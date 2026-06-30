import os
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func
from sqlalchemy.orm import Session

from .constants import SERVICE_TIERS, SERVICE_TYPES
from .database import Base, SessionLocal, engine, get_db
from .models import appeal, job, listing_unlock, payment, provider_listing, review, user
from . import fulfillment, payments as payment_service
from .schemas import appeal as appeal_schema
from .schemas import job as job_schema
from .schemas import payment as payment_schema
from .schemas import provider_listing as listing_schema
from .schemas import review as review_schema
from .schemas import user as user_schema

load_dotenv()

XAI_API_KEY = os.getenv("XAI_API_KEY", "")

frontend_dir = Path(__file__).resolve().parents[2] / "frontend"

app = FastAPI(
    title="Black Rabbit Services",
    description="Marketplace connecting customers with local service providers",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(frontend_dir), html=True), name="static")

Base.metadata.create_all(bind=engine)


def _user_rating(db: Session, user_id: int) -> tuple[float | None, int]:
    result = (
        db.query(func.avg(review.Review.rating), func.count(review.Review.id))
        .filter(review.Review.reviewee_id == user_id)
        .first()
    )
    avg, count = result
    return (round(float(avg), 1) if avg else None, int(count or 0))


def _serialize_user(db: Session, u: user.User) -> user_schema.UserRead:
    avg, count = _user_rating(db, u.id)
    return user_schema.UserRead(
        id=u.id,
        name=u.name,
        phone=u.phone,
        email=u.email,
        address=u.address,
        bio=u.bio,
        services_offered=u.services_offered,
        is_provider=u.is_provider,
        created_at=u.created_at,
        avg_rating=avg,
        review_count=count,
    )


def _serialize_job(db: Session, j: job.Job) -> job_schema.JobRead:
    return fulfillment.serialize_job(db, j)


def _serialize_listing(
    db: Session, listing: provider_listing.ProviderListing, viewer_customer_id: int | None = None
) -> listing_schema.ProviderListingRead:
    return fulfillment.serialize_listing(db, listing, viewer_customer_id)


def seed_sample_data(db: Session):
    if db.query(user.User).count() == 0:
        sample_users = [
            user.User(
                email="jane@example.com",
                name="Jane Doe",
                phone="555-123-4567",
                is_provider=False,
                address="Yelm, WA",
            ),
            user.User(
                email="mike@example.com",
                name="Mike Green",
                phone="555-987-6543",
                is_provider=True,
                address="Yelm, WA",
                bio="15 years of lawn care experience. Licensed and insured.",
                services_offered="Lawn Care, Landscaping, Pressure Washing",
            ),
            user.User(
                email="sarah@example.com",
                name="Sarah Chen",
                phone="555-456-7890",
                is_provider=True,
                address="Olympia, WA",
                bio="Window washing and handyman services. Fair prices, solid work.",
                services_offered="Window Washing, Handyman, Gutter Cleaning",
            ),
        ]
        db.add_all(sample_users)
        db.commit()

    if db.query(job.Job).count() == 0:
        customer = db.query(user.User).filter_by(email="jane@example.com").first()
        sample_jobs = [
            job.Job(
                customer_id=customer.id,
                title="Backyard mowing",
                description="Trim the lawn, edge the walkways and remove clippings.",
                service_type="Lawn Care",
                urgency="Today",
                address="123 Maple St, Yelm, WA",
                lead_price=SERVICE_TIERS["Lawn Care"],
                latitude=46.9421,
                longitude=-122.6065,
            ),
            job.Job(
                customer_id=customer.id,
                title="Mulch freshen-up",
                description="Add fresh mulch to the flower beds and weed the front yard.",
                service_type="Landscaping",
                urgency="This Week",
                address="456 Oak Ave, Yelm, WA",
                lead_price=SERVICE_TIERS["Landscaping"],
                latitude=46.9421,
                longitude=-122.6065,
            ),
            job.Job(
                customer_id=customer.id,
                title="Exterior window cleaning",
                description="Two-story home, about 20 windows. Need inside and outside.",
                service_type="Window Washing",
                urgency="This Week",
                address="789 Pine Rd, Yelm, WA",
                lead_price=SERVICE_TIERS["Window Washing"],
            ),
        ]
        db.add_all(sample_jobs)
        db.commit()

    if db.query(provider_listing.ProviderListing).count() == 0:
        mike = db.query(user.User).filter_by(email="mike@example.com").first()
        sarah = db.query(user.User).filter_by(email="sarah@example.com").first()
        if mike and sarah:
            sample_listings = [
                provider_listing.ProviderListing(
                    provider_id=mike.id,
                    title="Reliable lawn care — weekly or one-time",
                    description="I show up on time, edge every visit, and haul clippings. 15 years in Yelm.",
                    service_type="Lawn Care",
                    service_area="Yelm, WA",
                    lead_price=SERVICE_TIERS["Lawn Care"],
                ),
                provider_listing.ProviderListing(
                    provider_id=sarah.id,
                    title="Crystal-clear windows & small repairs",
                    description="Two-story homes welcome. Also handle minor handyman jobs — faucets, shelves, etc.",
                    service_type="Window Washing",
                    service_area="Yelm & Olympia, WA",
                    lead_price=SERVICE_TIERS["Window Washing"],
                ),
            ]
            db.add_all(sample_listings)
            db.commit()


@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_sample_data(db)
    finally:
        db.close()


@app.get("/")
def read_root():
    return {
        "message": "Black Rabbit Services API is running",
        "version": "0.4.0",
        "note": "Use the Expo frontend: cd frontend && npm run web",
    }


@app.get("/service-types/")
def get_service_types():
    return {
        "types": SERVICE_TYPES,
        "pricing": SERVICE_TIERS,
    }


# --- Users ---


@app.post("/users/", response_model=user_schema.UserRead)
def create_user(payload: user_schema.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(user.User).filter(user.User.phone == payload.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    db_user = user.User(**payload.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return _serialize_user(db, db_user)


@app.get("/users/{user_id}", response_model=user_schema.UserRead)
def get_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(user.User).filter(user.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return _serialize_user(db, db_user)


@app.get("/users/by-phone/{phone}", response_model=user_schema.UserRead)
def get_user_by_phone(phone: str, db: Session = Depends(get_db)):
    db_user = db.query(user.User).filter(user.User.phone == phone).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return _serialize_user(db, db_user)


@app.patch("/users/{user_id}", response_model=user_schema.UserRead)
def update_user(
    user_id: int, payload: user_schema.UserUpdate, db: Session = Depends(get_db)
):
    db_user = db.query(user.User).filter(user.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    return _serialize_user(db, db_user)


# --- Jobs / Leads ---


@app.post("/jobs/post", response_model=job_schema.JobRead)
def post_job(payload: job_schema.JobPostRequest, db: Session = Depends(get_db)):
    if payload.service_type not in SERVICE_TIERS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown service type. Choose from: {', '.join(SERVICE_TYPES)}",
        )

    db_customer = db.query(user.User).filter(user.User.phone == payload.phone).first()
    if not db_customer:
        email = payload.email or f"{payload.phone.replace('-', '')}@blackrabbit.local"
        db_customer = user.User(
            name=payload.name,
            phone=payload.phone,
            email=email,
            is_provider=False,
            address=payload.address,
        )
        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)
    else:
        db_customer.name = payload.name
        if payload.email:
            db_customer.email = payload.email
        db.commit()

    title = payload.description[:60] + ("..." if len(payload.description) > 60 else "")

    db_job = job.Job(
        customer_id=db_customer.id,
        title=title,
        description=payload.description,
        service_type=payload.service_type,
        urgency=payload.urgency,
        address=payload.address,
        lead_price=SERVICE_TIERS[payload.service_type],
        latitude=payload.latitude,
        longitude=payload.longitude,
        status="open",
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return _serialize_job(db, db_job)


@app.get("/jobs/", response_model=list[job_schema.JobRead])
def get_jobs(db: Session = Depends(get_db)):
    jobs = db.query(job.Job).order_by(job.Job.created_at.desc()).all()
    return [_serialize_job(db, j) for j in jobs]


@app.get("/jobs/open/", response_model=list[job_schema.JobRead])
def get_open_jobs(db: Session = Depends(get_db)):
    jobs = (
        db.query(job.Job)
        .filter(job.Job.status == "open")
        .order_by(job.Job.created_at.desc())
        .all()
    )
    return [_serialize_job(db, j) for j in jobs]


@app.get("/jobs/provider/{provider_id}", response_model=list[job_schema.JobRead])
def get_provider_jobs(provider_id: int, db: Session = Depends(get_db)):
    jobs = (
        db.query(job.Job)
        .filter(job.Job.provider_id == provider_id)
        .order_by(job.Job.created_at.desc())
        .all()
    )
    return [_serialize_job(db, j) for j in jobs]


@app.get("/jobs/customer/{customer_id}", response_model=list[job_schema.JobRead])
def get_customer_jobs(customer_id: int, db: Session = Depends(get_db)):
    jobs = (
        db.query(job.Job)
        .filter(job.Job.customer_id == customer_id)
        .order_by(job.Job.created_at.desc())
        .all()
    )
    return [_serialize_job(db, j) for j in jobs]


@app.post("/jobs/{job_id}/claim", response_model=job_schema.JobRead)
def claim_job(
    job_id: int, payload: job_schema.JobClaimRequest, db: Session = Depends(get_db)
):
    db_job = db.query(job.Job).filter(job.Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    return fulfillment.claim_job(db, db_job, payload.provider_id)


# --- Provider listings (free exchange) ---


@app.get("/provider-listings/", response_model=list[listing_schema.ProviderListingRead])
def list_provider_listings(
    service_type: str | None = None,
    customer_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(provider_listing.ProviderListing).filter(
        provider_listing.ProviderListing.status == "active"
    )
    if service_type:
        query = query.filter(provider_listing.ProviderListing.service_type == service_type)
    listings = query.order_by(provider_listing.ProviderListing.created_at.desc()).all()
    return [_serialize_listing(db, l, customer_id) for l in listings]


@app.get("/provider-listings/provider/{provider_id}", response_model=list[listing_schema.ProviderListingRead])
def get_provider_listings(provider_id: int, db: Session = Depends(get_db)):
    listings = (
        db.query(provider_listing.ProviderListing)
        .filter(provider_listing.ProviderListing.provider_id == provider_id)
        .order_by(provider_listing.ProviderListing.created_at.desc())
        .all()
    )
    return [_serialize_listing(db, l) for l in listings]


@app.post("/provider-listings/", response_model=listing_schema.ProviderListingRead)
def create_provider_listing(
    payload: listing_schema.ProviderListingCreate, db: Session = Depends(get_db)
):
    if payload.service_type not in SERVICE_TIERS:
        raise HTTPException(status_code=400, detail=f"Choose from: {', '.join(SERVICE_TYPES)}")

    provider = db.query(user.User).filter(user.User.id == payload.provider_id).first()
    if not provider or not provider.is_provider:
        raise HTTPException(status_code=400, detail="Provider account required")

    listing = provider_listing.ProviderListing(
        provider_id=payload.provider_id,
        title=payload.title,
        description=payload.description,
        service_type=payload.service_type,
        service_area=payload.service_area,
        lead_price=SERVICE_TIERS[payload.service_type],
        status="active",
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return _serialize_listing(db, listing)


@app.patch("/provider-listings/{listing_id}", response_model=listing_schema.ProviderListingRead)
def update_provider_listing(
    listing_id: int,
    payload: listing_schema.ProviderListingUpdate,
    db: Session = Depends(get_db),
):
    listing = (
        db.query(provider_listing.ProviderListing)
        .filter(provider_listing.ProviderListing.id == listing_id)
        .first()
    )
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "service_type" and value and value not in SERVICE_TIERS:
            raise HTTPException(status_code=400, detail="Invalid service type")
        setattr(listing, key, value)
        if key == "service_type" and value:
            listing.lead_price = SERVICE_TIERS[value]

    db.commit()
    db.refresh(listing)
    return _serialize_listing(db, listing)


# --- Payments ---


def _build_checkout_context(payload: payment_schema.PaymentCheckoutRequest, db: Session):
    if payload.payment_type == "job_lead":
        if not payload.job_id or not payload.provider_id:
            raise HTTPException(status_code=400, detail="job_id and provider_id required")
        db_job = db.query(job.Job).filter(job.Job.id == payload.job_id).first()
        if not db_job:
            raise HTTPException(status_code=404, detail="Job not found")
        if db_job.status != "open":
            raise HTTPException(status_code=400, detail="This lead is no longer available")
        provider = db.query(user.User).filter(user.User.id == payload.provider_id).first()
        if not provider or not provider.is_provider:
            raise HTTPException(status_code=400, detail="Invalid provider account")
        return {
            "amount": db_job.lead_price,
            "description": f"{db_job.service_type} job lead #{db_job.id}",
            "title": db_job.title,
            "service_type": db_job.service_type,
            "payer_id": payload.provider_id,
            "provider_id": payload.provider_id,
            "customer_id": None,
            "job_id": db_job.id,
            "listing_id": None,
            "success_path": "/leads",
            "cancel_path": "/leads",
        }

    if payload.payment_type == "provider_lead":
        if not payload.provider_listing_id or not payload.customer_id:
            raise HTTPException(status_code=400, detail="provider_listing_id and customer_id required")
        listing = (
            db.query(provider_listing.ProviderListing)
            .filter(provider_listing.ProviderListing.id == payload.provider_listing_id)
            .first()
        )
        if not listing or listing.status != "active":
            raise HTTPException(status_code=404, detail="Listing not found")
        customer = db.query(user.User).filter(user.User.id == payload.customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        existing = (
            db.query(listing_unlock.ListingUnlock)
            .filter(
                listing_unlock.ListingUnlock.listing_id == listing.id,
                listing_unlock.ListingUnlock.customer_id == customer.id,
            )
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="You already purchased this provider lead")
        return {
            "amount": listing.lead_price,
            "description": f"{listing.service_type} provider lead — {listing.title}",
            "title": listing.title,
            "service_type": listing.service_type,
            "payer_id": payload.customer_id,
            "provider_id": listing.provider_id,
            "customer_id": payload.customer_id,
            "job_id": None,
            "listing_id": listing.id,
            "success_path": "/pros",
            "cancel_path": "/pros",
        }

    raise HTTPException(status_code=400, detail="Invalid payment_type")


def _payment_confirm_response(db: Session, db_payment: payment.Payment):
    result = fulfillment.fulfill_payment(db, db_payment)
    return payment_schema.PaymentConfirmResponse(
        payment_id=db_payment.id,
        payment_type=db_payment.payment_type,
        status=db_payment.status,
        job=result["job"],
        listing=result["listing"],
    )


@app.get("/payments/config", response_model=payment_schema.PaymentConfig)
def get_payment_config():
    return payment_schema.PaymentConfig(
        stripe_enabled=payment_service.stripe_enabled(),
        demo_mode=payment_service.demo_mode(),
        stripe_mode=payment_service.stripe_mode_label(),
        publishable_key=payment_service.STRIPE_PUBLISHABLE_KEY or None,
        webhook_configured=bool(payment_service.STRIPE_WEBHOOK_SECRET),
    )


@app.post("/payments/checkout", response_model=payment_schema.PaymentCheckoutResponse)
def create_checkout(
    payload: payment_schema.PaymentCheckoutRequest, db: Session = Depends(get_db)
):
    ctx = _build_checkout_context(payload, db)

    db_payment = payment.Payment(
        payment_type=payload.payment_type,
        job_id=ctx["job_id"],
        provider_listing_id=ctx["listing_id"],
        provider_id=ctx["provider_id"],
        customer_id=ctx["customer_id"],
        amount=ctx["amount"],
        currency="usd",
        status="pending",
        is_demo=payment_service.demo_mode(),
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)

    client_secret = None
    checkout_url = None

    if payment_service.stripe_enabled():
        try:
            intent_data = payment_service.create_payment_intent(
                amount=ctx["amount"],
                description=ctx["description"],
                payment_type=payload.payment_type,
                payer_id=ctx["payer_id"],
                job_id=ctx["job_id"],
                listing_id=ctx["listing_id"],
                payment_id=db_payment.id,
            )
            db_payment.stripe_payment_intent_id = intent_data["payment_intent_id"]
            db.commit()
            client_secret = intent_data["client_secret"]
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")
    else:
        db_payment.is_demo = True
        db.commit()

    return payment_schema.PaymentCheckoutResponse(
        payment_id=db_payment.id,
        payment_type=payload.payment_type,
        amount=ctx["amount"],
        currency="usd",
        demo_mode=db_payment.is_demo,
        client_secret=client_secret,
        checkout_url=checkout_url,
        title=ctx["title"],
        service_type=ctx["service_type"],
    )


@app.post("/payments/{payment_id}/confirm", response_model=payment_schema.PaymentConfirmResponse)
def confirm_payment(
    payment_id: int,
    payload: payment_schema.PaymentConfirmRequest,
    db: Session = Depends(get_db),
):
    db_payment = db.query(payment.Payment).filter(payment.Payment.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if db_payment.status == "succeeded":
        return _payment_confirm_response(db, db_payment)
    if db_payment.status != "pending":
        raise HTTPException(status_code=400, detail=f"Payment is {db_payment.status}")

    if db_payment.is_demo:
        payment_service.mark_payment_completed(db_payment)
        db.commit()
        return _payment_confirm_response(db, db_payment)

    intent_id = payload.payment_intent_id or db_payment.stripe_payment_intent_id
    if not intent_id:
        raise HTTPException(status_code=400, detail="payment_intent_id required")

    try:
        if not payment_service.verify_payment_intent(intent_id):
            raise HTTPException(status_code=402, detail="Payment not completed yet")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe verification failed: {str(e)}")

    payment_service.mark_payment_completed(db_payment, stripe_payment_intent_id=intent_id)
    db.commit()
    return _payment_confirm_response(db, db_payment)


@app.post("/payments/checkout-session/confirm", response_model=payment_schema.PaymentConfirmResponse)
def confirm_checkout_session(
    payload: payment_schema.PaymentConfirmRequest, db: Session = Depends(get_db)
):
    if not payload.checkout_session_id:
        raise HTTPException(status_code=400, detail="checkout_session_id required")
    if not payment_service.stripe_enabled():
        raise HTTPException(status_code=400, detail="Stripe not configured")

    try:
        session_data = payment_service.verify_checkout_session(payload.checkout_session_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")

    if not session_data:
        raise HTTPException(status_code=402, detail="Checkout session not paid")

    db_payment = (
        db.query(payment.Payment)
        .filter(payment.Payment.stripe_checkout_session_id == payload.checkout_session_id)
        .first()
    )
    if not db_payment and session_data.get("payment_id"):
        db_payment = db.query(payment.Payment).filter(
            payment.Payment.id == int(session_data["payment_id"])
        ).first()

    if not db_payment:
        payment_type = session_data.get("payment_type", "job_lead")
        db_payment = payment.Payment(
            payment_type=payment_type,
            job_id=int(session_data["job_id"]) if session_data.get("job_id") else None,
            provider_listing_id=int(session_data["listing_id"]) if session_data.get("listing_id") else None,
            provider_id=int(session_data.get("payer_id", 0)),
            customer_id=int(session_data["payer_id"]) if payment_type == "provider_lead" else None,
            amount=0,
            status="pending",
            stripe_checkout_session_id=payload.checkout_session_id,
            is_demo=False,
        )
        db.add(db_payment)
        db.commit()
        db.refresh(db_payment)

    if db_payment.status != "succeeded":
        payment_service.mark_payment_completed(
            db_payment,
            stripe_payment_intent_id=session_data.get("payment_intent_id"),
            checkout_session_id=payload.checkout_session_id,
        )
        db.commit()

    return _payment_confirm_response(db, db_payment)


@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")

    try:
        event = payment_service.construct_webhook_event(payload, signature)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")

    if event.type == "payment_intent.succeeded":
        intent = event.data.object
        payment_id = intent.metadata.get("payment_id")
        db_payment = None
        if payment_id:
            db_payment = db.query(payment.Payment).filter(payment.Payment.id == int(payment_id)).first()
        if not db_payment:
            db_payment = (
                db.query(payment.Payment)
                .filter(payment.Payment.stripe_payment_intent_id == intent.id)
                .first()
            )
        if db_payment and db_payment.status == "pending":
            payment_service.mark_payment_completed(db_payment, stripe_payment_intent_id=intent.id)
            db.commit()
            fulfillment.fulfill_payment(db, db_payment)

    return {"received": True}


@app.get("/payments/provider/{provider_id}", response_model=list[payment_schema.PaymentRead])
def get_provider_payments(provider_id: int, db: Session = Depends(get_db)):
    payments = (
        db.query(payment.Payment)
        .filter(payment.Payment.provider_id == provider_id)
        .order_by(payment.Payment.created_at.desc())
        .all()
    )
    return payments


@app.put("/jobs/{job_id}/complete", response_model=job_schema.JobRead)
def complete_job(job_id: int, db: Session = Depends(get_db)):
    db_job = db.query(job.Job).filter(job.Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    if db_job.status != "claimed":
        raise HTTPException(status_code=400, detail="Job must be claimed before completing")

    db_job.status = "completed"
    db_job.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_job)
    return _serialize_job(db, db_job)


# --- Reviews ---


@app.post("/reviews/", response_model=review_schema.ReviewRead)
def create_review(payload: review_schema.ReviewCreate, db: Session = Depends(get_db)):
    db_job = db.query(job.Job).filter(job.Job.id == payload.job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    if db_job.status != "completed":
        raise HTTPException(status_code=400, detail="Reviews are available after job completion")

    existing = (
        db.query(review.Review)
        .filter(
            review.Review.job_id == payload.job_id,
            review.Review.reviewer_id == payload.reviewer_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this job")

    db_review = review.Review(**payload.model_dump())
    db.add(db_review)
    db.commit()
    db.refresh(db_review)

    reviewer = db.query(user.User).filter(user.User.id == payload.reviewer_id).first()
    return review_schema.ReviewRead(
        id=db_review.id,
        job_id=db_review.job_id,
        reviewer_id=db_review.reviewer_id,
        reviewee_id=db_review.reviewee_id,
        rating=db_review.rating,
        comment=db_review.comment,
        created_at=db_review.created_at,
        reviewer_name=reviewer.name if reviewer else None,
    )


@app.get("/reviews/user/{user_id}", response_model=list[review_schema.ReviewRead])
def get_user_reviews(user_id: int, db: Session = Depends(get_db)):
    reviews = (
        db.query(review.Review)
        .filter(review.Review.reviewee_id == user_id)
        .order_by(review.Review.created_at.desc())
        .all()
    )
    result = []
    for r in reviews:
        reviewer = db.query(user.User).filter(user.User.id == r.reviewer_id).first()
        result.append(
            review_schema.ReviewRead(
                id=r.id,
                job_id=r.job_id,
                reviewer_id=r.reviewer_id,
                reviewee_id=r.reviewee_id,
                rating=r.rating,
                comment=r.comment,
                created_at=r.created_at,
                reviewer_name=reviewer.name if reviewer else None,
            )
        )
    return result


# --- Appeals ---


@app.post("/appeals/", response_model=appeal_schema.AppealRead)
def create_appeal(payload: appeal_schema.AppealCreate, db: Session = Depends(get_db)):
    reporter = db.query(user.User).filter(user.User.id == payload.reporter_id).first()
    if not reporter:
        raise HTTPException(status_code=404, detail="Reporter not found")

    db_appeal = appeal.Appeal(**payload.model_dump())
    db.add(db_appeal)
    db.commit()
    db.refresh(db_appeal)

    return appeal_schema.AppealRead(
        id=db_appeal.id,
        job_id=db_appeal.job_id,
        reporter_id=db_appeal.reporter_id,
        subject=db_appeal.subject,
        reason=db_appeal.reason,
        details=db_appeal.details,
        status=db_appeal.status,
        resolution=db_appeal.resolution,
        created_at=db_appeal.created_at,
        resolved_at=db_appeal.resolved_at,
        reporter_name=reporter.name,
    )


@app.get("/appeals/", response_model=list[appeal_schema.AppealRead])
def get_appeals(db: Session = Depends(get_db)):
    appeals = db.query(appeal.Appeal).order_by(appeal.Appeal.created_at.desc()).all()
    result = []
    for a in appeals:
        reporter = db.query(user.User).filter(user.User.id == a.reporter_id).first()
        result.append(
            appeal_schema.AppealRead(
                id=a.id,
                job_id=a.job_id,
                reporter_id=a.reporter_id,
                subject=a.subject,
                reason=a.reason,
                details=a.details,
                status=a.status,
                resolution=a.resolution,
                created_at=a.created_at,
                resolved_at=a.resolved_at,
                reporter_name=reporter.name if reporter else None,
            )
        )
    return result


# --- Voice STT ---


@app.post("/voice/stt")
async def voice_stt(file: UploadFile = File(...)):
    if not XAI_API_KEY:
        raise HTTPException(status_code=400, detail="XAI_API_KEY not set in .env")

    audio_bytes = await file.read()

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.x.ai/v1/stt",
                headers={"Authorization": f"Bearer {XAI_API_KEY}"},
                files={
                    "file": (
                        file.filename or "recording.webm",
                        audio_bytes,
                        file.content_type or "audio/webm",
                    )
                },
            )

            if response.status_code == 200:
                data = response.json()
                transcript = data.get("text") or data.get("transcript") or str(data)
                return {"transcript": transcript}
            return {"transcript": f"Grok STT error: {response.text}"}

    except Exception as e:
        return {"transcript": f"Error calling Grok STT: {str(e)}"}