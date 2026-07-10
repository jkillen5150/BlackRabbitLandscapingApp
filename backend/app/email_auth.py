import hashlib
import logging
import os
import random
import re
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .models import email_verification, user

logger = logging.getLogger(__name__)

CODE_TTL_MINUTES = int(os.getenv("EMAIL_CODE_TTL_MINUTES", "15"))
MAX_ATTEMPTS = int(os.getenv("EMAIL_CODE_MAX_ATTEMPTS", "5"))

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "noreply@blackrabbit.services")
EMAIL_DEMO_MODE = os.getenv("EMAIL_DEMO_MODE", "true").lower() in {"1", "true", "yes"}


def _is_smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_FROM)


def is_demo_mode() -> bool:
    return EMAIL_DEMO_MODE or not _is_smtp_configured()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return phone.strip()


def _hash_code(email: str, code: str) -> str:
    payload = f"{_normalize_email(email)}:{code}:{os.getenv('EMAIL_CODE_SECRET', 'blackrabbit-dev')}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def _send_verification_email(email: str, code: str, name: str, is_provider: bool) -> None:
    role = "provider" if is_provider else "customer"
    subject = "Your Black Rabbit verification code"
    body = (
        f"Hi {name},\n\n"
        f"Your Black Rabbit {role} sign-up code is: {code}\n\n"
        f"This code expires in {CODE_TTL_MINUTES} minutes.\n\n"
        f"If you didn't request this, you can ignore this email.\n"
    )

    if is_demo_mode():
        logger.info("EMAIL DEMO MODE — verification code for %s: %s", email, code)
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = SMTP_FROM
    message["To"] = email
    message.set_content(body)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
        server.starttls()
        if SMTP_USER and SMTP_PASSWORD:
            server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(message)


def request_verification_code(
    db: Session,
    *,
    email: str,
    name: str,
    phone: str,
    is_provider: bool,
) -> tuple[str, bool]:
    normalized_email = _normalize_email(email)
    normalized_phone = _normalize_phone(phone)
    code = _generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES)

    db.query(email_verification.EmailVerification).filter(
        email_verification.EmailVerification.email == normalized_email,
        email_verification.EmailVerification.consumed_at.is_(None),
    ).update({"consumed_at": datetime.now(timezone.utc)})

    record = email_verification.EmailVerification(
        email=normalized_email,
        code_hash=_hash_code(normalized_email, code),
        name=name.strip(),
        phone=normalized_phone,
        is_provider=is_provider,
        expires_at=expires_at,
    )
    db.add(record)
    db.commit()

    try:
        _send_verification_email(normalized_email, code, name.strip(), is_provider)
    except Exception as exc:
        logger.exception("Failed to send verification email to %s", normalized_email)
        raise HTTPException(
            status_code=503,
            detail="Could not send verification email. Try again shortly.",
        ) from exc

    return code, is_demo_mode()


def verify_code_and_upsert_user(db: Session, *, email: str, code: str) -> tuple[user.User, bool]:
    normalized_email = _normalize_email(email)
    now = datetime.now(timezone.utc)

    record = (
        db.query(email_verification.EmailVerification)
        .filter(
            email_verification.EmailVerification.email == normalized_email,
            email_verification.EmailVerification.consumed_at.is_(None),
        )
        .order_by(email_verification.EmailVerification.created_at.desc())
        .first()
    )

    if not record:
        raise HTTPException(status_code=400, detail="No active verification code. Request a new one.")

    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now:
        record.consumed_at = now
        db.commit()
        raise HTTPException(status_code=400, detail="Verification code expired. Request a new one.")

    if record.attempts >= MAX_ATTEMPTS:
        record.consumed_at = now
        db.commit()
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new code.")

    if record.code_hash != _hash_code(normalized_email, code.strip()):
        record.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    record.consumed_at = now

    existing = db.query(user.User).filter(user.User.email == normalized_email).first()
    is_new_user = existing is None

    if existing:
        phone_owner = (
            db.query(user.User)
            .filter(user.User.phone == record.phone, user.User.id != existing.id)
            .first()
        )
        if phone_owner:
            raise HTTPException(status_code=400, detail="Phone number already used by another account.")

        existing.name = record.name
        existing.phone = record.phone
        existing.email_verified = True
        if record.is_provider:
            existing.is_provider = True
        db_user = existing
    else:
        phone_owner = db.query(user.User).filter(user.User.phone == record.phone).first()
        if phone_owner:
            if phone_owner.email and not phone_owner.email.endswith("@blackrabbit.local"):
                raise HTTPException(status_code=400, detail="Phone number already registered.")
            phone_owner.email = normalized_email
            phone_owner.name = record.name
            phone_owner.email_verified = True
            if record.is_provider:
                phone_owner.is_provider = True
            db_user = phone_owner
            is_new_user = False
        else:
            db_user = user.User(
                email=normalized_email,
                phone=record.phone,
                name=record.name,
                is_provider=record.is_provider,
                email_verified=True,
            )
            db.add(db_user)

    db.commit()
    db.refresh(db_user)
    return db_user, is_new_user


def require_verified_user(db_user: user.User, *, for_provider: bool = False) -> None:
    if not db_user.email_verified:
        raise HTTPException(
            status_code=403,
            detail="Verify your email before continuing. Check Profile to finish sign-up.",
        )
    if for_provider and not db_user.is_provider:
        raise HTTPException(status_code=403, detail="Enable provider mode on your profile first.")