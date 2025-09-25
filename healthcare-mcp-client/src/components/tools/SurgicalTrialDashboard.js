import React, { useState, useEffect } from 'react';

const SurgicalTrialDashboard = ({ 
  onLoadDashboard, 
  onMonitorTrials, 
  onTrackCompetitors, 
  onAnalyzeMarketTrends,
  isLoading = false,
  dashboardData = null,
  error = null 
}) => {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(['cardiovascular']);
  const [timePeriod, setTimePeriod] = useState(90);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentDashboardData, setCurrentDashboardData] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);

  const deviceCategories = [
    { id: 'cardiovascular', name: 'Cardiovascular', icon: '❤️' },
    { id: 'orthopedic', name: 'Orthopedic', icon: '🦴' },
    { id: 'surgical_robotics', name: 'Surgical Robotics', icon: '🤖' },
    { id: 'neurological', name: 'Neurological', icon: '🧠' },
    { id: 'diagnostic_imaging', name: 'Diagnostic Imaging', icon: '📡' },
    { id: 'ophthalmology', name: 'Ophthalmology', icon: '👁️' }
  ];

  const majorCompanies = [
    'Medtronic', 'Johnson & Johnson', 'Abbott', 'Boston Scientific',
    'Stryker', 'Zimmer Biomet', 'Edwards Lifesciences', 'Intuitive Surgical',
    'Smith & Nephew', 'Nevro', 'Teleflex', 'ConMed'
  ];

  // Company-specific data configurations
  const getCompanySpecificData = (company) => {
    const companyProfiles = {
      'Medtronic': {
        market_position: {
          total_trials: 45,
          active_trials: 28,
          pipeline_strength: 'Very Strong',
          therapeutic_areas: ['Cardiovascular Disease', 'Diabetes Management', 'Neurological Disorders', 'Spinal Care']
        },
        competitive_landscape: {
          market_share_by_trials: {
            'Medtronic': { trial_count: 45, market_share_percent: 25.7 },
            'Abbott': { trial_count: 32, market_share_percent: 18.3 },
            'Boston Scientific': { trial_count: 28, market_share_percent: 16.0 },
            'Johnson & Johnson': { trial_count: 25, market_share_percent: 14.3 },
            'Edwards Lifesciences': { trial_count: 20, market_share_percent: 11.4 },
            'Others': { trial_count: 25, market_share_percent: 14.3 }
          }
        },
        trial_pipeline: {
          by_phase: {
            'Phase I': [
              { trial_id: 'NCT05234567', title: 'Next-Gen Insulin Pump Safety Study', status: 'Recruiting' },
              { trial_id: 'NCT05234568', title: 'Advanced Cardiac Lead Technology', status: 'Active' },
              { trial_id: 'NCT05234569', title: 'Spinal Fusion Device Innovation', status: 'Recruiting' }
            ],
            'Phase II': [
              { trial_id: 'NCT05234570', title: 'AI-Enhanced Glucose Monitoring', status: 'Active' },
              { trial_id: 'NCT05234571', title: 'Minimally Invasive Heart Valve', status: 'Recruiting' }
            ],
            'Phase III': [
              { trial_id: 'NCT05234572', title: 'Large Scale Pacemaker Efficacy Study', status: 'Recruiting' },
              { trial_id: 'NCT05234573', title: 'Advanced Stent Platform Trial', status: 'Active' }
            ],
            'Phase IV': [
              { trial_id: 'NCT05234574', title: 'Post-Market Surveillance Study', status: 'Ongoing' }
            ]
          }
        },
        competitive_alerts: [
          {
            type: 'market_expansion',
            competitor: 'Abbott',
            message: 'Abbott launching 5 new cardiovascular trials in Q1 2024',
            severity: 'high',
            trials: [
              { title: 'Next-Gen Stent Platform Study', phase: 'Phase III' },
              { title: 'Cardiac Monitoring Innovation', phase: 'Phase II' }
            ]
          }
        ]
      },
      
      'Abbott': {
        market_position: {
          total_trials: 38,
          active_trials: 22,
          pipeline_strength: 'Strong',
          therapeutic_areas: ['Cardiovascular Disease', 'Diabetes Care', 'Diagnostics', 'Nutrition']
        },
        competitive_landscape: {
          market_share_by_trials: {
            'Abbott': { trial_count: 38, market_share_percent: 21.1 },
            'Medtronic': { trial_count: 45, market_share_percent: 25.0 },
            'Boston Scientific': { trial_count: 30, market_share_percent: 16.7 },
            'Johnson & Johnson': { trial_count: 25, market_share_percent: 13.9 },
            'Edwards Lifesciences': { trial_count: 18, market_share_percent: 10.0 },
            'Others': { trial_count: 24, market_share_percent: 13.3 }
          }
        },
        trial_pipeline: {
          by_phase: {
            'Phase I': [
              { trial_id: 'NCT05334567', title: 'Revolutionary CGM Technology', status: 'Recruiting' },
              { trial_id: 'NCT05334568', title: 'Next-Gen Heart Pump Device', status: 'Active' }
            ],
            'Phase II': [
              { trial_id: 'NCT05334569', title: 'Advanced Stent Coating Study', status: 'Recruiting' },
              { trial_id: 'NCT05334570', title: 'Glucose Sensor Accuracy Trial', status: 'Active' },
              { trial_id: 'NCT05334571', title: 'Cardiac Rhythm Management', status: 'Recruiting' }
            ],
            'Phase III': [
              { trial_id: 'NCT05334572', title: 'Large Scale TAVR Study', status: 'Active' },
              { trial_id: 'NCT05334573', title: 'Diabetes Management Platform', status: 'Recruiting' }
            ]
          }
        },
        competitive_alerts: [
          {
            type: 'new_competitor_activity',
            competitor: 'Medtronic',
            message: 'Medtronic accelerating diabetes device trials',
            severity: 'medium',
            trials: [
              { title: 'Competitive Insulin Pump Study', phase: 'Phase II' }
            ]
          }
        ]
      },

      'Boston Scientific': {
        market_position: {
          total_trials: 32,
          active_trials: 19,
          pipeline_strength: 'Strong',
          therapeutic_areas: ['Interventional Cardiology', 'Electrophysiology', 'Peripheral Interventions']
        },
        competitive_landscape: {
          market_share_by_trials: {
            'Boston Scientific': { trial_count: 32, market_share_percent: 18.9 },
            'Medtronic': { trial_count: 42, market_share_percent: 24.9 },
            'Abbott': { trial_count: 35, market_share_percent: 20.7 },
            'Johnson & Johnson': { trial_count: 22, market_share_percent: 13.0 },
            'Edwards Lifesciences': { trial_count: 15, market_share_percent: 8.9 },
            'Others': { trial_count: 23, market_share_percent: 13.6 }
          }
        },
        trial_pipeline: {
          by_phase: {
            'Phase I': [
              { trial_id: 'NCT05434567', title: 'Novel Electrophysiology Catheter', status: 'Recruiting' }
            ],
            'Phase II': [
              { trial_id: 'NCT05434568', title: 'Advanced Stent Design Study', status: 'Active' },
              { trial_id: 'NCT05434569', title: 'Peripheral Intervention Device', status: 'Recruiting' }
            ],
            'Phase III': [
              { trial_id: 'NCT05434570', title: 'Cardiac Ablation Technology', status: 'Active' },
              { trial_id: 'NCT05434571', title: 'Drug-Eluting Stent Platform', status: 'Recruiting' }
            ]
          }
        },
        competitive_alerts: [
          {
            type: 'technology_advancement',
            competitor: 'Abbott',
            message: 'Abbott advancing in electrophysiology space',
            severity: 'high',
            trials: [
              { title: 'Competing Ablation System', phase: 'Phase III' }
            ]
          }
        ]
      },

      'Stryker': {
        market_position: {
          total_trials: 29,
          active_trials: 17,
          pipeline_strength: 'Moderate',
          therapeutic_areas: ['Orthopedic Implants', 'Surgical Equipment', 'Neurotechnology']
        },
        competitive_landscape: {
          market_share_by_trials: {
            'Stryker': { trial_count: 29, market_share_percent: 19.5 },
            'Zimmer Biomet': { trial_count: 35, market_share_percent: 23.5 },
            'Johnson & Johnson': { trial_count: 32, market_share_percent: 21.5 },
            'Smith & Nephew': { trial_count: 22, market_share_percent: 14.8 },
            'Medtronic': { trial_count: 18, market_share_percent: 12.1 },
            'Others': { trial_count: 13, market_share_percent: 8.7 }
          }
        },
        trial_pipeline: {
          by_phase: {
            'Phase I': [
              { trial_id: 'NCT05534567', title: 'Robotic Joint Replacement System', status: 'Recruiting' }
            ],
            'Phase II': [
              { trial_id: 'NCT05534568', title: 'Advanced Hip Implant Design', status: 'Active' },
              { trial_id: 'NCT05534569', title: 'Neurosurgical Navigation Tech', status: 'Recruiting' }
            ],
            'Phase III': [
              { trial_id: 'NCT05534570', title: 'Total Knee Replacement Study', status: 'Active' }
            ]
          }
        },
        competitive_alerts: [
          {
            type: 'market_threat',
            competitor: 'Zimmer Biomet',
            message: 'Zimmer Biomet expanding robotic surgery portfolio',
            severity: 'high',
            trials: [
              { title: 'Competing Robotic Platform', phase: 'Phase II' }
            ]
          }
        ]
      },

      'Johnson & Johnson': {
        market_position: {
          total_trials: 41,
          active_trials: 25,
          pipeline_strength: 'Very Strong',
          therapeutic_areas: ['Surgical Robotics', 'Orthopedics', 'Cardiovascular', 'Vision Care']
        },
        competitive_landscape: {
          market_share_by_trials: {
            'Johnson & Johnson': { trial_count: 41, market_share_percent: 22.4 },
            'Medtronic': { trial_count: 38, market_share_percent: 20.8 },
            'Abbott': { trial_count: 33, market_share_percent: 18.0 },
            'Stryker': { trial_count: 28, market_share_percent: 15.3 },
            'Boston Scientific': { trial_count: 24, market_share_percent: 13.1 },
            'Others': { trial_count: 19, market_share_percent: 10.4 }
          }
        },
        trial_pipeline: {
          by_phase: {
            'Phase I': [
              { trial_id: 'NCT05634567', title: 'Advanced Surgical Robot Platform', status: 'Recruiting' },
              { trial_id: 'NCT05634568', title: 'Smart Intraocular Lens', status: 'Active' }
            ],
            'Phase II': [
              { trial_id: 'NCT05634569', title: 'Robotic Spine Surgery System', status: 'Recruiting' },
              { trial_id: 'NCT05634570', title: 'Next-Gen Hip Replacement', status: 'Active' }
            ],
            'Phase III': [
              { trial_id: 'NCT05634571', title: 'Multi-Site Robotic Surgery Trial', status: 'Active' },
              { trial_id: 'NCT05634572', title: 'Cardiovascular Device Platform', status: 'Recruiting' }
            ]
          }
        },
        competitive_alerts: [
          {
            type: 'innovation_race',
            competitor: 'Intuitive Surgical',
            message: 'Intuitive Surgical advancing next-gen robotic platforms',
            severity: 'high',
            trials: [
              { title: 'Competing Multi-Port System', phase: 'Phase III' }
            ]
          }
        ]
      }
    };

    return companyProfiles[company] || {
      market_position: {
        total_trials: 0,
        active_trials: 0,
        pipeline_strength: 'N/A',
        therapeutic_areas: []
      },
      competitive_landscape: { market_share_by_trials: {} },
      trial_pipeline: { by_phase: {} },
      competitive_alerts: []
    };
  };

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const loadDashboard = async () => {
    if (!selectedCompany) return;
    
    setLocalLoading(true);
    try {
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to call backend API first (if available)
      if (onLoadDashboard) {
        try {
          await onLoadDashboard(selectedCompany, selectedCategories, timePeriod);
        } catch (error) {
          console.warn('Backend API not available, using mock data:', error);
        }
      }
      
      // Always set company-specific data as fallback
      const companyData = getCompanySpecificData(selectedCompany);
      setCurrentDashboardData(companyData);
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Still show mock data even if there's an error
      const companyData = getCompanySpecificData(selectedCompany);
      setCurrentDashboardData(companyData);
    }
    setLocalLoading(false);
  };

  // Update data when company changes
  useEffect(() => {
    if (selectedCompany) {
      const companyData = getCompanySpecificData(selectedCompany);
      setCurrentDashboardData(companyData);
    } else {
      setCurrentDashboardData(null);
    }
  }, [selectedCompany]);

  // Use either API data or company-specific mock data
  const data = dashboardData || currentDashboardData;
  const currentLoading = isLoading || localLoading;

  // Simple CSS-based chart components
  const SimpleBarChart = ({ data, title }) => (
    <div className="bg-white p-4 rounded-lg border">
      <h4 className="font-medium text-gray-900 mb-4">{title}</h4>
      <div className="space-y-3">
        {Object.entries(data || {}).map(([label, value]) => {
          const count = typeof value === 'object' ? value.trial_count || value.count : value;
          const maxValue = Math.max(...Object.values(data || {}).map(v => typeof v === 'object' ? (v.trial_count || v.count) : v));
          const width = maxValue > 0 ? (count / maxValue) * 100 : 0;
          
          return (
            <div key={label} className="flex items-center space-x-3">
              <div className="w-24 text-xs text-gray-600 flex-shrink-0 truncate">{label}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                <div 
                  className="bg-teal-600 h-4 rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${Math.max(width, 10)}%` }}
                >
                  <span className="text-xs text-white font-medium">
                    {count}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const SimplePieChart = ({ data, title }) => {
    const entries = Object.entries(data || {});
    if (entries.length === 0) return null;
    
    const total = entries.reduce((sum, [, val]) => {
      return sum + (typeof val === 'object' ? val.trial_count : val);
    }, 0);

    return (
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="font-medium text-gray-900 mb-4">{title}</h4>
        <div className="space-y-2">
          {entries.map(([label, value], index) => {
            const count = typeof value === 'object' ? value.trial_count : value;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-indigo-500'];
            
            return (
              <div key={label} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded ${colors[index % colors.length]}`}></div>
                <span className="text-sm text-gray-700 truncate flex-1">{label}</span>
                <span className="text-sm font-medium text-gray-900">
                  {count} ({percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOverviewTab = () => {
    if (!data) return null;

    const marketShareData = data.competitive_landscape?.market_share_by_trials || {};
    const phaseData = {};
    
    // Calculate phase distribution
    Object.entries(data.trial_pipeline?.by_phase || {}).forEach(([phase, trials]) => {
      phaseData[phase] = trials.length;
    });

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Total Trials</p>
                <p className="text-3xl font-bold text-blue-900">{data.market_position?.total_trials || 0}</p>
              </div>
              <div className="text-2xl">🧪</div>
            </div>
            <p className="text-xs text-blue-700 mt-1">Last {timePeriod} days</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900">Active Trials</p>
                <p className="text-3xl font-bold text-green-900">{data.market_position?.active_trials || 0}</p>
              </div>
              <div className="text-2xl">🟢</div>
            </div>
            <p className="text-xs text-green-700 mt-1">Currently recruiting</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-900">Pipeline Strength</p>
                <p className="text-2xl font-bold text-purple-900">{data.market_position?.pipeline_strength || 'N/A'}</p>
              </div>
              <div className="text-2xl">💪</div>
            </div>
            <p className="text-xs text-purple-700 mt-1">Based on phase distribution</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-900">Competitive Alerts</p>
                <p className="text-3xl font-bold text-orange-900">{data.competitive_alerts?.length || 0}</p>
              </div>
              <div className="text-2xl">⚠️</div>
            </div>
            <p className="text-xs text-orange-700 mt-1">Requires attention</p>
          </div>
        </div>

        {/* Company Focus Areas */}
        {selectedCompany && data.market_position?.therapeutic_areas && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{selectedCompany} - Key Therapeutic Areas</h3>
            <div className="flex flex-wrap gap-2">
              {data.market_position.therapeutic_areas.map((area, index) => (
                <span key={index} className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium">
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          <SimplePieChart 
            data={marketShareData} 
            title="Market Share by Trial Count" 
          />
          <SimpleBarChart 
            data={phaseData} 
            title="Trial Pipeline by Phase" 
          />
        </div>

        {/* Competitive Alerts */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Competitive Intelligence Alerts</h3>
          {(data.competitive_alerts || []).length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-gray-500">No competitive alerts at this time</p>
              <p className="text-xs text-gray-400 mt-1">Alerts will appear here when competitor activity is detected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(data.competitive_alerts || []).map((alert, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'high' ? 'border-red-500 bg-red-50' :
                  alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{alert.competitor}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                      {alert.trials && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-600">Key Trials:</p>
                          {alert.trials.map((trial, trialIndex) => (
                            <p key={trialIndex} className="text-xs text-gray-600">
                              • {trial.title} ({trial.phase})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <button className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCompetitorsTab = () => {
    if (!data) return null;

    const competitorData = Object.entries(data.competitive_landscape?.market_share_by_trials || {})
      .filter(([company]) => company !== selectedCompany)
      .sort((a, b) => b[1].trial_count - a[1].trial_count);

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Competitor Analysis - {selectedCompany} vs Market
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Trials
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Market Share
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {competitorData.map(([company, companyData], index) => (
                  <tr key={company} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{company}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{companyData.trial_count}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900">{companyData.market_share_percent}%</div>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-teal-600 h-2 rounded-full" 
                            style={{width: `${Math.min(companyData.market_share_percent * 4, 100)}%`}}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        index % 3 === 0 ? 'bg-green-100 text-green-800' : 
                        index % 3 === 1 ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {index % 3 === 0 ? '↗ Growing' : index % 3 === 1 ? '↘ Declining' : '→ Stable'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-teal-600 hover:text-teal-900 mr-3">
                        View Trials
                      </button>
                      <button className="text-teal-600 hover:text-teal-900">
                        Deep Dive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderTrialsTab = () => {
    if (!data) return null;

    const totalTrials = Object.values(data.trial_pipeline?.by_phase || {}).flat().length;

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedCompany} Trial Pipeline Overview
            </h3>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Total Trials: {totalTrials}</span>
              <div className="flex space-x-2">
                <button className="px-3 py-1 text-sm bg-teal-100 text-teal-700 rounded-full">
                  All Phases
                </button>
                <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200">
                  Active Only
                </button>
              </div>
            </div>
          </div>

          {Object.keys(data.trial_pipeline?.by_phase || {}).length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔬</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Trial Data Available</h3>
              <p className="text-gray-600">Select a company to view their trial pipeline</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(data.trial_pipeline.by_phase).map(([phase, trials]) => (
                <div key={phase} className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{phase}</h4>
                      <span className="bg-teal-100 text-teal-800 text-xs font-medium px-2 py-1 rounded-full">
                        {trials.length} trial{trials.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {trials.map((trial, index) => (
                        <div key={index} className="flex items-start justify-between p-3 bg-white border border-gray-100 rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 mb-1">{trial.title}</h5>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>ID: {trial.trial_id}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                trial.status === 'Recruiting' ? 'bg-green-100 text-green-800' :
                                trial.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                                trial.status === 'Ongoing' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {trial.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                              View Details
                            </button>
                            <button className="text-sm text-gray-500 hover:text-gray-700">
                              Monitor
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderInsightsTab = () => {
    if (!selectedCompany) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💡</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Company</h3>
          <p className="text-gray-600">Choose a company to view market insights and analysis</p>
        </div>
      );
    }

    const getMarketInsights = (company) => {
      const insights = {
        'Medtronic': [
          'Leading in diabetes management with 35% market share in CGM trials',
          'Strong pipeline in neurological devices with 12 active studies',
          'Expanding into AI-powered cardiac monitoring solutions',
          'Geographic expansion in Asia-Pacific markets showing 25% growth'
        ],
        'Abbott': [
          'Dominating continuous glucose monitoring with FreeStyle platform',
          'Accelerating structural heart portfolio with 8 TAVR trials',
          'Focus on digital health integration and remote patient monitoring',
          'Strong competition in cardiac rhythm management space'
        ],
        'Boston Scientific': [
          'Leading innovation in electrophysiology with 15 active trials',
          'Expanding peripheral intervention portfolio significantly',
          'Strong focus on minimally invasive cardiac procedures',
          'Geographic expansion in emerging markets'
        ],
        'Stryker': [
          'Robotic surgery portfolio gaining momentum with Mako platform',
          'Strong position in joint replacement market',
          'Investing heavily in neurotechnology and spine solutions',
          'Focus on AI-enhanced surgical navigation systems'
        ],
        'Johnson & Johnson': [
          'Diversified portfolio across multiple therapeutic areas',
          'Strong robotic surgery presence competing with Intuitive',
          'Leading innovation in orthopedic implants and instruments',
          'Significant investment in digital surgery platforms'
        ]
      };
      
      return insights[company] || [
        'Emerging player in medical device innovation',
        'Focus on specialized therapeutic areas',
        'Building competitive pipeline in selected segments',
        'Opportunities for strategic partnerships and expansion'
      ];
    };

    const insights = getMarketInsights(selectedCompany);
    
    return (
      <div className="space-y-6">
        {/* Market Insights */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Market Insights for {selectedCompany}
          </h3>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="text-blue-600 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-gray-700">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Strategic Recommendations */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategic Recommendations</h3>
          <div className="space-y-4">
            {selectedCompany === 'Medtronic' && [
              {
                title: 'Accelerate AI Integration',
                description: 'Invest in AI-powered glucose monitoring to maintain CGM leadership',
                priority: 'High',
                timeline: 'Q2 2024'
              },
              {
                title: 'Expand Neurotechnology Pipeline',
                description: 'Leverage strong neurology portfolio for new therapeutic applications',
                priority: 'Medium',
                timeline: 'Q3 2024'
              }
            ].map((rec, index) => (
              <div key={index} className="p-4 border-l-4 border-teal-500 bg-teal-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    <p className="text-sm text-gray-700 mt-1">{rec.description}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rec.priority === 'High' ? 'bg-red-100 text-red-800' :
                      rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {rec.priority}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{rec.timeline}</p>
                  </div>
                </div>
              </div>
            ))}

            {!['Medtronic'].includes(selectedCompany) && [
              {
                title: 'Focus on Differentiation',
                description: 'Identify unique value propositions in competitive segments',
                priority: 'High',
                timeline: 'Q1 2024'
              },
              {
                title: 'Strategic Partnerships',
                description: 'Explore partnerships to accelerate market access and development',
                priority: 'Medium',
                timeline: 'Q2 2024'
              }
            ].map((rec, index) => (
              <div key={index} className="p-4 border-l-4 border-teal-500 bg-teal-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    <p className="text-sm text-gray-700 mt-1">{rec.description}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rec.priority === 'High' ? 'bg-red-100 text-red-800' :
                      rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {rec.priority}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{rec.timeline}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Surgical Trial Intelligence Dashboard</h1>
        <p className="text-gray-600">Monitor global surgical trial registries and competitive device studies</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Configuration</h2>
        
        <div className="grid grid-cols-3 gap-6">
          {/* Company Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company to Analyze
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="">Select a company</option>
              {majorCompanies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>

          {/* Device Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Device Categories
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {deviceCategories.map(category => (
                <label key={category.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="rounded text-teal-600 mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    {category.icon} {category.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Time Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Analysis Period
            </label>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 6 months</option>
              <option value={365}>Last year</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={loadDashboard}
            disabled={!selectedCompany || currentLoading}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              !selectedCompany || currentLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-teal-600 text-white hover:bg-teal-700'
            }`}
          >
            {currentLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Loading...</span>
              </div>
            ) : (
              'Generate Dashboard'
            )}
          </button>
        </div>
      </div>

      {/* Dashboard Content */}
      {selectedCompany && !currentLoading && (
        <div>
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'competitors', name: 'Competitors', icon: '🏢' },
                { id: 'trials', name: 'Trial Pipeline', icon: '🧪' },
                { id: 'insights', name: 'Market Insights', icon: '💡' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'competitors' && renderCompetitorsTab()}
          {activeTab === 'trials' && renderTrialsTab()}
          {activeTab === 'insights' && renderInsightsTab()}
        </div>
      )}

      {!selectedCompany && !currentLoading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Company to Begin</h3>
          <p className="text-gray-600">Choose a medical device company to analyze their competitive landscape and trial pipeline.</p>
        </div>
      )}
    </div>
  );
};

export default SurgicalTrialDashboard;