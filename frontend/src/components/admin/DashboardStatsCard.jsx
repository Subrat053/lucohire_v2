import { HiTrendingUp, HiTrendingDown } from 'react-icons/hi';
import { Link } from 'react-router-dom';

const DashboardStatsCard = ({ icon: Icon, label, value, trend, trendLabel, colorClass = 'text-green-500', bgClass = 'bg-green-50', sparklineColor = '#10B981', link }) => {
  const isPositive = trend >= 0;

  const CardContent = (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col relative overflow-hidden group hover:border-gray-200 hover:shadow-md transition-all cursor-pointer h-full">
      <div className="flex items-center gap-3 relative z-10">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bgClass} ${colorClass}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-gray-500 truncate">{label}</p>
          <h3 className="text-xl font-extrabold text-gray-900 leading-tight mt-0.5">{value}</h3>
          
          {trend !== undefined && trend !== null && (
            <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold">
              <span className={`flex items-center gap-0.5 ${isPositive ? 'text-green-700' : 'text-red-600'}`}>
                {isPositive ? <HiTrendingUp className="w-3 h-3" /> : <HiTrendingDown className="w-3 h-3" />}
                {isPositive ? '+' : ''}{trend}%
              </span>
              <span className="text-gray-400 truncate">{trendLabel || 'vs last 7 days'}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Decorative Sparkline (Static visual representation for design) */}
      <div className="absolute bottom-0 left-0 right-0 h-8 opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none">
        <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full">
          <path 
            d="M0,15 L10,12 L20,16 L30,8 L40,14 L50,6 L60,10 L70,4 L80,8 L90,2 L100,6 L100,20 L0,20 Z" 
            fill={`url(#gradient-${sparklineColor.replace('#','')})`} 
          />
          <path 
            d="M0,15 L10,12 L20,16 L30,8 L40,14 L50,6 L60,10 L70,4 L80,8 L90,2 L100,6" 
            fill="none" 
            stroke={sparklineColor} 
            strokeWidth="1.5" 
            vectorEffect="non-scaling-stroke"
          />
          <defs>
            <linearGradient id={`gradient-${sparklineColor.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sparklineColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={sparklineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );

  return link ? (
    <Link to={link} className="block h-full">
      {CardContent}
    </Link>
  ) : CardContent;
};

export default DashboardStatsCard;
