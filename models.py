from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import enum

db = SQLAlchemy()

class MessageStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"

class Contact(db.Model):
    __tablename__ = "contacts"
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    phone_or_username = db.Column(db.String(100), nullable=False, index=True)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.Enum(MessageStatus), default=MessageStatus.PENDING, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    sent_at = db.Column(db.DateTime, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "phone_or_username": self.phone_or_username,
            "message": self.message,
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "error_message": self.error_message
        }