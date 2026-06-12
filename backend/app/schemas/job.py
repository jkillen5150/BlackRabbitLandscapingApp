from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class JobBase(BaseModel):
    title: str
    description: str
    service_type: str
    urgency: str
    address: str

class JobCreate(JobBase):
    customer_id: int

class JobRead(JobBase):
    id: int
    customer_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True