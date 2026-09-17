import useTranslation from "../../hooks/useTranslation";
import React, { useState } from 'react';
import { providerAPI } from '../../services/api';

const AIProfileAutoFillModal = ({ isOpen, onClose, onApply }) => {
  const {
    t
  } = useTranslation();

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for disambiguation step
  const [extractedData, setExtractedData] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  if (!isOpen) return null;

  const handleExtract = async () => {
    if (!text.trim()) {
      setError("Please paste some text describing your profile.");
      return;
    }

    setLoading(true);
    setError(null);
    setExtractedData(null);
    setSelectedLocation(null);

    try {
      const response = await providerAPI.extractProfileData({ freeText: text });
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setExtractedData(data);
        
        // If there's exactly one location, pre-select it
        if (data.locationOptions && data.locationOptions.length === 1) {
          setSelectedLocation(data.locationOptions[0]);
        }
      } else {
        setError(response.data.message || "Failed to extract data.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while communicating with the AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (extractedData) {
      // Build final object to send to parent
      const finalData = {
        skills: extractedData.skill ? [extractedData.skill] : [],
        experience: extractedData.experience_years || 0,
        hourlyRate: extractedData.hourly_rate || 0,
        location: selectedLocation || null
      };
      
      onApply(finalData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#111827] border border-gray-700/50 rounded-2xl w-full max-w-lg shadow-2xl relative animate-fadeInUp">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <span className="text-blue-500">✨</span>{t("AI Profile Auto-Fill")}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {!extractedData ? (
            <>
              <p className="text-gray-400 text-sm">{t(
                "Paste your bio, resume snippet, or just describe what you do, and our AI will automatically fill out your profile details!"
              )}</p>
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t(
                  "e.g. I am a plumber from Akshardham with 5 years of experience. I usually charge 200 per hour."
                )}
                className="w-full bg-[#1F2937] border border-gray-700 text-white rounded-xl p-4 min-h-[150px] focus:outline-none focus:border-blue-500 transition-colors resize-none placeholder-gray-500"
              />

              <button
                onClick={handleExtract}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>{t("Extracting Data...")}</>
                ) : (
                  <>{t("Extract Details ✨")}</>
                )}
              </button>
            </>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-[#1F2937] rounded-xl p-4 border border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">{t("Extracted Details")}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t("Skill:")}</span>
                    <span className="text-white font-medium capitalize">{extractedData.skill || 'Not found'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t("Experience:")}</span>
                    <span className="text-white font-medium">{extractedData.experience_years ? `${extractedData.experience_years} years` : 'Not found'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t("Hourly Rate:")}</span>
                    <span className="text-white font-medium">{extractedData.hourly_rate ? `₹${extractedData.hourly_rate}` : 'Not found'}</span>
                  </div>
                </div>
              </div>

              {/* Location Disambiguation */}
              {extractedData.locationOptions && extractedData.locationOptions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400">{t("We found multiple matches for \"")}{extractedData.rawLocationExtracted}{t("\". Please select the correct one:")}</h3>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                    {extractedData.locationOptions.map((loc, idx) => (
                      <label 
                        key={idx} 
                        className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${selectedLocation?.standardizedAddress === loc.standardizedAddress ? 'bg-blue-500/10 border-blue-500' : 'bg-[#1F2937] border-gray-700 hover:border-gray-500'}`}
                      >
                        <input 
                          type="radio" 
                          name="location" 
                          className="mt-1 mr-3 text-blue-500 focus:ring-blue-500"
                          checked={selectedLocation?.standardizedAddress === loc.standardizedAddress}
                          onChange={() => setSelectedLocation(loc)}
                        />
                        <span className="text-sm text-gray-200">{loc.standardizedAddress}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {extractedData.locationOptions && extractedData.locationOptions.length === 0 && (
                <div className="text-sm text-yellow-500 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">{t("Could not find a valid location for \"")}{extractedData.rawLocationExtracted}{t("\". You can still apply the other details.")}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setExtractedData(null)}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
                >{t("Back")}</button>
                <button
                  onClick={handleApply}
                  disabled={extractedData.locationOptions?.length > 0 && !selectedLocation}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >{t("Apply Details")}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIProfileAutoFillModal;
