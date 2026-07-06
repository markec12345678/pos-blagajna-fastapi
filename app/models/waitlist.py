from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from datetime import datetime
from app.core.database import Base


class WaitlistEntry(Base):
    __tablename__ = "waitlist_entries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String)
    party_size = Column(Integer, default=2)
    status = Column(String, default="waiting")  # waiting, notified, seated, cancelled
    notes = Column(Text)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    created_at = Column(DateTime, default=datetime.now)
    notified_at = Column(DateTime)
    seated_at = Column(DateTime)
