from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    services_offered: Optional[str] = None


class UserCreate(UserBase):
    is_provider: bool = False


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    services_offered: Optional[str] = None
    is_provider: Optional[bool] = None


class UserRead(UserBase):
    id: int
    is_provider: bool
    created_at: datetime
    avg_rating: Optional[float] = None
    review_count: int = 0

    class Config:
        from_attributes = True