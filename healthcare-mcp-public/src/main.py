import os
import uuid
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP, Context

# Load environment variables
load_dotenv()

# Create MCP server
mcp = FastMCP(
    name="healthcare-mcp",
    version="1.0.0",
    description="Healthcare MCP server for medical information access"
)

# Import tools and services
from src.tools.fda_tool import FDATool  # Keep original name for compatibility
from src.tools.pubmed_tool import PubMedTool
from src.tools.healthfinder_tool import HealthFinderTool
from src.tools.clinical_trials_tool import ClinicalTrialsTool
from src.tools.medical_terminology_tool import MedicalTerminologyTool
from src.services.usage_service import UsageService

# Initialize tool instances and services
fda_tool = FDATool()
pubmed_tool = PubMedTool()
healthfinder_tool = HealthFinderTool()
clinical_trials_tool = ClinicalTrialsTool()
medical_terminology_tool = MedicalTerminologyTool()
usage_service = UsageService(db_path="healthcare_usage.db")

# Generate a unique session ID for this connection
session_id = str(uuid.uuid4())

@mcp.tool()
async def fda_device_lookup(ctx: Context, searchType: str, dateRange: int = 30, deviceName: str = None, eventType: str = "all"):
    """
    Look up device information from the FDA MAUDE database
    
    Args:
        searchType: Type of search - 'adverse_events', 'recalls', or 'safety_signals'
        dateRange: Number of days to look back (default 30)
        deviceName: Name of the device to search for (optional - searches all devices if not provided)
        eventType: For adverse events: 'all', 'malfunction', 'injury', 'death'
    """
    # Record usage
    usage_service.record_usage(session_id, "fda_device_lookup")
    
    # Create device parameters dictionary
    device_params = {
        'searchType': searchType,
        'dateRange': dateRange,
        'deviceName': deviceName,  # Changed from deviceModel
        'eventType': eventType
    }
    
    # Call the updated tool with device parameters
    return await fda_tool.lookup_device(device_params)

# Keep the old drug lookup function for backward compatibility
@mcp.tool()
async def fda_drug_lookup(ctx: Context, drug_name: str, search_type: str = "general"):
    """
    Look up drug information from the FDA database (deprecated - use fda_device_lookup for new features)
    
    Args:
        drug_name: Name of the drug to search for
        search_type: Type of information to retrieve: 'label', 'adverse_events', or 'general'
    """
    # Record usage
    usage_service.record_usage(session_id, "fda_drug_lookup")
    
    # For backward compatibility, still call the old method if it exists
    # This will need to be handled in your FDATool class
    try:
        if hasattr(fda_tool, 'lookup_drug'):
            return await fda_tool.lookup_drug(drug_name, search_type)
        else:
            return {
                "status": "error",
                "error_message": "Drug lookup functionality has been replaced with device monitoring. Please use fda_device_lookup instead."
            }
    except Exception as e:
        return {
            "status": "error",
            "error_message": f"Error in drug lookup: {str(e)}"
        }

@mcp.tool()
async def pubmed_search(ctx: Context, query: str, max_results: int = 5, date_range: str = ""):
    """
    Search for medical literature in PubMed database
    
    Args:
        query: Search query for medical literature
        max_results: Maximum number of results to return
        date_range: Limit to articles published within years (e.g. '5' for last 5 years)
    """
    # Record usage
    usage_service.record_usage(session_id, "pubmed_search")
    
    # Call the tool
    return await pubmed_tool.search_literature(query, max_results, date_range)

@mcp.tool()
async def health_topics(ctx: Context, topic: str, language: str = "en"):
    """
    Get evidence-based health information on various topics
    
    Args:
        topic: Health topic to search for information
        language: Language for content (en or es)
    """
    # Record usage
    usage_service.record_usage(session_id, "health_topics")
    
    # Call the tool
    return await healthfinder_tool.get_health_topics(topic, language)

@mcp.tool()
async def clinical_trials_search(ctx: Context, condition: str, status: str = "recruiting", max_results: int = 10):
    """
    Search for clinical trials by condition, status, and other parameters
    
    Args:
        condition: Medical condition or disease to search for
        status: Trial status (recruiting, completed, active, not_recruiting, or all)
        max_results: Maximum number of results to return
    """
    # Record usage
    usage_service.record_usage(session_id, "clinical_trials_search")
    
    # Call the tool
    return await clinical_trials_tool.search_trials(condition, status, max_results)

@mcp.tool()
async def lookup_icd_code(ctx: Context, code: str = None, description: str = None, max_results: int = 10):
    """
    Look up ICD-10 codes by code or description
    
    Args:
        code: ICD-10 code to look up (optional if description is provided)
        description: Medical condition description to search for (optional if code is provided)
        max_results: Maximum number of results to return
    """
    # Record usage
    usage_service.record_usage(session_id, "lookup_icd_code")
    
    # Call the tool
    return await medical_terminology_tool.lookup_icd_code(code, description, max_results)

@mcp.tool()
async def get_usage_stats(ctx: Context):
    """
    Get usage statistics for the current session
    
    Returns:
        A summary of API usage for the current session
    """
    return usage_service.get_monthly_usage(session_id)

@mcp.tool()
async def get_all_usage_stats(ctx: Context):
    """
    Get overall usage statistics for all sessions
    
    Returns:
        A summary of API usage across all sessions
    """
    return usage_service.get_usage_stats()

if __name__ == "__main__":
    # Using FastMCP's CLI
    import sys
    sys.exit(mcp.run())