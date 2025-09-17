import React, { useState } from 'react';
import mcpClient from '../../services/mcpClient';

const HealthTopics = () => {
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('en');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const searchHealthTopics = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    setResults(null);

    try {
      console.log('Searching health topics for:', topic, 'Language:', language);
      const response = await mcpClient.callTool('health_topics', {
        topic: topic,
        language: language
      });
      console.log('Health topics response:', response);
      setResults(response);
    } catch (error) {
      console.error('Health topics search error:', error);
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

    if (results.status === 'success' && results.topics) {
      const topics = results.topics || [];

      if (topics.length === 0) {
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">No health topics found for "{topic}"</p>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">
              Found {results.total_results || topics.length} health topics
            </p>
          </div>

          {topics.map((topicItem, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {topicItem.title}
              </h4>
              
              <div className="space-y-2 text-sm">
                {topicItem.description && (
                  <div>
                    <p className="text-gray-900">{topicItem.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-600">Section:</span>
                    <p className="text-gray-900">{topicItem.section || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Last Updated:</span>
                    <p className="text-gray-900">{topicItem.last_updated || 'N/A'}</p>
                  </div>
                </div>

                {topicItem.content && topicItem.content.length > 0 && (
                  <div className="mt-4">
                    <span className="font-medium text-gray-600">Content:</span>
                    <div className="mt-2 space-y-2">
                      {topicItem.content.slice(0, 3).map((contentItem, idx) => (
                        <p key={idx} className="text-gray-700 text-sm pl-4 border-l-2 border-gray-200">
                          {contentItem}
                        </p>
                      ))}
                      {topicItem.content.length > 3 && (
                        <p className="text-gray-500 text-sm italic">
                          ...and {topicItem.content.length - 3} more sections
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <a 
                  href={topicItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                >
                  View on Health.gov →
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
          <h2 className="text-2xl font-semibold text-gray-900">Health Topics Search</h2>
          <p className="text-gray-600 mt-2">
            Search evidence-based health information from Health.gov in English or Spanish.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Health Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter health topic (e.g., diabetes, nutrition, exercise)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLanguage('en')}
                className={`p-3 rounded-lg border transition-all ${
                  language === 'en'
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">English</div>
                <div className="text-xs mt-1 text-gray-500">Health information in English</div>
              </button>
              <button
                onClick={() => setLanguage('es')}
                className={`p-3 rounded-lg border transition-all ${
                  language === 'es'
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Español</div>
                <div className="text-xs mt-1 text-gray-500">Información de salud en español</div>
              </button>
            </div>
          </div>

          <button
            onClick={searchHealthTopics}
            disabled={loading || !topic.trim()}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
              loading || !topic.trim()
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
                Searching Health Topics...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Health Topics
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

export default HealthTopics;
