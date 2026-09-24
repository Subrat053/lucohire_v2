import React from 'react';

/**
 * Reusable animated circular SVG score gauge
 */
export default function ScoreGauge({
  score = 0,
  max = 100,
  size = 56,
  strokeWidth = 5,
  showLabel = true,
  status = 'auto', // 'auto' | 'good' | 'mid' | 'low' | 'primary'
  labelSuffix = '',
  className = ''
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const offset = circumference - (pct / 100) * circumference;

  let strokeColor = '#5B21D6'; // primary brand
  if (status === 'auto') {
    if (pct >= 75) strokeColor = '#0E8F5F'; // good green
    else if (pct >= 45) strokeColor = '#B9791A'; // mid amber
    else strokeColor = '#B3492F'; // low red
  } else if (status === 'good') {
    strokeColor = '#0E8F5F';
  } else if (status === 'mid') {
    strokeColor = '#B9791A';
  } else if (status === 'low') {
    strokeColor = '#B3492F';
  } else if (status === 'primary') {
    strokeColor = '#1B4FE0';
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ECEAF9"
          strokeWidth={strokeWidth}
        />
        {/* Progress fill circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      {showLabel && (
        <span
          className="absolute inset-0 flex items-center justify-center font-bold tracking-tight text-[#181B24]"
          style={{ fontSize: size <= 60 ? '13px' : size <= 90 ? '18px' : '28px', fontFamily: 'Fraunces, serif' }}
        >
          {score}{labelSuffix}
        </span>
      )}
    </div>
  );
}
