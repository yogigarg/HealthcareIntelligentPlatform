import React from 'react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'query', label: 'AI Query', icon: '🤖' },
    { id: 'drug-info', label: 'Medical Device Monitoring', icon: '🏥' }, // Updated label
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
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        
        {/* Info panel about the device monitoring update */}
        <div className="mt-8 p-3 bg-blue-900 bg-opacity-50 rounded-lg border border-blue-700">
          <div className="flex items-start space-x-2">
            <span className="text-blue-300 text-sm">ℹ️</span>
            <div>
              <p className="text-blue-200 text-xs font-medium">System Update</p>
              <p className="text-blue-300 text-xs mt-1">
                Now supports <strong>all medical devices</strong> with FDA MAUDE integration. 
                Search for any device like pacemakers, implants, surgical equipment, and more.
              </p>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;