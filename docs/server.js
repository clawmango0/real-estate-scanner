// Property Scraper API Server
// Run with: node server.js
// Endpoint: GET /api/scrape?url=...
// Uses ScraperAPI for blocked sites

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

// ScraperAPI configuration
const SCRAPER_API_KEY = '0b281e9035c595a332e175b172d8b36e';

// Data paths
const DATA_DIR = path.join(__dirname, '..', 'deals');
const TELEMETRY_FILE = path.join(__dirname, 'telemetry.json');
const PROPERTIES_CACHE_FILE = path.join(__dirname, 'properties-cache.json');

// Initialize telemetry file
function initTelemetry() {
    if (!fs.existsSync(TELEMETRY_FILE)) {
        fs.writeFileSync(TELEMETRY_FILE, JSON.stringify({ runs: [], daily: {} }, null, 2));
    }
}
initTelemetry();

// Log telemetry event
function logTelemetry(event) {
    try {
        const data = JSON.parse(fs.readFileSync(TELEMETRY_FILE, 'utf8'));
        data.runs.push(event);
        // Keep last 1000 runs
        if (data.runs.length > 1000) data.runs = data.runs.slice(-1000);
        
        const date = event.timestamp.split('T')[0];
        if (!data.daily[date]) {
            data.daily[date] = { success: 0, failed: 0, total: 0, avgTime: 0, times: [] };
        }
        data.daily[date].total++;
        if (event.success) data.daily[date].success++;
        else data.daily[date].failed++;
        data.daily[date].times.push(event.duration);
        // Keep last 100 times for avg
        if (data.daily[date].times.length > 100) data.daily[date].times = data.daily[date].times.slice(-100);
        data.daily[date].avgTime = Math.round(data.daily[date].times.reduce((a,b) => a+b, 0) / data.daily[date].times.length);
        
        fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Telemetry error:', e.message);
    }
}

// Get all properties from deals folder
function getProperties() {
    const properties = [];
    try {
        const files = fs.readdirSync(DATA_DIR);
        for (const file of files) {
            if (!file.endsWith('.md') || file === 'README.md') continue;
            const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
            
            // Parse key metrics from the markdown
            const addressMatch = content.match(/Address \| ([^\n]+)/);
            const priceMatch = content.match(/Listed Price \| \$?([\d,]+)/);
            const typeMatch = content.match(/Type \| ([^\n]+)/);
            const cfMatch = content.match(/\*\*Net Cash Flow\*\* \| \*\*([^\n]+)/);
            const cocMatch = content.match(/Cash-on-Cash Return \| >?\d+% \| ([^%]+)/);
            const statusMatch = content.match(/OVERALL \| ([^\n*]+)/);
            
            if (addressMatch) {
                const address = addressMatch[1].trim().replace(/\s*\|$/, '');
                const listed = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
                const type = typeMatch ? typeMatch[1].trim().replace(/\s*\|$/, '') : 'SFR';
                const cashFlow = cfMatch ? cfMatch[1].trim() : '$0';
                const coc = cocMatch ? cocMatch[1].trim() : '0%';
                
                // Determine status
                let status = 'fail';
                if (statusMatch && statusMatch[1].includes('PASS')) status = 'pass';
                if (type.toLowerCase().includes('duplex') || type.toLowerCase().includes('multi')) status = 'duplex';
                
                // Extract cash flow number
                const cfNum = parseInt(cashFlow.replace(/[^0-9-]/g, '')) || 0;
                
                // Extract CoC percentage
                const cocNum = parseFloat(coc.replace(/[^0-9.]/g, '')) || 0;
                
                properties.push({
                    id: file.replace('.md', ''),
                    address,
                    listed,
                    offer: Math.round(listed * 0.85),
                    type,
                    cashFlow: cfNum,
                    coc: cocNum,
                    status,
                    url: '',
                    beds: '',
                    baths: '',
                    sqft: ''
                });
            }
        }
    } catch (e) {
        console.error('Error loading properties:', e.message);
    }
    return properties;
}

// Cache properties with TTL
let propertiesCache = { data: [], updated: 0 };
function getCachedProperties(forceRefresh = false) {
    const now = Date.now();
    // Refresh every 5 minutes
    if (!propertiesCache.data.length || forceRefresh || (now - propertiesCache.updated) > 300000) {
        propertiesCache = { data: getProperties(), updated: now };
        fs.writeFileSync(PROPERTIES_CACHE_FILE, JSON.stringify(propertiesCache, null, 2));
    }
    return propertiesCache.data;
}

// Use ScraperAPI for blocked sites
function fetchPage(pageUrl) {
    return new Promise((resolve, reject) => {
        // Use ScraperAPI for difficult sites
        const useScraperAPI = pageUrl.includes('zillow') || 
                             pageUrl.includes('autotrader') ||
                             pageUrl.includes('cars.com') ||
                             pageUrl.includes('facebook');
        
        let targetUrl = pageUrl;
        if (useScraperAPI) {
            targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(pageUrl)}`;
        }
        
        const parsedUrl = new URL(targetUrl);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            timeout: 60000
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
            
            // Try JSON-LD structured data first (most reliable)
            const jsonLdMatch = html.match(/"price"\s*:\s*"?(\d{6,7})"?/);
            if (jsonLdMatch) {
                data.price = parseInt(jsonLdMatch[1]);
            }
            
            // Try price in heading/listing price format
            if (!data.price || data.price < 100000) {
                const headingPrice = html.match(/<h1[^>]*data-testid[^>]*>.*?(\d{3},\d{3})/);
                if (headingPrice) {
                    data.price = parseInt(headingPrice[1].replace(/,/g, ''));
                }
            }
            
            // Fallback - look for common listing price range
            if (!data.price || data.price < 100000) {
                const priceRange = html.match(/\$(\d{2,3},\d{3})/);
                if (priceRange) data.price = parseInt(priceRange[1].replace(/,/g, ''));
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    // API: Get all properties (analyzed deals)
    if (parsedUrl.pathname === '/api/properties') {
        const props = getCachedProperties(parsedUrl.query.refresh === 'true');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            properties: props, 
            count: props.length,
            passCount: props.filter(p => p.status === 'pass').length,
            updated: propertiesCache.updated 
        }));
        return;
    }
    
    // API: Get telemetry stats (GET only)
    if (parsedUrl.pathname === '/api/telemetry' && req.method === 'GET') {
        try {
            const data = JSON.parse(fs.readFileSync(TELEMETRY_FILE, 'utf8'));
            const today = new Date().toISOString().split('T')[0];
            const todayStats = data.daily[today] || { success: 0, failed: 0, total: 0, avgTime: 0 };
            const last7days = Object.entries(data.daily)
                .filter(([d]) => d >= new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0])
                .reduce((acc, [,v]) => ({ 
                    success: acc.success + v.success, 
                    failed: acc.failed + v.failed, 
                    total: acc.total + v.total 
                }), { success: 0, failed: 0, total: 0 });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                today: todayStats, 
                last7days,
                recentRuns: data.runs.slice(-20).reverse(),
                daily: data.daily
            }));
        } catch (e) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message, today: {}, last7days: {}, recentRuns: [] }));
        }
        return;
    }
    
    // API: Log telemetry (for scraper to call after each run)
    if (parsedUrl.pathname === '/api/telemetry' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const event = JSON.parse(body);
                event.timestamp = event.timestamp || new Date().toISOString();
                logTelemetry(event);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }
    
    // API endpoint: /api/scrape?url=...
    if (parsedUrl.pathname === '/api/scrape' && parsedUrl.query.url) {
        const startTime = Date.now();
        const targetUrl = parsedUrl.query.url;
        
        try {
            console.log('Fetching:', targetUrl);
            const html = await fetchPage(targetUrl);
            const data = parseProperty(html, targetUrl);
            const duration = Date.now() - startTime;
            
            // Log successful scrape
            logTelemetry({
                timestamp: new Date().toISOString(),
                url: targetUrl,
                success: true,
                duration,
                source: data.source
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('Error:', error.message);
            
            // Log failed scrape
            logTelemetry({
                timestamp: new Date().toISOString(),
                url: targetUrl,
                success: false,
                duration,
                error: error.message
            });
            
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
        return;
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
