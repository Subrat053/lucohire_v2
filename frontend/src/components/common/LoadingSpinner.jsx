import React from 'react';
import RouteLoader from './RouteLoader';

const LoadingSpinner = ({ size = 'md', text = '' }) => {
  if (size === 'lg') {
    return <RouteLoader />;
  }

  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={`${sizes[size] || 'w-8 h-8'} border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin`}></div>
      {text && <p className="mt-3 text-sm text-gray-500">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
