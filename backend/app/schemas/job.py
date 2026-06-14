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

class JobCreate(JobBase):
    customer_id: int

class JobRead(JobBase):
    id: int
    customer_id: int
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True