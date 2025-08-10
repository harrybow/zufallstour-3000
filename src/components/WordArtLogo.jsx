import React from "react";

export default function WordArtLogo(){
  return (
    <div className="flex flex-col items-center select-none mt-2 mb-6">
      <div className="relative">
        <h1 className="relative z-20 text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-teal-300 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent" style={{filter:"saturate(1.3)",letterSpacing:"0.5px",WebkitTextStroke:"4px #000",paintOrder:"stroke fill"}}>ZUFALLSTOUR</h1>
        <h1 className="absolute inset-0 z-0 text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-black" style={{transform:"translate(6px,6px)",opacity:.6}}>ZUFALLSTOUR</h1>
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-40">
          <span className="text-6xl sm:text-7xl md:text-8xl font-black italic bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-300 bg-clip-text text-transparent" style={{WebkitMaskImage:"linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.85) 50%, rgba(0,0,0,1))",maskImage:"linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.85) 50%, rgba(0,0,0,1))"}}>3000</span>
        </div>
      </div>
    </div>
  );
}

