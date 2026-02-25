// Property Scraper API Server
// Run with: node server.js
// Endpoint: GET /api/scrape?url=...

const http = require('http');
const https = require('https');
const url = require('url');

// Simple HTTP GET request
function fetchPage(pageUrl) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(pageUrl);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            timeout: 30000
        };
        
        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));
        req.end();
    });
}

// Parse property data from HTML
function parseProperty(html, pageUrl) {
    const data = {
        url: pageUrl,
        found: false,
        address: '',
        price: '',
        beds: '',
        baths: '',
        sqft: '',
        type: '',
        source: ''
    };
    
    try {
        // Detect source
        if (pageUrl.includes('fortworthfocused.com')) {
            data.source = 'Fort Worth Focused';
            
            // Extract price - look for $xxx,xxx pattern
            const priceMatch = html.match(/\$\s*([\d,]+)/);
            if (priceMatch) {
                data.price = parseInt(priceMatch[1].replace(/,/g, ''));
            }
            
            // Extract beds
            const bedsMatch = html.match(/(\d+)\s*(bed|beds|Bed|Beds|bedroom)/i);
            if (bedsMatch) data.beds = bedsMatch[1];
            
            // Extract baths
            const bathsMatch = html.match(/(\d+\.?\d*)\s*(bath|baths|Bath|Baths)/i);
            if (bathsMatch) data.baths = bathsMatch[1];
            
            // Extract sqft
            const sqftMatch = html.match(/([\d,]+)\s*(sqft|sq\.ft|square feet)/i);
            if (sqftMatch) data.sqft = sqftMatch[1].replace(/,/g, '');
            
            // Extract address - look in common locations
            const addrMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            if (addrMatch) {
                data.address = addrMatch[1].trim();
            }
            
            // Try meta description
            if (!data.address) {
                const metaAddr = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
                if (metaAddr) data.address = metaAddr[1];
            }
            
            if (data.price || data.address) data.found = true;
        }
        else if (pageUrl.includes('zillow.com')) {
            data.source = 'Zillow';
            
            // Zillow is harder - try various patterns
            const priceMatch = html.match(/(\d{3},\d{3})/);
            if (priceMatch) {
                data.price = parseInt(priceMatch[1].replace(/,/g, ''));
            }
            
            const bedsMatch = html.match(/(\d+)\s*(bed|beds|Bed|Beds)/i);
            if (bedsMatch) data.beds = bedsMatch[1];
            
            const bathsMatch = html.match(/(\d+\.?\d*)\s*(bath|baths|Bath|Baths)/i);
            if (bathsMatch) data.baths = bathsMatch[1];
            
            const sqftMatch = html.match(/([\d,]+)\s*(sqft|sq\.ft)/i);
            if (sqftMatch) data.sqft = sqftMatch[1].replace(/,/g, '');
            
            // Address from URL
            const urlMatch = pageUrl.match(/\/homedetails\/([^\/]+)/);
            if (urlMatch) {
                data.address = urlMatch[1].replace(/-/g, ' ').replace(/TX\s*\d{5}/i, '').trim();
            }
            
            if (data.price || data.address) data.found = true;
        }
        else if (pageUrl.includes('yourhomesearchdfw.com')) {
            data.source = 'Your Home Search DFW';
            
            const priceMatch = html.match(/\$\s*([\d,]+)/);
            if (priceMatch) data.price = parseInt(priceMatch[1].replace(/,/g, ''));
            
            const bedsMatch = html.match(/(\d+)\s*(bed|beds|Bed|Beds)/i);
            if (bedsMatch) data.beds = bedsMatch[1];
            
            const bathsMatch = html.match(/(\d+\.?\d*)\s*(bath|baths)/i);
            if (bathsMatch) data.baths = bathsMatch[1];
            
            if (data.price || data.address) data.found = true;
        }
        else {
            // Generic parsing
            const priceMatch = html.match(/\$\s*([\d,]{3,7})/);
            if (priceMatch) data.price = parseInt(priceMatch[1].replace(/,/g, ''));
            
            const bedsMatch = html.match(/(\d+)\s*(bed|beds)/i);
            if (bedsMatch) data.beds = bedsMatch[1];
            
            const bathsMatch = html.match(/(\d+\.?\d*)\s*(bath|baths)/i);
            if (bathsMatch) data.baths = bathsMatch[1];
            
            if (data.price) data.found = true;
        }
    } catch (e) {
        console.error('Parse error:', e.message);
    }
    
    return data;
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    // API endpoint: /api/scrape?url=...
    if (parsedUrl.pathname === '/api/scrape' && parsedUrl.query.url) {
        const targetUrl = parsedUrl.query.url;
        
        try {
            console.log('Fetching:', targetUrl);
            const html = await fetchPage(targetUrl);
            const data = parseProperty(html, targetUrl);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } catch (error) {
            console.error('Error:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    }
    // Health check
    else if (parsedUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
    }
    else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found. Use /api/scrape?url=...' }));
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Property API server running on port ${PORT}`);
    console.log(`Usage: http://localhost:${PORT}/api/scrape?url=https://renn.fortworthfocused.com/...`);
});
