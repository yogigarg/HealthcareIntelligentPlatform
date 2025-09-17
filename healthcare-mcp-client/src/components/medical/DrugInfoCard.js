import React from 'react';

const DrugInfoCard = ({ drug, searchType }) => {
  const renderGeneralInfo = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {drug.brand_name || drug.generic_name || 'Unknown Drug'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {drug.labeler_name || drug.manufacturer || 'Unknown Manufacturer'}
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {drug.product_type || 'Drug'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Generic Name</p>
          <p className="mt-1 text-sm text-gray-900">{drug.generic_name || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Brand Name</p>
          <p className="mt-1 text-sm text-gray-900">{drug.brand_name || 'N/A'}</p>
        </div>
        {drug.dosage_form && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dosage Form</p>
            <p className="mt-1 text-sm text-gray-900">{drug.dosage_form}</p>
          </div>
        )}
        {drug.route && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Route</p>
            <p className="mt-1 text-sm text-gray-900">
              {Array.isArray(drug.route) ? drug.route.join(', ') : drug.route}
            </p>
          </div>
        )}
        {drug.pharm_class && (
          <div className="col-span-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pharmacological Class</p>
            <p className="mt-1 text-sm text-gray-900">
              {Array.isArray(drug.pharm_class) ? drug.pharm_class.join(', ') : drug.pharm_class}
            </p>
          </div>
        )}
      </div>

      {drug.active_ingredients && drug.active_ingredients.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Active Ingredients</p>
          <div className="space-y-1">
            {drug.active_ingredients.map((ingredient, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-900">{ingredient.name}</span>
                <span className="text-gray-500">{ingredient.strength}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderLabelInfo = () => {
    const openfda = drug.openfda || {};
    const brandNames = openfda.brand_name || [];
    const genericNames = openfda.generic_name || [];
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {brandNames[0] || genericNames[0] || 'Drug Label Information'}
          </h3>
          {(brandNames.length > 0 || genericNames.length > 0) && (
            <p className="text-sm text-gray-500 mt-1">
              {genericNames[0] && `Generic: ${genericNames[0]}`}
              {brandNames[0] && genericNames[0] && ' • '}
              {brandNames[0] && `Brand: ${brandNames[0]}`}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {drug.indications_and_usage && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Indications and Usage</h4>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {Array.isArray(drug.indications_and_usage) 
                  ? drug.indications_and_usage[0] 
                  : drug.indications_and_usage}
              </p>
            </div>
          )}

          {drug.warnings && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="text-sm font-semibold text-amber-900 mb-1 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Warnings
              </h4>
              <p className="text-sm text-amber-800 whitespace-pre-line">
                {Array.isArray(drug.warnings) 
                  ? drug.warnings[0] 
                  : drug.warnings}
              </p>
            </div>
          )}

          {drug.contraindications && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-semibold text-red-900 mb-1 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Contraindications
              </h4>
              <p className="text-sm text-red-800 whitespace-pre-line">
                {Array.isArray(drug.contraindications) 
                  ? drug.contraindications[0] 
                  : drug.contraindications}
              </p>
            </div>
          )}

          {drug.dosage_and_administration && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Dosage and Administration</h4>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {Array.isArray(drug.dosage_and_administration) 
                  ? drug.dosage_and_administration[0] 
                  : drug.dosage_and_administration}
              </p>
            </div>
          )}

          {drug.adverse_reactions && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Adverse Reactions</h4>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {Array.isArray(drug.adverse_reactions) 
                  ? drug.adverse_reactions[0] 
                  : drug.adverse_reactions}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAdverseEvents = () => {
    if (!drug.patient) return null;
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Adverse Event Report</h3>
          <p className="text-sm text-gray-500 mt-1">
            Report Date: {drug.receivedate || 'Unknown'}
          </p>
        </div>

        <div className="space-y-4">
          {drug.patient.drug && drug.patient.drug.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Drugs Involved</h4>
              <div className="space-y-2">
                {drug.patient.drug.map((d, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">
                      {d.medicinalproduct || 'Unknown Drug'}
                    </p>
                    {d.drugindication && (
                      <p className="text-xs text-gray-600 mt-1">
                        Indication: {d.drugindication}
                      </p>
                    )}
                    {d.drugdosagetext && (
                      <p className="text-xs text-gray-600">
                        Dosage: {d.drugdosagetext}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {drug.patient.reaction && drug.patient.reaction.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Reported Reactions</h4>
              <div className="flex flex-wrap gap-2">
                {drug.patient.reaction.map((r, idx) => (
                  <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {r.reactionmeddrapt || 'Unknown reaction'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {drug.patient.patientsex && (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Sex</p>
                <p className="font-medium text-gray-900">
                  {drug.patient.patientsex === '1' ? 'Male' : 
                   drug.patient.patientsex === '2' ? 'Female' : 'Unknown'}
                </p>
              </div>
              {drug.patient.patientage && (
                <div>
                  <p className="text-gray-500">Age</p>
                  <p className="font-medium text-gray-900">
                    {drug.patient.patientage} {drug.patient.patientageyear && 'years'}
                  </p>
                </div>
              )}
              {drug.serious && (
                <div>
                  <p className="text-gray-500">Serious</p>
                  <p className="font-medium text-gray-900">
                    {drug.serious === '1' ? 'Yes' : 'No'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  switch (searchType) {
    case 'general':
      return renderGeneralInfo();
    case 'label':
      return renderLabelInfo();
    case 'adverse_events':
      return renderAdverseEvents();
    default:
      return null;
  }
};

export default DrugInfoCard;