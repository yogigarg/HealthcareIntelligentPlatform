import React from 'react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'query', label: 'AI Query', icon: '🤖' },
    { id: 'device-monitoring', label: 'Medical Device Monitoring', icon: '🏥' },
    { id: 'surgical-dashboard', label: 'Surgical Trial Intelligence', icon: '🔬' }, // NEW MENU ITEM
    { id: 'clinical-trials', label: 'Clinical Trials', icon: '🧪' },
    { id: 'interactions', label: 'Drug Interactions', icon: '⚡' },
    { id: 'pubmed', label: 'PubMed Search', icon: '📚' },
    { id: 'health-topics', label: 'Health Topics', icon: '🩺' },
    { id: 'icd10', label: 'ICD-10 Codes', icon: '📋' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
  ];

  return (
    <aside className="w-64 bg-gray-800 min-h-screen">
      <nav className="p-4">
        <h2 className="text-white text-lg font-semibold mb-4">Navigation</h2>
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 ${
                  activeTab === item.id
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        
        {/* NEW: Surgical Trial Intelligence Feature Highlight */}
        <div className="mt-8 p-3 bg-gradient-to-br from-blue-900 to-purple-900 bg-opacity-50 rounded-lg border border-blue-700">
          <div className="flex items-start space-x-2">
            <span className="text-blue-300 text-lg">🆕</span>
            <div>
              <p className="text-blue-200 text-xs font-medium">NEW: Surgical Trial Intelligence</p>
              <p className="text-blue-300 text-xs mt-1">
                <strong>Competitive Intelligence Dashboard</strong> - Monitor global surgical registries, track competitor device studies, and analyze market trends for medical device companies.
              </p>
              <div className="mt-2 text-xs text-blue-400">
                <div>✨ Global trial monitoring</div>
                <div>📊 Competitive analysis</div>
                <div>🎯 Market trend insights</div>
              </div>
            </div>
          </div>
        </div>

        {/* Updated device monitoring info */}
        <div className="mt-4 p-3 bg-teal-900 bg-opacity-30 rounded-lg border border-teal-700">
          <div className="flex items-start space-x-2">
            <span className="text-teal-300 text-sm">ℹ️</span>
            <div>
              <p className="text-teal-200 text-xs font-medium">Device Monitoring</p>
              <p className="text-teal-300 text-xs mt-1">
                Now supports <strong>all medical devices</strong> with FDA MAUDE integration. 
                Search for any device like pacemakers, implants, surgical equipment, and more.
              </p>
            </div>
          </div>
        </div>
        
        {/* System status info */}
        <div className="mt-4 p-3 bg-gray-900 bg-opacity-30 rounded-lg border border-gray-700">
          <div className="flex items-start space-x-2">
            <span className="text-gray-300 text-sm">🔧</span>
            <div>
              <p className="text-gray-200 text-xs font-medium">System Status</p>
              <div className="text-gray-300 text-xs mt-1 space-y-1">
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  <span>Core Services Online</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  <span>AI Agents Active</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                  <span>Backend Tools Loading</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick access shortcuts */}
        <div className="mt-4 p-3 bg-purple-900 bg-opacity-20 rounded-lg border border-purple-700">
          <div className="flex items-start space-x-2">
            <span className="text-purple-300 text-sm">⚡</span>
            <div>
              <p className="text-purple-200 text-xs font-medium">Quick Access</p>
              <div className="mt-2 space-y-1">
                <button 
                  onClick={() => setActiveTab('surgical-dashboard')}
                  className="w-full text-left text-xs text-purple-300 hover:text-purple-200 transition-colors"
                >
                  → Competitive Intelligence
                </button>
                <button 
                  onClick={() => setActiveTab('device-monitoring')}
                  className="w-full text-left text-xs text-purple-300 hover:text-purple-200 transition-colors"
                >
                  → FDA Device Search  
                </button>
                <button 
                  onClick={() => setActiveTab('clinical-trials')}
                  className="w-full text-left text-xs text-purple-300 hover:text-purple-200 transition-colors"
                >
                  → Clinical Trials
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Developer shortcut hint */}
        <div className="mt-4 p-2 bg-gray-900 bg-opacity-20 rounded text-center">
          <p className="text-xs text-gray-400">
            Press <kbd className="bg-gray-700 px-1 rounded text-xs">Ctrl+Shift+D</kbd>
          </p>
          <p className="text-xs text-gray-500">for debug tools</p>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;