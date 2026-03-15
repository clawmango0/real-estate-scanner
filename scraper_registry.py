"""
Scraper Registry - Defines available scraping methods and their capabilities.
Includes reliability features: User-Agent rotation, retry logic, rate limiting.
"""

import json
import os
import random
import time
from typing import Dict, List, Any, Callable, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

# User-Agent rotation - list of 10+ common browsers
COMMON_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
]


def get_random_user_agent() -> str:
    """Get a random User-Agent string for rotation."""
    return random.choice(COMMON_USER_AGENTS)


def get_default_headers() -> Dict[str, str]:
    """Get default HTTP headers with rotating User-Agent."""
    return {
        "User-Agent": get_random_user_agent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
    }


# Retry configuration
DEFAULT_MAX_RETRIES = 3
DEFAULT_INITIAL_DELAY = 1.0  # seconds
DEFAULT_BACKOFF_FACTOR = 2.0  # exponential backoff multiplier


def retry_with_backoff(
    func: Callable,
    max_retries: int = DEFAULT_MAX_RETRIES,
    initial_delay: float = DEFAULT_INITIAL_DELAY,
    backoff_factor: float = DEFAULT_BACKOFF_FACTOR,
    exceptions: tuple = (Exception,),
    retry_on_status: tuple = (429, 500, 502, 503, 504)
) -> Any:
    """
    Execute a function with exponential backoff retry logic.
    
    Args:
        func: Function to execute
        max_retries: Maximum number of retry attempts (default: 3)
        initial_delay: Initial delay in seconds (default: 1.0)
        backoff_factor: Multiplier for each retry (default: 2.0)
        exceptions: Tuple of exception types to catch and retry
        retry_on_status: HTTP status codes that trigger a retry
    
    Returns:
        Result from successful function call
    
    Raises:
        Last exception if all retries exhausted
    """
    last_exception = None
    delay = initial_delay
    
    for attempt in range(max_retries + 1):
        try:
            result = func()
            
            # Check for HTTP status code in result (if it's a dict with status_code)
            if isinstance(result, dict):
                status_code = result.get("status_code")
                if status_code in retry_on_status and attempt < max_retries:
                    print(f"  Retry {attempt + 1}/{max_retries}: Got status {status_code}, waiting {delay:.1f}s")
                    time.sleep(delay)
                    delay *= backoff_factor
                    continue
                elif status_code == 200:
                    return result
            
            return result
            
        except exceptions as e:
            last_exception = e
            if attempt < max_retries:
                print(f"  Retry {attempt + 1}/{max_retries}: {type(e).__name__}, waiting {delay:.1f}s")
                time.sleep(delay)
                delay *= backoff_factor
            else:
                break
    
    # All retries exhausted
    raise last_exception


# Rate limiting
_rate_limit_delay = 1.0  # default 1 second between requests
_last_request_time = 0.0


def set_rate_limit(delay: float):
    """Set the rate limit delay between requests (in seconds)."""
    global _rate_limit_delay
    _rate_limit_delay = max(0, delay)


def get_rate_limit() -> float:
    """Get the current rate limit delay."""
    return _rate_limit_delay


def apply_rate_limit():
    """Apply rate limiting - waits if needed to maintain configured delay between requests."""
    global _last_request_time
    
    current_time = time.time()
    elapsed = current_time - _last_request_time
    
    if elapsed < _rate_limit_delay:
        wait_time = _rate_limit_delay - elapsed
        # Add small random jitter to avoid synchronized requests
        wait_time += random.uniform(0, 0.5)
        time.sleep(wait_time)
    
    _last_request_time = time.time()

@dataclass
class ScraperMethod:
    name: str
    description: str
    capabilities: List[str]
    speed_rating: str  # fast, medium, slow
    reliability_rating: str  # high, medium, low
    scraper_func: Callable = None  # Runtime function reference

class ScraperRegistry:
    """Registry of all available scraping methods."""
    
    def __init__(self, catalog_path: str = None):
        self.methods: Dict[str, ScraperMethod] = {}
        self.catalog_path = catalog_path or "/home/claw/.openclaw/workspace/real-estate-scanner/data/effectiveness_catalog.json"
        self._load_catalog()
    
    def _load_catalog(self):
        """Load effectiveness catalog if exists."""
        if os.path.exists(self.catalog_path):
            with open(self.catalog_path, 'r') as f:
                self.catalog = json.load(f)
        else:
            self.catalog = {"methods": {}, "probes": []}
    
    def save_catalog(self):
        """Save effectiveness catalog."""
        os.makedirs(os.path.dirname(self.catalog_path), exist_ok=True)
        with open(self.catalog_path, 'w') as f:
            json.dump(self.catalog, f, indent=2)
    
    def register(self, name: str, description: str, capabilities: List[str], 
                 speed_rating: str, reliability_rating: str, scraper_func: Callable = None):
        """Register a new scraping method."""
        method = ScraperMethod(
            name=name,
            description=description,
            capabilities=capabilities,
            speed_rating=speed_rating,
            reliability_rating=reliability_rating,
            scraper_func=scraper_func
        )
        self.methods[name] = method
        
        # Initialize catalog entry if not exists
        if name not in self.catalog.get("methods", {}):
            self.catalog.setdefault("methods", {})[name] = {
                "total_attempts": 0,
                "successes": 0,
                "failures": 0,
                "avg_duration_ms": 0,
                "last_used": None,
                "last_success": None,
                "last_failure": None
            }
        
        return method
    
    def get_method(self, name: str) -> ScraperMethod:
        """Get a method by name."""
        return self.methods.get(name)
    
    def get_all_methods(self) -> Dict[str, ScraperMethod]:
        """Get all registered methods."""
        return self.methods
    
    def get_methods_by_capability(self, capability: str) -> List[ScraperMethod]:
        """Find methods that support a specific capability."""
        return [m for m in self.methods.values() if capability in m.capabilities]
    
    def get_best_method(self, target_url: str = None) -> str:
        """
        Select the best method based on historical performance.
        Considers success rate, speed, and recency.
        """
        best_method = None
        best_score = -1
        
        for name, stats in self.catalog.get("methods", {}).items():
            if name not in self.methods:
                continue
                
            method = self.methods[name]
            total = stats.get("total_attempts", 0)
            
            if total == 0:
                # Prefer unused methods with good ratings
                if method.reliability_rating == "high":
                    score = 3
                elif method.reliability_rating == "medium":
                    score = 2
                else:
                    score = 1
            else:
                success_rate = stats.get("successes", 0) / total
                avg_duration = stats.get("avg_duration_ms", 0)
                
                # Score: 60% success rate, 30% speed, 10% recency
                speed_score = 1.0 if method.speed_rating == "fast" else 0.5 if method.speed_rating == "medium" else 0.2
                
                recency_bonus = 0.1 if stats.get("last_success") else 0
                
                score = (success_rate * 0.6) + (speed_score * 0.3) + recency_bonus
            
            if score > best_score:
                best_score = score
                best_method = name
        
        return best_method or "requests"
    
    def record_probe_result(self, method_name: str, url: str, success: bool, duration_ms: float):
        """Record the result of a probe/test."""
        probe_result = {
            "method": method_name,
            "url": url,
            "success": success,
            "duration_ms": duration_ms,
            "timestamp": datetime.now().isoformat()
        }
        self.catalog.setdefault("probes", []).append(probe_result)
        
        # Keep only last 100 probes
        if len(self.catalog["probes"]) > 100:
            self.catalog["probes"] = self.catalog["probes"][-100:]
        
        # Update method stats
        if method_name in self.catalog.get("methods", {}):
            stats = self.catalog["methods"][method_name]
            stats["total_attempts"] = stats.get("total_attempts", 0) + 1
            
            if success:
                stats["successes"] = stats.get("successes", 0) + 1
                stats["last_success"] = datetime.now().isoformat()
            else:
                stats["failures"] = stats.get("failures", 0) + 1
                stats["last_failure"] = datetime.now().isoformat()
            
            # Update average duration
            total = stats["total_attempts"]
            old_avg = stats.get("avg_duration_ms", 0)
            stats["avg_duration_ms"] = ((old_avg * (total - 1)) + duration_ms) / total
            stats["last_used"] = datetime.now().isoformat()


# Built-in scraper methods
def requests_scraper(url: str, **kwargs) -> Dict[str, Any]:
    """Basic requests library scraper with reliability features."""
    import requests
    
    use_retry = kwargs.get('use_retry', True)
    use_rate_limit = kwargs.get('use_rate_limit', True)
    max_retries = kwargs.get('max_retries', 3)
    
    # Apply rate limiting before request
    if use_rate_limit:
        apply_rate_limit()
    
    def _make_request():
        # Use rotating User-Agent if not explicitly provided
        headers = kwargs.get('headers', {}).copy()
        if 'User-Agent' not in headers:
            headers.update(get_default_headers())
        
        response = requests.get(
            url, 
            timeout=kwargs.get('timeout', 10),
            headers=headers,
            allow_redirects=True
        )
        return {"success": True, "status_code": response.status_code, 
                "content": response.text, "method": "requests",
                "headers": dict(response.headers)}
    
    try:
        if use_retry:
            return retry_with_backoff(_make_request, max_retries=max_retries)
        else:
            return _make_request()
    except Exception as e:
        return {"success": False, "error": str(e), "method": "requests"}

def playwright_scraper(url: str, **kwargs) -> Dict[str, Any]:
    """Playwright/headless browser scraper."""
    # Placeholder - would require playwright installed
    return {"success": False, "error": "Playwright not implemented", "method": "playwright"}

def selenium_scraper(url: str, **kwargs) -> Dict[str, Any]:
    """Selenium WebDriver scraper."""
    # Placeholder - would require selenium installed
    return {"success": False, "error": "Selenium not implemented", "method": "selenium"}

def httpx_scraper(url: str, **kwargs) -> Dict[str, Any]:
    """HTTPX sync/scync scraper - fast with HTTP/2 support with reliability features."""
    import httpx
    
    use_retry = kwargs.get('use_retry', True)
    use_rate_limit = kwargs.get('use_rate_limit', True)
    max_retries = kwargs.get('max_retries', 3)
    
    # Apply rate limiting
    if use_rate_limit:
        apply_rate_limit()
    
    def _make_request():
        timeout = kwargs.get('timeout', 10)
        headers = kwargs.get('headers', {}).copy()
        if 'User-Agent' not in headers:
            headers.update(get_default_headers())
        
        client = httpx.Client(timeout=timeout, follow_redirects=True)
        response = client.get(url, headers=headers)
        client.close()
        return {"success": True, "status_code": response.status_code, 
                "content": response.text, "method": "httpx",
                "headers": dict(response.headers)}
    
    try:
        if use_retry:
            return retry_with_backoff(_make_request, max_retries=max_retries)
        else:
            return _make_request()
    except Exception as e:
        return {"success": False, "error": str(e), "method": "httpx"}


def aiohttp_scraper(url: str, **kwargs) -> Dict[str, Any]:
    """Aiohttp async scraper - high performance for concurrent requests."""
    import asyncio
    import aiohttp
    try:
        timeout = aiohttp.ClientTimeout(total=kwargs.get('timeout', 10))
        # Run async in sync context
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        async def fetch():
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url, allow_redirects=True) as response:
                    content = await response.text()
                    return {"success": True, "status_code": response.status,
                            "content": content[:1000], "method": "aiohttp"}
        
        result = loop.run_until_complete(fetch())
        return result
    except Exception as e:
        return {"success": False, "error": str(e), "method": "aiohttp"}


def requests_html_scraper(url: str, **kwargs) -> Dict[str, Any]:
    """Requests-HTML scraper - parses JavaScript and renders HTML."""
    from requests_html import HTMLSession
    try:
        timeout = kwargs.get('timeout', 15)
        session = HTMLSession()
        response = session.get(url, timeout=timeout)
        # Render JavaScript if needed
        if kwargs.get('render_js', False):
            response.html.render(timeout=timeout)
        session.close()
        return {"success": True, "status_code": response.status_code, 
                "content": response.html.html[:1000], "method": "requests_html",
                "links": [str(l) for l in response.html.absolute_links][:10]}
    except Exception as e:
        return {"success": False, "error": str(e), "method": "requests_html"}


def wget_scraper(url: str, **kwargs) -> Dict[str, Any]:
    """Wget-based scraper using subprocess."""
    import subprocess
    import tempfile
    import os
    try:
        timeout = kwargs.get('timeout', 10)
        with tempfile.NamedTemporaryFile(mode='w+b', suffix='.html', delete=False) as f:
            temp_path = f.name
        
        result = subprocess.run(
            ['wget', '-q', '-O', temp_path, '-T', str(timeout), url],
            capture_output=True, timeout=timeout
        )
        
        if result.returncode == 0 and os.path.exists(temp_path):
            with open(temp_path, 'rb') as f:
                content = f.read().decode('utf-8', errors='ignore')[:1000]
            os.unlink(temp_path)
            return {"success": True, "content": content, "method": "wget"}
        else:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            return {"success": False, "error": "wget failed", "method": "wget"}
    except subprocess.TimeoutExpired:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.unlink(temp_path)
        return {"success": False, "error": "Timeout", "method": "wget"}
    except Exception as e:
        return {"success": False, "error": str(e), "method": "wget"}


def curl_scraper(url: str, **kwargs) -> Dict[str, Any]:
    """Curl-based scraper using subprocess with rotating User-Agent."""
    import subprocess
    
    use_rate_limit = kwargs.get('use_rate_limit', True)
    
    # Apply rate limiting
    if use_rate_limit:
        apply_rate_limit()
    
    try:
        timeout = kwargs.get('timeout', 10)
        # Get rotating User-Agent
        user_agent = get_random_user_agent()
        result = subprocess.run(
            ['curl', '-s', '-L', '--max-time', str(timeout), 
             '-A', user_agent,
             url], 
            capture_output=True, timeout=timeout + 2)
        
        if result.returncode == 0:
            content = result.stdout.decode('utf-8', errors='ignore')
            return {"success": True, 
                    "content": content,
                    "status_code": 200,
                    "method": "curl",
                    "user_agent": user_agent}
        else:
            return {"success": False, "error": "curl failed", "method": "curl"}
    except Exception as e:
        return {"success": False, "error": str(e), "method": "curl"}


# Default registry initialization
def create_default_registry() -> ScraperRegistry:
    """Create registry with default scraping methods."""
    registry = ScraperRegistry()
    
    # Register built-in methods
    registry.register(
        name="requests",
        description="Basic HTTP requests using Python requests library",
        capabilities=["html", "json", "api", "simple"],
        speed_rating="fast",
        reliability_rating="high",
        scraper_func=requests_scraper
    )
    
    registry.register(
        name="playwright",
        description="Headless browser automation for JavaScript-heavy sites",
        capabilities=["javascript", "dynamic", "spa", "html", "screenshots"],
        speed_rating="slow",
        reliability_rating="high",
        scraper_func=playwright_scraper
    )
    
    registry.register(
        name="selenium",
        description="Selenium WebDriver for browser automation",
        capabilities=["javascript", "dynamic", "spa", "html"],
        speed_rating="slow",
        reliability_rating="medium",
        scraper_func=selenium_scraper
    )
    
    registry.register(
        name="httpx",
        description="Async HTTP client with support for HTTP/2",
        capabilities=["html", "json", "api", "async"],
        speed_rating="fast",
        reliability_rating="high",
        scraper_func=httpx_scraper
    )
    
    registry.register(
        name="aiohttp",
        description="Async HTTP client for high-performance scraping",
        capabilities=["html", "json", "api", "async", "high_concurrency"],
        speed_rating="fast",
        reliability_rating="high",
        scraper_func=aiohttp_scraper
    )
    
    registry.register(
        name="requests_html",
        description="Requests-HTML with JavaScript rendering support",
        capabilities=["html", "javascript", "dynamic", "links"],
        speed_rating="medium",
        reliability_rating="high",
        scraper_func=requests_html_scraper
    )
    
    registry.register(
        name="wget",
        description="GNU wget for robust command-line fetching",
        capabilities=["html", "simple", "resume", "redirects"],
        speed_rating="fast",
        reliability_rating="medium",
        scraper_func=wget_scraper
    )
    
    registry.register(
        name="curl",
        description="Command-line curl for simple fetching",
        capabilities=["html", "simple", "redirects"],
        speed_rating="fast",
        reliability_rating="medium",
        scraper_func=curl_scraper
    )
    
    return registry


if __name__ == "__main__":
    # Test the registry
    registry = create_default_registry()
    print("Registered methods:")
    for name, method in registry.get_all_methods().items():
        print(f"  - {name}: {method.description}")
        print(f"    Capabilities: {method.capabilities}")
        print(f"    Speed: {method.speed_rating}, Reliability: {method.reliability_rating}")
    
    print(f"\nBest method: {registry.get_best_method()}")
