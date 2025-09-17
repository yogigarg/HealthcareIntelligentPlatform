import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import Login from './components/Login';
import AISidekick from './components/sidekick/AISidekick';
import DebugPanel from './components/DebugPanel';
import MCPTester from './components/MCPTester';
import PubMedSearch from './components/tools/PubMedSearch';
import HealthTopics from './components/tools/HealthTopics';
import ICD10Lookup from './components/tools/ICD10Lookup';
import MedicalTerminology from './components/tools/MedicalTerminology';
import mcpClient from './services/mcpClient';
import agentFactory from './services/multiAgent';

const MODEL = process.env.REACT_APP_OPENAI_MODEL || 'gpt-4-turbo-preview';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('query');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('fda_agent');
  const [agents, setAgents] = useState([]);
  const [queryHistory, setQueryHistory] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTester, setShowTester] = useState(false);
  
  // Drug Info states
  const [drugName, setDrugName] = useState('');
  const [drugSearchType, setDrugSearchType] = useState('general');
  const [drugResult, setDrugResult] = useState(null);
  
  // Clinical Trials states
  const [condition, setCondition] = useState('');
  const [trialStatus, setTrialStatus] = useState('recruiting');
  const [trialsResult, setTrialsResult] = useState(null);
  
  // Drug Interactions states
  const [drug1, setDrug1] = useState('');
  const [drug2, setDrug2] = useState('');
  const [interactionResult, setInteractionResult] = useState(null);

  const user = {
    name: 'Dr. Sarah Johnson',
    organization: 'Jade Medical Center',
    initials: 'SJ'
  };

  useEffect(() => {
    // Check if user is already logged in (you can use localStorage in a real app)
    const loggedIn = sessionStorage.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(loggedIn);
    
    if (loggedIn) {
      initializeSystem();
    }
    
    // Add keyboard shortcut for developer tools
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowTester(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const initializeSystem = async () => {
    try {
      await agentFactory.initialize();
      setAgents(agentFactory.getAllAgents());
    } catch (error) {
      console.error('Initialization error:', error);
    }
  };

  const handleLogin = (success) => {
    if (success) {
      setIsAuthenticated(true);
      sessionStorage.setItem('isAuthenticated', 'true');
      initializeSystem();
    }
  };

  const handleLogout = () => {
    // Clear MCP session ID
    mcpClient.clearSessionId();
    
    // Clear all application state
    setIsAuthenticated(false);
    setActiveTab('query');
    setQuery('');
    setResult(null);
    setLoading(false);
    setSelectedAgent('fda_agent');
    setAgents([]);
    setQueryHistory([]);
    setShowAdvanced(false);
    setShowTester(false);
    
    // Clear drug info states
    setDrugName('');
    setDrugSearchType('general');
    setDrugResult(null);
    
    // Clear clinical trials states
    setCondition('');
    setTrialStatus('recruiting');
    setTrialsResult(null);
    
    // Clear drug interactions states
    setDrug1('');
    setDrug2('');
    setInteractionResult(null);
    
    // Clear session storage
    sessionStorage.clear();
    
    // Note: The server-side cache will be cleared automatically when a new session ID is generated
    // on the next login, as each session has its own cache context
  };

  const submitQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await agentFactory.routeQuery(selectedAgent, query);
      setResult(response);
      
      // Add to history
      setQueryHistory(prev => [{
        id: Date.now(),
        query,
        agent: selectedAgent,
        timestamp: new Date().toLocaleString(),
        response: response.response
      }, ...prev.slice(0, 9)]);
      
    } catch (error) {
      setResult({ error: error.message });
    }
    
    setLoading(false);
  };

  const searchDrug = async () => {
    if (!drugName.trim()) return;
    
    setLoading(true);
    setDrugResult(null);
    
    try {
      console.log('Searching for drug:', drugName, 'Type:', drugSearchType);
      const response = await mcpClient.callTool('fda_drug_lookup', {
        drug_name: drugName,
        search_type: drugSearchType
      });
      console.log('Drug search response:', response);
      
      // Check if no results found or if there's an FDA API error
      if ((response.status === 'success' && response.results && response.results.length === 0) ||
          (response.error && response.error.includes('NOT_FOUND')) ||
          (response.error_message && response.error_message.includes('404'))) {
        // Use AI agent to provide information
        console.log('No FDA data found, using AI agent...');
        try {
          const agentResponse = await agentFactory.routeQuery(
            'fda_agent',
            `Provide comprehensive information about ${drugName} including its uses, dosage, side effects, and warnings. Note that this information is AI-generated as the drug was not found in the FDA database.`
          );
          
          setDrugResult({
            status: 'ai_generated',
            drug_name: drugName,
            message: agentResponse.response,
            source: 'AI Generated Information'
          });
        } catch (agentError) {
          console.error('AI generation error:', agentError);
          setDrugResult({ status: 'error', error_message: 'Drug not found in FDA database and AI generation failed.' });
        }
      } else if (response.status === 'error' || response.error || response.error_message) {
        // Handle other errors by trying AI
        console.log('FDA API error, using AI agent...');
        try {
          const agentResponse = await agentFactory.routeQuery(
            'fda_agent',
            `Provide comprehensive information about ${drugName} including its uses, dosage, side effects, and warnings. Note that this information is AI-generated as there was an issue accessing the FDA database.`
          );
          
          setDrugResult({
            status: 'ai_generated',
            drug_name: drugName,
            message: agentResponse.response,
            source: 'AI Generated Information'
          });
        } catch (agentError) {
          console.error('AI generation error:', agentError);
          setDrugResult({ status: 'error', error_message: response.error_message || response.error || 'An error occurred' });
        }
      } else {
        setDrugResult(response);
      }
    } catch (error) {
      console.error('Drug search error:', error);
      
      // If MCP call fails, try using AI agent
      try {
        const agentResponse = await agentFactory.routeQuery(
          'fda_agent',
          `Provide comprehensive information about ${drugName} including its uses, dosage, side effects, and warnings. Note that this information is AI-generated as there was an issue accessing the FDA database.`
        );
        
        setDrugResult({
          status: 'ai_generated',
          drug_name: drugName,
          message: agentResponse.response,
          source: 'AI Generated Information'
        });
      } catch (agentError) {
        console.error('AI generation error:', agentError);
        setDrugResult({ status: 'error', error_message: error.message });
      }
    }
    
    setLoading(false);
  };

  const searchClinicalTrials = async () => {
    if (!condition.trim()) return;
    
    setLoading(true);
    setTrialsResult(null);
    
    try {
      console.log('Searching clinical trials for:', condition, 'Status:', trialStatus);
      
      // Try MCP tool first
      try {
        const response = await mcpClient.callTool('clinical_trials_search', {
          condition: condition,
          status: trialStatus,
          max_results: 10
        });
        
        console.log('MCP clinical trials response:', response);
        
        if (response.status === 'success' && response.trials) {
          setTrialsResult(response);
        } else if (response.error || response.error_message) {
          // Handle MCP server error
          console.error('MCP server error:', response.error_message || response.error);
          
          // If the MCP server has issues, use the clinical research agent to search
          const agentResponse = await agentFactory.routeQuery(
            'clinical_research_agent',
            `Search for clinical trials for ${condition} with status ${trialStatus}. Provide information about ongoing trials including study titles, phases, locations, and eligibility criteria. Format the response in a clear, structured way.`
          );
          
          // Convert agent response to trials format
          setTrialsResult({
            status: 'success',
            condition: condition,
            total_results: 'Multiple',
            trials: [],
            message: agentResponse.response,
            source: 'AI Agent Analysis'
          });
        }
      } catch (mcpError) {
        console.error('MCP call error:', mcpError);
        
        // Fallback to agent-based search
        const agentResponse = await agentFactory.routeQuery(
          'clinical_research_agent',
          `Search for clinical trials for ${condition} with status ${trialStatus}. Provide information about ongoing trials including study titles, phases, locations, and eligibility criteria. Format the response in a clear, structured way.`
        );
        
        setTrialsResult({
          status: 'success',
          condition: condition,
          total_results: 'Multiple',
          trials: [],
          message: agentResponse.response,
          source: 'AI Agent Analysis'
        });
      }
    } catch (error) {
      console.error('Clinical trials search error:', error);
      setTrialsResult({ status: 'error', error_message: error.message });
    }
    
    setLoading(false);
  };

  const checkInteractions = async () => {
    if (!drug1.trim() || !drug2.trim()) return;
    
    setLoading(true);
    setInteractionResult(null);
    
    try {
      console.log('Checking interactions between:', drug1, 'and', drug2);
      // Use the interaction checker agent for comprehensive analysis
      const response = await agentFactory.routeQuery(
        'interaction_checker_agent',
        `Check for interactions between ${drug1} and ${drug2}. Include contraindications, warnings, and severity levels.`
      );
      console.log('Interaction check response:', response);
      setInteractionResult(response);
    } catch (error) {
      console.error('Interaction check error:', error);
      setInteractionResult({ error: error.message });
    }
    
    setLoading(false);
  };

  const renderDrugResults = (result) => {
    if (!result) return null;

    if (result.status === 'error' || result.error_message) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{result.error_message || 'An error occurred'}</p>
        </div>
      );
    }

    // Handle AI-generated results
    if (result.status === 'ai_generated') {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-800 font-medium">AI-Generated Drug Information for "{result.drug_name}"</p>
            </div>
            <p className="text-sm text-blue-600 mt-1">Note: This drug was not found in the FDA database. The following information is AI-generated.</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {result.message}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (result.status === 'success' && result.results) {
      const results = Array.isArray(result.results) ? result.results : [];
      
      if (results.length === 0) {
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">No results found for "{result.drug_name}"</p>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">Found {result.total_results || results.length} results for "{result.drug_name}"</p>
          </div>
          
          {results.map((drug, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              {drugSearchType === 'general' && (
                <>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {drug.brand_name || drug.generic_name || 'Unknown Drug'}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Generic Name:</span>
                      <p className="text-gray-900">{drug.generic_name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Brand Name:</span>
                      <p className="text-gray-900">{drug.brand_name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Manufacturer:</span>
                      <p className="text-gray-900">{drug.labeler_name || drug.manufacturer || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Product Type:</span>
                      <p className="text-gray-900">{drug.product_type || 'N/A'}</p>
                    </div>
                  </div>
                </>
              )}

              {drugSearchType === 'label' && (
                <>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {drug.openfda?.brand_name?.[0] || drug.openfda?.generic_name?.[0] || 'Drug Label Information'}
                  </h4>
                  <div className="space-y-4 text-sm">
                    {drug.indications_and_usage && (
                      <div>
                        <span className="font-medium text-gray-600">Indications and Usage:</span>
                        <p className="text-gray-900 mt-1">{Array.isArray(drug.indications_and_usage) ? drug.indications_and_usage[0] : drug.indications_and_usage}</p>
                      </div>
                    )}
                    {drug.warnings && (
                      <div>
                        <span className="font-medium text-gray-600">Warnings:</span>
                        <p className="text-gray-900 mt-1">{Array.isArray(drug.warnings) ? drug.warnings[0] : drug.warnings}</p>
                      </div>
                    )}
                    {drug.contraindications && (
                      <div>
                        <span className="font-medium text-gray-600">Contraindications:</span>
                        <p className="text-gray-900 mt-1">{Array.isArray(drug.contraindications) ? drug.contraindications[0] : drug.contraindications}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {drugSearchType === 'adverse_events' && (
                <>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Adverse Event Report</h4>
                  <div className="space-y-4 text-sm">
                    {drug.patient?.drug && (
                      <div>
                        <span className="font-medium text-gray-600">Drugs Involved:</span>
                        <ul className="list-disc list-inside mt-1">
                          {drug.patient.drug.map((d, i) => (
                            <li key={i} className="text-gray-900">
                              {d.medicinalproduct || 'Unknown'} - {d.drugindication || 'No indication specified'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {drug.patient?.reaction && (
                      <div>
                        <span className="font-medium text-gray-600">Reactions:</span>
                        <ul className="list-disc list-inside mt-1">
                          {drug.patient.reaction.map((r, i) => (
                            <li key={i} className="text-gray-900">{r.reactionmeddrapt || 'Unknown reaction'}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <pre className="whitespace-pre-wrap text-sm text-gray-700">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    );
  };

  const renderClinicalTrialsResults = (result) => {
    if (!result) return null;

    console.log('Rendering clinical trials result:', result);

    // Handle error cases
    if (result.status === 'error' || result.error_message || result.error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{result.error_message || result.error || 'An error occurred'}</p>
        </div>
      );
    }

    // Handle agent-based response (when MCP fails)
    if (result.source === 'AI Agent Analysis' && result.message) {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-800 font-medium">AI-Generated Clinical Trials Information for "{result.condition}"</p>
            </div>
            <p className="text-sm text-blue-600 mt-1">Note: Direct API access is currently unavailable. This information is provided by our AI research agent.</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {result.message}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Handle success case with actual trials data
    if (result.status === 'success' && result.trials) {
      const trials = Array.isArray(result.trials) ? result.trials : [];
      const totalResults = result.total_results || trials.length;
      const searchCondition = result.condition || condition;

      if (trials.length === 0) {
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">No clinical trials found for "{searchCondition}"</p>
            {result.message && <p className="text-sm text-yellow-600 mt-1">{result.message}</p>}
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">Found {totalResults} clinical trials for "{searchCondition}"</p>
          </div>
          
          {trials.map((trial, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {trial.title || trial.brief_title || trial.BriefTitle || 'Untitled Trial'}
              </h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="font-medium text-gray-600">NCT Number:</span>
                  <p className="text-gray-900">{trial.nct_id || trial.NCTId || trial.nctId || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Status:</span>
                  <p className="text-gray-900">{trial.status || trial.Status || trial.OverallStatus || 'Unknown'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Phase:</span>
                  <p className="text-gray-900">{trial.phase || trial.Phase || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Study Type:</span>
                  <p className="text-gray-900">{trial.study_type || trial.StudyType || 'Not specified'}</p>
                </div>
              </div>

              {(trial.brief_summary || trial.BriefSummary || trial.description) && (
                <div className="mb-4">
                  <span className="font-medium text-gray-600 text-sm">Brief Summary:</span>
                  <p className="text-gray-900 text-sm mt-1">{trial.brief_summary || trial.BriefSummary || trial.description}</p>
                </div>
              )}

              {(trial.conditions || trial.Conditions || trial.condition) && (
                <div className="mb-4">
                  <span className="font-medium text-gray-600 text-sm">Conditions:</span>
                  <p className="text-gray-900 text-sm mt-1">
                    {Array.isArray(trial.conditions || trial.Conditions) 
                      ? (trial.conditions || trial.Conditions).join(', ')
                      : trial.condition || 'Not specified'}
                  </p>
                </div>
              )}

              {(trial.locations || trial.Locations || trial.location) && (
                <div className="mb-4">
                  <span className="font-medium text-gray-600 text-sm">Locations:</span>
                  <div className="mt-1">
                    {Array.isArray(trial.locations || trial.Locations) ? (
                      (trial.locations || trial.Locations).slice(0, 3).map((loc, i) => (
                        <p key={i} className="text-gray-900 text-sm">
                          • {loc.facility || loc.Facility || 'Unknown facility'} - 
                          {loc.city || loc.City}, {loc.state || loc.State} {loc.country || loc.Country}
                        </p>
                      ))
                    ) : (
                      <p className="text-gray-900 text-sm">{trial.location || 'Not specified'}</p>
                    )}
                    {Array.isArray(trial.locations || trial.Locations) && (trial.locations || trial.Locations).length > 3 && (
                      <p className="text-gray-500 text-sm italic">
                        ...and {(trial.locations || trial.Locations).length - 3} more locations
                      </p>
                    )}
                  </div>
                </div>
              )}

              {(trial.url || trial.URL || trial.nct_id || trial.NCTId) && (
                <a 
                  href={trial.url || trial.URL || `https://clinicaltrials.gov/study/${trial.nct_id || trial.NCTId || trial.nctId}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                >
                  View on ClinicalTrials.gov →
                </a>
              )}
            </div>
          ))}
        </div>
      );
    }

    // If we reach here, the response format is unexpected
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <p className="text-gray-700 mb-2">Unexpected response format. Raw data:</p>
        <pre className="whitespace-pre-wrap text-sm text-gray-700">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    );
  };

  const renderQueryTab = () => (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Intelligent Healthcare Query</h2>
              <p className="text-sm text-gray-500 mt-1">
                Powered by advanced AI agents with access to comprehensive medical databases
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
                System Online
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Model: {MODEL}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select AI Agent Specialist
            </label>
            <div className="grid grid-cols-2 gap-3">
              {agents.filter(agent => agent.id !== 'general_assistant').map(agent => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedAgent === agent.id
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h4 className="font-medium text-sm text-gray-900">{agent.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{agent.role}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Enter Your Query
            </label>
            <div className="relative">
              <textarea
                className="w-full p-4 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                rows="4"
                placeholder="Ask about drug information, clinical trials, interactions, symptoms, or any healthcare-related query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    submitQuery();
                  }
                }}
              />
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Ctrl+Enter to submit • Your queries are processed securely
            </p>
          </div>

          <div className="mb-6">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center"
            >
              <svg className={`w-4 h-4 mr-1 transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Advanced Options
            </button>
            {showAdvanced && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded text-teal-600 mr-2" />
                    <span className="text-sm text-gray-700">Include clinical guidelines</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded text-teal-600 mr-2" />
                    <span className="text-sm text-gray-700">Show evidence levels</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded text-teal-600 mr-2" />
                    <span className="text-sm text-gray-700">Include research papers</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded text-teal-600 mr-2" />
                    <span className="text-sm text-gray-700">Detailed explanations</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={submitQuery}
            disabled={loading || !query.trim()}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
              loading || !query.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800 transform hover:scale-[1.02]'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Query...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Submit Query
              </>
            )}
          </button>
        </div>

        {result && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Query Results</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  Processed by: {result.agent}
                </span>
                {result.mcpToolsUsed && result.mcpToolsUsed.length > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Tools: {result.mcpToolsUsed.join(', ')}
                  </span>
                )}
              </div>
            </div>
            
            {result.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{result.error}</p>
              </div>
            ) : (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {result.response}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="col-span-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Queries</h3>
          
          {queryHistory.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-500">No queries yet</p>
              <p className="text-xs text-gray-400 mt-1">Your query history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queryHistory.map(item => (
                <div 
                  key={item.id}
                  className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors"
                  onClick={() => {
                    setQuery(item.query);
                    setSelectedAgent(item.agent);
                  }}
                >
                  <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                    {item.query}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{item.agent}</span>
                    <span className="text-xs text-gray-400">{item.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Templates</h4>
            <div className="space-y-2">
              <button 
                onClick={() => setQuery("What are the side effects and interactions of metformin?")}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Drug side effects check
              </button>
              <button 
                onClick={() => setQuery("Find clinical trials for type 2 diabetes treatment")}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Clinical trial search
              </button>
              <button 
                onClick={() => setQuery("Check interactions between aspirin and warfarin")}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Drug interaction check
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDrugInfoTab = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">FDA Drug Information Database</h2>
          <p className="text-gray-600 mt-2">Access comprehensive drug information from FDA databases including labels, adverse events, and general information.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Drug Name
            </label>
            <input
              type="text"
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              placeholder="Enter drug name (e.g., aspirin, metformin, lisinopril)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Information Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setDrugSearchType('general')}
                className={`p-3 rounded-lg border transition-all ${
                  drugSearchType === 'general'
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">General Info</div>
                <div className="text-xs mt-1 text-gray-500">Overview & usage</div>
              </button>
              <button
                onClick={() => setDrugSearchType('label')}
                className={`p-3 rounded-lg border transition-all ${
                  drugSearchType === 'label'
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Drug Label</div>
                <div className="text-xs mt-1 text-gray-500">Official labeling</div>
              </button>
              <button
                onClick={() => setDrugSearchType('adverse_events')}
                className={`p-3 rounded-lg border transition-all ${
                  drugSearchType === 'adverse_events'
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Adverse Events</div>
                <div className="text-xs mt-1 text-gray-500">Side effects reported</div>
              </button>
            </div>
          </div>

          <button
            onClick={searchDrug}
            disabled={loading || !drugName.trim()}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
              loading || !drugName.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching FDA Database...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Drug Information
              </>
            )}
          </button>
        </div>

        {drugResult && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Results</h3>
            {renderDrugResults(drugResult)}
          </div>
        )}
      </div>
    </div>
  );

  const renderClinicalTrialsTab = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Clinical Trials Search</h2>
          <p className="text-gray-600 mt-2">Search active clinical trials worldwide from ClinicalTrials.gov database.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Medical Condition
            </label>
            <input
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="Enter condition (e.g., diabetes, cancer, hypertension)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trial Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTrialStatus('recruiting')}
                className={`p-3 rounded-lg border transition-all ${
                  trialStatus === 'recruiting'
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Recruiting</div>
                <div className="text-xs mt-1 text-gray-500">Currently enrolling</div>
              </button>
              <button
                onClick={() => setTrialStatus('completed')}
                className={`p-3 rounded-lg border transition-all ${
                  trialStatus === 'completed'
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Completed</div>
                <div className="text-xs mt-1 text-gray-500">Finished trials</div>
              </button>
              <button
                onClick={() => setTrialStatus('active')}
                className={`p-3 rounded-lg border transition-all ${
                  trialStatus === 'active'
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Active</div>
                <div className="text-xs mt-1 text-gray-500">Ongoing trials</div>
              </button>
              <button
                onClick={() => setTrialStatus('all')}
                className={`p-3 rounded-lg border transition-all ${
                  trialStatus === 'all'
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">All Trials</div>
                <div className="text-xs mt-1 text-gray-500">Any status</div>
              </button>
            </div>
          </div>

          <button
            onClick={searchClinicalTrials}
            disabled={loading || !condition.trim()}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
              loading || !condition.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching Clinical Trials...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Clinical Trials
              </>
            )}
          </button>
        </div>

        {trialsResult && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinical Trials Found</h3>
            {renderClinicalTrialsResults(trialsResult)}
          </div>
        )}
      </div>
    </div>
  );

  const renderInteractionsTab = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Drug Interaction Checker</h2>
          <p className="text-gray-600 mt-2">Check for potential drug interactions, contraindications, and warnings between medications.</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Drug
              </label>
              <input
                type="text"
                value={drug1}
                onChange={(e) => setDrug1(e.target.value)}
                placeholder="Enter first drug name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Second Drug
              </label>
              <input
                type="text"
                value={drug2}
                onChange={(e) => setDrug2(e.target.value)}
                placeholder="Enter second drug name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Common interaction checks:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setDrug1('aspirin'); setDrug2('warfarin'); }}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                Aspirin + Warfarin
              </button>
              <button
                onClick={() => { setDrug1('lisinopril'); setDrug2('potassium'); }}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                Lisinopril + Potassium
              </button>
              <button
                onClick={() => { setDrug1('metformin'); setDrug2('insulin'); }}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                Metformin + Insulin
              </button>
              <button
                onClick={() => { setDrug1('simvastatin'); setDrug2('amiodarone'); }}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                Simvastatin + Amiodarone
              </button>
            </div>
          </div>

          <button
            onClick={checkInteractions}
            disabled={loading || !drug1.trim() || !drug2.trim()}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
              loading || !drug1.trim() || !drug2.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking Interactions...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Check Interactions
              </>
            )}
          </button>
        </div>

        {interactionResult && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Interaction Analysis</h3>
            {interactionResult.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{interactionResult.error}</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-amber-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-900 mb-2">Drug Interaction Report</h4>
                    <div className="prose prose-sm max-w-none text-amber-800">
                      <div className="whitespace-pre-wrap">
                        {interactionResult.response}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Analytics Dashboard</h2>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Total Queries</h3>
          <p className="text-3xl font-bold text-blue-900">{queryHistory.length}</p>
          <p className="text-xs text-blue-700 mt-1">This session</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-green-900 mb-2">Active Agents</h3>
          <p className="text-3xl font-bold text-green-900">{agents.length}</p>
          <p className="text-xs text-green-700 mt-1">Specialized AI agents</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-purple-900 mb-2">Response Time</h3>
          <p className="text-3xl font-bold text-purple-900">1.2s</p>
          <p className="text-xs text-purple-700 mt-1">Average</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Drug Information</span>
              <span className="text-sm font-medium">35%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-teal-600 h-2 rounded-full" style={{width: '35%'}}></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Clinical Trials</span>
              <span className="text-sm font-medium">25%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-teal-600 h-2 rounded-full" style={{width: '25%'}}></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Drug Interactions</span>
              <span className="text-sm font-medium">40%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-teal-600 h-2 rounded-full" style={{width: '40%'}}></div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Status</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">MCP Server</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">OpenAI API</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cache Hit Rate</span>
              <span className="text-sm font-medium">87%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'query':
        return renderQueryTab();
      case 'drug-info':
        return renderDrugInfoTab();
      case 'clinical-trials':
        return renderClinicalTrialsTab();
      case 'interactions':
        return renderInteractionsTab();
      case 'pubmed':
        return <PubMedSearch />;
      case 'health-topics':
        return <HealthTopics />;
      case 'icd10':
        return <ICD10Lookup />;
      case 'terminology':
        return <MedicalTerminology />;
      case 'analytics':
        return renderAnalyticsTab();
      default:
        return null;
    }
  };

  // If not authenticated, show login page
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} onLogout={handleLogout} />
      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
      <Footer />
      <AISidekick />
      {showTester && <MCPTester />}
    </div>
  );
}

export default App;