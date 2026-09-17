import sys
from database import init_db, add_message

def main():
    init_db()
    
    if len(sys.argv) < 3:
        print("Usage: python add_messages.py <recipient> <message>")
        print("Example: python add_messages.py @username 'Hello!'")
        return
    
    recipient = sys.argv[1]
    content = " ".join(sys.argv[2:])
    
    if add_message(recipient, content):
        print(f"Added message for {recipient}")
    else:
        print("Failed to add message")

if __name__ == "__main__":
    main()