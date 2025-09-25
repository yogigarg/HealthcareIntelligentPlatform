import os
import logging
from typing import Dict, Any, Optional
from src.tools.base_tool import BaseTool

logger = logging.getLogger("healthcare-mcp")

class FDATool(BaseTool):
    """Tool for accessing FDA drug information"""
    
    def __init__(self, cache_db_path: str = "healthcare_cache.db"):
        """Initialize the FDA tool with API key and base URL"""
        super().__init__(cache_db_path=cache_db_path)
        self.api_key = os.getenv("FDA_API_KEY", "")
        #self.base_url = "https://api.fda.gov/drug"
	self.base_url = "https://api.fda.gov/device"
    
    async def lookup_drug(self, drug_name: str, search_type: str = "general") -> Dict[str, Any]:
        """
        Look up drug information from the FDA database with caching
        
        Args:
            drug_name: Name of the drug to search for
            search_type: Type of information to retrieve: 'label', 'adverse_events', or 'general'
            
        Returns:
            Dictionary containing drug information or error details
        """
        # Input validation
        if not drug_name:
            return self._format_error_response("Drug name is required")
        
        # Normalize search type
        search_type = search_type.lower()
        if search_type not in ["label", "adverse_events", "general"]:
            search_type = "general"
        
        # Create cache key
        cache_key = self._get_cache_key("fda_drug", search_type, drug_name)
        
        # Check cache first
        cached_result = self.cache.get(cache_key)
        if cached_result:
            logger.info(f"Cache hit for FDA drug lookup: {drug_name}, {search_type}")
            return cached_result
        
        # If not in cache, fetch from API
        try:
            logger.info(f"Fetching FDA drug information for {drug_name}, type: {search_type}")
            
            # Determine endpoint and query based on search type
            if search_type == "label":
                endpoint = f"{self.base_url}/label.json"
                query = f"openfda.generic_name:{drug_name} OR openfda.brand_name:{drug_name}"
            elif search_type == "adverse_events":
                endpoint = f"{self.base_url}/event.json"
                query = f"patient.drug.medicinalproduct:{drug_name}"
            else:  # general
                endpoint = f"{self.base_url}/ndc.json"
                query = f"generic_name:{drug_name} OR brand_name:{drug_name}"
            
            # Build API URL
            params = {
                "search": query,
                "limit": 3
            }
            
            # Add API key if available
            if self.api_key:
                params["api_key"] = self.api_key
            
            # Make the request
            data = await self._make_request(endpoint, params=params)
            
            # Process the response
            result = self._format_success_response(
                drug_name=drug_name,
                results=data.get("results", []),
                total_results=data.get("meta", {}).get("results", {}).get("total", 0)
            )
            logger.info(f"FDA tool return object: {result}")
            # Cache for 24 hours (86400 seconds)
            self.cache.set(cache_key, result, ttl=86400)
            
            return result
                
        except Exception as e:
            logger.error(f"Error fetching FDA drug information: {str(e)}")
            return self._format_error_response(f"Error fetching drug information: {str(e)}")
