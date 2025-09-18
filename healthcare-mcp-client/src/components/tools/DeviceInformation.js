import React, { useState } from 'react';
import DeviceInfoCard from '../medical/DeviceInfoCard';

const DeviceInformation = ({ onSearch, isLoading, results, error }) => {
  const [searchType, setSearchType] = useState('adverse_events');
  const [dateRange, setDateRange] = useState(30);
  const [deviceName, setDeviceName] = useState('');
  const [eventType, setEventType] = useState('all');

  // Popular medical device categories for quick search
  const popularDevices = [
    'pacemaker',
    'insulin pump',
    'hip implant',
    'knee implant',
    'heart valve',
    'stent',
    'defibrillator',
    'surgical robot',
    'breast implant',
    'contact lens',
    'hearing aid',
    'glucose monitor'
  ];

  const eventTypes = [
    { value: 'all', label: 'All Events' },
    { value: 'malfunction', label: 'Device Malfunctions' },
    { value: 'injury', label: 'Patient Injuries' },
    { value: 'death', label: 'Patient Deaths' }
  ];

  const dateRanges = [
    { value: 7, label: 'Last 7 days' },
    { value: 30, label: 'Last 30 days' },
    { value: 90, label: 'Last 90 days' },
    { value: 180, label: 'Last 6 months' },
    { value: 365, label: 'Last year' }
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    
    const searchParams = {
      searchType,
      dateRange,
      deviceName: deviceName.trim() || null,
      eventType: searchType === 'adverse_events' ? eventType : 'all'
    };

    if (onSearch) {
      onSearch(searchParams);
    }
  };

  const handleQuickSearch = (params) => {
    setSearchType(params.searchType);
    setDateRange(params.dateRange || 30);
    setDeviceName(params.deviceName || '');
    setEventType(params.eventType || 'all');
    
    if (onSearch) {
      onSearch(params);
    }
  };

  const handleDeviceQuickSelect = (device) => {
    setDeviceName(device);
    // Automatically search when device is selected
    const searchParams = {
      searchType,
      dateRange,
      deviceName: device,
      eventType
    };
    if (onSearch) {
      onSearch(searchParams);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          FDA MAUDE Medical Device Monitoring
        </h1>
        <p className="text-lg text-gray-600">
          Monitor any medical device for adverse events, recalls, and safety signals using FDA MAUDE database
        </p>
      </div>

      {/* Popular Devices Quick Select */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Medical Devices</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {popularDevices.map((device) => (
            <button
              key={device}
              onClick={() => handleDeviceQuickSelect(device)}
              className="p-3 text-left bg-gray-50 hover:bg-blue-50 hover:border-blue-300 border border-gray-200 rounded-lg transition-all duration-200 text-sm capitalize"
            >
              {device}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => handleQuickSearch({ 
            searchType: 'adverse_events', 
            dateRange: 30, 
            eventType: 'all' 
          })}
          className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center justify-center mb-2">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-1">Monitor Adverse Events</h3>
          <p className="text-sm opacity-90">Check recent adverse events and safety issues</p>
        </button>

        <button
          onClick={() => handleQuickSearch({ 
            searchType: 'recalls', 
            dateRange: 90 
          })}
          className="p-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center justify-center mb-2">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-1">Check Recalls</h3>
          <p className="text-sm opacity-90">Review recent device recalls and safety notices</p>
        </button>

        <button
          onClick={() => handleQuickSearch({ 
            searchType: 'safety_signals', 
            dateRange: 180 
          })}
          className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center justify-center mb-2">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-1">Analyze Safety Signals</h3>
          <p className="text-sm opacity-90">Identify trends and potential safety concerns</p>
        </button>
      </div>

      {/* Advanced Search Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Advanced Search</h2>
        
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Device Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device Name (Optional)
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Enter device name (e.g., pacemaker, insulin pump, hip implant)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank to search all medical devices
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Type
              </label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="adverse_events">Adverse Events</option>
                <option value="recalls">Device Recalls</option>
                <option value="safety_signals">Safety Signal Analysis</option>
              </select>
            </div>

            {/* Event Type (only for adverse events) */}
            {searchType === 'adverse_events' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {eventTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Period
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {dateRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading && (
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isLoading ? 'Searching...' : 'Search MAUDE Database'}
            </button>
          </div>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results && results.status === 'success' && (
        <div className="space-y-6">
          <DeviceInfoCard deviceData={results} searchType={searchType} />
        </div>
      )}

      {/* No Results */}
      {results && results.status === 'success' && (
        (searchType === 'adverse_events' && (!results.events || results.events.length === 0)) ||
        (searchType === 'recalls' && (!results.recalls || results.recalls.length === 0)) ||
        (searchType === 'safety_signals' && !results.safety_signals)
      ) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
          <p className="text-gray-600">
            No {searchType.replace('_', ' ')} found for the specified criteria. 
            Try adjusting your search parameters or expanding the date range.
          </p>
        </div>
      )}

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800">About MAUDE Database</h3>
            <div className="text-sm text-blue-700 mt-1">
              <p className="mb-2">
                The Manufacturer and User Facility Device Experience (MAUDE) database contains medical device reports 
                submitted to the FDA by manufacturers, user facilities, and patients.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Reports may not always be verified or validated by the FDA</li>
                <li>The absence of reports does not mean a device is problem-free</li>
                <li>This tool searches across all FDA-regulated medical devices</li>
                <li>Data is updated regularly but may have reporting delays</li>
                <li>You can search for any medical device by name or leave blank to search all devices</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceInformation;