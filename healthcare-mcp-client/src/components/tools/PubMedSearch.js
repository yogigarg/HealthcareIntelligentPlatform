import React, { useState } from 'react';
import mcpClient from '../../services/mcpClient';

const PubMedSearch = () => {
  const [query, setQuery] = useState('');
  const [maxResults, setMaxResults] = useState(5);
  const [dateRange, setDateRange] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const searchPubMed = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResults(null);

    try {
      const response = await mcpClient.callTool('pubmed_search', {
        query: query,
        max_results: maxResults,
        date_range: dateRange
      });
      setResults(response);
    } catch (error) {
      console.error('PubMed search error:', error);
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

    if (results.status === 'success' && results.articles) {
      const articles = results.articles || [];

      if (articles.length === 0) {
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">No articles found for "{query}"</p>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">
              Found {results.total_results || articles.length} articles
            </p>
          </div>

          {articles.map((article, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {article.title}
              </h4>
              
              <div className="space-y-2 text-sm">
                {article.authors && article.authors.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-600">Authors:</span>
                    <p className="text-gray-900">
                      {article.authors.length > 3 
                        ? `${article.authors.slice(0, 3).join(', ')}, et al.`
                        : article.authors.join(', ')}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-600">Journal:</span>
                    <p className="text-gray-900">{article.journal || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Published:</span>
                    <p className="text-gray-900">{article.publication_date || 'N/A'}</p>
                  </div>
                </div>

                {article.doi && (
                  <div>
                    <span className="font-medium text-gray-600">DOI:</span>
                    <p className="text-gray-900">{article.doi}</p>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <a 
                  href={article.abstract_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                >
                  View on PubMed →
                </a>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">PubMed Literature Search</h2>
          <p className="text-gray-600 mt-2">
            Search medical literature from PubMed's extensive database of scientific articles.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Query
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter search terms (e.g., diabetes treatment, COVID-19 vaccines)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Results
              </label>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value={5}>5 articles</option>
                <option value={10}>10 articles</option>
                <option value={20}>20 articles</option>
                <option value={50}>50 articles</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range (years)
              </label>
              <input
                type="text"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                placeholder="e.g., 5 (for last 5 years)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={searchPubMed}
            disabled={loading || !query.trim()}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
              loading || !query.trim()
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
                Searching PubMed...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Literature
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

export default PubMedSearch;
