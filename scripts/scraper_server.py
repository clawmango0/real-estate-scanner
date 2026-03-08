#!/usr/bin/env python3
"""
Local Scraper Server - Drop-in replacement for ScraperAPI
Runs as a simple HTTP server on port 3001

Endpoints:
    GET /?url=<url>     - Scrape a URL (like ScraperAPI)
    GET /health         - Health check

Usage:
    python scraper_server.py
"""

import asyncio
import json
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from patchright.async_api import async_playwright

CHROME_PATH = '/usr/bin/google-chrome'
PORT = 3001

class ScraperHandler(BaseHTTPRequestHandler):
    """HTTP Handler for scraper requests"""
    
    async def scrape_url(self, url, wait_time=3000):
        """Scrape a URL using headless Chrome"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                executable_path=CHROME_PATH,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ]
            )
            
            page = await browser.new_page()
            
            try:
                await page.goto(url, timeout=60000, wait_until='domcontentloaded')
                await page.wait_for_timeout(wait_time)
                
                content = await page.content()
                await browser.close()
                
                return {
                    'success': True,
                    'status': 200,
                    'content': content
                }
            except Exception as e:
                await browser.close()
                return {
                    'success': False,
                    'status': 500,
                    'error': str(e)
                }
    
    def do_GET(self):
        """Handle GET requests"""
        parsed = urllib.parse.urlparse(self.path)
        
        # Health check
        if parsed.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok'}).encode())
            return
        
        # Scrape endpoint
        if parsed.path == '/' or parsed.path == '/api':
            query = urllib.parse.parse_qs(parsed.query)
            url = query.get('url', [None])[0]
            
            if not url:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Missing url parameter'}).encode())
                return
            
            # Run async scrape
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(self.scrape_url(url))
            finally:
                loop.close()
            
            if result['success']:
                self.send_response(200)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                self.wfile.write(result['content'].encode())
            else:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': result['error']}).encode())
            return
        
        self.send_response(404)
        self.end_headers()
    
    def log_message(self, format, *args):
        """Log messages"""
        print(f"[Scraper] {args[0]}")

def run_server():
    """Run the HTTP server"""
    server = HTTPServer(('0.0.0.0', PORT), ScraperHandler)
    print(f"Local Scraper Server running on http://localhost:{PORT}")
    print(f"Usage: curl 'http://localhost:{PORT}/?url=https://example.com'")
    server.serve_forever()

if __name__ == '__main__':
    run_server()
