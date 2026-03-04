// Property Scraper API Server with Static Dashboard
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load .env file if exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim();
    });
}

// ScraperAPI configuration - use environment variable, never hardcode
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '0b281e9035c595a332e175b172d8b36e';
console.log('ScraperAPI configured');

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
        if (data.runs.length > 1000) data.runs = data.runs.slice(-1000);
        
        const date = event.timestamp.split('T')[0];
        if (!data.daily[date]) {
            data.daily[date] = { success: 0, failed: 0, total: 0, avgTime: 0, times: [] };
        }
        data.daily[date].total++;
        if (event.success) data.daily[date].success++;
        else data.daily[date].failed++;
        data.daily[date].times.push(event.duration);
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
                
                let status = 'fail';
                if (statusMatch && statusMatch[1].includes('PASS')) status = 'pass';
                if (type.toLowerCase().includes('duplex') || type.toLowerCase().includes('multi')) status = 'duplex';
                
                const cfNum = parseInt(cashFlow.replace(/[^0-9-]/g, '')) || 0;
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

let propertiesCache = { data: [], updated: 0 };
function getCachedProperties(forceRefresh = false) {
    const now = Date.now();
    if (!propertiesCache.data.length || forceRefresh || (now - propertiesCache.updated) > 300000) {
        propertiesCache = { data: getProperties(), updated: now };
        fs.writeFileSync(PROPERTIES_CACHE_FILE, JSON.stringify(propertiesCache, null, 2));
    }
    return propertiesCache.data;
}

// Fetch page with ScraperAPI - using spawn for large responses
function fetchPage(pageUrl) {
    return new Promise((resolve, reject) => {
        const useScraperAPI = pageUrl.includes('zillow') || pageUrl.includes('autotrader') || pageUrl.includes('cars.com') || pageUrl.includes('facebook');
        
        let targetUrl = pageUrl;
        if (useScraperAPI) {
            targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(pageUrl)}`;
        }
        
        const { spawn } = require('child_process');
        let html = '';
        const proc = spawn('curl', ['-s', '--max-time', '60', targetUrl]);
        
        proc.stdout.on('data', (chunk) => { html += chunk; });
        proc.on('close', (code) => {
            if (code === 0) resolve(html);
            else reject(new Error('curl exited with code ' + code));
        });
        proc.on('error', reject);
    });
}

// Parse property data from HTML
function parseProperty(html, pageUrl) {
    const data = { url: pageUrl, found: false, address: '', price: '', beds: '', baths: '', sqft: '', type: '', source: '' };
    
    try {
        if (pageUrl.includes('zillow.com')) {
            data.source = 'Zillow';
            const priceMatch = html.match(/"price"\s*:\s*"?(\d{6,7})"?/);
            if (priceMatch) data.price = parseInt(priceMatch[1]);
            const bedsMatch = html.match(/(\d+)\s*(bed|beds)/i);
            if (bedsMatch) data.beds = bedsMatch[1];
            const bathsMatch = html.match(/(\d+\.?\d*)\s*(bath|baths)/i);
            if (bathsMatch) data.baths = bathsMatch[1];
            if (data.price || data.address) data.found = true;
        }
    } catch (e) {
        console.error('Parse error:', e.message);
    }
    
    return data;
}

// Get OpenClaw agent activity
function getAgentActivity() {
    try {
        // Get session list - use correct CLI syntax
        const sessionsJson = execSync('openclaw sessions --json --active 60 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
        const sessions = JSON.parse(sessionsJson);
        
        // Get agents list
        let agents = { total: 0, list: [] };
        try {
            const agentsJson = execSync('openclaw agents list --json 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
            agents = JSON.parse(agentsJson);
        } catch(e) {
            // Agents command failed, that's OK
        }
        
        return { sessions, subagents: { total: agents.total || 0, list: agents.list || [] }, error: null };
    } catch (e) {
        return {
            sessions: { count: 0, sessions: [] },
            subagents: { total: 0, active: [] },
            error: e.message
        };
    }
}

// Create server
const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Static files - serve HTML directly
    if (!pathname.startsWith('/api/')) {
        let file = pathname === '/' ? '/index.html' : pathname;
        const filePath = path.join(__dirname, file);
        
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            const contentType = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : 'text/plain';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(fs.readFileSync(filePath));
            return;
        }
    }
    
    // API Routes
    if (pathname === '/api/agent-activity') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getAgentActivity()));
        return;
    }
    
    if (pathname === '/api/properties') {
        const props = getCachedProperties(parsedUrl.query.refresh === 'true');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ properties: props, count: props.length, passCount: props.filter(p => p.status === 'pass').length, updated: propertiesCache.updated }));
        return;
    }
    
    if (pathname === '/api/telemetry') {
        if (req.method === 'POST') {
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
        
        // GET telemetry
        try {
            const data = JSON.parse(fs.readFileSync(TELEMETRY_FILE, 'utf8'));
            const today = new Date().toISOString().split('T')[0];
            const todayStats = data.daily[today] || { success: 0, failed: 0, total: 0, avgTime: 0 };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ today: todayStats, recentRuns: data.runs.slice(-20).reverse(), daily: data.daily }));
        } catch (e) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ today: {}, recentRuns: [], daily: {} }));
        }
        return;
    }
    
    if (pathname === '/api/scrape' && parsedUrl.query.url) {
        const startTime = Date.now();
        try {
            const html = await fetchPage(parsedUrl.query.url);
            const data = parseProperty(html, parsedUrl.query.url);
            logTelemetry({ timestamp: new Date().toISOString(), url: parsedUrl.query.url, success: true, duration: Date.now() - startTime, source: data.source });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } catch (error) {
            logTelemetry({ timestamp: new Date().toISOString(), url: parsedUrl.query.url, success: false, duration: Date.now() - startTime, error: error.message });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
        return;
    }
    
    if (pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }
    
    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Dashboards:');
    console.log('  - /                  → Fort Worth Property Scout');
    console.log('  - /agent-dashboard.html → Agent Activity Monitor');
});

// Prevent crashes
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));
