import React, { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";

export default function ComboBox({ options, value, onChange, placeholder }){
  const { t } = useI18n();
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const norm = (s) => String(s || "").toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const labelOf = (id) => options.find(o => o.id === id)?.name || "";
  const filtered = useMemo(() => {
    const nq = norm(q);
    return nq ? options.filter(o => norm(o.name).includes(nq)) : options;
  }, [q, options]);

  useEffect(() => {
    function onDocClick(e){ if(!wrapRef.current) return; if(!wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => { if(open){ setTimeout(() => inputRef.current?.focus(), 0); setHi(0);} }, [open]);

  function choose(id){ onChange?.(id); setOpen(false); setQ(""); }

  function onKey(e){
    if(!open && (e.key === 'ArrowDown' || e.key === 'Enter')){ setOpen(true); e.preventDefault(); return; }
    if(!open) return;
    if(e.key === 'ArrowDown'){ setHi(i => Math.min(filtered.length-1, i+1)); e.preventDefault(); }
    else if(e.key === 'ArrowUp'){ setHi(i => Math.max(0, i-1)); e.preventDefault(); }
    else if(e.key === 'Enter'){ const item = filtered[hi]; if(item) choose(item.id); e.preventDefault(); }
    else if(e.key === 'Escape'){ setOpen(false); e.preventDefault(); }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        value={open ? q : labelOf(value)}
        onChange={(e) => { setQ(e.target.value); if(!open) setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder={placeholder || t('comboBox.placeholder')}
        className="w-full px-3 py-2 rounded-lg border-4 border-black bg-white"
      />
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-white"
      >▾</button>
      {open && (
        <div className="absolute z-20 mt-1 left-0 right-0 max-h-64 overflow-auto rounded-lg border-4 border-black bg-white shadow">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm opacity-70">{t('comboBox.noResults')}</div>
          ) : (
            filtered.map((o, idx) => (
              <button key={o.id} type="button" onMouseEnter={() => setHi(idx)} onClick={() => choose(o.id)}
                className={`w-full text-left px-3 py-2 ${idx === hi ? 'bg-amber-200' : 'bg-white'}`}
              >{o.name}</button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

