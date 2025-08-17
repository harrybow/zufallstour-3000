import React, { useRef, useState } from "react";
import { useI18n } from "../i18n";

export default function ZoomBox({ src }: { src: string }){
  const wrapRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  function onWheel(e: React.WheelEvent){ e.preventDefault(); const delta=-e.deltaY, factor=delta>0?1.1:0.9; const next=Math.min(5, Math.max(1, scale*factor)); setScale(next); }
  function onPointerDown(e: React.PointerEvent){ dragging.current=true; last.current={x:e.clientX,y:e.clientY}; e.currentTarget.setPointerCapture(e.pointerId); }
  function onPointerMove(e: React.PointerEvent){ if(!dragging.current) return; const dx=e.clientX-last.current.x, dy=e.clientY-last.current.y; last.current={x:e.clientX,y:e.clientY}; setPos(p=>({x:p.x+dx,y:p.y+dy})); }
  function onPointerUp(e: React.PointerEvent){ dragging.current=false; try{ e.currentTarget.releasePointerCapture(e.pointerId); }catch{ /* ignore */ } }
  const reset = () => { setScale(1); setPos({x:0,y:0}); };
  return (
    <div className="relative w-full h-[70vh] bg-white rounded-xl border-4 border-black overflow-hidden">
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <button onClick={() => setScale(s=>Math.min(5,s*1.1))} className="px-3 py-1 rounded-lg bg-white">+</button>
        <button onClick={() => setScale(s=>Math.max(1,s/1.1))} className="px-3 py-1 rounded-lg bg-white">-</button>
        <button onClick={reset} className="px-3 py-1 rounded-lg bg-white">{t('zoom.reset')}</button>
      </div>
      <div ref={wrapRef} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} className="w-full h-full flex items-center justify-center touch-none cursor-grab active:cursor-grabbing">
        <img src={src} alt="Zoom" style={{ transform:`translate(${pos.x}px, ${pos.y}px) scale(${scale})` }} className="max-w-none max-h-none" />
      </div>
    </div>
  );
}

