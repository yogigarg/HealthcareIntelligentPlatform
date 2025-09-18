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
            "limit": 20,  # Reduced from 100 to avoid overwhelming the API
            "sort": "date_received:desc"
        }
        
        if self.api_key:
            params["api_key"] = self.api_key
        
        try:
            # Make the request
            logger.info(f"Fetching FDA device information for: {device_name or 'all devices'}")
            data = await self._make_request(endpoint, params=params)
            
            # Process and categorize results
            # Filter results by date manually AFTER getting them from API
            all_events = data.get("results", [])
            filtered_events = self._filter_events_by_date(all_events, date_range)

            # Process and categorize results
            result = self._process_adverse_events(filtered_events, device_name, event_type, date_range)
            result["total_results"] = data.get("meta", {}).get("results", {}).get("total", 0)
            
            # Cache for 4 hours
            self.cache.set(cache_key, result, ttl=14400)
            
            return result
            
        except Exception as e:
            logger.error(f"FDA API error: {str(e)}")
            
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
        
        for event in events:
            processed_event = {
                "report_number": event.get("report_number", "Unknown"),
                "date_received": event.get("date_received", "Unknown"),
                "event_type": event.get("event_type", "Unknown"),
                "device_name": event.get("device", [{}])[0].get("device_name", "Unknown") if event.get("device") else "Unknown",
                "manufacturer": event.get("device", [{}])[0].get("manufacturer_name", "Unknown") if event.get("device") else "Unknown",
                "event_description": event.get("mdr_text", [{}])[0].get("text", "No description available") if event.get("mdr_text") else "No description available",
                "patient_problems": []
            }
            
            # Extract patient problems if available
            if event.get("patient"):
                for patient in event.get("patient", []):
                    problem = patient.get("patient_problem_flag", "")
                    if problem:
                        processed_event["patient_problems"].append(problem)
            
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
            device_breakdown[device_name_actual] = device_breakdown.get(device_name_actual, 0) + 1
        
        return {
            "status": "success",
            "events": processed_events,
            "summary": event_summary,
            "device_breakdown": device_breakdown,
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
                        "date_received": "20240915",
                        "event_type": "M",
                        "device_name": device_name or "Medical Device",
                        "manufacturer": "Demo Manufacturer Inc.",
                        "event_description": f"Reported malfunction of {device_name or 'device'} during routine operation. Device stopped functioning as expected. No patient injury reported. Investigation ongoing.",
                        "patient_problems": []
                    },
                    {
                        "report_number": "DEMO-2024-002", 
                        "date_received": "20240910",
                        "event_type": "I",
                        "device_name": device_name or "Medical Device",
                        "manufacturer": "Demo Manufacturer Inc.",
                        "event_description": f"Patient experienced minor complications during {device_name or 'device'} use. Medical attention required. Device performance under review.",
                        "patient_problems": ["Device malfunction"]
                    }
                ],
                "summary": {
                    "total": 2,
                    "death": 0,
                    "injury": 1, 
                    "malfunction": 1
                },
                "device_breakdown": {
                    device_name or "Medical Device": 2
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
                        "recall_initiation_date": "20240901",
                        "recall_class": "Class II",
                        "product_description": f"Demo {device_name or 'Medical Device'} - Model XYZ-123",
                        "reason": f"Potential malfunction in {device_name or 'device'} software that may cause incorrect readings",
                        "firm_name": "Demo Medical Corp",
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
                        "Review maintenance procedures"
                    ]
                },
                "demo_mode": True,
                "message": "Demo analysis shown - FDA API temporarily unavailable"
            }
    
    def _format_success_response(self, **kwargs) -> Dict[str, Any]:
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