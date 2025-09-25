# Import tools
import os
from src.tools.fda_tool import FDATool  # Keep original name for compatibility
from src.tools.pubmed_tool import PubMedTool

# Set up data directory
data_dir = os.environ.get('DATA_DIR', os.path.join(os.getcwd(), 'data'))
os.makedirs(data_dir, exist_ok=True)
cache_db_path = os.path.join(data_dir, 'healthcare_cache.db')

# Initialize tools
fda_tool = FDATool(cache_db_path=cache_db_path)
pubmed_tool = PubMedTool(cache_db_path=cache_db_path)

# Define tool actions for registration
fda_device_lookup = {
    "name": "fda_device_lookup",
    "description": "Look up device information from the FDA MAUDE database",
    "parameters": [
        {
            "name": "searchType",
            "description": "Type of search: 'adverse_events', 'recalls', or 'safety_signals'",
            "required": True,
            "type": "string"
        },
        {
            "name": "dateRange",
            "description": "Number of days to look back",
            "required": False,
            "type": "integer",
            "default": 30
        },
        {
            "name": "deviceModel",
            "description": "Specific device model to search for",
            "required": False,
            "type": "string",
            "default": None
        },
        {
            "name": "eventType",
            "description": "For adverse events: 'all', 'malfunction', 'injury', 'death'",
            "required": False,
            "type": "string",
            "default": "all"
        }
    ],
    "handler": fda_tool.lookup_device
}

# Keep the old drug lookup for backward compatibility
fda_drug_lookup = {
    "name": "fda_drug_lookup",
    "description": "Look up drug information from the FDA database (deprecated)",
    "parameters": [
        {
            "name": "drug_name",
            "description": "Name of the drug to search for",
            "required": True,
            "type": "string"
        },
        {
            "name": "search_type",
            "description": "Type of information to retrieve: 'label', 'adverse_events', or 'general'",
            "required": False,
            "type": "string",
            "default": "general"
        }
    ],
    "handler": lambda drug_name, search_type="general": {
        "status": "error",
        "error_message": "Drug lookup has been replaced with device monitoring. Use fda_device_lookup instead."
    }
}

pubmed_search = {
    "name": "pubmed_search",
    "description": "Search for medical literature in PubMed database",
    "parameters": [
        {
            "name": "query",
            "description": "Search query for medical literature",
            "required": True,
            "type": "string"
        },
        {
            "name": "max_results",
            "description": "Maximum number of results to return",
            "required": False,
            "type": "integer",
            "default": 5
        },
        {
            "name": "date_range",
            "description": "Limit to articles published within years (e.g. '5' for last 5 years)",
            "required": False,
            "type": "string",
            "default": ""
        }
    ],
    "handler": pubmed_tool.search_literature
}

# List of all tools for registration
all_tools = [
    fda_device_lookup,  # New device lookup tool
    fda_drug_lookup,    # Keep for backward compatibility
    pubmed_search
]