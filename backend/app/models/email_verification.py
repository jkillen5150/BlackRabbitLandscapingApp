from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    code_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    is_provider = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())