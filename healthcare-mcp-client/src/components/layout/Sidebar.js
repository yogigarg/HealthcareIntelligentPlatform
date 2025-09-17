import React from 'react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'query', label: 'AI Query', icon: '🤖' },
    { id: 'drug-info', label: 'Drug Information', icon: '💊' },
    { id: 'clinical-trials', label: 'Clinical Trials', icon: '🧪' },
    { id: 'interactions', label: 'Drug Interactions', icon: '⚡' },
    { id: 'pubmed', label: 'PubMed Search', icon: '📚' },
    { id: 'health-topics', label: 'Health Topics', icon: '🏥' },
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
      </nav>
    </aside>
  );
};

export default Sidebar;
