from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobBase(BaseModel):
    title: str
    description: str
    service_type: str
    urgency: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class JobPostRequest(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    service_type: str
    urgency: str
    description: str
    address: str = "Yelm, WA"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # "owner" = house crew lead (not shown on open board); "open" = marketplace
    route: Optional[str] = "open"


class JobCreate(JobBase):
    customer_id: int


class JobRead(JobBase):
    id: int
    customer_id: int
    provider_id: Optional[int] = None
    status: str
    lead_price: float
    created_at: datetime
    claimed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None

    class Config:
        from_attributes = True


class JobClaimRequest(BaseModel):
    provider_id: int