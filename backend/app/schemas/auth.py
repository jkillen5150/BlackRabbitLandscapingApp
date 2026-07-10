from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from .user import UserRead


class EmailCodeRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=7, max_length=32)
    is_provider: bool = False


class EmailCodeResponse(BaseModel):
    message: str
    email: str
    expires_in_minutes: int
    demo_mode: bool
    dev_code: Optional[str] = None


class EmailVerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class EmailVerifyResponse(BaseModel):
    user: UserRead
    is_new_user: bool