#!/usr/bin/env python3
"""
Simple SMTP email sender for Property Scout daily emails
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Gmail SMTP settings (using app password)
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "clawmango0@gmail.com"
# You'll need to generate an app password in your Google Account
# Go to: https://myaccount.google.com/apppasswords
APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")

def send_email(to_email, subject, body):
    """Send an email via Gmail SMTP."""
    if not APP_PASSWORD:
        print("ERROR: GMAIL_APP_PASSWORD environment variable not set")
        print("Get an app password at: https://myaccount.google.com/apppasswords")
        return False
    
    msg = MIMEMultipart()
    msg["From"] = SENDER_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject
    
    msg.attach(MIMEText(body, "plain"))
    
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, APP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python3 send_email.py <to_email> <subject> <body_file>")
        sys.exit(1)
    
    to_email = sys.argv[1]
    subject = sys.argv[2]
    body_file = sys.argv[3]
    
    with open(body_file, "r") as f:
        body = f.read()
    
    send_email(to_email, subject, body)
