from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProviderListingCreate(BaseModel):
    provider_id: int
    title: str
    description: str
    service_type: str
    service_area: str = "Yelm, WA"


class ProviderListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    service_type: Optional[str] = None
    service_area: Optional[str] = None
    status: Optional[str] = None


class ProviderListingRead(BaseModel):
    id: int
    provider_id: int
    title: str
    description: str
    service_type: str
    service_area: str
    lead_price: float
    status: str
    created_at: datetime
    provider_name: Optional[str] = None
    provider_bio: Optional[str] = None
    provider_phone: Optional[str] = None
    avg_rating: Optional[float] = None
    review_count: int = 0
    contact_unlocked: bool = False

    class Config:
        from_attributes = True