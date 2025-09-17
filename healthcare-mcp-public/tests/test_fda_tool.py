import pytest
import os
import tempfile
from unittest.mock import patch, MagicMock
from src.tools.fda_tool import FDATool

class TestFDATool:
    """Test suite for FDATool class"""
    
    @pytest.fixture
    def fda_tool(self):
        """Create an FDATool instance with a temporary cache database"""
        # Set up environment variable for testing
        os.environ["FDA_API_KEY"] = "test_api_key"
        
        # Create a tool with mocked cache
        tool = FDATool()
        
        # Mock the cache get and set methods
        tool.cache.get = MagicMock(return_value=None)
        tool.cache.set = MagicMock(return_value=True)
        
        yield tool
        
        # Clean up
        if "FDA_API_KEY" in os.environ:
            del os.environ["FDA_API_KEY"]
    
    def test_init(self, fda_tool):
        """Test FDATool initialization"""
        assert fda_tool.api_key == "test_api_key"
        assert fda_tool.base_url == "https://api.fda.gov/drug"
        assert fda_tool.cache is not None
    
    @patch('src.tools.base_tool.BaseTool._make_request')
    async def test_lookup_drug_general(self, mock_request, fda_tool):
        """Test looking up general drug information"""
        # Mock response for general drug info
        mock_response = {
            "meta": {
                "results": {
                    "total": 1
                }
            },
            "results": [
                {
                    "generic_name": "ASPIRIN",
                    "brand_name": "BAYER",
                    "product_type": "HUMAN PRESCRIPTION DRUG"
                }
            ]
        }
        mock_request.return_value = mock_response
        
        # Test lookup
        result = await fda_tool.lookup_drug("aspirin", "general")
        
        # Verify result
        assert result["status"] == "success"
        assert result["drug_name"] == "aspirin"
        assert result["total_results"] == 1
        assert len(result["results"]) == 1
        assert result["results"][0]["generic_name"] == "ASPIRIN"
        
        # Verify API call
        mock_request.assert_called_once()
        args, kwargs = mock_request.call_args
        assert args[0] == "https://api.fda.gov/drug/ndc.json"
        assert kwargs["params"]["search"] == "generic_name:aspirin+OR+brand_name:aspirin"
        assert kwargs["params"]["limit"] == 3
        assert kwargs["params"]["api_key"] == "test_api_key"
    
    @patch('src.tools.base_tool.BaseTool._make_request')
    async def test_lookup_drug_label(self, mock_request, fda_tool):
        """Test looking up drug label information"""
        # Mock response for label info
        mock_response = {
            "meta": {
                "results": {
                    "total": 1
                }
            },
            "results": [
                {
                    "openfda": {
                        "generic_name": ["ASPIRIN"],
                        "brand_name": ["BAYER"]
                    },
                    "indications_and_usage": ["Pain relief"],
                    "warnings": ["May cause stomach bleeding"]
                }
            ]
        }
        mock_request.return_value = mock_response
        
        # Test lookup
        result = await fda_tool.lookup_drug("aspirin", "label")
        
        # Verify result
        assert result["status"] == "success"
        assert result["drug_name"] == "aspirin"
        assert result["total_results"] == 1
        assert len(result["results"]) == 1
        assert result["results"][0]["openfda"]["generic_name"][0] == "ASPIRIN"
        
        # Verify API call
        mock_request.assert_called_once()
        args, kwargs = mock_request.call_args
        assert args[0] == "https://api.fda.gov/drug/label.json"
        assert kwargs["params"]["search"] == "openfda.generic_name:aspirin+OR+openfda.brand_name:aspirin"
    
    @patch('src.tools.base_tool.BaseTool._make_request')
    async def test_lookup_drug_adverse_events(self, mock_request, fda_tool):
        """Test looking up drug adverse events"""
        # Mock response for adverse events
        mock_response = {
            "meta": {
                "results": {
                    "total": 1
                }
            },
            "results": [
                {
                    "patient": {
                        "drug": [
                            {
                                "medicinalproduct": "ASPIRIN",
                                "drugindication": "HEADACHE"
                            }
                        ],
                        "reaction": [
                            {
                                "reactionmeddrapt": "NAUSEA"
                            }
                        ]
                    }
                }
            ]
        }
        mock_request.return_value = mock_response
        
        # Test lookup
        result = await fda_tool.lookup_drug("aspirin", "adverse_events")
        
        # Verify result
        assert result["status"] == "success"
        assert result["drug_name"] == "aspirin"
        assert result["total_results"] == 1
        assert len(result["results"]) == 1
        assert result["results"][0]["patient"]["drug"][0]["medicinalproduct"] == "ASPIRIN"
        
        # Verify API call
        mock_request.assert_called_once()
        args, kwargs = mock_request.call_args
        assert args[0] == "https://api.fda.gov/drug/event.json"
        assert kwargs["params"]["search"] == "patient.drug.medicinalproduct:aspirin"
    
    @patch('src.tools.base_tool.BaseTool._make_request')
    async def test_lookup_drug_invalid_type(self, mock_request, fda_tool):
        """Test looking up drug with invalid search type"""
        # Mock response
        mock_response = {
            "meta": {
                "results": {
                    "total": 1
                }
            },
            "results": [{"generic_name": "ASPIRIN"}]
        }
        mock_request.return_value = mock_response
        
        # Test lookup with invalid type (should default to general)
        result = await fda_tool.lookup_drug("aspirin", "invalid_type")
        
        # Verify result
        assert result["status"] == "success"
        
        # Verify API call used general endpoint
        mock_request.assert_called_once()
        args, kwargs = mock_request.call_args
        assert args[0] == "https://api.fda.gov/drug/ndc.json"
    
    async def test_lookup_drug_empty_name(self, fda_tool):
        """Test looking up drug with empty name"""
        result = await fda_tool.lookup_drug("")
        
        # Verify error response
        assert result["status"] == "error"
        assert "Drug name is required" in result["error_message"]
    
    @patch('src.tools.base_tool.BaseTool._make_request')
    async def test_lookup_drug_api_error(self, mock_request, fda_tool):
        """Test handling API errors"""
        # Mock API error
        mock_request.side_effect = Exception("API connection error")
        
        # Test lookup
        result = await fda_tool.lookup_drug("aspirin")
        
        # Verify error response
        assert result["status"] == "error"
        assert "Error fetching drug information" in result["error_message"]
    
    @patch('src.tools.base_tool.BaseTool._make_request')
    async def test_lookup_drug_caching(self, mock_request, fda_tool):
        """Test caching functionality"""
        # Mock response
        mock_response = {
            "meta": {
                "results": {
                    "total": 1
                }
            },
            "results": [{"generic_name": "ASPIRIN"}]
        }
        mock_request.return_value = mock_response
        
        # Setup cache behavior
        cache_data = {}
        
        def mock_cache_get(key):
            return cache_data.get(key)
            
        def mock_cache_set(key, value, ttl=None):
            cache_data[key] = value
            return True
            
        fda_tool.cache.get.side_effect = mock_cache_get
        fda_tool.cache.set.side_effect = mock_cache_set
        
        # First call should hit the API
        result1 = await fda_tool.lookup_drug("aspirin")
        assert result1["status"] == "success"
        assert mock_request.call_count == 1
        
        # Second call should use cache
        result2 = await fda_tool.lookup_drug("aspirin")
        assert result2["status"] == "success"
        assert mock_request.call_count == 1  # Still 1, not 2
        
        # Different drug should hit API again
        result3 = await fda_tool.lookup_drug("ibuprofen")
        assert result3["status"] == "success"
        assert mock_request.call_count == 2