import os
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from src.tools.base_tool import BaseTool

logger = logging.getLogger("healthcare-mcp")


class FDATool(BaseTool):
    """Tool for accessing FDA MAUDE database for medical device monitoring"""
    
    def __init__(self, cache_db_path: str = "healthcare_cache.db"):
        """Initialize the FDA Device tool with API key and base URL"""
        super().__init__(cache_db_path=cache_db_path)
        self.api_key = os.getenv("FDA_API_KEY", "")
        self.base_url = "https://api.fda.gov/device"
        
        # Common medical device categories for suggestions
        self.device_categories = [
            "pacemaker",
            "insulin pump", 
            "surgical robot",
            "hip implant",
            "knee implant",
            "heart valve",
            "stent",
            "defibrillator",
            "catheter",
            "surgical mesh",
            "breast implant",
            "contact lens",
            "hearing aid",
            "glucose monitor",
            "ventilator",
            "dialysis machine",
            "MRI scanner",
            "CT scanner",
            "ultrasound",
            "surgical laser"
        ]
    
    async def lookup_drug(self, drug_name: str, search_type: str = "general") -> Dict[str, Any]:
        """
        Backward compatibility method for drug lookup (deprecated)
        
        Args:
            drug_name: Name of the drug to search for
            search_type: Type of information to retrieve
            
        Returns:
            Dictionary containing deprecation message
        """
        logger.warning(f"lookup_drug method is deprecated. Drug: {drug_name}, Type: {search_type}")
        
        return {
            "status": "error",
            "error_message": "Drug lookup functionality has been replaced with device monitoring. Please use lookup_device() with device parameters instead.",
            "migration_info": {
                "old_method": "lookup_drug",
                "new_method": "lookup_device",
                "new_parameters": {
                    "searchType": "adverse_events",
                    "dateRange": 30,
                    "deviceName": "pacemaker",
                    "eventType": "all"
                }
            }
        }

    async def lookup_device(self, device_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Look up device information from the FDA MAUDE database with fallback to demo data
        
        Args:
            device_params: Dictionary containing search parameters:
                - searchType: 'adverse_events', 'recalls', or 'safety_signals'
                - dateRange: Number of days to look back
                - deviceName: Name of device to search for (optional)
                - eventType: For adverse events: 'all', 'malfunction', 'injury', 'death'
            
        Returns:
            Dictionary containing device information or demo data if API fails
        """
        # Input validation
        search_type = device_params.get('searchType', 'adverse_events')
        date_range = device_params.get('dateRange', 30)
        device_name = device_params.get('deviceName')
        event_type = device_params.get('eventType', 'all')
        
        # Validate search type
        if search_type not in ["adverse_events", "recalls", "safety_signals"]:
            return self._format_error_response("Invalid search type. Must be 'adverse_events', 'recalls', or 'safety_signals'")
        
        try:
            logger.info(f"Fetching FDA device information: {search_type}, device: {device_name}, days: {date_range}")
            
            if search_type == "adverse_events":
                result = await self._fetch_adverse_events(date_range, device_name, event_type)
            elif search_type == "recalls":
                result = await self._fetch_recalls(date_range, device_name)
            elif search_type == "safety_signals":
                result = await self._analyze_safety_signals(date_range, device_name)
            
            # Check if we got actual data or just error messages
            if result.get("status") == "success" and not result.get("api_error") and not result.get("api_errors"):
                return result
            else:
                # API failed, provide demo data with explanation
                logger.info(f"FDA API failed, providing demo data for {search_type}")
                demo_result = await self._get_demo_data(search_type, device_name)
                return demo_result
                
        except Exception as e:
            logger.error(f"Error fetching FDA device information: {str(e)}")
            
            # Provide demo data as fallback
            try:
                demo_result = await self._get_demo_data(search_type, device_name)
                demo_result["fallback_reason"] = f"API error: {str(e)}"
                return demo_result
            except Exception as demo_error:
                logger.error(f"Even demo data failed: {str(demo_error)}")
                return self._format_error_response(f"System temporarily unavailable: {str(e)}")
    
    async def _fetch_adverse_events(self, date_range: int, device_name: Optional[str], event_type: str) -> Dict[str, Any]:
        """Fetch adverse events for any medical device"""
        # Create cache key
        cache_key = self._get_cache_key("maude_adverse", device_name or "all", event_type, str(date_range))
        
        # Check cache first (cache for 4 hours for adverse events)
        cached_result = self.cache.get(cache_key)
        if cached_result:
            logger.info(f"Cache hit for MAUDE adverse events: {device_name}, {event_type}")
            return cached_result
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=date_range)
        
        # Build search query
        search_terms = self._build_device_search_query(device_name)
        
        # Try without date filter first - date filtering might be causing 500 errors
        query = search_terms
        
        # Only add date filter if we have a specific device (to keep query simple)
        if device_name and device_name.strip():
            date_filter = f"date_received:[{start_date.strftime('%Y%m%d')}+TO+{end_date.strftime('%Y%m%d')}]"
            query = f"({search_terms})"
        
        # Add event type filter if specified
        if event_type != "all":
            event_codes = self._get_event_type_codes(event_type)
            if event_codes:
                query += f"+AND+event_type:{event_codes}"
        
        endpoint = f"{self.base_url}/event.json"
        params = {
            "search": query,
            "limit": 10,  # Reduced limit to avoid API overload
            "sort": "date_received:desc"
        }
        
        if self.api_key:
            params["api_key"] = self.api_key
        
        logger.info(f"FDA API request - URL: {endpoint}")
        logger.info(f"FDA API request - Query: {query}")
        logger.info(f"FDA API request - Params: {params}")
        
        try:
            # Make the request with enhanced error handling
            logger.info(f"Fetching FDA device information for: {device_name or 'all devices'}")
            
            # Use the synchronous _make_request method from base class
            try:
                raw_response = self._make_request(endpoint, params=params)
                logger.info(f"Raw response type: {type(raw_response)}")
                
                # Handle case where response is a string instead of dict
                if isinstance(raw_response, str):
                    logger.error(f"FDA API returned string response: {raw_response[:200]}")
                    raise Exception(f"FDA API returned string instead of JSON: {raw_response[:200]}")
                elif not isinstance(raw_response, dict):
                    logger.error(f"FDA API returned unexpected type: {type(raw_response)}")
                    raise Exception(f"FDA API returned unexpected response type: {type(raw_response)}")
                
                data = raw_response
                
            except Exception as req_error:
                logger.error(f"FDA request failed: {str(req_error)}")
                raise req_error
            
            # Process and categorize results
            # Filter results by date manually AFTER getting them from API
            all_events = data.get("results", [])
            if not isinstance(all_events, list):
                logger.error(f"FDA API results field is not a list: {type(all_events)}")
                raise Exception("FDA API returned invalid results format")
                
            filtered_events = self._filter_events_by_date(all_events, date_range)

            # Process and categorize results
            result = self._process_adverse_events(filtered_events, device_name, event_type, date_range)
            result["total_results"] = data.get("meta", {}).get("results", {}).get("total", 0)
            
            # Cache for 4 hours
            self.cache.set(cache_key, result, ttl=14400)
            
            return result
            
        except Exception as e:
            logger.error(f"FDA API error: {str(e)}")
            
            # Log more details about the error for debugging
            if hasattr(e, 'response'):
                logger.error(f"Response status: {getattr(e.response, 'status_code', 'unknown')}")
                logger.error(f"Response content: {getattr(e.response, 'text', 'unknown')[:500]}")
            
            # Return a structured error response with helpful information
            return {
                "status": "success",  # Don't fail completely
                "events": [],
                "summary": {
                    "total": 0,
                    "death": 0,
                    "injury": 0,
                    "malfunction": 0
                },
                "device_breakdown": {},
                "query_info": {
                    "date_range": date_range,
                    "device_name": device_name,
                    "event_type": event_type
                },
                "message": "FDA MAUDE data temporarily unavailable. This may be due to API limitations or server issues.",
                "api_error": str(e)
            }

    async def _fetch_recalls(self, date_range: int, device_name: Optional[str]) -> Dict[str, Any]:
        """Fetch device recalls for any medical device"""
        # Create cache key
        cache_key = self._get_cache_key("maude_recalls", device_name or "all", str(date_range))
        
        # Check cache first (cache for 6 hours for recalls)
        cached_result = self.cache.get(cache_key)
        if cached_result:
            logger.info(f"Cache hit for MAUDE recalls: {device_name}")
            return cached_result
        
        # Try multiple query approaches since recalls API seems problematic
        
        # Approach 1: Try without date filter first
        try:
            search_terms = self._build_device_search_query(device_name)
            
            endpoint = f"{self.base_url}/recall.json"
            params = {
                "search": search_terms,
                "limit": 10,  # Smaller limit for recalls
                "sort": "recall_initiation_date:desc"
            }
            
            if self.api_key:
                params["api_key"] = self.api_key
            
            # Make the request
            logger.info(f"Trying FDA recalls without date filter for: {device_name or 'all devices'}")
            data = await self._make_request(endpoint, params=params)
            
            # Process recall results
            result = self._process_recalls(data.get("results", []), date_range)
            result["total_results"] = data.get("meta", {}).get("results", {}).get("total", 0)
            result["note"] = "Retrieved without date filtering due to API limitations"
            
            # Cache for 6 hours
            self.cache.set(cache_key, result, ttl=21600)
            
            return result
            
        except Exception as e1:
            logger.error(f"FDA recalls API error (no date): {str(e1)}")
            
            # Approach 2: Try very simple query
            try:
                endpoint = f"{self.base_url}/recall.json"
                params = {
                    "limit": 5
                }
                
                if self.api_key:
                    params["api_key"] = self.api_key
                
                logger.info("Trying very simple FDA recalls query")
                data = await self._make_request(endpoint, params=params)
                
                # Filter results manually if we got data
                all_recalls = data.get("results", [])
                filtered_recalls = []
                
                if device_name and device_name.strip():
                    device_lower = device_name.lower()
                    for recall in all_recalls:
                        product_desc = recall.get("product_description", "").lower()
                        if device_lower in product_desc:
                            filtered_recalls.append(recall)
                else:
                    filtered_recalls = all_recalls
                
                result = self._process_recalls(filtered_recalls, date_range)
                result["total_results"] = len(filtered_recalls)
                result["note"] = "Retrieved with basic query - filtered manually"
                
                # Cache for 6 hours
                self.cache.set(cache_key, result, ttl=21600)
                
                return result
                
            except Exception as e2:
                logger.error(f"FDA recalls API error (simple): {str(e2)}")
                
                # Return graceful fallback
                return {
                    "status": "success",
                    "recalls": [],
                    "summary": {
                        "total": 0,
                        "class_1": 0,
                        "class_2": 0,
                        "class_3": 0
                    },
                    "query_info": {
                        "date_range": date_range,
                        "device_name": device_name
                    },
                    "message": "FDA recall database temporarily unavailable. This may be due to API server issues or query limitations.",
                    "api_errors": [str(e1), str(e2)]
                }

    async def _analyze_safety_signals(self, analysis_period: int, device_name: Optional[str]) -> Dict[str, Any]:
        """Analyze safety signals and trends for any medical device"""
        # Create cache key
        cache_key = self._get_cache_key("safety_signals", device_name or "all", str(analysis_period))
        
        # Check cache first (cache for 12 hours)
        cached_result = self.cache.get(cache_key)
        if cached_result:
            logger.info(f"Cache hit for safety signals: {analysis_period} days")
            return cached_result
        
        # Get adverse events for analysis period
        events_result = await self._fetch_adverse_events(analysis_period, device_name, "all")
        
        if events_result.get("status") != "success":
            return events_result
        
        # Analyze patterns and trends
        analysis = self._analyze_safety_patterns(events_result.get("events", []))
        
        result = {
            "status": "success",
            "analysis_period": analysis_period,
            "device_name": device_name,
            "safety_signals": analysis,
            "generated_at": datetime.now().isoformat()
        }
        
        # Cache for 12 hours
        self.cache.set(cache_key, result, ttl=43200)
        
        return result
    
    def _build_device_search_query(self, device_name: Optional[str] = None) -> str:
        """Build search query for any medical device"""
        if device_name and device_name.strip():
            # Search for user-specified device - use simpler query format
            device_clean = device_name.strip().lower()
            
            # Try different field combinations - some work better than others
            # Start with just device_name as it's most commonly populated
            return f'device_name="{device_clean}"'
        else:
            # If no device specified, use a simple broad search
            return 'device_name=surgical'
    
    def _filter_events_by_date(self, events: list, date_range: int) -> list:
        """Filter events to only include those within the specified date range"""
        if not events:
            return []
    
        # Calculate cutoff date
        cutoff_date = datetime.now() - timedelta(days=date_range)
        cutoff_str = cutoff_date.strftime('%Y%m%d')
    
        filtered = []
        for event in events:
            event_date = event.get('date_received', '')
            if event_date and event_date >= cutoff_str:
                filtered.append(event)
    
        return filtered
    
    def _get_event_type_codes(self, event_type: str) -> str:
        """Get FDA event type codes"""
        event_codes = {
            "malfunction": "M",
            "injury": "I", 
            "death": "D"
        }
        return event_codes.get(event_type.lower(), "")
    
    def _process_adverse_events(self, events: list, device_name: Optional[str], event_type: str, date_range: int) -> Dict[str, Any]:
        """Process and categorize adverse events"""
        processed_events = []
        event_summary = {
            "malfunction": 0,
            "injury": 0,
            "death": 0,
            "total": len(events)
        }
        
        device_breakdown = {}
        manufacturer_breakdown = {}
        
        for event in events:
            # Extract device information - handle multiple devices per event
            device_info = self._extract_device_info(event.get("device", []))
            
            # Extract manufacturer information with multiple fallbacks
            manufacturer_info = self._extract_manufacturer_info(event.get("device", []))
            
            # Extract event description from multiple possible sources
            event_description = self._extract_event_description(event)
            
            # Format date for better readability
            formatted_date = self._format_date(event.get("date_received", ""))
            
            processed_event = {
                "report_number": event.get("report_number", "Not Available"),
                "date_received": formatted_date,
                "event_type": self._format_event_type(event.get("event_type", "")),
                "device_name": device_info.get("name", "Device Not Specified"),
                "generic_name": device_info.get("generic_name", ""),
                "brand_name": device_info.get("brand_name", ""),
                "model_number": device_info.get("model_number", ""),
                "product_code": device_info.get("product_code", ""),
                "manufacturer": manufacturer_info.get("name", "Manufacturer Not Available"),
                "manufacturer_city": manufacturer_info.get("city", ""),
                "manufacturer_state": manufacturer_info.get("state", ""),
                "manufacturer_country": manufacturer_info.get("country", ""),
                "event_description": event_description,
                "patient_problems": self._extract_patient_problems(event.get("patient", [])),
                "remedial_action": self._extract_remedial_action(event.get("remedial_action", [])),
                "event_location": self._extract_event_location(event),
                "device_operator": event.get("device_operator", ""),
                "implant_flag": event.get("implant_flag", ""),
                "baseline_510k_number": device_info.get("baseline_510k_number", ""),
                # Add FDA URLs
                "fda_report_url": self._generate_fda_url(event.get("report_number", ""), device_name),
                "fda_device_search_url": self._generate_device_search_url(device_info.get("name", "")),
                "openfda_api_url": self._generate_openfda_api_url(device_info.get("name", "")),
                "report_number_for_search": event.get("report_number", "")  # Include for manual search
            }
            
            processed_events.append(processed_event)
            
            # Update summary counts
            event_type_code = event.get("event_type", "")
            if "M" in event_type_code:
                event_summary["malfunction"] += 1
            if "I" in event_type_code:
                event_summary["injury"] += 1
            if "D" in event_type_code:
                event_summary["death"] += 1
            
            # Track device breakdown
            device_name_actual = processed_event["device_name"]
            if device_name_actual != "Device Not Specified":
                device_breakdown[device_name_actual] = device_breakdown.get(device_name_actual, 0) + 1
            
            # Track manufacturer breakdown
            manufacturer_actual = processed_event["manufacturer"]
            if manufacturer_actual != "Manufacturer Not Available":
                manufacturer_breakdown[manufacturer_actual] = manufacturer_breakdown.get(manufacturer_actual, 0) + 1
        
        return {
            "status": "success",
            "events": processed_events,
            "summary": event_summary,
            "device_breakdown": device_breakdown,
            "manufacturer_breakdown": manufacturer_breakdown,
            "query_info": {
                "date_range": date_range,
                "device_name": device_name,
                "event_type": event_type
            }
        }
    
    def _process_recalls(self, recalls: list, date_range: int) -> Dict[str, Any]:
        """Process recall information"""
        processed_recalls = []
        recall_summary = {
            "class_1": 0,  # Most serious
            "class_2": 0,  # Moderately serious
            "class_3": 0,  # Least serious
            "total": len(recalls)
        }
        
        for recall in recalls:
            processed_recall = {
                "recall_number": recall.get("recall_number", "Unknown"),
                "recall_initiation_date": recall.get("recall_initiation_date", "Unknown"),
                "recall_class": recall.get("classification", "Unknown"),
                "product_description": recall.get("product_description", "No description"),
                "reason": recall.get("reason_for_recall", "No reason provided"),
                "firm_name": recall.get("recalling_firm", "Unknown"),
                "status": recall.get("status", "Unknown")
            }
            
            processed_recalls.append(processed_recall)
            
            # Update class summary
            recall_class = recall.get("classification", "")
            if "Class I" in recall_class:
                recall_summary["class_1"] += 1
            elif "Class II" in recall_class:
                recall_summary["class_2"] += 1
            elif "Class III" in recall_class:
                recall_summary["class_3"] += 1
        
        return {
            "status": "success",
            "recalls": processed_recalls,
            "summary": recall_summary,
            "query_info": {
                "date_range": date_range
            }
        }
    
    def _analyze_safety_patterns(self, events: list) -> Dict[str, Any]:
        """Analyze safety patterns and identify potential signals"""
        if not events:
            return {"patterns": [], "risk_signals": [], "recommendations": []}
        
        # Analyze device-specific patterns
        device_issues = {}
        temporal_patterns = {}
        severity_trends = {"malfunction": 0, "injury": 0, "death": 0}
        
        for event in events:
            device = event.get("device_name", "Unknown")
            date = event.get("date_received", "")
            event_type = event.get("event_type", "")
            
            # Track device-specific issues
            if device not in device_issues:
                device_issues[device] = []
            device_issues[device].append(event)
            
            # Track temporal patterns (by month)
            if date and len(date) >= 6:
                month_key = date[:6]  # YYYYMM
                temporal_patterns[month_key] = temporal_patterns.get(month_key, 0) + 1
            
            # Track severity
            if "M" in event_type:
                severity_trends["malfunction"] += 1
            if "I" in event_type:
                severity_trends["injury"] += 1
            if "D" in event_type:
                severity_trends["death"] += 1
        
        # Identify risk signals
        risk_signals = []
        for device, device_events in device_issues.items():
            if len(device_events) > 5:  # Threshold for concern
                risk_signals.append({
                    "device": device,
                    "event_count": len(device_events),
                    "risk_level": "High" if len(device_events) > 20 else "Medium"
                })
        
        # Generate recommendations
        recommendations = []
        if severity_trends["death"] > 0:
            recommendations.append("Immediate review of fatal events required")
        if severity_trends["injury"] > 10:
            recommendations.append("Enhanced monitoring of injury reports recommended")
        if len(risk_signals) > 0:
            recommendations.append("Focused analysis of high-risk devices needed")
        
        return {
            "patterns": {
                "device_breakdown": {k: len(v) for k, v in device_issues.items()},
                "temporal_distribution": temporal_patterns,
                "severity_distribution": severity_trends
            },
            "risk_signals": risk_signals,
            "recommendations": recommendations
        }

    async def _test_simple_query(self) -> Dict[str, Any]:
        """Test with a very simple FDA query to verify API access"""
        try:
            # Very basic query that should work - just get recent reports without device filter
            endpoint = f"{self.base_url}/event.json"
            params = {
                "limit": 5
            }
            
            if self.api_key:
                params["api_key"] = self.api_key
            
            logger.info(f"Testing simple FDA query: {endpoint}")
            data = await self._make_request(endpoint, params=params)
            
            return {
                "status": "success",
                "message": "FDA API is accessible",
                "test_results": len(data.get("results", [])),
                "total_available": data.get("meta", {}).get("results", {}).get("total", 0)
            }
            
        except Exception as e:
            logger.error(f"FDA API test failed: {str(e)}")
            return {
                "status": "error",
                "message": "FDA API is not accessible",
                "error": str(e)
            }

    async def _get_demo_data(self, search_type: str, device_name: str) -> Dict[str, Any]:
        """Provide realistic demo data when FDA API is unavailable"""
        
        if search_type == "adverse_events":
            return {
                "status": "success",
                "events": [
                    {
                        "report_number": "DEMO-2024-001",
                        "date_received": "September 15, 2024",
                        "event_type": "Device Malfunction",
                        "device_name": device_name or "Surgical Instrument",
                        "generic_name": "Surgical Device",
                        "brand_name": "ProSurg Model X",
                        "model_number": "PSX-2024",
                        "product_code": "SUR",
                        "manufacturer": "MedTech Solutions Inc.",
                        "manufacturer_city": "Boston",
                        "manufacturer_state": "MA",
                        "manufacturer_country": "US",
                        "event_description": f"Reported malfunction of {device_name or 'surgical device'} during routine operation. Device stopped functioning as expected during procedure. No patient injury reported. Device was immediately replaced and procedure completed successfully. Investigation ongoing with manufacturer.",
                        "patient_problems": [],
                        "remedial_action": "Device recalled for inspection; Software update issued",
                        "event_location": "General Hospital, Boston",
                        "device_operator": "HEALTH PROFESSIONAL",
                        "implant_flag": "N",
                        "baseline_510k_number": "K123456",
                        "fda_report_url": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/search.cfm",
                        "fda_device_search_url": f"https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/search.cfm?search_term={device_name or 'surgical'}"
                    },
                    {
                        "report_number": "DEMO-2024-002", 
                        "date_received": "September 10, 2024",
                        "event_type": "Patient Injury",
                        "device_name": device_name or "Medical Monitoring Device",
                        "generic_name": "Patient Monitor",
                        "brand_name": "VitalWatch Pro",
                        "model_number": "VW-500",
                        "product_code": "MON",
                        "manufacturer": "Advanced Medical Systems Corp.",
                        "manufacturer_city": "San Francisco",
                        "manufacturer_state": "CA", 
                        "manufacturer_country": "US",
                        "event_description": f"Patient experienced minor complications during {device_name or 'device'} use. Device alarm failed to activate during critical threshold event. Medical attention required. Patient stable after intervention. Device performance under review.",
                        "patient_problems": ["Device alarm malfunction", "Delayed response"],
                        "remedial_action": "Firmware update; Enhanced training provided",
                        "event_location": "Memorial Medical Center, San Francisco",
                        "device_operator": "HEALTH PROFESSIONAL",
                        "implant_flag": "N",
                        "baseline_510k_number": "K789012",
                        "fda_report_url": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/search.cfm",
                        "fda_device_search_url": f"https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/search.cfm?search_term={device_name or 'monitor'}"
                    }
                ],
                "summary": {
                    "total": 2,
                    "death": 0,
                    "injury": 1, 
                    "malfunction": 1
                },
                "device_breakdown": {
                    device_name or "Surgical Instrument": 1,
                    device_name or "Medical Monitoring Device": 1
                },
                "manufacturer_breakdown": {
                    "MedTech Solutions Inc.": 1,
                    "Advanced Medical Systems Corp.": 1
                },
                "query_info": {
                    "date_range": 30,
                    "device_name": device_name,
                    "event_type": "all"
                },
                "demo_mode": True,
                "message": "Demo data shown - FDA MAUDE API temporarily unavailable"
            }
            
        elif search_type == "recalls":
            return {
                "status": "success", 
                "recalls": [
                    {
                        "recall_number": "DEMO-RECALL-001",
                        "recall_initiation_date": "September 01, 2024",
                        "recall_class": "Class II",
                        "product_description": f"Demo {device_name or 'Medical Device'} - Model XYZ-123, Serial Numbers 1000-2000",
                        "reason": f"Potential malfunction in {device_name or 'device'} software that may cause incorrect readings during critical operations",
                        "firm_name": "Demo Medical Corporation",
                        "status": "Ongoing"
                    }
                ],
                "summary": {
                    "total": 1,
                    "class_1": 0,
                    "class_2": 1,
                    "class_3": 0
                },
                "query_info": {
                    "date_range": 90,
                    "device_name": device_name
                },
                "demo_mode": True,
                "message": "Demo data shown - FDA recalls API temporarily unavailable"
            }
            
        else:  # safety_signals
            return {
                "status": "success",
                "analysis_period": 180,
                "device_name": device_name,
                "safety_signals": {
                    "patterns": {
                        "device_breakdown": {
                            device_name or "Medical Device": 3
                        },
                        "temporal_distribution": {
                            "202409": 2,
                            "202408": 1
                        },
                        "severity_distribution": {
                            "malfunction": 2,
                            "injury": 1,
                            "death": 0
                        }
                    },
                    "risk_signals": [
                        {
                            "device": device_name or "Medical Device",
                            "event_count": 3,
                            "risk_level": "Medium"
                        }
                    ],
                    "recommendations": [
                        "Monitor device performance closely",
                        "Review maintenance procedures",
                        "Enhanced operator training recommended"
                    ]
                },
                "demo_mode": True,
                "message": "Demo analysis shown - FDA API temporarily unavailable"
            }
    
    def _extract_device_info(self, devices: list) -> Dict[str, str]:
        """Extract comprehensive device information from the device array"""
        if not devices:
            return {"name": "Device Not Specified"}
        
        # Take the first device (most reports have one device)
        device = devices[0] if isinstance(devices, list) else devices
        
        # Handle case where device might be a string instead of dict
        if isinstance(device, str):
            return {"name": device.strip() if device else "Device Not Specified"}
        
        if not isinstance(device, dict):
            return {"name": "Device Not Specified"}
        
        # Try multiple fields for device name in order of preference
        device_name = (
            device.get("device_name") or
            device.get("generic_name") or
            device.get("brand_name") or
            device.get("model_number") or
            "Device Not Specified"
        )
        
        return {
            "name": device_name.strip() if device_name else "Device Not Specified",
            "generic_name": str(device.get("generic_name", "")).strip(),
            "brand_name": str(device.get("brand_name", "")).strip(),
            "model_number": str(device.get("model_number", "")).strip(),
            "product_code": str(device.get("device_report_product_code", "")).strip(),
            "baseline_510k_number": str(device.get("baseline_510_k__number", "")).strip()
        }
    
    def _extract_manufacturer_info(self, devices: list) -> Dict[str, str]:
        """Extract comprehensive manufacturer information"""
        if not devices:
            return {"name": "Manufacturer Not Available"}
        
        device = devices[0] if isinstance(devices, list) else devices
        
        # Handle case where device might be a string instead of dict
        if isinstance(device, str):
            return {"name": "Manufacturer Not Available"}
        
        if not isinstance(device, dict):
            return {"name": "Manufacturer Not Available"}
        
        # Try multiple fields for manufacturer name
        manufacturer_name = (
            device.get("manufacturer_d_name") or
            device.get("manufacturer_name") or
            device.get("manufacturer_g1_name") or
            "Manufacturer Not Available"
        )
        
        return {
            "name": str(manufacturer_name).strip() if manufacturer_name else "Manufacturer Not Available",
            "city": str(device.get("manufacturer_d_city", "")).strip(),
            "state": str(device.get("manufacturer_d_state", "")).strip(),
            "country": str(device.get("manufacturer_d_country", "")).strip(),
            "address": str(device.get("manufacturer_d_address_1", "")).strip(),
            "zip_code": str(device.get("manufacturer_d_zip_code", "")).strip()
        }
    
    def _extract_event_description(self, event: Dict) -> str:
        """Extract event description from multiple possible sources"""
        if not isinstance(event, dict):
            return "Event details not available"
            
        # Try mdr_text first (most detailed)
        mdr_text = event.get("mdr_text")
        if mdr_text:
            if isinstance(mdr_text, list):
                for text_entry in mdr_text:
                    if isinstance(text_entry, dict) and text_entry.get("text"):
                        return str(text_entry["text"]).strip()
            elif isinstance(mdr_text, dict) and mdr_text.get("text"):
                return str(mdr_text["text"]).strip()
            elif isinstance(mdr_text, str):
                return mdr_text.strip()
        
        # Try event_description field
        event_desc = event.get("event_description")
        if event_desc and isinstance(event_desc, str):
            return event_desc.strip()
        
        # Try narrative fields
        narrative = event.get("narrative")
        if narrative and isinstance(narrative, str):
            return narrative.strip()
        
        # Fallback to a constructed description
        event_type = self._format_event_type(event.get("event_type", ""))
        if event_type != "Unknown Event Type":
            return f"Medical device event reported: {event_type}"
        
        return "Event details not available in report"
    
    def _extract_patient_problems(self, patients: list) -> list:
        """Extract patient problems from patient data"""
        problems = []
        if not patients or not isinstance(patients, list):
            return problems
        
        for patient in patients:
            if not isinstance(patient, dict):
                continue
                
            # Check multiple possible fields for patient problems
            problem_flag = patient.get("patient_problem_flag")
            if problem_flag and isinstance(problem_flag, str):
                problems.append(problem_flag)
                
            problem_code = patient.get("patient_problem_code")
            if problem_code and isinstance(problem_code, str):
                problems.append(problem_code)
                
            # Also check for sequence_number_treatment or outcome
            treatment_seq = patient.get("sequence_number_treatment")
            if treatment_seq:
                problems.append(f"Treatment sequence: {treatment_seq}")
        
        return list(set(problems))  # Remove duplicates
    
    def _extract_remedial_action(self, remedial_actions: list) -> str:
        """Extract remedial action taken"""
        if not remedial_actions or not isinstance(remedial_actions, list):
            return ""
        
        actions = []
        for action in remedial_actions:
            if isinstance(action, dict):
                remedial_action = action.get("remedial_action")
                if remedial_action and isinstance(remedial_action, str):
                    actions.append(remedial_action)
            elif isinstance(action, str):
                actions.append(action)
        
        return "; ".join(actions) if actions else ""
    
    def _extract_event_location(self, event: Dict) -> str:
        """Extract where the event occurred"""
        if not isinstance(event, dict):
            return ""
            
        # Try multiple location fields
        location_parts = []
        
        event_location = event.get("event_location")
        if event_location and isinstance(event_location, str):
            location_parts.append(event_location)
        
        distributor_city = event.get("distributor_city")
        if distributor_city and isinstance(distributor_city, str):
            location_parts.append(distributor_city)
        
        distributor_state = event.get("distributor_state")
        if distributor_state and isinstance(distributor_state, str):
            location_parts.append(distributor_state)
        
        return ", ".join(location_parts) if location_parts else ""
    
    def _format_date(self, date_str: str) -> str:
        """Format date from YYYYMMDD to readable format"""
        if not date_str or len(date_str) < 8:
            return "Date Not Available"
        
        try:
            # Parse YYYYMMDD format
            year = date_str[:4]
            month = date_str[4:6]
            day = date_str[6:8]
            
            # Create readable date
            date_obj = datetime.strptime(f"{year}-{month}-{day}", "%Y-%m-%d")
            return date_obj.strftime("%B %d, %Y")
        except ValueError:
            return date_str  # Return original if parsing fails
    
    def _format_event_type(self, event_type: str) -> str:
        """Format event type codes into readable text"""
        if not event_type:
            return "Unknown Event Type"
        
        # Map common event type codes
        type_mappings = {
            "M": "Device Malfunction",
            "I": "Patient Injury", 
            "D": "Patient Death",
            "MI": "Device Malfunction with Injury",
            "MD": "Device Malfunction with Death",
            "ID": "Injury Leading to Death"
        }
        
        # Check for exact matches first
        if event_type in type_mappings:
            return type_mappings[event_type]
        
        # Check for combinations
        formatted_types = []
        if "M" in event_type:
            formatted_types.append("Malfunction")
        if "I" in event_type:
            formatted_types.append("Injury")
        if "D" in event_type:
            formatted_types.append("Death")
        
        if formatted_types:
            return " & ".join(formatted_types)
        
        return f"Event Type: {event_type}"

    def _generate_fda_url(self, report_number: str, search_terms: str = "") -> str:
        """Generate FDA MAUDE database URL for a specific report or search"""
        if not report_number or report_number == "Not Available" or report_number.startswith("DEMO"):
            # If no specific report number or demo data, create a general search URL
            if search_terms and search_terms != "Device Not Specified":
                # Use the main MAUDE search interface
                import urllib.parse
                encoded_search = urllib.parse.quote(search_terms.replace('"', ''))
                return f"https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/search.cfm"
            else:
                return "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/search.cfm"
        
        # For specific reports, use the general search interface since direct report URLs may be restricted
        return "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/search.cfm"
    
    def _generate_device_search_url(self, device_name: str) -> str:
        """Generate FDA MAUDE search URL for a specific device"""
        if device_name and device_name != "Device Not Specified":
            # Use the main MAUDE search interface - users can manually search for the device
            return "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/search.cfm"
        return "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/search.cfm"
    
    def _generate_openfda_api_url(self, device_name: str) -> str:
        """Generate openFDA API URL for device information"""
        if device_name and device_name != "Device Not Specified":
            import urllib.parse
            encoded_device = urllib.parse.quote(device_name.replace('"', ''))
            return f"https://open.fda.gov/apis/device/event/search?search=device.generic_name:{encoded_device}"
        return "https://open.fda.gov/apis/device/event/"
        """Format date from YYYYMMDD to readable format"""
        if not date_str or len(date_str) < 8:
            return "Date Not Available"
        
        try:
            # Parse YYYYMMDD format
            year = date_str[:4]
            month = date_str[4:6]
            day = date_str[6:8]
            
            # Create readable date
            date_obj = datetime.strptime(f"{year}-{month}-{day}", "%Y-%m-%d")
            return date_obj.strftime("%B %d, %Y")
        except ValueError:
            return date_str  # Return original if parsing fails
    
    def _format_event_type(self, event_type: str) -> str:
        """Format event type codes into readable text"""
        if not event_type:
            return "Unknown Event Type"
        
        # Map common event type codes
        type_mappings = {
            "M": "Device Malfunction",
            "I": "Patient Injury", 
            "D": "Patient Death",
            "MI": "Device Malfunction with Injury",
            "MD": "Device Malfunction with Death",
            "ID": "Injury Leading to Death"
        }
        
        # Check for exact matches first
        if event_type in type_mappings:
            return type_mappings[event_type]
        
        # Check for combinations
        formatted_types = []
        if "M" in event_type:
            formatted_types.append("Malfunction")
        if "I" in event_type:
            formatted_types.append("Injury")
        if "D" in event_type:
            formatted_types.append("Death")
        
        if formatted_types:
            return " & ".join(formatted_types)
        
        return f"Event Type: {event_type}"
        """Format a successful response"""
        return {
            "status": "success",
            **kwargs
        }
    
    def _format_error_response(self, error_message: str) -> Dict[str, Any]:
        """Format an error response"""
        return {
            "status": "error",
            "error_message": error_message
        }