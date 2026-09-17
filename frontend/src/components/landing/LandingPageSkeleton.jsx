import React from 'react';

export default function LandingPageSkeleton() {
  return (
    <div className="w-full bg-white font-sans overflow-hidden animate-pulse min-h-screen">
      {/* Hero Section Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-24 flex flex-col items-center text-center">
        <div className="w-3/4 max-w-2xl h-12 md:h-16 bg-gray-200 rounded-xl mb-6"></div>
        <div className="w-5/6 max-w-3xl h-6 md:h-8 bg-gray-100 rounded-lg mb-4"></div>
        <div className="w-2/3 max-w-xl h-6 md:h-8 bg-gray-100 rounded-lg mb-10"></div>
        
        {/* Search Bar Skeleton */}
        <div className="w-full max-w-4xl bg-gray-50 rounded-2xl p-2 md:p-3 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
          <div className="h-12 flex-1 bg-white border border-gray-100 rounded-xl"></div>
          <div className="h-12 flex-1 bg-white border border-gray-100 rounded-xl hidden md:block"></div>
          <div className="h-12 w-full md:w-32 bg-gray-200 rounded-xl"></div>
        </div>
      </div>

      {/* Trust Badges / Stats Skeleton */}
      <div className="w-full border-y border-gray-100 py-8 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-6 md:gap-12">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 w-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>

      {/* Talent Carousel Skeleton */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 flex justify-between items-end">
          <div>
            <div className="w-48 h-8 bg-gray-200 rounded-lg mb-3"></div>
            <div className="w-64 h-5 bg-gray-100 rounded-md"></div>
          </div>
          <div className="w-24 h-10 bg-gray-100 rounded-xl hidden sm:block"></div>
        </div>
        
        {/* Cards row (Scrollable) */}
        <div className="w-full flex overflow-hidden gap-6 px-4 sm:px-6 lg:px-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="min-w-[280px] w-[280px] sm:min-w-[320px] h-[380px] bg-gray-50 rounded-[24px] border border-gray-100 p-6 flex flex-col shrink-0">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gray-200 shrink-0"></div>
                <div className="flex-1">
                  <div className="w-32 h-5 bg-gray-200 rounded-md mb-2"></div>
                  <div className="w-24 h-4 bg-gray-100 rounded-md"></div>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="w-full h-4 bg-gray-100 rounded-md"></div>
                <div className="w-5/6 h-4 bg-gray-100 rounded-md"></div>
              </div>
              <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="w-full h-12 bg-gray-200 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid Skeleton */}
      <div className="py-16 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-64 h-8 bg-gray-200 rounded-lg mb-12 mx-auto"></div>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-white rounded-[24px] border border-gray-100 p-8">
                <div className="w-12 h-12 bg-gray-200 rounded-xl mb-6"></div>
                <div className="w-40 h-6 bg-gray-200 rounded-md mb-4"></div>
                <div className="w-full h-4 bg-gray-100 rounded-md mb-2"></div>
                <div className="w-4/5 h-4 bg-gray-100 rounded-md"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
