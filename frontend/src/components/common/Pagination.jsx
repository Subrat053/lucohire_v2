import React from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center space-x-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <HiChevronLeft className="w-5 h-5" />
      </button>
      
      <span className="text-sm text-gray-700 font-medium px-4">
        Page {currentPage} of {totalPages}
      </span>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <HiChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Pagination;
