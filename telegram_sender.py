import asyncio
import random
from datetime import datetime
from pyrogram import Client
from pyrogram.errors import FloodWait, PeerIdInvalid, UserIsBlocked, ChatWriteForbidden, UserDeactivated, UserDeactivatedBan
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Contact, MessageStatus
from config import Config


class TelegramSender:
    def __init__(self, api_id: int, api_hash: str, session_name: str, 
                 delay_min: int = 5, delay_max: int = 10, batch_size: int = 20):
        self.api_id = api_id
        self.api_hash = api_hash
        self.session_name = session_name
        self.delay_min = delay_min
        self.delay_max = delay_max
        self.batch_size = batch_size
        
        self.app = Client(session_name, api_id=api_id, api_hash=api_hash)
        
        engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
        self.SessionLocal = sessionmaker(bind=engine)
    
    async def start(self):
        await self.app.start()
        me = await self.app.get_me()
        print(f"Telegram client started as: {me.first_name} (@{me.username})")
    
    async def stop(self):
        await self.app.stop()
        print("Telegram client stopped")
    
    def get_pending_contacts(self):
        session = self.SessionLocal()
        try:
            return session.query(Contact).filter(
                Contact.status == MessageStatus.PENDING
            ).limit(self.batch_size).all()
        finally:
            session.close()
    
    def update_contact_status(self, contact_id: int, status: MessageStatus, error: str = None):
        session = self.SessionLocal()
        try:
            contact = session.query(Contact).filter(Contact.id == contact_id).first()
            if contact:
                contact.status = status
                if status == MessageStatus.SENT:
                    contact.sent_at = datetime.utcnow()
                if error:
                    contact.error_message = error
                session.commit()
                return True
            return False
        except Exception as e:
            session.rollback()
            print(f"DB error updating status: {e}")
            return False
        finally:
            session.close()
    
    async def send_message_safe(self, recipient: str, content: str) -> tuple[bool, str | None]:
        try:
            await self.app.send_message(recipient, content)
            return True, None
        except FloodWait as e:
            wait_time = e.value + 5
            print(f"FloodWait: sleeping for {wait_time} seconds")
            await asyncio.sleep(wait_time)
            return await self.send_message_safe(recipient, content)
        except (PeerIdInvalid, UserIsBlocked, ChatWriteForbidden, UserDeactivated, UserDeactivatedBan) as e:
            return False, str(e)
        except Exception as e:
            return False, f"Unexpected error: {type(e).__name__}: {e}"
    
    async def process_pending(self):
        contacts = self.get_pending_contacts()
        if not contacts:
            print("No pending contacts to process")
            return
        
        print(f"Processing {len(contacts)} pending contacts...")
        
        for contact in contacts:
            print(f"Sending to {contact.phone_or_username} (ID: {contact.id})...")
            
            success, error = await self.send_message_safe(contact.phone_or_username, contact.message)
            
            if success:
                self.update_contact_status(contact.id, MessageStatus.SENT)
                print(f"✓ Sent to {contact.phone_or_username}")
            else:
                self.update_contact_status(contact.id, MessageStatus.FAILED, error)
                print(f"✗ Failed to send to {contact.phone_or_username}: {error}")
            
            delay = random.uniform(self.delay_min, self.delay_max)
            print(f"Waiting {delay:.1f}s before next message...")
            await asyncio.sleep(delay)