from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True)
    name = Column(String)
    is_provider = Column(Boolean, default=False)
    address = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    services_offered = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())