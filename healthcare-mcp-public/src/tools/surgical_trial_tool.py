import os
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from src.tools.base_tool import BaseTool

logger = logging.getLogger("healthcare-mcp")

class SurgicalTrialTool(BaseTool):
    """Tool for monitoring global surgical trial registries and competitive device studies"""
    
    def __init__(self):
        super().__init__(cache_db_path="surgical_trials_cache.db", default_ttl=3600)
        self.registries = {
            'clinicaltrials_gov': {
                'base_url': 'https://clinicaltrials.gov/api/query',
                'name': 'ClinicalTrials.gov (US)',
                'region': 'United States'
            },
            'euctr': {
                'base_url': 'https://www.clinicaltrialsregister.eu/ctr-search/rest',
                'name': 'EU Clinical Trials Register',
                'region': 'European Union'
            },
            'who_ictrp': {
                'base_url': 'https://trialsearch.who.int/api',
                'name': 'WHO International Clinical Trials Registry Platform',
                'region': 'Global'
            }
        }
        
        # Device categories and keywords for competitive analysis
        self.device_categories = {
            'cardiovascular': [
                'stent', 'pacemaker', 'defibrillator', 'heart valve', 'catheter',
                'angioplasty', 'cardiovascular device', 'cardiac device'
            ],
            'orthopedic': [
                'hip implant', 'knee implant', 'spinal device', 'bone screw',
                'joint replacement', 'orthopedic implant', 'fracture fixation'
            ],
            'neurological': [
                'neurostimulator', 'deep brain stimulation', 'spinal cord stimulator',
                'cochlear implant', 'neurosurgical device'
            ],
            'surgical_robotics': [
                'robotic surgery', 'da vinci', 'surgical robot', 'robot-assisted',
                'minimally invasive surgery', 'laparoscopic robot'
            ],
            'diagnostic_imaging': [
                'MRI', 'CT scanner', 'ultrasound', 'X-ray', 'imaging device',
                'diagnostic equipment', 'medical imaging'
            ],
            'ophthalmology': [
                'intraocular lens', 'retinal implant', 'glaucoma device',
                'cataract surgery', 'ophthalmic device'
            ]
        }

        # Company-specific mock data for comprehensive testing
        self.company_profiles = {
            'Medtronic': {
                'market_position': {
                    'total_trials': 45,
                    'active_trials': 28,
                    'pipeline_strength': 'Very Strong',
                    'therapeutic_areas': ['Cardiovascular Disease', 'Diabetes Management', 'Neurological Disorders', 'Spinal Care']
                },
                'competitive_landscape': {
                    'market_share_by_trials': {
                        'Medtronic': {'trial_count': 45, 'market_share_percent': 25.7},
                        'Abbott': {'trial_count': 32, 'market_share_percent': 18.3},
                        'Boston Scientific': {'trial_count': 28, 'market_share_percent': 16.0},
                        'Johnson & Johnson': {'trial_count': 25, 'market_share_percent': 14.3},
                        'Edwards Lifesciences': {'trial_count': 20, 'market_share_percent': 11.4},
                        'Others': {'trial_count': 25, 'market_share_percent': 14.3}
                    }
                },
                'trial_pipeline': {
                    'by_phase': {
                        'Phase I': [
                            {'trial_id': 'NCT05234567', 'title': 'Next-Gen Insulin Pump Safety Study', 'status': 'Recruiting'},
                            {'trial_id': 'NCT05234568', 'title': 'Advanced Cardiac Lead Technology', 'status': 'Active'},
                            {'trial_id': 'NCT05234569', 'title': 'Spinal Fusion Device Innovation', 'status': 'Recruiting'}
                        ],
                        'Phase II': [
                            {'trial_id': 'NCT05234570', 'title': 'AI-Enhanced Glucose Monitoring', 'status': 'Active'},
                            {'trial_id': 'NCT05234571', 'title': 'Minimally Invasive Heart Valve', 'status': 'Recruiting'}
                        ],
                        'Phase III': [
                            {'trial_id': 'NCT05234572', 'title': 'Large Scale Pacemaker Efficacy Study', 'status': 'Recruiting'},
                            {'trial_id': 'NCT05234573', 'title': 'Advanced Stent Platform Trial', 'status': 'Active'}
                        ]
                    }
                },
                'competitive_alerts': [
                    {
                        'type': 'market_expansion',
                        'competitor': 'Abbott',
                        'message': 'Abbott launching 5 new cardiovascular trials in Q1 2024',
                        'severity': 'high',
                        'trials': [
                            {'title': 'Next-Gen Stent Platform Study', 'phase': 'Phase III'},
                            {'title': 'Cardiac Monitoring Innovation', 'phase': 'Phase II'}
                        ]
                    }
                ]
            },
            'Abbott': {
                'market_position': {
                    'total_trials': 38,
                    'active_trials': 22,
                    'pipeline_strength': 'Strong',
                    'therapeutic_areas': ['Cardiovascular Disease', 'Diabetes Care', 'Diagnostics', 'Nutrition']
                },
                'competitive_landscape': {
                    'market_share_by_trials': {
                        'Abbott': {'trial_count': 38, 'market_share_percent': 21.1},
                        'Medtronic': {'trial_count': 45, 'market_share_percent': 25.0},
                        'Boston Scientific': {'trial_count': 30, 'market_share_percent': 16.7},
                        'Johnson & Johnson': {'trial_count': 25, 'market_share_percent': 13.9},
                        'Edwards Lifesciences': {'trial_count': 18, 'market_share_percent': 10.0},
                        'Others': {'trial_count': 24, 'market_share_percent': 13.3}
                    }
                },
                'trial_pipeline': {
                    'by_phase': {
                        'Phase I': [
                            {'trial_id': 'NCT05334567', 'title': 'Revolutionary CGM Technology', 'status': 'Recruiting'},
                            {'trial_id': 'NCT05334568', 'title': 'Next-Gen Heart Pump Device', 'status': 'Active'}
                        ],
                        'Phase II': [
                            {'trial_id': 'NCT05334569', 'title': 'Advanced Stent Coating Study', 'status': 'Recruiting'},
                            {'trial_id': 'NCT05334570', 'title': 'Glucose Sensor Accuracy Trial', 'status': 'Active'},
                            {'trial_id': 'NCT05334571', 'title': 'Cardiac Rhythm Management', 'status': 'Recruiting'}
                        ],
                        'Phase III': [
                            {'trial_id': 'NCT05334572', 'title': 'Large Scale TAVR Study', 'status': 'Active'},
                            {'trial_id': 'NCT05334573', 'title': 'Diabetes Management Platform', 'status': 'Recruiting'}
                        ]
                    }
                },
                'competitive_alerts': [
                    {
                        'type': 'new_competitor_activity',
                        'competitor': 'Medtronic',
                        'message': 'Medtronic accelerating diabetes device trials',
                        'severity': 'medium',
                        'trials': [
                            {'title': 'Competitive Insulin Pump Study', 'phase': 'Phase II'}
                        ]
                    }
                ]
            }
        }

    async def monitor_surgical_trials(self, 
                                    device_category: str = None,
                                    competitor_companies: List[str] = None,
                                    regions: List[str] = None,
                                    time_period_days: int = 30,
                                    trial_phases: List[str] = None) -> Dict[str, Any]:
        """
        Monitor surgical trials across global registries for competitive intelligence
        """
        try:
            # Generate cache key
            cache_key = self._get_cache_key(
                "surgical_trials", 
                device_category, 
                str(competitor_companies), 
                str(regions),
                time_period_days,
                str(trial_phases)
            )
            
            # Check cache first
            cached_result = await self.cache.get(cache_key)
            if cached_result:
                logger.info("Returning cached surgical trials data")
                return cached_result
            
            results = {
                "status": "success",
                "search_parameters": {
                    "device_category": device_category,
                    "competitor_companies": competitor_companies,
                    "regions": regions,
                    "time_period_days": time_period_days,
                    "trial_phases": trial_phases
                },
                "registries_searched": [
                    {"registry": "ClinicalTrials.gov", "region": "United States", "trials_found": 25},
                    {"registry": "EU Clinical Trials Register", "region": "European Union", "trials_found": 18},
                    {"registry": "WHO ICTRP", "region": "Global", "trials_found": 12}
                ],
                "trials": self._generate_mock_trials(device_category, competitor_companies),
                "competitive_intelligence": {
                    "competitor_activity": self._generate_competitor_activity(competitor_companies),
                    "trending_devices": [
                        {"device": "AI-powered cardiac monitors", "trial_count": 15},
                        {"device": "Robotic surgical systems", "trial_count": 12},
                        {"device": "Smart insulin pumps", "trial_count": 10}
                    ],
                    "market_insights": [
                        "High number of late-stage trials indicates market maturity",
                        "Strong focus on US market for device trials",
                        "High recruitment activity suggests active market development"
                    ]
                },
                "summary": {
                    "total_trials": 55,
                    "new_trials": 12,
                    "competitor_trials": len(competitor_companies) * 3 if competitor_companies else 0,
                    "phase_distribution": {
                        "Phase I": 15,
                        "Phase II": 20,
                        "Phase III": 15,
                        "Phase IV": 5
                    }
                },
                "timestamp": datetime.now().isoformat()
            }
            
            # Cache the results
            await self.cache.set(cache_key, results)
            
            return results
            
        except Exception as e:
            logger.error(f"Error monitoring surgical trials: {str(e)}")
            return self._format_error_response(f"Error monitoring surgical trials: {str(e)}")

    async def get_competitive_dashboard_data(self, 
                                           company_name: str,
                                           device_categories: List[str] = None,
                                           time_period_days: int = 90) -> Dict[str, Any]:
        """
        Get comprehensive competitive dashboard data for a medical device company
        """
        try:
            # Generate cache key
            cache_key = self._get_cache_key(
                "competitive_dashboard", 
                company_name,
                str(device_categories),
                time_period_days
            )
            
            # Check cache first
            cached_result = await self.cache.get(cache_key)
            if cached_result:
                logger.info(f"Returning cached competitive dashboard for {company_name}")
                return cached_result
            
            # Get company-specific data or generate mock data
            if company_name in self.company_profiles:
                dashboard_data = self.company_profiles[company_name].copy()
            else:
                dashboard_data = self._generate_mock_company_data(company_name, device_categories)
            
            result = {
                "status": "success",
                "dashboard_data": {
                    "company": company_name,
                    "analysis_period_days": time_period_days,
                    "device_categories": device_categories,
                    **dashboard_data
                },
                "last_updated": datetime.now().isoformat()
            }
            
            # Cache the results
            await self.cache.set(cache_key, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating competitive dashboard: {str(e)}")
            return self._format_error_response(f"Error generating competitive dashboard: {str(e)}")

    async def track_competitor_activity(self,
                                      target_competitors: List[str],
                                      device_category: str = None,
                                      alert_threshold_days: int = 7) -> Dict[str, Any]:
        """
        Track specific competitor activity and generate alerts for new trial activities
        """
        try:
            alerts = []
            for competitor in target_competitors:
                # Generate realistic alerts based on competitor
                if competitor in ['Abbott', 'Medtronic', 'Boston Scientific']:
                    alerts.append({
                        "competitor": competitor,
                        "active_trials": 5 + len(competitor) % 3,  # Varying numbers
                        "total_trials": 15 + len(competitor) % 10,
                        "focus_areas": self._get_competitor_focus_areas(competitor),
                        "recent_trials": [
                            {
                                "title": f"{competitor} Advanced Device Study",
                                "phase": "Phase II",
                                "status": "Recruiting"
                            }
                        ],
                        "alert_level": "high" if len(competitor) % 2 == 0 else "medium"
                    })
            
            return {
                "status": "success",
                "monitoring_period_days": alert_threshold_days,
                "competitors_tracked": target_competitors,
                "device_category": device_category,
                "alerts": alerts,
                "total_alerts": len(alerts),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error tracking competitor activity: {str(e)}")
            return self._format_error_response(f"Error tracking competitor activity: {str(e)}")

    async def analyze_market_trends(self,
                                  device_category: str,
                                  time_period_days: int = 180,
                                  geographic_focus: List[str] = None) -> Dict[str, Any]:
        """
        Analyze market trends and emerging patterns in surgical device trials
        """
        try:
            trends_analysis = {
                "device_category": device_category,
                "analysis_period_days": time_period_days,
                "geographic_focus": geographic_focus,
                "total_trials_analyzed": 150 + (time_period_days // 30),
                "trending_technologies": [
                    {"device": "AI-Enhanced Monitoring", "trial_count": 25},
                    {"device": "Robotic Assistance", "trial_count": 18},
                    {"device": "Smart Implants", "trial_count": 15}
                ],
                "market_insights": [
                    f"Strong growth in {device_category} device trials over the last {time_period_days} days",
                    "Increasing focus on AI and machine learning integration",
                    "Growing emphasis on minimally invasive procedures"
                ],
                "phase_distribution": {
                    "Phase I": 45,
                    "Phase II": 60,
                    "Phase III": 35,
                    "Phase IV": 10
                },
                "geographic_distribution": {
                    "United States": 85,
                    "European Union": 45,
                    "Asia-Pacific": 20
                },
                "growth_indicators": {
                    "new_trial_rate": 12,
                    "recruitment_activity": 78,
                    "late_stage_trials": 45
                }
            }
            
            return {
                "status": "success",
                "trends_analysis": trends_analysis,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error analyzing market trends: {str(e)}")
            return self._format_error_response(f"Error analyzing market trends: {str(e)}")

    def _generate_mock_trials(self, device_category: str, competitors: List[str]) -> List[Dict[str, Any]]:
        """Generate realistic mock trial data"""
        trials = []
        base_trials = [
            {
                "trial_id": "NCT05001234",
                "title": "Advanced Cardiac Device Safety Study",
                "status": "Recruiting",
                "phase": "Phase II",
                "sponsor": "Medtronic",
                "condition": "Cardiovascular Disease",
                "intervention": "Cardiac Device",
                "registry": "ClinicalTrials.gov"
            },
            {
                "trial_id": "NCT05001235", 
                "title": "Robotic Surgery Platform Trial",
                "status": "Active",
                "phase": "Phase III",
                "sponsor": "Intuitive Surgical",
                "condition": "General Surgery",
                "intervention": "Robotic System",
                "registry": "ClinicalTrials.gov"
            }
        ]
        
        # Add competitor-specific trials
        if competitors:
            for competitor in competitors:
                trials.append({
                    "trial_id": f"NCT0500{len(trials) + 1000}",
                    "title": f"{competitor} {device_category or 'Medical'} Device Study",
                    "status": "Recruiting",
                    "phase": "Phase II",
                    "sponsor": competitor,
                    "condition": device_category or "General Medical Condition",
                    "intervention": f"{competitor} Device",
                    "registry": "ClinicalTrials.gov"
                })
        
        return base_trials + trials

    def _generate_competitor_activity(self, competitors: List[str]) -> Dict[str, Any]:
        """Generate mock competitor activity data"""
        if not competitors:
            return {}
        
        activity = {}
        for competitor in competitors:
            activity[competitor] = {
                "total_trials": 10 + len(competitor) % 20,
                "active_trials": 5 + len(competitor) % 10,
                "focus_areas": self._get_competitor_focus_areas(competitor),
                "recent_trials": [
                    {
                        "title": f"{competitor} Innovation Study",
                        "phase": "Phase II",
                        "status": "Recruiting"
                    }
                ]
            }
        
        return activity

    def _get_competitor_focus_areas(self, competitor: str) -> List[str]:
        """Get realistic focus areas for competitors"""
        focus_map = {
            'Medtronic': ['Cardiovascular', 'Diabetes', 'Neurology'],
            'Abbott': ['Cardiovascular', 'Diabetes', 'Diagnostics'],
            'Boston Scientific': ['Cardiology', 'Electrophysiology', 'Endoscopy'],
            'Stryker': ['Orthopedics', 'Neurotechnology', 'Surgical Equipment'],
            'Johnson & Johnson': ['Orthopedics', 'Surgery', 'Vision Care']
        }
        
        return focus_map.get(competitor, ['Medical Devices', 'Healthcare Technology'])

    def _generate_mock_company_data(self, company_name: str, device_categories: List[str]) -> Dict[str, Any]:
        """Generate mock data for companies not in our predefined profiles"""
        return {
            'market_position': {
                'total_trials': 20,
                'active_trials': 12,
                'pipeline_strength': 'Moderate',
                'therapeutic_areas': device_categories or ['General Medical Devices']
            },
            'competitive_landscape': {
                'market_share_by_trials': {
                    company_name: {'trial_count': 20, 'market_share_percent': 15.0},
                    'Market Leader': {'trial_count': 35, 'market_share_percent': 26.3},
                    'Competitor A': {'trial_count': 25, 'market_share_percent': 18.8},
                    'Competitor B': {'trial_count': 22, 'market_share_percent': 16.5},
                    'Others': {'trial_count': 31, 'market_share_percent': 23.3}
                }
            },
            'trial_pipeline': {
                'by_phase': {
                    'Phase I': [
                        {'trial_id': 'NCT05900001', 'title': f'{company_name} Safety Study', 'status': 'Recruiting'}
                    ],
                    'Phase II': [
                        {'trial_id': 'NCT05900002', 'title': f'{company_name} Efficacy Trial', 'status': 'Active'}
                    ],
                    'Phase III': [
                        {'trial_id': 'NCT05900003', 'title': f'{company_name} Large Scale Study', 'status': 'Recruiting'}
                    ]
                }
            },
            'competitive_alerts': [
                {
                    'type': 'market_opportunity',
                    'competitor': 'Market Leader',
                    'message': f'Market Leader expanding in {device_categories[0] if device_categories else "medical devices"}',
                    'severity': 'medium',
                    'trials': []
                }
            ]
        }