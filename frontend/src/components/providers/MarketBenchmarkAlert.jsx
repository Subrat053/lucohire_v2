import React, { useState, useEffect } from 'react';
import { TrendingUp, Award } from 'lucide-react';
import { providerAPI } from '../../services/api';

const MarketBenchmarkAlert = ({ candidateId }) => {
  const [benchmark, setBenchmark] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (candidateId) {
      fetchBenchmark();
    }
  }, [candidateId]);

  const fetchBenchmark = async () => {
    try {
      setLoading(true);
      const res = await providerAPI.getBenchmark(candidateId);
      if (res.data.success) {
        setBenchmark(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch benchmark', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (!benchmark) return null;

  return (
    <div className="relative group w-full mb-6 mt-4">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
      <div className="relative flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white ring-1 ring-gray-900/5 rounded-xl leading-none">
        
        <div className="flex items-center space-x-4 w-full">
          <div className="flex-shrink-0 bg-indigo-50 rounded-full p-2.5">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
              Market Stand Value
              <Award className="w-4 h-4 text-yellow-500" />
            </p>
            <p className="text-sm text-gray-700">
              You are better than <span className="font-bold text-indigo-600">{benchmark.percentile}%</span> of {benchmark.designation}s in the <span className="font-medium text-gray-800">{benchmark.city}</span> market right now.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

export default MarketBenchmarkAlert;
