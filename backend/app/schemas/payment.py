from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

from .job import JobRead
from .provider_listing import ProviderListingRead


class PaymentConfig(BaseModel):
    stripe_enabled: bool
    demo_mode: bool
    stripe_mode: Literal["demo", "test", "live"]
    publishable_key: Optional[str] = None
    webhook_configured: bool = False


class PaymentCheckoutRequest(BaseModel):
    payment_type: Literal["job_lead", "provider_lead"]
    job_id: Optional[int] = None
    provider_listing_id: Optional[int] = None
    provider_id: Optional[int] = None
    customer_id: Optional[int] = None


class PaymentCheckoutResponse(BaseModel):
    payment_id: int
    payment_type: str
    amount: float
    currency: str
    demo_mode: bool
    client_secret: Optional[str] = None
    checkout_url: Optional[str] = None
    title: str
    service_type: str


class PaymentConfirmRequest(BaseModel):
    payment_intent_id: Optional[str] = None
    checkout_session_id: Optional[str] = None


class PaymentConfirmResponse(BaseModel):
    payment_id: int
    payment_type: str
    status: str
    job: Optional[JobRead] = None
    listing: Optional[ProviderListingRead] = None


class PaymentRead(BaseModel):
    id: int
    payment_type: str
    job_id: Optional[int] = None
    provider_listing_id: Optional[int] = None
    provider_id: int
    customer_id: Optional[int] = None
    amount: float
    currency: str
    status: str
    is_demo: bool
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True