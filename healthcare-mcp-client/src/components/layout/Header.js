import React from 'react';

const Header = ({ user, onLogout }) => {
  return (
    <header className="bg-teal-600 shadow-lg">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Jade Logo */}
            <img 
              src="/jade-logo.png" 
              alt="Jade Global" 
              className="h-10 w-auto"
            />
            <div className="border-l border-white border-opacity-30 pl-4">
              <h1 className="text-xl font-semibold text-white">Healthcare Intelligence Platform</h1>
              <p className="text-sm text-white text-opacity-80">Powered by MCP & AI Agents</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-teal-600 bg-white rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-2 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-white text-opacity-80">{user.organization}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-white bg-opacity-20 backdrop-blur flex items-center justify-center text-white font-medium shadow-md">
              {user.initials}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;