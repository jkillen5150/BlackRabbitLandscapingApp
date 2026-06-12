from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: str
    name: str
    phone: str
    address: Optional[str] = None

class UserCreate(UserBase):
    is_provider: bool = False

class UserRead(UserBase):
    id: int
    is_provider: bool
    created_at: datetime

    class Config:
        from_attributes = True