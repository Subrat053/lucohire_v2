import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#7C3AED', '#3B82F6', '#F59E0B', '#10B981'];

const EarningsSourceChart = ({ data = [] }) => {
  const chartData = data.length > 0 ? data : [
    { name: 'Subscriptions', value: 42 },
    { name: 'Referral Fees', value: 28 },
    { name: 'Job Postings', value: 18 },
    { name: 'Add-ons', value: 12 },
  ];

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900">Earnings Source</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Current month breakdown</p>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center mt-4">
        <div className="w-40 h-40 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
                cornerRadius={4}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
                formatter={(value) => [`${value}%`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-extrabold text-gray-900">100%</span>
            <span className="text-[9px] font-bold text-gray-400 tracking-wider">TOTAL</span>
          </div>
        </div>

        <div className="w-full space-y-3 mt-8 px-4">
          {chartData.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-[11px] text-gray-700 font-medium">{item.name}</span>
              </div>
              <span className="text-[11px] font-bold text-gray-900">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EarningsSourceChart;
