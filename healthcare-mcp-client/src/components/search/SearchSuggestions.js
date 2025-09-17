import React, { useState, useEffect } from 'react';

const SearchSuggestions = ({ searchType, onSelect }) => {
  const [suggestions, setSuggestions] = useState([]);

  const drugSuggestions = [
    { name: 'Aspirin', category: 'Pain Relief' },
    { name: 'Metformin', category: 'Diabetes' },
    { name: 'Lisinopril', category: 'Blood Pressure' },
    { name: 'Atorvastatin', category: 'Cholesterol' },
    { name: 'Omeprazole', category: 'Acid Reflux' },
    { name: 'Levothyroxine', category: 'Thyroid' },
    { name: 'Amlodipine', category: 'Blood Pressure' },
    { name: 'Metoprolol', category: 'Heart' },
    { name: 'Albuterol', category: 'Asthma' },
    { name: 'Gabapentin', category: 'Nerve Pain' }
  ];

  const conditionSuggestions = [
    { name: 'Type 2 Diabetes', category: 'Metabolic' },
    { name: 'Hypertension', category: 'Cardiovascular' },
    { name: 'Breast Cancer', category: 'Oncology' },
    { name: 'Alzheimer Disease', category: 'Neurological' },
    { name: 'COVID-19', category: 'Infectious' },
    { name: 'Depression', category: 'Mental Health' },
    { name: 'Asthma', category: 'Respiratory' },
    { name: 'Rheumatoid Arthritis', category: 'Autoimmune' },
    { name: 'Heart Failure', category: 'Cardiovascular' },
    { name: 'COPD', category: 'Respiratory' }
  ];

  useEffect(() => {
    if (searchType === 'drug') {
      setSuggestions(drugSuggestions);
    } else if (searchType === 'condition') {
      setSuggestions(conditionSuggestions);
    }
  }, [searchType]);

  return (
    <div className="mt-4">
      <p className="text-sm text-gray-600 mb-2">Popular searches:</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(suggestion.name)}
            className="group inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-gray-100 hover:bg-teal-100 text-gray-700 hover:text-teal-700 transition-colors"
          >
            <span>{suggestion.name}</span>
            <span className="ml-2 text-xs text-gray-500 group-hover:text-teal-600">
              {suggestion.category}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchSuggestions;