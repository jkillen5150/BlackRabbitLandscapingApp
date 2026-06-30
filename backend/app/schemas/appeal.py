from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AppealCreate(BaseModel):
    reporter_id: int
    subject: str
    reason: str
    details: str
    job_id: Optional[int] = None


class AppealRead(BaseModel):
    id: int
    job_id: Optional[int] = None
    reporter_id: int
    subject: str
    reason: str
    details: str
    status: str
    resolution: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    reporter_name: Optional[str] = None

    class Config:
        from_attributes = True