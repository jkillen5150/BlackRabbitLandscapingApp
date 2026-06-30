from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ReviewCreate(BaseModel):
    job_id: int
    reviewer_id: int
    reviewee_id: int
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class ReviewRead(BaseModel):
    id: int
    job_id: int
    reviewer_id: int
    reviewee_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    reviewer_name: Optional[str] = None

    class Config:
        from_attributes = True