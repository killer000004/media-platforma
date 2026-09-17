from flask import Flask, render_template, request, jsonify, redirect, url_for
from config import Config
from models import db, Contact, MessageStatus
import threading
import asyncio

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

sender_thread = None
sender_loop = None
is_sending = False

with app.app_context():
    db.create_all()

@app.route("/")
def index():
    contacts = Contact.query.order_by(Contact.created_at.desc()).all()
    return render_template("index.html", contacts=contacts)

@app.route("/add", methods=["POST"])
def add_contact():
    phone_or_username = request.form.get("phone_or_username", "").strip()
    message = request.form.get("message", "").strip()
    
    if not phone_or_username or not message:
        return jsonify({"error": "Both fields are required"}), 400
    
    contact = Contact(phone_or_username=phone_or_username, message=message)
    db.session.add(contact)
    db.session.commit()
    
    return jsonify({"success": True, "contact": contact.to_dict()})

@app.route("/contacts")
def get_contacts():
    contacts = Contact.query.order_by(Contact.created_at.desc()).all()
    return jsonify([c.to_dict() for c in contacts])

@app.route("/start_sending", methods=["POST"])
def start_sending():
    global sender_thread, sender_loop, is_sending
    
    if is_sending:
        return jsonify({"error": "Already sending"}), 400
    
    is_sending = True
    
    def run_sender():
        global sender_loop, is_sending
        sender_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(sender_loop)
        try:
            sender_loop.run_until_complete(run_sender_loop(app))
        finally:
            is_sending = False
            sender_loop.close()
    
    sender_thread = threading.Thread(target=run_sender, daemon=True)
    sender_thread.start()
    
    return jsonify({"success": True, "message": "Sending started"})

@app.route("/stop_sending", methods=["POST"])
def stop_sending():
    global is_sending, sender_loop
    is_sending = False
    if sender_loop:
        sender_loop.call_soon_threadsafe(sender_loop.stop)
    return jsonify({"success": True, "message": "Sending stopped"})

@app.route("/status")
def get_status():
    pending = Contact.query.filter_by(status=MessageStatus.PENDING).count()
    sent = Contact.query.filter_by(status=MessageStatus.SENT).count()
    failed = Contact.query.filter_by(status=MessageStatus.FAILED).count()
    return jsonify({"pending": pending, "sent": sent, "failed": failed, "is_sending": is_sending})

async def run_sender_loop(flask_app):
    from telegram_sender import TelegramSender
    sender = TelegramSender(
        api_id=Config.API_ID,
        api_hash=Config.API_HASH,
        session_name=Config.SESSION_NAME,
        delay_min=Config.DELAY_MIN,
        delay_max=Config.DELAY_MAX,
        batch_size=Config.BATCH_SIZE
    )
    
    await sender.start()
    
    global is_sending
    while is_sending:
        with flask_app.app_context():
            await sender.process_pending()
        await asyncio.sleep(Config.SEND_INTERVAL)
    
    await sender.stop()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)