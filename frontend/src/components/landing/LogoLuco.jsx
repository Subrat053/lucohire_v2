import React from 'react';

const LogoLuco = () => {
  return (
    <div className="w-full bg-white py-16 sm:py-24 relative overflow-hidden">
      {/* Subtle glowing background effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-200/40 rounded-full blur-2xl opacity-60 mix-blend-multiply pointer-events-none"></div>
      
      <div className="max-w-335 mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          {/* Logo container with subtle hover scale */}
          <div className="relative group cursor-default">
            <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-700"></div>
            <img 
              src="/lucologo.png" 
              alt="Lucohire Logo" 
              className="relative w-25 h-25 sm:w-48 sm:h-48 object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105" 
            />
          </div>
          
          <div className="flex flex-col items-center space-y-3">
            <h2 className="font-bold text-gray-900 text-5xl sm:text-6xl tracking-tight drop-shadow-sm">
              Lucohire
            </h2>
            <p className="text-base sm:text-lg md:text-xl font-medium text-gray-700 max-w-lg mx-auto leading-relaxed">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-bold">
                AI-Powered
              </span>{' '}
              Global Jobs & Hiring Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoLuco;
