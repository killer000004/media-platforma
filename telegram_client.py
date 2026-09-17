import asyncio
import random
from pyrogram import Client
from pyrogram.errors import FloodWait, PeerIdInvalid, UserIsBlocked, ChatWriteForbidden
from config import API_ID, API_HASH, SESSION_NAME, DELAY_MIN, DELAY_MAX
from database import get_pending_messages, update_status, MessageStatus

class UserBot:
    def __init__(self):
        self.app = Client(SESSION_NAME, api_id=API_ID, api_hash=API_HASH)
    
    async def start(self):
        await self.app.start()
        print("Userbot started")
    
    async def stop(self):
        await self.app.stop()
        print("Userbot stopped")
    
    async def send_message_safe(self, recipient: str, content: str) -> bool:
        try:
            await self.app.send_message(recipient, content)
            return True
        except FloodWait as e:
            print(f"FloodWait: sleeping for {e.value} seconds")
            await asyncio.sleep(e.value + 5)
            return await self.send_message_safe(recipient, content)
        except (PeerIdInvalid, UserIsBlocked, ChatWriteForbidden) as e:
            print(f"Cannot send to {recipient}: {e}")
            return False
        except Exception as e:
            print(f"Unexpected error sending to {recipient}: {e}")
            return False
    
    async def process_pending(self, batch_size: int = 20):
        messages = get_pending_messages(batch_size)
        if not messages:
            print("No pending messages")
            return
        
        for msg in messages:
            print(f"Sending to {msg.recipient}...")
            success = await self.send_message_safe(msg.recipient, msg.content)
            
            if success:
                update_status(msg.id, MessageStatus.SENT)
                print(f"Sent to {msg.recipient}")
            else:
                update_status(msg.id, MessageStatus.FAILED)
                print(f"Failed to send to {msg.recipient}")
            
            delay = random.uniform(DELAY_MIN, DELAY_MAX)
            print(f"Waiting {delay:.1f}s...")
            await asyncio.sleep(delay)
    
    async def run_loop(self, interval: int = 60):
        await self.start()
        try:
            while True:
                await self.process_pending()
                await asyncio.sleep(interval)
        finally:
            await self.stop()

async def main():
    bot = UserBot()
    await bot.run_loop()

if __name__ == "__main__":
    asyncio.run(main())