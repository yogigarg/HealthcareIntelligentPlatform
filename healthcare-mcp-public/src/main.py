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
from src.tools.surgical_trial_tool import SurgicalTrialTool  # NEW TOOL
from src.services.usage_service import UsageService

# Initialize tool instances and services
fda_tool = FDATool()
pubmed_tool = PubMedTool()
healthfinder_tool = HealthFinderTool()
clinical_trials_tool = ClinicalTrialsTool()
medical_terminology_tool = MedicalTerminologyTool()
surgical_trial_tool = SurgicalTrialTool()  # NEW TOOL INSTANCE
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
        'deviceName': deviceName,
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

# NEW SURGICAL TRIAL MONITORING TOOLS
@mcp.tool()
async def monitor_surgical_trials(ctx: Context, 
                                device_category: str = None,
                                competitor_companies: list = None,
                                regions: list = None,
                                time_period_days: int = 30,
                                trial_phases: list = None):
    """
    Monitor surgical trials across global registries for competitive intelligence
    
    Args:
        device_category: Category of medical device (e.g., 'cardiovascular', 'orthopedic', 'surgical_robotics')
        competitor_companies: List of competitor company names to track
        regions: List of regions to focus on (e.g., ['United States', 'European Union'])
        time_period_days: Number of days to look back for new trials (default 30)
        trial_phases: List of trial phases to include (e.g., ['Phase I', 'Phase II', 'Phase III'])
    """
    # Record usage
    usage_service.record_usage(session_id, "monitor_surgical_trials")
    
    # Call the surgical trial monitoring tool
    return await surgical_trial_tool.monitor_surgical_trials(
        device_category=device_category,
        competitor_companies=competitor_companies,
        regions=regions,
        time_period_days=time_period_days,
        trial_phases=trial_phases
    )

@mcp.tool()
async def get_competitive_dashboard(ctx: Context, 
                                 company_name: str,
                                 device_categories: list = None,
                                 time_period_days: int = 90):
    """
    Get comprehensive competitive dashboard data for a medical device company
    
    Args:
        company_name: Name of the company to analyze (e.g., 'Medtronic', 'Abbott')
        device_categories: List of device categories to focus on (e.g., ['cardiovascular', 'orthopedic'])
        time_period_days: Time period for analysis in days (default 90)
    """
    # Record usage
    usage_service.record_usage(session_id, "get_competitive_dashboard")
    
    # Call the competitive dashboard tool
    return await surgical_trial_tool.get_competitive_dashboard_data(
        company_name=company_name,
        device_categories=device_categories,
        time_period_days=time_period_days
    )

@mcp.tool()
async def track_competitor_activity(ctx: Context,
                                  target_competitors: list,
                                  device_category: str = None,
                                  alert_threshold_days: int = 7):
    """
    Track specific competitor activity and generate alerts for new trial activities
    
    Args:
        target_competitors: List of competitor names to specifically track
        device_category: Specific device category to monitor (optional)
        alert_threshold_days: Generate alerts for activity within this many days
    """
    # Record usage
    usage_service.record_usage(session_id, "track_competitor_activity")
    
    # Call the competitor tracking tool
    return await surgical_trial_tool.track_competitor_activity(
        target_competitors=target_competitors,
        device_category=device_category,
        alert_threshold_days=alert_threshold_days
    )

@mcp.tool()
async def analyze_market_trends(ctx: Context,
                              device_category: str,
                              time_period_days: int = 180,
                              geographic_focus: list = None):
    """
    Analyze market trends and emerging patterns in surgical device trials
    
    Args:
        device_category: Device category to analyze (e.g., 'cardiovascular', 'orthopedic')
        time_period_days: Time period for trend analysis (default 180 days)
        geographic_focus: List of regions to focus analysis on (optional)
    """
    # Record usage
    usage_service.record_usage(session_id, "analyze_market_trends")
    
    # Call the market trends analysis tool
    return await surgical_trial_tool.analyze_market_trends(
        device_category=device_category,
        time_period_days=time_period_days,
        geographic_focus=geographic_focus
    )

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