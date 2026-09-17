import React from 'react';

export default function HomeDivider() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-1 opacity-60 max-w-[460px] md:max-w-2xl mx-auto my-2">
      <div className="h-[1px] flex-1 bg-gradient-to-r from-[#ECEAF9] to-transparent" />
      <div className="w-[5px] h-[5px] rounded-full bg-[#4A3AE0] shrink-0" />
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#ECEAF9]" />
    </div>
  );
}
