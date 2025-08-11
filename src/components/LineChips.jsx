import React from "react";

export default function LineChips({ lines, types = [] }){
  const items = [...(lines || [])];
  if (types.includes("R")) items.unshift("R");
  if (!items.length) return null;
  const chip = (l, i) => {
    const t = String(l).toUpperCase();
    const isS = /^S/.test(t), isU = /^U/.test(t), isR = /^(RE|RB|FEX|R)/.test(t);
    const shape = isS ? 'rounded-full' : 'rounded-sm';
    const bg = isS ? 'bg-[#2aa232]' : isU ? 'bg-[#1f62ae]' : isR ? 'bg-[#d22]' : 'bg-white';
    const txt = (isS || isU || isR) ? 'text-white' : 'text-black';
    const it = isR ? 'italic' : '';
    return <span key={i} className={`px-2 py-0.5 text-[10px] font-black ${shape} border-2 border-black ${bg} ${txt} ${it}`}>{l}</span>;
  };
  return <div className="flex flex-wrap gap-1 mt-1">{items.map(chip)}</div>;
}

