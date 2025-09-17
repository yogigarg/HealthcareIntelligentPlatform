import React, { useState } from 'react';
import mcpClient from '../services/mcpClient';

const MCPTester = () => {
 const [testResults, setTestResults] = useState({});
 const [loading, setLoading] = useState(false);
 const [rawResponse, setRawResponse] = useState(null);

 const runTests = async () => {
   setLoading(true);
   const results = {};

   // Test 1: Connection test
   try {
     const health = await mcpClient.testConnection();
     results.connection = { status: 'success', data: health };
   } catch (error) {
     results.connection = { status: 'error', error: error.message };
   }

   // Test 2: Get available tools
   try {
     const tools = await mcpClient.getAvailableTools();
     results.tools = { status: 'success', data: tools };
   } catch (error) {
     results.tools = { status: 'error', error: error.message };
   }

   // Test 3: Clinical trials search with direct API call
   try {
     console.log('Testing clinical trials search...');
     const response = await fetch('http://localhost:5081/api/clinical_trials?condition=diabetes&status=recruiting&max_results=3', {
       method: 'GET',
       headers: {
         'Content-Type': 'application/json',
         'X-Session-ID': mcpClient.getSessionId()
       }
     });
     
     const responseText = await response.text();
     console.log('Raw response text:', responseText);
     
     let data;
     try {
       data = JSON.parse(responseText);
     } catch (e) {
       console.error('Failed to parse response:', e);
       data = { raw: responseText };
     }
     
     results.clinicalTrialsDirect = { 
       status: 'success', 
       data: data,
       rawResponse: responseText 
     };
     setRawResponse(responseText);
   } catch (error) {
     results.clinicalTrialsDirect = { status: 'error', error: error.message };
   }

   // Test 4: Clinical trials search via MCP
   try {
     const trials = await mcpClient.callTool('clinical_trials_search', {
       condition: 'diabetes',
       status: 'recruiting',
       max_results: 3
     });
     results.clinicalTrials = { status: 'success', data: trials };
   } catch (error) {
     results.clinicalTrials = { status: 'error', error: error.message };
   }

   // Test 5: FDA drug lookup
   try {
     const drug = await mcpClient.callTool('fda_drug_lookup', {
       drug_name: 'aspirin',
       search_type: 'general'
     });
     results.fdaDrug = { status: 'success', data: drug };
   } catch (error) {
     results.fdaDrug = { status: 'error', error: error.message };
   }

   setTestResults(results);
   setLoading(false);
 };

 const testSpecificEndpoint = async (endpoint) => {
   try {
     const response = await fetch(`http://localhost:5081${endpoint}`, {
       method: 'GET',
       headers: {
         'Content-Type': 'application/json'
       }
     });
     
     const responseText = await response.text();
     console.log(`Response from ${endpoint}:`, responseText);
     
     try {
       const data = JSON.parse(responseText);
       return { status: 'success', data, raw: responseText };
     } catch (e) {
       return { status: 'error', error: 'Invalid JSON', raw: responseText };
     }
   } catch (error) {
     return { status: 'error', error: error.message };
   }
 };

 return (
   <div className="fixed top-20 right-4 w-96 max-h-[80vh] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-30">
     <div className="p-4 bg-gray-50 border-b border-gray-200">
       <h3 className="text-lg font-semibold text-gray-900">MCP Server Tester</h3>
       <p className="text-sm text-gray-600 mt-1">Debug tool for testing MCP endpoints</p>
     </div>

     <div className="p-4">
       <button
         onClick={runTests}
         disabled={loading}
         className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
           loading 
             ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
             : 'bg-blue-600 text-white hover:bg-blue-700'
         }`}
       >
         {loading ? 'Running Tests...' : 'Run All Tests'}
       </button>

       {/* Quick endpoint tests */}
       <div className="mt-4 space-y-2">
         <button
           onClick={async () => {
             const result = await testSpecificEndpoint('/health');
             setTestResults(prev => ({ ...prev, health: result }));
           }}
           className="w-full py-1 px-3 text-sm bg-gray-100 hover:bg-gray-200 rounded"
         >
           Test /health
         </button>
         <button
           onClick={async () => {
             const result = await testSpecificEndpoint('/api/clinical_trials?condition=diabetes&status=recruiting&max_results=2');
             setTestResults(prev => ({ ...prev, directApi: result }));
           }}
           className="w-full py-1 px-3 text-sm bg-gray-100 hover:bg-gray-200 rounded"
         >
           Test /api/clinical_trials
         </button>
       </div>

       {rawResponse && (
         <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
           <h4 className="text-sm font-medium text-yellow-800 mb-1">Raw Response</h4>
           <pre className="text-xs text-yellow-700 overflow-x-auto">
             {rawResponse.substring(0, 200)}...
           </pre>
         </div>
       )}

       {Object.keys(testResults).length > 0 && (
         <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
           {Object.entries(testResults).map(([testName, result]) => (
             <div key={testName} className="border border-gray-200 rounded-lg p-3">
               <div className="flex items-center justify-between mb-2">
                 <h4 className="font-medium text-gray-900 capitalize">
                   {testName.replace(/([A-Z])/g, ' $1').trim()}
                 </h4>
                 <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                   result.status === 'success' 
                     ? 'bg-green-100 text-green-800' 
                     : 'bg-red-100 text-red-800'
                 }`}>
                   {result.status}
                 </span>
               </div>
               
               <div className="text-xs">
                 {result.status === 'error' ? (
                   <p className="text-red-600">{result.error}</p>
                 ) : (
                   <details>
                     <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                       View Response
                     </summary>
                     <pre className="mt-2 p-2 bg-gray-50 rounded overflow-x-auto">
                       {JSON.stringify(result.data, null, 2)}
                     </pre>
                     {result.raw && (
                       <details className="mt-2">
                         <summary className="cursor-pointer text-gray-600 hover:text-gray-900 text-xs">
                           View Raw
                         </summary>
                         <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                           {result.raw}
                         </pre>
                       </details>
                     )}
                   </details>
                 )}
               </div>
             </div>
           ))}
         </div>
       )}
     </div>
   </div>
 );
};

export default MCPTester;
