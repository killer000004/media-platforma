# Personal CRM - Telegram Notification System

A Flask-based web interface for managing contacts and sending Telegram messages via a userbot (Pyrogram).

## Features

- **Web UI**: Add contacts (username/phone) and messages via a clean HTML interface
- **Database**: SQLite with SQLAlchemy (contacts table with status tracking)
- **Telegram Userbot**: Pyrogram-based sender with FloodWait handling
- **Safety**: Random 5-10s delays between messages, automatic retry on FloodWait
- **Real-time**: Live status updates via AJAX polling

## Setup

### 1. Get Telegram API Credentials
1. Go to https://my.telegram.org
2. Log in and create a new application
3. Note down `api_id` and `api_hash`

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your API credentials
```

### 4. Run the Application
```bash
python app.py
```

The app will be available at `http://localhost:5000`

### 5. First Run - Authentication
On first run, Pyrogram will prompt for your phone number and verification code to create the session file.

## Usage

1. Open `http://localhost:5000`
2. Add contacts with phone/username and message
3. Click "Start Sending" to begin the background process
4. Monitor status in the table (pending/sent/failed)
5. Click "Stop Sending" to pause

## Project Structure

```
├── app.py              # Flask application & routes
├── config.py           # Configuration management
├── models.py           # SQLAlchemy models
├── telegram_sender.py  # Pyrogram sender with FloodWait handling
├── templates/
│   └── index.html      # Frontend UI
├── requirements.txt    # Python dependencies
└── .env.example        # Environment template
```

## Key Components

### Database (models.py)
- `Contact` table: id, phone_or_username, message, status, created_at, sent_at, error_message
- Status enum: PENDING, SENT, FAILED

### Telegram Sender (telegram_sender.py)
- `TelegramSender` class handles all Pyrogram logic
- `FloodWait` exception handling with automatic wait + retry
- Random delays (5-10s) between messages
- Batch processing (configurable batch size)

### Flask Routes (app.py)
- `GET /` - Main dashboard
- `POST /add` - Add contact/message
- `GET /contacts` - JSON list of all contacts
- `POST /start_sending` - Start background sender
- `POST /stop_sending` - Stop background sender
- `GET /status` - Current stats

## Safety Notes

- Uses **userbot** (personal account), not bot API
- Respects Telegram limits with delays and FloodWait handling
- Run responsibly - don't spam
- Session file (`userbot_session.session`) stores auth - keep it private