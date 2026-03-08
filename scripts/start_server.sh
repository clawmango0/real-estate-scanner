#!/bin/bash
# Auto-start script for property scout server

LOGFILE="/tmp/scraper_autostart.log"
PORT=3000

echo "$(date): Checking port $PORT..." >> $LOGFILE

if ! lsof -i :$PORT > /dev/null 2>&1; then
    echo "$(date): Port $PORT not in use, starting server..." >> $LOGFILE
    cd /home/claw/.openclaw/workspace/real-estate-scanner/docs
    nohup node server.js >> $LOGFILE 2>&1 &
    sleep 2
    if lsof -i :$PORT > /dev/null 2>&1; then
        echo "$(date): Server started successfully" >> $LOGFILE
    else
        echo "$(date): Failed to start server" >> $LOGFILE
    fi
else
    echo "$(date): Port $PORT already in use" >> $LOGFILE
fi
