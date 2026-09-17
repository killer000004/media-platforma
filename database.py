from sqlalchemy import create_engine, Column, Integer, String, Enum
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from config import DATABASE_URL
import enum

Base = declarative_base()

class MessageStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    recipient = Column(String, nullable=False)
    content = Column(String, nullable=False)
    status = Column(Enum(MessageStatus), default=MessageStatus.PENDING, nullable=False)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)

def init_db():
    Base.metadata.create_all(engine)

def add_message(recipient: str, content: str) -> bool:
    session = SessionLocal()
    try:
        msg = Message(recipient=recipient, content=content)
        session.add(msg)
        session.commit()
        return True
    except SQLAlchemyError:
        session.rollback()
        return False
    finally:
        session.close()

def get_pending_messages(limit: int = 100):
    session = SessionLocal()
    try:
        return session.query(Message).filter(
            Message.status == MessageStatus.PENDING
        ).limit(limit).all()
    finally:
        session.close()

def update_status(message_id: int, status: MessageStatus) -> bool:
    session = SessionLocal()
    try:
        msg = session.query(Message).filter(Message.id == message_id).first()
        if msg:
            msg.status = status
            session.commit()
            return True
        return False
    except SQLAlchemyError:
        session.rollback()
        return False
    finally:
        session.close()