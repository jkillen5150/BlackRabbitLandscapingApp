from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Boolean
from sqlalchemy.sql import func
from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_type = Column(String, default="job_lead")
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True, index=True)
    provider_listing_id = Column(Integer, ForeignKey("provider_listings.id"), nullable=True, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"), index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="usd")
    status = Column(String, default="pending")
    stripe_payment_intent_id = Column(String, nullable=True, unique=True, index=True)
    stripe_checkout_session_id = Column(String, nullable=True, unique=True, index=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)