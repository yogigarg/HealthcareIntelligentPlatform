import React, { useState } from 'react';

const ClinicalTrialCard = ({ trial }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('recruiting')) return 'green';
    if (statusLower.includes('active')) return 'blue';
    if (statusLower.includes('completed')) return 'gray';
    if (statusLower.includes('terminated')) return 'red';
    return 'gray';
  };

  const statusColor = getStatusColor(trial.status);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {trial.title || 'Untitled Trial'}
            </h3>
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-500">NCT{trial.nct_id}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
                {trial.status}
              </span>
              {trial.phase && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {trial.phase}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Key Information */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Study Type</p>
            <p className="mt-1 text-sm text-gray-900">{trial.study_type || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sponsor</p>
            <p className="mt-1 text-sm text-gray-900">{trial.sponsor || 'Not specified'}</p>
          </div>
        </div>

        {/* Conditions */}
        {trial.conditions && trial.conditions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Conditions</p>
            <div className="flex flex-wrap gap-2">
              {trial.conditions.map((condition, idx) => (
                <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                  {condition}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Brief Summary */}
        {trial.brief_summary && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Brief Summary</p>
            <p className={`text-sm text-gray-600 ${!expanded ? 'line-clamp-3' : ''}`}>
              {trial.brief_summary}
            </p>
            {trial.brief_summary.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium mt-1"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Eligibility */}
        {trial.eligibility && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Eligibility Criteria</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {trial.eligibility.gender && (
                <div>
                  <span className="text-gray-500">Gender:</span>
                  <span className="ml-2 text-gray-900">{trial.eligibility.gender}</span>
                </div>
              )}
              {trial.eligibility.min_age && (
                <div>
                  <span className="text-gray-500">Age Range:</span>
                  <span className="ml-2 text-gray-900">
                    {trial.eligibility.min_age} - {trial.eligibility.max_age || 'No limit'}
                  </span>
                </div>
              )}
              {trial.eligibility.healthy_volunteers && (
                <div className="col-span-2">
                  <span className="text-gray-500">Healthy Volunteers:</span>
                  <span className="ml-2 text-gray-900">{trial.eligibility.healthy_volunteers}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Locations */}
        {trial.locations && trial.locations.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Locations ({trial.locations.length})
            </p>
            <div className="space-y-2">
              {trial.locations.slice(0, expanded ? undefined : 2).map((location, idx) => (
                <div key={idx} className="text-sm">
                  <p className="font-medium text-gray-900">{location.facility}</p>
                  <p className="text-gray-500">
                    {location.city}, {location.state} {location.country}
                  </p>
                </div>
              ))}
              {!expanded && trial.locations.length > 2 && (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Show {trial.locations.length - 2} more locations
                </button>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          
            href={trial.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center"
          >
            View on ClinicalTrials.gov
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <button className="text-sm text-gray-500 hover:text-gray-700">
            Save for later
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClinicalTrialCard;