#!/usr/bin/env python3
"""
Intelligent Scraper - Probes methods, tracks performance, selects best approach.
"""

import json
import time
import argparse
from typing import Dict, List, Any, Optional
from datetime import datetime

from scraper_registry import (
    ScraperRegistry, 
    create_default_registry,
    requests_scraper,
    curl_scraper,
    set_rate_limit,
    get_rate_limit,
    get_random_user_agent,
    COMMON_USER_AGENTS
)


class IntelligentScraper:
    """
    Intelligent scraper that:
    1. Probes multiple scraping methods
    2. Tracks success/failure/speed
    3. Selects best method based on history
    4. Outputs results in JSON format
    """
    
    def __init__(self, catalog_path: str = None):
        self.registry = create_default_registry()
        if catalog_path:
            self.registry.catalog_path = catalog_path
            self.registry._load_catalog()
        
        # Reliability settings
        self.use_retry = True
        self.max_retries = 3
        self.rate_limit_delay = 1.0  # seconds
        set_rate_limit(self.rate_limit_delay)
    
    def set_retry_options(self, enabled: bool = True, max_retries: int = 3):
        """Configure retry behavior."""
        self.use_retry = enabled
        self.max_retries = max_retries
    
    def set_rate_limit(self, delay: float):
        """Configure rate limiting delay between requests."""
        self.rate_limit_delay = max(0, delay)
        set_rate_limit(self.rate_limit_delay)
    
    def probe_method(self, url: str, method_name: str, timeout: int = 10) -> Dict[str, Any]:
        """Test a single scraping method with a quick probe."""
        method = self.registry.get_method(method_name)
        if not method:
            return {"success": False, "error": f"Unknown method: {method_name}"}
        
        start_time = time.time()
        
        try:
            # Call the scraper function if available with reliability options
            if method.scraper_func:
                result = method.scraper_func(
                    url, 
                    timeout=timeout,
                    use_retry=self.use_retry,
                    max_retries=self.max_retries,
                    use_rate_limit=True  # Always apply rate limiting during probing
                )
            else:
                result = {"success": False, "error": "No scraper function registered"}
        except Exception as e:
            result = {"success": False, "error": str(e)}
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        # Record the result
        self.registry.record_probe_result(
            method_name=method_name,
            url=url,
            success=result.get("success", False),
            duration_ms=duration_ms
        )
        
        result["duration_ms"] = duration_ms
        result["method"] = method_name
        
        return result
    
    def probe_all_methods(self, url: str, timeout: int = 10) -> Dict[str, Any]:
        """Probe all registered methods and return results."""
        results = {
            "url": url,
            "timestamp": datetime.now().isoformat(),
            "probes": [],
            "best_method": None,
            "summary": {}
        }
        
        for method_name in self.registry.get_all_methods():
            probe_result = self.probe_method(url, method_name, timeout)
            results["probes"].append(probe_result)
            
            # Track stats
            method_stats = self.registry.catalog.get("methods", {}).get(method_name, {})
            results["summary"][method_name] = {
                "success": probe_result.get("success", False),
                "duration_ms": probe_result.get("duration_ms", 0),
                "success_rate": self._calc_success_rate(method_name),
                "avg_duration_ms": method_stats.get("avg_duration_ms", 0)
            }
        
        # Select best method based on history
        results["best_method"] = self.registry.get_best_method(url)
        
        # Save catalog after probing
        self.registry.save_catalog()
        
        return results
    
    def _calc_success_rate(self, method_name: str) -> float:
        """Calculate success rate for a method."""
        stats = self.registry.catalog.get("methods", {}).get(method_name, {})
        total = stats.get("total_attempts", 0)
        if total == 0:
            return 0.0
        return stats.get("successes", 0) / total
    
    def scrape(self, url: str, preferred_method: str = None, 
               auto_probe: bool = False, timeout: int = 10) -> Dict[str, Any]:
        """
        Main scrape function.
        
        Args:
            url: Target URL to scrape
            preferred_method: Force a specific method (optional)
            auto_probe: If True, probe all methods first (optional)
            timeout: Request timeout in seconds
        
        Returns:
            JSON dict with results
        """
        result = {
            "url": url,
            "timestamp": datetime.now().isoformat(),
            "method_used": None,
            "success": False,
            "data": {},
            "performance": {}
        }
        
        # Determine which method to use
        if preferred_method:
            method_to_use = preferred_method
        elif auto_probe:
            # Probe all and use best
            probe_results = self.probe_all_methods(url, timeout)
            method_to_use = probe_results["best_method"]
            result["probe_results"] = probe_results
        else:
            # Use historical best
            method_to_use = self.registry.get_best_method(url)
        
        result["method_used"] = method_to_use
        
        # Execute the scrape
        method = self.registry.get_method(method_to_use)
        if method and method.scraper_func:
            start_time = time.time()
            
            try:
                scrape_result = method.scraper_func(
                    url, 
                    timeout=timeout,
                    use_retry=self.use_retry,
                    max_retries=self.max_retries,
                    use_rate_limit=True
                )
                duration_ms = int((time.time() - start_time) * 1000)
                
                result["success"] = scrape_result.get("success", False)
                result["data"] = scrape_result
                result["performance"]["duration_ms"] = duration_ms
                
                # Record this attempt
                self.registry.record_probe_result(
                    method_name=method_to_use,
                    url=url,
                    success=result["success"],
                    duration_ms=duration_ms
                )
                
            except Exception as e:
                result["success"] = False
                result["data"]["error"] = str(e)
                result["performance"]["duration_ms"] = int((time.time() - start_time) * 1000)
        else:
            result["data"]["error"] = f"No scraper function for method: {method_to_use}"
        
        # Save updated catalog
        self.registry.save_catalog()
        
        return result
    
    def get_method_stats(self) -> Dict[str, Any]:
        """Get statistics for all methods."""
        return self.registry.catalog.get("methods", {})
    
    def get_catalog(self) -> Dict[str, Any]:
        """Get the full effectiveness catalog."""
        return self.registry.catalog


def main():
    """CLI interface for intelligent scraper."""
    parser = argparse.ArgumentParser(description="Intelligent Web Scraper")
    parser.add_argument("url", help="URL to scrape")
    parser.add_argument("--method", "-m", help="Specific method to use")
    parser.add_argument("--probe", "-p", action="store_true", 
                       help="Probe all methods first")
    parser.add_argument("--timeout", "-t", type=int, default=10,
                       help="Request timeout in seconds")
    parser.add_argument("--catalog", "-c", 
                       default="/home/claw/.openclaw/workspace/real-estate-scanner/data/effectiveness_catalog.json",
                       help="Path to effectiveness catalog")
    parser.add_argument("--stats", "-s", action="store_true",
                       help="Show method statistics and exit")
    # Reliability options
    parser.add_argument("--no-retry", action="store_true",
                       help="Disable retry logic")
    parser.add_argument("--max-retries", type=int, default=3,
                       help="Maximum retry attempts (default: 3)")
    parser.add_argument("--rate-limit", type=float, default=1.0,
                       help="Rate limit delay in seconds between requests (default: 1.0)")
    parser.add_argument("--show-ua", action="store_true",
                       help="Show current User-Agent being used")
    
    args = parser.parse_args()
    
    scraper = IntelligentScraper(catalog_path=args.catalog)
    
    # Configure reliability options
    scraper.set_retry_options(enabled=not args.no_retry, max_retries=args.max_retries)
    scraper.set_rate_limit(args.rate_limit)
    
    if args.stats:
        stats = scraper.get_method_stats()
        print(json.dumps(stats, indent=2))
        return
    
    if args.show_ua:
        print(f"Current User-Agent: {get_random_user_agent()}")
        print(f"Available User-Agents: {len(COMMON_USER_AGENTS)}")
        return
    
    # Run the scrape
    result = scraper.scrape(
        url=args.url,
        preferred_method=args.method,
        auto_probe=args.probe,
        timeout=args.timeout
    )
    
    # Output as JSON
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
