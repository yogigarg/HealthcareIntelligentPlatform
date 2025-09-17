import React, { useState } from 'react';
import mcpClient from '../../services/mcpClient';

const ICD10Lookup = () => {
  const [searchType, setSearchType] = useState('description');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [maxResults, setMaxResults] = useState(10);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const lookupICD10 = async () => {
    if (searchType === 'code' && !code.trim()) return;
    if (searchType === 'description' && !description.trim()) return;

    setLoading(true);
    setResults(null);

    try {
      const params = { max_results: maxResults };
      if (searchType === 'code') {
        params.code = code;
      } else {
        params.description = description;
      }

      console.log('Looking up ICD-10 code with params:', params);
      const response = await mcpClient.callTool('lookup_icd_code', params);
      console.log('ICD-10 lookup response:', response);
      setResults(response);
    } catch (error) {
      console.error('ICD-10 lookup error:', error);
      setResults({ status: 'error', error_message: error.message });
    }

    setLoading(false);
  };

  const renderResults = () => {
    if (!results) return null;

    if (results.status === 'error') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{results.error_message || 'An error occurred'}</p>
        </div>
      );
    }

    if (results.status === 'success' && results.results) {
      const codes = results.results || [];

      if (codes.length === 0) {
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              No ICD-10 codes found for {searchType === 'code' ? `code "${code}"` : `description "${description}"`}
            </p>
            {searchType === 'description' && (
              <p className="text-sm text-yellow-600 mt-2">
                Try searching with different keywords or use a more specific medical term.
              </p>
            )}
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">
              Found {results.total_results || codes.length} ICD-10 codes
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chapter
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {codes.map((icdCode, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {icdCode.code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {icdCode.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {icdCode.category || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {icdCode.chapter && icdCode.chapter_description ? (
                        <span title={icdCode.chapter_description}>
                          Chapter {icdCode.chapter}
                        </span>
                      ) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // If the response structure is unexpected, try to display what we have
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <p className="text-gray-700 mb-2">Response received:</p>
        <pre className="whitespace-pre-wrap text-sm text-gray-700">
          {JSON.stringify(results, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">ICD-10 Code Lookup</h2>
          <p className="text-gray-600 mt-2">
            Look up ICD-10 medical classification codes by code or description.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search By
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSearchType('description')}
                className={`p-3 rounded-lg border transition-all ${
                  searchType === 'description'
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Description</div>
                <div className="text-xs mt-1 text-gray-500">Search by condition name</div>
              </button>
              <button
                onClick={() => setSearchType('code')}
                className={`p-3 rounded-lg border transition-all ${
                  searchType === 'code'
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Code</div>
                <div className="text-xs mt-1 text-gray-500">Search by ICD-10 code</div>
              </button>
            </div>
          </div>

          {searchType === 'description' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical Condition Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter condition (e.g., diabetes, hypertension, pneumonia)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tip: Use specific medical terms for better results (e.g., "type 2 diabetes mellitus" instead of just "diabetes")
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ICD-10 Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter ICD-10 code (e.g., E11.9, I10, J44.0)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Results
            </label>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value={10}>10 results</option>
              <option value={25}>25 results</option>
              <option value={50}>50 results</option>
            </select>
          </div>

          <button
            onClick={lookupICD10}
            disabled={loading || (searchType === 'code' ? !code.trim() : !description.trim())}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
              loading || (searchType === 'code' ? !code.trim() : !description.trim())
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
                Looking up ICD-10 codes...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Lookup ICD-10 Code
              </>
            )}
          </button>
        </div>

        {results && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Results</h3>
            {renderResults()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ICD10Lookup;
