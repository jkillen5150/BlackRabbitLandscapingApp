from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Float
from sqlalchemy.sql import func
from app.database import Base


class ProviderListing(Base):
    __tablename__ = "provider_listings"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String)
    description = Column(Text)
    service_type = Column(String)
    service_area = Column(String, default="Yelm, WA")
    lead_price = Column(Float, default=0.0)
    status = Column(String, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())