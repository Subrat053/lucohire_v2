import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RevenueChart = ({ data = [], onPeriodChange }) => {
  const [period, setPeriod] = useState('last7');

  const handlePeriodChange = (p) => {
    setPeriod(p);
    if (onPeriodChange) onPeriodChange(p);
  };

  const formatYAxis = (val) => `${(val / 1000).toFixed(0)}K`;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Platform Overview</h3>
        </div>
        <div className="flex gap-2">
          {[{ label: '7 Days', val: 'last7' }, { label: '30 Days', val: 'last30' }, { label: '90 Days', val: 'last90' }].map((p) => (
            <button
              key={p.val}
              onClick={() => handlePeriodChange(p.val)}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 border ${
                period === p.val
                  ? 'border-gray-200 bg-white text-gray-900 shadow-md transform -translate-y-0.5'
                  : 'border-transparent text-gray-400 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '11px',
              }}
            />
            <Line type="monotone" dataKey="candidates" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="recruiters" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3, fill: '#8B5CF6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="jobs" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="apps" stroke="#F97316" strokeWidth={2} dot={{ r: 3, fill: '#F97316', strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-center gap-x-6 gap-y-2 mt-4">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[10px] text-gray-500 font-medium">New Candidates</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div><span className="text-[10px] text-gray-500 font-medium">New Recruiters</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-[10px] text-gray-500 font-medium">New Jobs</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div><span className="text-[10px] text-gray-500 font-medium">Applications</span></div>
      </div>
    </div>
  );
};

export default RevenueChart;
