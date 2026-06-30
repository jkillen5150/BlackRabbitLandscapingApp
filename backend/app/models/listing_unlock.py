from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class ListingUnlock(Base):
    __tablename__ = "listing_unlocks"
    __table_args__ = (UniqueConstraint("listing_id", "customer_id", name="uq_listing_customer"),)

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("provider_listings.id"), index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())