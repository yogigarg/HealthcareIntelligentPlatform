import os
import aiohttp
import asyncio
import hashlib
import logging
from typing import Any, Dict, Optional, Union
from src.services.cache_service import CacheService

logger = logging.getLogger("healthcare-mcp")

class BaseTool:
    """Base class for all healthcare tools with common functionality"""
    
    # Class-level HTTP client session
    _http_client: Optional[aiohttp.ClientSession] = None
    _client_lock = asyncio.Lock()
    
    def __init__(self, cache_db_path: str = "healthcare_cache.db", default_ttl: int = 3600):
        """
        Initialize the base tool with caching
        
        Args:
            cache_db_path: Path to the cache database
            default_ttl: Default time-to-live for cache entries in seconds
        """
        self.cache = CacheService(db_path=cache_db_path, ttl=default_ttl)
        self.api_key = None
        self.base_url = None
    
    @classmethod
    async def get_http_client(cls) -> aiohttp.ClientSession:
        """Get or create the shared HTTP client session"""
        if cls._http_client is None or cls._http_client.closed:
            async with cls._client_lock:
                if cls._http_client is None or cls._http_client.closed:
                    timeout = aiohttp.ClientTimeout(total=30)
                    cls._http_client = aiohttp.ClientSession(timeout=timeout)
        return cls._http_client
    
    @classmethod
    async def close_http_client(cls):
        """Close the shared HTTP client session"""
        if cls._http_client is not None and not cls._http_client.closed:
            await cls._http_client.close()
            cls._http_client = None
    
    def _get_cache_key(self, prefix: str, *args) -> str:
        """
        Generate a cache key from the prefix and arguments
        
        Args:
            prefix: Prefix for the cache key
            *args: Arguments to include in the cache key
        
        Returns:
            A hashed cache key
        """
        # Create a string from all arguments
        key_parts = [prefix]
        for arg in args:
            if arg is not None:
                key_parts.append(str(arg))
        
        # Join and hash
        cache_key = "_".join(key_parts)
        return hashlib.md5(cache_key.encode()).hexdigest()
    
    async def _make_request(self, 
                           url: str, 
                           method: str = "GET", 
                           params: Optional[Dict[str, Any]] = None, 
                           headers: Optional[Dict[str, str]] = None, 
                           data: Optional[Any] = None,
                           json_data: Optional[Dict[str, Any]] = None,
                           timeout: int = 30) -> Dict[str, Any]:
        """
        Make an HTTP request with error handling using aiohttp
        
        Args:
            url: URL to request
            method: HTTP method (GET, POST, etc.)
            params: URL parameters
            headers: HTTP headers
            data: Request body data
            json_data: JSON data for the request body
            timeout: Request timeout in seconds
            
        Returns:
            Response data as a dictionary
        """
        try:
            # Set up headers if not provided
            if headers is None:
                headers = {}
            # Add a default User-Agent if not present
            if 'User-Agent' not in headers:
                headers['User-Agent'] = 'healthcare-mcp/1.0 (Linux)'
            
            logger.debug(f"Making {method} request to {url} with params={params}")
            
            # Get the HTTP client
            client = await self.get_http_client()
            
            async with client.request(
                method=method,
                url=url,
                params=params,
                headers=headers,
                data=data,
                json=json_data
            ) as response:
                logger.debug(f"API response status: {response.status}")
                response_text = await response.text()
                logger.debug(f"API response body: {response_text}")
                
                response.raise_for_status()
                
                # Try to parse as JSON
                try:
                    return await response.json()
                except:
                    # If not JSON, return the text wrapped in a dict
                    return {"response": response_text}
                    
        except aiohttp.ClientError as e:
            logger.error(f"Request error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            raise
    
    def _format_error_response(self, error_message: str) -> Dict[str, str]:
        """
        Format an error response
        
        Args:
            error_message: Error message
            
        Returns:
            Formatted error response
        """
        return {
            "status": "error",
            "error_message": error_message
        }
    
    def _format_success_response(self, **kwargs) -> Dict[str, Any]:
        """
        Format a success response
        
        Args:
            **kwargs: Key-value pairs to include in the response
            
        Returns:
            Formatted success response
        """
        response = {"status": "success"}
        response.update(kwargs)
        return response