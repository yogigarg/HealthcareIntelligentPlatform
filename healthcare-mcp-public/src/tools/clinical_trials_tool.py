import logging
import requests
import json
from typing import Dict, Any, List, Optional
from src.tools.base_tool import BaseTool

logger = logging.getLogger("healthcare-mcp")

class ClinicalTrialsTool(BaseTool):
    """Tool for searching clinical trials from ClinicalTrials.gov"""
    
    def __init__(self, cache_db_path=None):
        """Initialize Clinical Trials tool with base URL and caching
        
        Args:
            cache_db_path: Optional path to the cache database file
        """
        super().__init__(cache_db_path=cache_db_path or "healthcare_cache.db")
        self.base_url = "https://clinicaltrials.gov/api/v2/studies"
        self.http_client = requests  # Initialize http_client attribute
    
    async def search_trials(self, condition: str, status: str = "recruiting", max_results: int = 10) -> Dict[str, Any]:
        """
        Search for clinical trials by condition, status, and other parameters
        
        Args:
            condition: Medical condition or disease to search for
            status: Trial status (recruiting, completed, etc.)
            max_results: Maximum number of results to return
            
        Returns:
            Dictionary containing clinical trial information or error details
        """
        # Input validation
        if not condition:
            return self._format_error_response("Condition is required")
        
        # Validate max_results
        try:
            max_results = int(max_results)
            if max_results < 1:
                max_results = 10
            elif max_results > 100:
                max_results = 100  # Limit to reasonable number
        except (ValueError, TypeError):
            max_results = 10
        
        # Create cache key
        cache_key = self._get_cache_key("clinical_trials", condition, status, max_results)
        
        # Check cache first
        cached_result = self.cache.get(cache_key)
        if cached_result and cached_result.get('status') == 'success':
            logger.info(f"Cache hit for clinical trials search: {condition}, status={status}")
            return cached_result
            
        try:
            logger.info(f"Searching clinical trials for condition: {condition}, status={status}, max_results={max_results}")
            
            # Map status to API format if needed
            status_map = {
                "recruiting": "RECRUITING",
                "not_recruiting": "ACTIVE_NOT_RECRUITING",
                "completed": "COMPLETED",
                "active": "RECRUITING"
            }
            mapped_status = status_map.get(status.lower(), status.upper()) if status.lower() != "all" else None
            
            # Construct the API URL with correct parameters
            params = {
                "query.cond": condition,
                "pageSize": max_results,
                "format": "json"
            }
            
            # Add status filter if not 'all'
            if status.lower() != "all" and mapped_status:
                params["filter.overallStatus"] = mapped_status
            
            # Make the API request directly using requests
            logger.debug(f"Making request to {self.base_url} with params: {params}")
            
            response = requests.get(self.base_url, params=params, timeout=30)
            response.raise_for_status()
            
            # Log response details for debugging
            logger.debug(f"Response status: {response.status_code}")
            logger.debug(f"Response content type: {response.headers.get('content-type')}")
            
            # Parse response - handle both JSON and text responses
            try:
                if 'application/json' in response.headers.get('content-type', ''):
                    data = response.json()
                else:
                    # Try to parse as JSON anyway
                    data = json.loads(response.text)
            except (json.JSONDecodeError, ValueError) as e:
                logger.error(f"Failed to parse JSON response: {e}")
                logger.error(f"Response text: {response.text[:500]}...")
                return self._format_error_response(f"Invalid response format from ClinicalTrials.gov API")
            
            # Ensure data is a dictionary
            if not isinstance(data, dict):
                logger.error(f"Expected dict but got {type(data)}")
                return self._format_error_response(f"Unexpected response format from API")
            
            # Process the studies
            studies = data.get('studies', [])
            trials = await self._process_trials(studies)
            
            # Create result object
            result = self._format_success_response(
                condition=condition,
                search_status=status,
                total_results=data.get('totalCount', 0),
                trials=trials
            )
            
            # Cache for 24 hours (86400 seconds)
            self.cache.set(cache_key, result, ttl=86400)
            
            return result
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {str(e)}")
            return self._format_error_response(f"Error connecting to ClinicalTrials.gov: {str(e)}")
        except Exception as e:
            logger.error(f"Error searching clinical trials: {str(e)}", exc_info=True)
            return self._format_error_response(f"Error searching clinical trials: {str(e)}")
    
    async def _process_trials(self, studies: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Process clinical trial data from ClinicalTrials.gov API response
        
        Args:
            studies: List of study data from ClinicalTrials.gov API
            
        Returns:
            List of processed trial data
        """
        trials = []
        
        for study in studies:
            try:
                # Extract data from the nested structure based on the API response
                protocol_section = study.get('protocolSection', {})
                identification = protocol_section.get('identificationModule', {})
                status_module = protocol_section.get('statusModule', {})
                design_module = protocol_section.get('designModule', {})
                conditions_module = protocol_section.get('conditionsModule', {})
                contacts_locations = protocol_section.get('contactsLocationsModule', {})
                sponsor_module = protocol_section.get('sponsorCollaboratorsModule', {})
                description_module = protocol_section.get('descriptionModule', {})
                
                # Get phases as a string
                phases = design_module.get('phases', [])
                phase_str = ', '.join(phases) if phases else 'Not Specified'
                
                # Get sponsor name
                sponsor_name = ''
                if 'leadSponsor' in sponsor_module:
                    sponsor_name = sponsor_module['leadSponsor'].get('name', '')
                
                # Create trial object
                trial = {
                    "nct_id": identification.get('nctId', ''),
                    "title": identification.get('briefTitle', ''),
                    "status": status_module.get('overallStatus', ''),
                    "phase": phase_str,
                    "study_type": design_module.get('studyType', ''),
                    "conditions": conditions_module.get('conditions', []),
                    "locations": [],
                    "sponsor": sponsor_name,
                    "url": f"https://clinicaltrials.gov/study/{identification.get('nctId', '')}"
                }
                
                # Add brief summary if available
                if 'briefSummary' in description_module:
                    trial["brief_summary"] = description_module.get('briefSummary', '')
                
                # Add locations if available
                locations = contacts_locations.get('locations', [])
                
                for loc in locations[:5]:  # Limit to first 5 locations
                    location = {
                        "facility": loc.get('facility', ''),
                        "city": loc.get('city', ''),
                        "state": loc.get('state', ''),
                        "country": loc.get('country', '')
                    }
                    trial["locations"].append(location)
                
                # Add eligibility information if available
                eligibility_module = protocol_section.get('eligibilityModule', {})
                if eligibility_module:
                    eligibility = {
                        "gender": eligibility_module.get('sex', ''),
                        "min_age": eligibility_module.get('minimumAge', ''),
                        "max_age": eligibility_module.get('maximumAge', ''),
                        "healthy_volunteers": eligibility_module.get('healthyVolunteers', '')
                    }
                    trial["eligibility"] = eligibility
                
                trials.append(trial)
            except Exception as e:
                logger.error(f"Error processing trial: {e}")
                continue
        
        return trials