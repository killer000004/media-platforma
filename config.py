import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///crm.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    API_ID = int(os.getenv("API_ID", "0"))
    API_HASH = os.getenv("API_HASH", "")
    SESSION_NAME = os.getenv("SESSION_NAME", "userbot_session")
    
    DELAY_MIN = int(os.getenv("DELAY_MIN", "5"))
    DELAY_MAX = int(os.getenv("DELAY_MAX", "10"))
    BATCH_SIZE = int(os.getenv("BATCH_SIZE", "20"))
    SEND_INTERVAL = int(os.getenv("SEND_INTERVAL", "60"))