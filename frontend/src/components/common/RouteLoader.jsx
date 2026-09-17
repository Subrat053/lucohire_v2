import React from 'react';

const RouteLoader = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
    {/* Header Banner Skeleton */}
    <div className="bg-slate-200 rounded-3xl p-8 h-40 flex flex-col justify-between">
      <div className="space-y-3 w-1/2">
        <div className="h-4 bg-slate-300 rounded w-24"></div>
        <div className="h-7 bg-slate-300 rounded w-48"></div>
        <div className="h-3.5 bg-slate-300 rounded w-72"></div>
      </div>
    </div>

    {/* Section Skeleton Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 h-32 flex justify-between items-start">
          <div className="space-y-3 w-full">
            <div className="h-4 bg-slate-200 rounded w-24"></div>
            <div className="h-8 bg-slate-200 rounded w-16 mt-2"></div>
          </div>
          <div className="w-12 h-12 bg-slate-200 rounded-full shrink-0"></div>
        </div>
      ))}
    </div>

    {/* Main Grid Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 h-48">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 h-64">
           <div className="h-6 bg-slate-200 rounded w-1/4 mb-6"></div>
           <div className="space-y-4">
             {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-200 rounded-xl w-full"></div>)}
           </div>
        </div>
      </div>
      <div className="space-y-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 h-64">
           <div className="h-6 bg-slate-200 rounded w-1/2 mb-6"></div>
           <div className="space-y-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-4 bg-slate-200 rounded w-full"></div>)}
           </div>
        </div>
      </div>
    </div>
  </div>
);

export default RouteLoader;
