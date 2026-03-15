"""
Scraper Registry - Defines available scraping methods and their capabilities.
"""

import json
import os
from typing import Dict, List, Any, Callable
from dataclasses import dataclass, asdict
from datetime import datetime

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
    """Basic requests library scraper."""
    import requests
    try:
        response = requests.get(url, timeout=kwargs.get('timeout', 10), 
                               headers=kwargs.get('headers', {}))
        return {"success": True, "status_code": response.status_code, 
                "content": response.text[:1000], "method": "requests"}
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
    """HTTPX async scraper."""
    # Placeholder
    return {"success": False, "error": "HTTPX not implemented", "method": "httpx"}

def aiohttp_scraper(url: str, **kwargs) -> Dict[str, Any]:
    """Aiohttp async scraper."""
    # Placeholder
    return {"success": False, "error": "Aiohttp not implemented", "method": "aiohttp"}

def curl_scraper(url: str, **kwargs) -> Dict[str, Any]:
    """Curl-based scraper using subprocess."""
    import subprocess
    try:
        result = subprocess.run(['curl', '-s', '-L', url], 
                               capture_output=True, timeout=kwargs.get('timeout', 10))
        return {"success": result.returncode == 0, "content": result.stdout.decode('utf-8', errors='ignore')[:1000],
                "method": "curl"}
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
