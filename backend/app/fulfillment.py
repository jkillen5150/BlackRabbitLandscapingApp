from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .models import job, listing_unlock, payment, provider_listing, user
from .schemas import job as job_schema
from .schemas import provider_listing as listing_schema


def serialize_listing(
    db: Session,
    listing: provider_listing.ProviderListing,
    viewer_customer_id: int | None = None,
) -> listing_schema.ProviderListingRead:
    provider = db.query(user.User).filter(user.User.id == listing.provider_id).first()
    unlocked = listing.status == "active"

    avg_rating = None
    review_count = 0
    if provider:
        from sqlalchemy import func
        from .models import review

        result = (
            db.query(func.avg(review.Review.rating), func.count(review.Review.id))
            .filter(review.Review.reviewee_id == provider.id)
            .first()
        )
        avg, count = result
        avg_rating = round(float(avg), 1) if avg else None
        review_count = int(count or 0)

    return listing_schema.ProviderListingRead(
        id=listing.id,
        provider_id=listing.provider_id,
        title=listing.title,
        description=listing.description,
        service_type=listing.service_type,
        service_area=listing.service_area,
        lead_price=listing.lead_price,
        status=listing.status,
        created_at=listing.created_at,
        provider_name=provider.name if provider else None,
        provider_bio=provider.bio if provider else None,
        provider_phone=provider.phone if provider and unlocked else None,
        avg_rating=avg_rating,
        review_count=review_count,
        contact_unlocked=unlocked,
    )


def serialize_job(db: Session, j: job.Job) -> job_schema.JobRead:
    customer = db.query(user.User).filter(user.User.id == j.customer_id).first()
    show_contact = j.status in ("claimed", "completed")
    return job_schema.JobRead(
        id=j.id,
        customer_id=j.customer_id,
        provider_id=j.provider_id,
        title=j.title,
        description=j.description,
        service_type=j.service_type,
        urgency=j.urgency,
        address=j.address,
        status=j.status,
        lead_price=j.lead_price,
        latitude=j.latitude,
        longitude=j.longitude,
        created_at=j.created_at,
        claimed_at=j.claimed_at,
        completed_at=j.completed_at,
        customer_name=customer.name if customer else None,
        customer_phone=customer.phone if customer and show_contact else None,
    )


def claim_job(db: Session, db_job: job.Job, provider_id: int) -> job_schema.JobRead:
    provider = db.query(user.User).filter(user.User.id == provider_id).first()
    if not provider or not provider.is_provider:
        raise HTTPException(status_code=400, detail="Invalid provider account")
    if db_job.status != "open":
        raise HTTPException(status_code=400, detail="This job is no longer available")

    db_job.provider_id = provider_id
    db_job.status = "claimed"
    db_job.claimed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_job)
    return serialize_job(db, db_job)


def fulfill_job_lead_payment(db: Session, db_payment: payment.Payment) -> job_schema.JobRead:
    db_job = db.query(job.Job).filter(job.Job.id == db_payment.job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    return claim_job(db, db_job, db_payment.provider_id)


def fulfill_provider_lead_payment(
    db: Session, db_payment: payment.Payment
) -> listing_schema.ProviderListingRead:
    listing = (
        db.query(provider_listing.ProviderListing)
        .filter(provider_listing.ProviderListing.id == db_payment.provider_listing_id)
        .first()
    )
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if not db_payment.customer_id:
        raise HTTPException(status_code=400, detail="Customer required for provider lead purchase")

    existing = (
        db.query(listing_unlock.ListingUnlock)
        .filter(
            listing_unlock.ListingUnlock.listing_id == listing.id,
            listing_unlock.ListingUnlock.customer_id == db_payment.customer_id,
        )
        .first()
    )
    if not existing:
        unlock = listing_unlock.ListingUnlock(
            listing_id=listing.id,
            customer_id=db_payment.customer_id,
            payment_id=db_payment.id,
        )
        db.add(unlock)
        db.commit()

    return serialize_listing(db, listing, viewer_customer_id=db_payment.customer_id)


def fulfill_payment(db: Session, db_payment: payment.Payment):
    if db_payment.payment_type == "provider_lead":
        listing = fulfill_provider_lead_payment(db, db_payment)
        return {"payment_type": "provider_lead", "listing": listing, "job": None}
    job_result = fulfill_job_lead_payment(db, db_payment)
    return {"payment_type": "job_lead", "job": job_result, "listing": None}