import React from "react";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children }){
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[96%] max-w-[860px] md:w-[760px] rounded-3xl shadow-2xl border-4 border-black p-4 md:p-6 bg-gradient-to-br from-yellow-300 via-fuchsia-200 to-cyan-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-black drop-shadow">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-black text-white border-4 border-black"><X size={18}/></button>
        </div>
        <div className="max-h-[85vh] md:max-h-[72vh] overflow-auto pr-1">{children}</div>
      </div>
    </div>
  );
}

