// Alternative Property Sources Scraper
// Craigslist + Facebook Marketplace for Fort Worth area

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || process.env.SCRAPER_API_KEY || '0b281e9035c595a332e175b172d8b36e';

const TARGET_ZIPS = [
    { zip: '76133', area: 'Wedgewood', count: 8 },
    { zip: '76148', area: 'Watauga', count: 3 },
    { zip: '76104', area: 'Fort Worth SE', count: 3 },
    { zip: '76123', area: 'Crowley', count: 2 },
    { zip: '76110', area: 'Fort Worth', count: 2 },
    { zip: '76107', area: 'Fort Worth', count: 2 },
    { zip: '76103', area: 'Fort Worth', count: 2 },
    { zip: '76039', area: 'Euless', count: 2 },
];

// Craigslist URLs (Fort Worth)
const craiglistURLs = TARGET_ZIPS.map(z => 
    `https://fortworth.craigslist.org/search/rea?query=${z.zip}&min_price=100000&max_price=270000`
);

// Facebook Marketplace URLs  
const fbURLs = TARGET_ZIPS.map(z =>
    `https://www.facebook.com/marketplace/fortworth/?search_query=${z.zip}&minPrice=100000&maxPrice=270000`
);

console.log('Craigslist URLs:', craiglistURLs.length);
console.log('FB Marketplace URLs:', fbURLs.length);

// Function to fetch a URL via ScrapingAPI
async function scrapeURL(targetUrl) {
    const apiUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}`;
    
    return new Promise((resolve, reject) => {
        const req = https.get(apiUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.setTimeout(30000);
    });
}

// Parse Craigslist results
function parseCraigslist(html) {
    const results = [];
    // Look for listing items - Craigslist has changed format, so this is a best-effort
    const priceRegex = /\$([\d,]+)/g;
    const addressRegex = /([0-9]+\s+[A-Za-z]+\s+(St|Ave|Dr|Blvd|Rd|Ct|Ln|Way|Cir))/g;
    
    // Basic parsing - in practice would need to inspect actual HTML
    return results;
}

// Save results
function saveResults(source, results) {
    const file = `../deals/${source}-${new Date().toISOString().split('T')[0]}.json`;
    const fs = require('fs');
    // Would save to file
    console.log(`Would save ${results.length} ${source} results`);
}

// Main
async function main() {
    console.log('Starting alternative sources scrape...');
    
    // Test with one URL
    console.log('\nTesting Craigslist...');
    try {
        const html = await scrapeURL(craiglistURLs[0]);
        console.log('Got HTML length:', html.length);
        // Save for inspection
        require('fs').writeFileSync('craiglist-test.html', html);
        console.log('Saved to craiglist-test.html for inspection');
    } catch (e) {
        console.error('Error:', e.message);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { craiglistURLs, fbURLs, TARGET_ZIPS };
