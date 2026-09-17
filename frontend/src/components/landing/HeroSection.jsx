import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DualPathwayCards from './DualPathwayCards';
import LiveJobsCarousel from './LiveJobsCarousel';
import useTranslation from '../../hooks/useTranslation';
import JobSearchAutocomplete from '../common/JobSearchAutocomplete';
import LocationSearch from '../LocationSearch';

export default function HeroSection({ user, jobSearch, setJobSearch, jobLocation, setJobLocation, handleJobSearch, isLoadingJobs, liveJobsList, onJobClick }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getPopularSearchLink = (term) => {
    if (user?.activeRole === 'provider') {
      return `/provider/job-for-me`; 
    } else if (user?.activeRole === 'recruiter') {
      return `/recruiter/dashboard`;
    } else {
      return `/candidate-landing`;
    }
  };

  return (
    <div className="w-full flex flex-col pt-1 pb-6 sm:pt-5 sm:pb-10 bg-[#fcfdfe]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* 2. Hero Section Content */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center flex-1">
        
        {/* Top Pill */}
        {/* Top Pill */}
        {/* <div className="flex items-center gap-1.5 bg-[#f4f7ff] text-blue-700 px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold mb-2 mt-1 border border-blue-100/50 shadow-sm">
          <User className="w-3.5 h-3.5 text-blue-600" />
          {t("India's AI-Powered Hiring Platform")}
        </div> */}

        {/* Main Headline */}
        <h2 className="text-[26px] sm:text-3xl md:text-4xl lg:text-[40px] font-bold text-[#0B1536] mt-6 sm:mt-0 mb-4 sm:mb-5 text-center tracking-tight leading-tight px-2">
          {t("One Platform.")} <br className="block sm:hidden" /> <span className="text-blue-600">{t("Endless Opportunities.")}</span>
        </h2>

        
        {/* Main Job Search Bar */}
        <form onSubmit={handleJobSearch} className="w-full max-w-3xl bg-white border border-gray-200 rounded-2xl shadow-sm p-2 sm:p-2.5 flex flex-col sm:flex-row items-center relative z-10 hover:shadow-md transition gap-2 sm:gap-2.5 mt-1">
          <JobSearchAutocomplete
            value={jobSearch}
            onChange={setJobSearch}
            onSelect={setJobSearch}
            placeholder={t("Search jobs by title, skills, or company")}
            liveJobsList={liveJobsList}
            className="!bg-gray-50 !border !border-gray-100 !rounded-lg focus-within:!border-blue-500 focus-within:!ring-1 focus-within:!ring-blue-500 transition-all !py-0.5 sm:!py-1"
          />
          <div className="flex-1 flex items-center w-full sm:w-auto relative">
            <LocationSearch
              value={jobLocation}
              onChange={setJobLocation}
              onSelect={(loc) => setJobLocation(loc ? loc.name || loc.city || loc.label : '')}
              placeholder={t("All Locations")}
              className="w-full flex-1"
              iconClassName="w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
              inputClassName="!border-gray-100 !rounded-lg !bg-gray-50 focus:!border-blue-500 focus:!ring-1 focus:!ring-blue-500 w-full !shadow-none !text-xs text-gray-900 truncate !py-2 sm:!py-2.5 !pl-9 !pr-8"
            />
          </div>
          <button 
            type="submit"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 sm:py-2 px-6 sm:px-7 rounded-xl transition-colors shrink-0 text-xs shadow-sm"
          >
            {t("Search Jobs")}
          </button>
        </form>

        {/* Popular Searches */}
        <div className="mt-3 flex flex-wrap justify-center items-center gap-2 text-sm">
          {/* <span className="text-gray-900 font-bold text-[10px] sm:text-[11px] mr-1">{t("Popular Searches:")}</span>
          {[t('React Developer'), t('UI/UX Designer'), t('Data Analyst'), t('Marketing'), t('Python Developer')].map((term) => (
            <Link 
              key={term} 
              to={getPopularSearchLink(term)}
              state={{ formData: { skills: term, location: '' } }}
              onClick={() => setJobSearch(term)}
              className="px-3 py-1 rounded-full bg-[#f4f7fa] text-[#4b5563] hover:bg-blue-50 hover:text-blue-700 transition font-semibold text-[9px] sm:text-[10px] block"
            >
              {term}
            </Link>
          ))}
          <Link to="/candidate-landing" className="text-blue-600 font-bold text-[10px] hover:underline ml-1">
            {t("View all")}
          </Link> */}
        </div>
        
        {/* 3. Dual Pathway Cards or Jobs */}
        <div className="w-full mt-4 sm:mt-10">
          {user ? (
            <div className="-mt-4 w-full">
              <LiveJobsCarousel isLoadingJobs={isLoadingJobs} liveJobsList={liveJobsList} onJobClick={onJobClick} />
            </div>
          ) : (
            <DualPathwayCards user={user} />
          )}
        </div>
      </div>
      
      {!user && (
        <div className="w-full mt-5 sm:mt-10 mb-1 sm:mb-0 px-4 sm:px-6 lg:px-8">
          <LiveJobsCarousel isLoadingJobs={isLoadingJobs} liveJobsList={liveJobsList} onJobClick={onJobClick} />
        </div>
      )}
    </div>
  );
}
