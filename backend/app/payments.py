import os
from datetime import datetime, timezone

import stripe

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_MODE = os.getenv("STRIPE_MODE", "test").lower()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8081")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


def stripe_enabled() -> bool:
    return bool(STRIPE_SECRET_KEY)


def demo_mode() -> bool:
    return not stripe_enabled()


def stripe_mode_label() -> str:
    if demo_mode():
        return "demo"
    if STRIPE_MODE == "live":
        return "live"
    return "test"


def dollars_to_cents(amount: float) -> int:
    return int(round(amount * 100))


def _build_metadata(
    payment_type: str,
    payer_id: int,
    job_id: int | None = None,
    listing_id: int | None = None,
    payment_id: int | None = None,
) -> dict:
    meta = {
        "payment_type": payment_type,
        "payer_id": str(payer_id),
    }
    if job_id:
        meta["job_id"] = str(job_id)
    if listing_id:
        meta["listing_id"] = str(listing_id)
    if payment_id:
        meta["payment_id"] = str(payment_id)
    return meta


def create_payment_intent(
    amount: float,
    description: str,
    payment_type: str,
    payer_id: int,
    job_id: int | None = None,
    listing_id: int | None = None,
    payment_id: int | None = None,
) -> dict:
    intent = stripe.PaymentIntent.create(
        amount=dollars_to_cents(amount),
        currency="usd",
        description=description,
        metadata=_build_metadata(payment_type, payer_id, job_id, listing_id, payment_id),
        automatic_payment_methods={"enabled": True},
    )
    return {"payment_intent_id": intent.id, "client_secret": intent.client_secret}


def create_checkout_session(
    amount: float,
    description: str,
    payment_type: str,
    payer_id: int,
    success_path: str,
    cancel_path: str,
    job_id: int | None = None,
    listing_id: int | None = None,
    payment_id: int | None = None,
) -> dict:
    session = stripe.checkout.Session.create(
        mode="payment",
        payment_method_types=["card"],
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": dollars_to_cents(amount),
                    "product_data": {"name": description},
                },
                "quantity": 1,
            }
        ],
        success_url=f"{FRONTEND_URL}{success_path}?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{FRONTEND_URL}{cancel_path}?payment=cancelled",
        metadata=_build_metadata(payment_type, payer_id, job_id, listing_id, payment_id),
    )
    return {"checkout_session_id": session.id, "checkout_url": session.url}


def verify_payment_intent(payment_intent_id: str) -> dict | None:
    intent = stripe.PaymentIntent.retrieve(payment_intent_id)
    if intent.status != "succeeded":
        return None
    return dict(intent.metadata or {})


def verify_checkout_session(session_id: str) -> dict | None:
    session = stripe.checkout.Session.retrieve(session_id)
    if session.payment_status != "paid":
        return None
    meta = dict(session.metadata or {})
    meta["payment_intent_id"] = session.payment_intent
    meta["checkout_session_id"] = session.id
    return meta


def construct_webhook_event(payload: bytes, signature: str):
    if not STRIPE_WEBHOOK_SECRET:
        raise ValueError("STRIPE_WEBHOOK_SECRET not configured")
    return stripe.Webhook.construct_event(payload, signature, STRIPE_WEBHOOK_SECRET)


def mark_payment_completed(payment, stripe_payment_intent_id=None, checkout_session_id=None):
    payment.status = "succeeded"
    payment.completed_at = datetime.now(timezone.utc)
    if stripe_payment_intent_id:
        payment.stripe_payment_intent_id = stripe_payment_intent_id
    if checkout_session_id:
        payment.stripe_checkout_session_id = checkout_session_id