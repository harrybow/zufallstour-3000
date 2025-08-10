import React, { useEffect, useMemo, useRef, useState } from "react";
import { Settings as SettingsIcon, Shuffle, MapPin, Camera, Upload, Download, Trash2, ArrowUpDown, Check, ChevronLeft, Trophy, Pencil } from "lucide-react";
import { seedStations } from "./seed_stations";
import WordArtLogo from "./components/WordArtLogo";
import LineChips from "./components/LineChips";
import Modal from "./components/Modal";
import ComboBox from "./components/ComboBox";
import ManualVisitForm from "./components/ManualVisitForm";
import ZoomBox from "./components/ZoomBox";

// Helpers & Types
const STORAGE_KEY = "zufallstour3000.v4";
const COOLDOWN_KEY = "zufallstour3000.cooldownEnabled";
/** @typedef {{ id:string; name:string; types:("S"|"U"|"R")[]; lines?: string[]; visits: Visit[] }} Station */
/** @typedef {{ date: string; note?: string; photos?: string[] }} Visit */
const uid = () => Math.random().toString(36).slice(2, 10);
const googleMapsUrl = (name) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ", Berlin")}`;
const downloadFile = (filename, text, mime = "application/json;charset=utf-8") => {
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener"; a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  } catch {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    window.open(url, "_blank"); setTimeout(()=>URL.revokeObjectURL(url), 10000);
  }
};
const fileToDataUrl = (file) => new Promise((res, rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
const makeDataUrl = (text, mime="application/json;charset=utf-8") => URL.createObjectURL(new Blob([text], {type:mime}));
const pickThreeUnvisited = (stations/**:Station[]*/)=>{ const unvisited=stations.filter(s=>(s.visits?.length||0)===0); if(!unvisited.length) return []; const pool=[...unvisited]; for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]];} return pool.slice(0,Math.min(3,pool.length)).map(s=>s.id); };
const rollAllowed = (lastTs, now=Date.now()) => !lastTs || (now-lastTs)>=20000;

// Seed aus externer Datei (seed_stations.js)
const makeSeed = () => (seedStations || []).map(s => ({
  id: s.id || uid(),
  name: String(s.name || "Unbenannt"),
  types: Array.isArray(s.types) ? s.types : [],
  lines: Array.isArray(s.lines) ? s.lines.map(x=>String(x)) : [],
  visits: []
}));

// Migration/Normalisierung bestehender Daten
const normalizeStations = (data) => {
  if (!Array.isArray(data)) return makeSeed();
  return data.map(st => ({
    ...st,
    visits: Array.isArray(st.visits)
      ? st.visits.map(v => {
          const photos = Array.isArray(v.photos)
            ? v.photos
            : (v.photo ? [v.photo] : []);
          const { photo: _photo, ...rest } = v || {};
          return { ...rest, photos };
        })
      : [],
  }));
};

// Normalisierung für Namens-Abgleich (für Merge-Import)
const normName = (s) => String(s||"")
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')   // diakritische Zeichen raus
  .replace(/\s+/g, ' ')
  .trim();


// App
export default function App(){
  const [stations, setStations] = useState/** @type {Station[]} */(()=>{ try{ const raw=localStorage.getItem(STORAGE_KEY); if(raw) return normalizeStations(JSON.parse(raw));}catch{ /* ignore */ } return makeSeed(); });
  const [page, setPage] = useState/** @type {"home"|"visited"} */("home");
  const [rolled, setRolled] = useState/** @type {string[]} */([]);
  const [showSettings, setShowSettings] = useState(false);
  const [addVisitFor, setAddVisitFor] = useState/** @type {Station|null} */(null);
  const [exportDialog, setExportDialog] = useState({open:false, href:"", filename:"", text:""});
  const [denyShake, setDenyShake] = useState(false);
  const [denyMessage, setDenyMessage] = useState("");
  const lastRollRef = useRef(0);
  const [showMilestones, setShowMilestones] = useState(false);
  const [cooldownEnabled, setCooldownEnabled] = useState(()=>{ try{ return JSON.parse(localStorage.getItem(COOLDOWN_KEY) ?? "true"); }catch{ return true; }});

  useEffect(()=>{ localStorage.setItem(STORAGE_KEY, JSON.stringify(stations)); }, [stations]);
  useEffect(()=>{ localStorage.setItem(COOLDOWN_KEY, JSON.stringify(cooldownEnabled)); }, [cooldownEnabled]);
  const visitedIds = useMemo(()=> new Set(stations.filter(s=>s.visits.length>0).map(s=>s.id)), [stations]);

  function doRoll(){
    setPage('home'); setShowSettings(false); setShowMilestones(false); setAddVisitFor(null);
    if (exportDialog.open){ try{ URL.revokeObjectURL(exportDialog.href); }catch{ /* ignore */ } setExportDialog({open:false, href:"", filename:"", text:""}); }
    const now=Date.now();
    if (cooldownEnabled && !rollAllowed(lastRollRef.current, now)) { setDenyShake(true); setDenyMessage("srsly? ;)"); setTimeout(()=>setDenyShake(false),600); setTimeout(()=>setDenyMessage(""),1800); return; }
    lastRollRef.current = now; setRolled(pickThreeUnvisited(stations));
  }

  function addVisit(stationId, visit/**:Visit*/){ setStations(prev=>prev.map(s=> s.id===stationId ? {...s, visits:[...s.visits, visit]} : s)); setAddVisitFor(null); }
  function removeAllVisits(stationId){ setStations(prev=>prev.map(s=> s.id===stationId ? {...s, visits:[]} : s)); }
  function attachPhotos(stationId, visitIndex, photos){ setStations(prev=>prev.map(s=> s.id===stationId ? {...s, visits:s.visits.map((v,i)=> i===visitIndex?{...v, photos:[...(v.photos||[]), ...photos]}:v)} : s)); }

  // NEW: Notiz aktualisieren (inline Edit)
  function updateVisitNote(stationId, visitIndex, note){
    const clean = (note || "").trim();
    setStations(prev => prev.map(s => s.id===stationId
      ? {...s, visits: s.visits.map((v,i)=> i===visitIndex ? {...v, note: clean || undefined} : v)}
      : s
    ));
  }

  function exportJson(){ const payload=JSON.stringify(stations,null,2); const filename=`zufallstour-3000-backup-${new Date().toISOString().slice(0,10)}.json`; downloadFile(filename,payload,"application/json;charset=utf-8"); const href=makeDataUrl(payload); setExportDialog({open:true, href, filename, text:payload}); }
  async function importJson(file){
    try{
      const text = await file.text();
      const data = JSON.parse(text);
      if(!Array.isArray(data)) throw new Error("Ungültiges Format: Erwartet Array von Stationen");
  
      // Eingabe säubern
      const incoming = data.map(d=>({
        id: d.id || uid(),
        name: String(d.name || "Unbenannt"),
        types: Array.isArray(d.types) ? Array.from(new Set(d.types.filter(t=>["S","U","R"].includes(t)))) : [],
        lines: Array.isArray(d.lines) ? d.lines.map(String) : [],
        visits: Array.isArray(d.visits) ? d.visits
          .map(v=>({
            date: String(v?.date || ""),
            note: typeof v?.note === "string" ? v.note : undefined,
            photos: Array.isArray(v?.photos) ? v.photos.filter(Boolean) : (v?.photo ? [v.photo] : []),
          }))
          .filter(v=> v.date) : [],
      }));
  
      // Merge in bestehenden Zustand
      setStations(prev => {
        const byKey = new Map(prev.map(s => [normName(s.name), {...s}]));
        const next = Array.from(byKey.values());
  
        for(const inc of incoming){
          const key = normName(inc.name);
          let target = byKey.get(key);
  
          if(!target){
            // neue Station anlegen
            target = {
              id: inc.id || uid(),
              name: inc.name,
              types: inc.types || [],
              lines: inc.lines || [],
              visits: [],
            };
            byKey.set(key, target);
            next.push(target);
          } else {
            // Typen/Linien vereinigen
            const tset = new Set([...(target.types||[]), ...(inc.types||[])]);
            target.types = Array.from(tset).filter(t=>["S","U","R"].includes(t));
            const lset = new Set([...(target.lines||[]), ...(inc.lines||[])]);
            target.lines = Array.from(lset);
          }
  
          // Besuche nach Datum deduplizieren/anhängen
          const have = new Set((target.visits||[]).map(v=> String(v.date)));
          for(const v of inc.visits){
            const d = String(v.date);
            if(!d || have.has(d)) continue;
            target.visits.push({ date: d, note: v.note, photos: v.photos });
            have.add(d);
          }
  
          // chronologisch sortieren (optional)
          target.visits.sort((a,b)=> String(a.date).localeCompare(String(b.date)));
        }
  
        return next;
      });
  
      alert("Import abgeschlossen: Daten wurden in bestehende Liste gemerged.");
    } catch(e){
      alert("Import fehlgeschlagen: " + e.message);
    }
  }
  

  const rolledStations = rolled.map(id=>stations.find(s=>s.id===id)).filter(Boolean);
  const visitedCount = visitedIds.size, total = stations.length||1, percent = Math.round((visitedCount/total)*100);
  const lastVisitDate = useMemo(()=>{ let max=""; stations.forEach(s=> s.visits.forEach(v=>{ if((v.date||"")>max) max=v.date; })); return max; }, [stations]);
  const lineIndex = useMemo(()=>{ const map={}; stations.forEach(s=>{ (s.lines||[]).forEach(l=>{ if(!map[l]) map[l]={total:0,visited:0}; map[l].total+=1; if(s.visits.length>0) map[l].visited+=1; }); }); return map; }, [stations]);

  return (
    <div className="min-h-screen w-full bg-[repeating-linear-gradient(135deg,_#ffea61_0,_#ffea61_8px,_#ffd447_8px,_#ffd447_16px)] p-3 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <WordArtLogo />
        <style>{`
          button{cursor:pointer}
          @keyframes shake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}}
          @keyframes slamIn{0%{transform:scale(.2) rotate(-35deg);opacity:0}60%{transform:scale(1.15) rotate(8deg);opacity:1}80%{transform:scale(1.03) rotate(-6deg)}100%{transform:scale(1) rotate(-8deg)}}
          @keyframes fadeOut{to{opacity:0;transform:scale(1) rotate(-8deg) translateY(-6px)}}
          .srsly-pop{will-change:transform,opacity;animation:slamIn .6s cubic-bezier(.2,.9,.2,1) both, fadeOut .9s ease-in .9s forwards}
        `}</style>

        <div className="relative rounded-[28px] border-4 border-black shadow-[10px_10px_0_0_rgba(0,0,0,0.6)] bg-gradient-to-br from-teal-300 via-rose-200 to-amber-200 p-4 sm:p-6 mb-4 overflow-hidden">
          {denyMessage && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
              <div
                className="srsly-pop font-black text-black/90 text-center"
                style={{ fontSize: 'min(28vw, 520px)', transformOrigin: 'center' }}
              >
                {denyMessage}
              </div>
            </div>
          )}
          <p className="text-lg font-bold mb-3">Würfel drei zufällige Bahnhöfe, die du noch nicht besucht hast.</p>

          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-extrabold text-sm">Fortschritt</div>
              <div className="text-xs opacity-80">{visitedCount}/{total} ({percent}%)</div>
              <button onClick={()=>setShowMilestones(true)} className="ml-auto text-xs px-2 py-1 rounded-full border-2 border-black bg-white flex items-center gap-1"><Trophy size={14}/> Meilensteine</button>
            </div>
            <div onClick={()=>setShowMilestones(true)} className="relative h-4 rounded-full border-4 border-black bg-white cursor-pointer">
              <div className="h-full bg-green-500" style={{width:`${Math.max(4,percent)}%`}} />
              {[25,50,75,100].map(p=> (
                <div key={p} className="absolute -top-[6px]" style={{left:`${p}%`}}><div className="w-[2px] h-6 bg-black"/></div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <button onClick={doRoll} className={`w-full justify-center px-6 py-3 rounded-full text-xl font-black bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 text-white border-4 border-black shadow-[6px_6px_0_0_rgba(0,0,0,0.6)] active:translate-y-[2px] active:shadow-[4px_4px_0_0_rgba(0,0,0,0.6)] flex items-center`} style={denyShake?{animation:"shake .6s"}:{}}>
              <span className="inline-flex items-center gap-2 mx-auto"><Shuffle size={22}/> WÜRFELN</span>
            </button>
            <button onClick={()=>setPage('visited')} className="w-full justify-center px-4 py-3 rounded-full font-bold bg-white text-black flex items-center gap-2 border-4 border-black shadow hover:brightness-110 active:translate-y-[1px]">Besuchte Bahnhöfe</button>
            <button onClick={()=>setShowSettings(true)} className="w-full justify-center px-4 py-3 rounded-full font-bold bg-black text-white flex items-center border-4 border-black shadow" aria-label="Einstellungen" title="Einstellungen"><SettingsIcon size={20}/></button>
          </div>

          {lastVisitDate && (<div className="mt-3 text-sm opacity-80">Letzter Besuch: <b>{formatDate(lastVisitDate)}</b></div>)}
        </div>

        {page==='home' && (
          <div className="space-y-3">
            {rolledStations.length===0 && (<div className="text-center text-sm opacity-80">Noch nichts ausgewürfelt … drück auf <b>WÜRFELN</b>! ✨</div>)}
            {rolledStations.map(st=> (<StationRow key={st.id} st={st} onAddVisit={()=>setAddVisitFor(st)} onUnvisit={()=>removeAllVisits(st.id)} />))}
          </div>
        )}

        {page==='visited' && (
          <VisitedPage stations={stations} onBack={()=>setPage('home')} onAddVisit={addVisit} onClearVisits={removeAllVisits} onAttachPhotos={attachPhotos} onUpdateNote={updateVisitNote} />
        )}

        <Modal open={showSettings} onClose={()=>setShowSettings(false)} title="Einstellungen">
          <div className="rounded-2xl border-4 border-black p-4 bg-white/80">
            <h3 className="font-extrabold text-lg mb-2">Backups</h3>
            <p className="text-sm mb-3">Exportiere/Importiere deine Daten als JSON.</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={exportJson} title="JSON exportieren" className="px-4 py-2 rounded-full bg-green-500 text-black font-extrabold border-4 border-black flex items-center gap-2"><Download size={18}/> Export</button>
              <label className="px-4 py-2 rounded-full bg-amber-300 text-black font-extrabold border-4 border-black flex items-center gap-2 cursor-pointer"><Upload size={18}/> Import<input type="file" accept="application/json" className="hidden" onChange={(e)=>e.target.files && importJson(e.target.files[0])} /></label>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border-4 border-black p-4 bg-white/80">
            <h3 className="font-extrabold text-lg mb-2">Würfel-Cooldown</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-2 border-black"
                checked={cooldownEnabled}
                onChange={e=>setCooldownEnabled(e.target.checked)}
              />
              <span>20-Sekunden-Cooldown aktiv</span>
            </label>
            <p className="text-xs mt-1 opacity-80">Deaktivieren, um ohne „srsly?“-Hinweis schnell zu würfeln.</p>
          </div>
        </Modal>

        <Modal open={exportDialog.open} onClose={()=>{ try{ URL.revokeObjectURL(exportDialog.href);}catch{ /* ignore */ } setExportDialog(p=>({...p, open:false})); }} title="Backup exportiert">
          <div className="space-y-3">
            <p className="text-sm">Falls dein Browser den automatischen Download blockiert, nutze diesen Link:</p>
            <a href={exportDialog.href} download={exportDialog.filename} className="px-4 py-2 rounded-full bg-green-500 border-4 border-black font-extrabold inline-flex items-center gap-2 cursor-pointer"><Download size={18}/> {exportDialog.filename}</a>
            <div><p className="text-sm mb-1">Oder kopiere den JSON-Inhalt:</p><textarea readOnly value={exportDialog.text} className="w-full h-40 p-2 rounded-lg border-4 border-black bg-white text-xs"></textarea></div>
          </div>
        </Modal>

        <MilestonesModal open={showMilestones} onClose={()=>setShowMilestones(false)} percent={percent} visitedCount={visitedCount} total={total} lineIndex={lineIndex} />

        <Modal open={!!addVisitFor} onClose={()=>setAddVisitFor(null)} title={`Besuch eintragen – ${addVisitFor?.name ?? ''}`}>
          {addVisitFor && (<AddVisitForm onSave={addVisit} stationId={addVisitFor.id} />)}
        </Modal>

        <div className="mt-10 text-center text-xs opacity-70"><p>Made with ❤ in 90s WordArt • Deine Daten bleiben im Browser (localStorage).</p></div>
      </div>
    </div>
  );
}

// Station Row
function StationRow({ st, onAddVisit, onUnvisit }){
  const isVisited = st.visits.length>0; const lastVisit = isVisited ? st.visits[st.visits.length-1] : null;
  return (
    <div className="rounded-[22px] border-4 border-black bg-[#8c4bd6] text-white p-3 shadow-[8px_8px_0_0_rgba(0,0,0,0.6)]">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-lg leading-tight truncate">{st.name}</div>
          <div className="text-xs opacity-90 flex flex-col gap-1">
            {isVisited ? (<span>Besucht am <b>{formatDate(lastVisit.date)}</b></span>) : (<span>Noch unbesucht</span>)}
            {lastVisit?.note && (<span className="opacity-90 truncate">Notiz: {lastVisit.note}</span>)}
          </div>
          <LineChips lines={st.lines} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <a href={googleMapsUrl(st.name)} target="_blank" rel="noreferrer" className="w-full justify-center px-3 py-2 rounded-full bg-white text-black font-extrabold border-4 border-black flex items-center gap-2"><MapPin size={18}/> Maps</a>
        <button onClick={onAddVisit} className="w-full justify-center px-3 py-2 rounded-full bg-amber-300 text-black font-extrabold border-4 border-black flex items-center gap-2"><Camera size={22}/> Besuch eintragen</button>
        {isVisited && (<button onClick={onUnvisit} className="w-full justify-center px-3 py-2 rounded-full bg-red-500 text-white font-extrabold border-4 border-black flex items-center gap-2"><Trash2 size={18}/> Besuch löschen</button>)}
      </div>

      {lastVisit?.photos?.[0] && (<div className="mt-3"><img src={lastVisit.photos[0]} alt="Besuchsbild" className="w-full max-h-72 object-cover rounded-xl border-4 border-black"/></div>)}
    </div>
  );
}

// Visited Page
function VisitedPage({ stations, onBack, onAddVisit, onClearVisits, onAttachPhotos, onUpdateNote }){
  const sortModes = ['visitDate','name','createdAt'];
  const sortLabels = {
    visitDate: 'Besuchsdatum ↓',
    name: 'Name ↓',
    createdAt: 'Eintragsdatum ↓'
  };
  const [sortKey, setSortKey] = useState('visitDate');
  const cycleSortKey = () => {
    setSortKey(prev => {
      const idx = sortModes.indexOf(prev);
      return sortModes[(idx + 1) % sortModes.length];
    });
  };
  const [confirmId, setConfirmId] = useState(null);
  const [zoom, setZoom] = useState(null); // {src, station, date}
  const fileRef = useRef(null);
  const [pendingPhoto, setPendingPhoto] = useState(null); // {stationId, index}
  const [manualOpen, setManualOpen] = useState(false);
  const [editing, setEditing] = useState(null); // {stationId, index, text}

  const latestISO = (st)=> st.visits.length ? (st.visits[st.visits.length-1].date||'') : '';
  const visited = useMemo(()=> stations.filter(s=> s.visits.length>0), [stations]);
  const unvisited = useMemo(()=> stations.filter(s=> s.visits.length===0), [stations]);
  const visitedSorted = useMemo(()=>{ const arr=[...visited]; switch(sortKey){ case 'name': arr.sort((a,b)=>a.name.localeCompare(b.name)); break; case 'createdAt': arr.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)); break; default: arr.sort((a,b)=> latestISO(b).localeCompare(latestISO(a))); } return arr; }, [visited, sortKey]);

  async function onFileChange(e){ const files=Array.from(e.target.files||[]); if(!files.length||!pendingPhoto) return; const dataUrls=await Promise.all(files.map(fileToDataUrl)); onAttachPhotos(pendingPhoto.stationId, pendingPhoto.index, dataUrls); setPendingPhoto(null); try{ e.target.value=''; }catch{ /* ignore */ } }

  function startEdit(stationId, index, currentText){ setEditing({ stationId, index, text: currentText || "" }); }
  function cancelEdit(){ setEditing(null); }
  function saveEdit(){ if(!editing) return; onUpdateNote?.(editing.stationId, editing.index, editing.text); setEditing(null); }

  function onNoteKeyDown(e){
    if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEdit(); }
    if(e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  }

  return (
    <div className="rounded-[28px] border-4 border-black shadow-[10px_10px_0_0_rgba(0,0,0,0.6)] bg-gradient-to-br from-teal-300 via-rose-200 to-amber-200 p-4 sm:p-6 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="px-3 py-2 rounded-full border-4 border-black bg-white flex items-center gap-2"><ChevronLeft size={18}/> Zurück</button>
        <div className="font-extrabold text-lg">Besuche</div>
        <div className="ml-auto flex items-center gap-2 text-sm">
        <div>{sortLabels[sortKey]}</div>
          <button
            onClick={cycleSortKey}
            className="p-1 rounded-lg border-2 border-black bg-white"
            title="Sortierung ändern"
            type="button"
          >
            <ArrowUpDown size={16}/>
          </button>
        </div>
      </div>

      {manualOpen ? (<ManualVisitForm stations={unvisited} onAdd={onAddVisit} onCancel={()=>setManualOpen(false)} />) : (<button onClick={()=>setManualOpen(true)} className="w-full px-6 py-4 rounded-2xl text-xl font-black bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 text-white border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.6)] active:translate-y-[2px] active:shadow-[4px_4px_0_rgba(0,0,0,0.6)]">Besuch hinzufügen</button>)}

      <div className="mt-4 pr-1 space-y-4">
        {visitedSorted.length===0 ? (<div className="text-sm">Noch keine Besuche eingetragen.</div>) : (
          visitedSorted.map(st=> (
            <div key={st.id} className="p-2 border-4 border-black rounded-xl bg-white/80">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold truncate">{st.name}</div>
                  <LineChips lines={st.lines} />
                  <div className="text-xs mt-1">Zuletzt am <b>{formatDate(st.visits[st.visits.length-1].date)}</b></div>
                </div>
                <div className="shrink-0"><button type="button" onClick={()=>setConfirmId(st.id)} className="w-9 h-9 rounded-full bg-red-500 text-white border-2 border-black flex items-center justify-center" title="Besuch(e) löschen"><Trash2 size={16}/></button></div>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {st.visits.map((v,idx)=> (
                  <div key={idx} className="space-y-1">
                    {editing && editing.stationId===st.id && editing.index===idx ? (
                      <div className="space-y-1">
                        <textarea
                          value={editing.text}
                          onChange={e=>setEditing(ed=>({...ed, text:e.target.value}))}
                          onKeyDown={onNoteKeyDown}
                          rows={3}
                          className="w-full text-xs px-2 py-1 rounded-md border-2 border-black bg-white"
                          placeholder="Notiz"
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={cancelEdit} className="px-3 py-1 rounded-lg bg-white border-2 border-black text-xs">Abbrechen</button>
                          <button onClick={saveEdit} className="px-3 py-1 rounded-lg bg-black text-white border-2 border-black text-xs">Speichern</button>
                        </div>
                      </div>
                    ) : (
                      (v.note ? (
                        <div className="text-xs px-2 py-1 rounded-md border-2 border-black bg-white/70 flex items-start gap-2">
                          <div className="flex-1 break-words">{v.note}</div>
                          <button
                            title="Notiz bearbeiten"
                            className="shrink-0 p-1 rounded-md border-2 border-black bg-white"
                            onClick={()=>startEdit(st.id, idx, v.note)}
                          >
                            <Pencil size={14}/>
                          </button>
                        </div>
                      ) : (
                        <button
                          className="w-full rounded-md border-2 border-dashed border-black px-2 py-1 text-xs bg-white/70 text-left"
                          onClick={()=>startEdit(st.id, idx, "")}
                        >
                          Notiz hinzufügen ✍️
                        </button>
                      ))
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(v.photos || []).map((p,pidx)=> (
                        <button
                          key={pidx}
                          className="w-full h-64 rounded-xl overflow-hidden border-2 border-black bg-white"
                          onClick={()=>setZoom({src:p, station:st.name, date:v.date})}
                        >
                          <img src={p} alt="Foto" className="w-full h-full object-contain"/>
                        </button>
                      ))}
                      <button
                        className="w-full h-10 md:h-12 rounded-xl border-2 border-dashed border-black flex items-center justify-center text-sm bg-white"
                        onClick={()=>{ setPendingPhoto({stationId:st.id, index:idx}); fileRef.current?.click(); }}
                      >
                        {(v.photos && v.photos.length) ? 'Weitere Fotos hinzufügen' : 'Kein Foto – Foto hinzufügen'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ))
        )}
      </div>

      <Modal open={!!confirmId} onClose={()=>setConfirmId(null)} title="Besuche löschen">
        <div className="space-y-3">
          <p className="text-sm">Diesen Bahnhof als <b>unbesucht</b> markieren? Alle Besuchseinträge werden entfernt.</p>
          <div className="flex gap-2 justify-end"><button onClick={()=>setConfirmId(null)} className="px-4 py-2 rounded-lg bg-white border-2 border-black">Abbrechen</button><button onClick={()=>{ onClearVisits(confirmId); setConfirmId(null); }} className="px-4 py-2 rounded-lg bg-red-600 text-white border-2 border-black">Löschen</button></div>
        </div>
      </Modal>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFileChange} />
      <Modal open={!!zoom} onClose={()=>setZoom(null)} title={`${zoom?.station ?? ''} ${zoom?.date ? '– ' + formatDate(zoom.date) : ''}`}>{zoom && (<ZoomBox src={zoom.src} />)}</Modal>
    </div>
  );
}

// Add Visit Form
function AddVisitForm({ stationId, onSave }){
  const [date, setDate] = useState(()=> new Date().toISOString().slice(0,10));
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);
  async function onFile(e){ const files=Array.from(e.target.files||[]); if(!files.length) return; const urls=await Promise.all(files.map(fileToDataUrl)); setPhotos(p=>[...p, ...urls]); }
  function submit(){ if(!date) return alert("Bitte Datum wählen"); onSave(stationId, { date, note: note.trim()||undefined, photos: photos.length?photos:undefined }); }
  return (
    <div className="space-y-3">
      <div><label className="font-bold text-sm">Datum</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border-4 border-black bg-white"/></div>
      <div><label className="font-bold text-sm">Notiz (optional)</label><textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 rounded-lg border-4 border-black bg-white" placeholder="z.B. Sonnenuntergang auf der Brücke 🌇"/></div>
      <div><label className="font-bold text-sm block mb-1">Fotos (optional)</label><label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-300 border-4 border-black cursor-pointer font-extrabold"><Camera size={18}/> Datei wählen<input type="file" accept="image/*" multiple className="hidden" onChange={onFile}/></label>{photos.length>0 && (<div className="mt-2 flex flex-wrap gap-2">{photos.map((p,i)=>(<img key={i} src={p} alt="Preview" className="max-h-56 rounded-xl border-4 border-black"/>))}</div>)}</div>
      <div className="flex"><button onClick={submit} className="w-full md:w-auto px-6 py-2 rounded-full bg-black text-white font-extrabold border-4 border-black">Speichern</button></div>
    </div>
  );
}

// Milestones Modal
function MilestonesModal({ open, onClose, percent, visitedCount, total, lineIndex }){
  if(!open) return null; const percentMilestones=[25,50,75,100], countMilestones=[10,25,50];
  return (
    <Modal open={open} onClose={onClose} title="Meilensteine">
      <div className="space-y-6">
        <section><div className="font-extrabold mb-2">Gesamt-Fortschritt</div><div className="w-full h-4 rounded-full border-4 border-black bg-white"><div className="h-full bg-green-500" style={{width:`${percent}%`}}/></div><div className="text-sm mt-1">{visitedCount}/{total} ({percent}%)</div></section>
        <section><div className="font-extrabold mb-2">Prozent-Ziele</div><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{percentMilestones.map(p=> (<div key={p} className={`rounded-xl border-4 border-black p-2 text-center ${percent>=p?"bg-green-300":"bg-white"}`}><div className="font-black">{p}%</div><div className="text-xs flex items-center justify-center gap-1">{percent>=p?<Check size={14}/> : null} {percent>=p?"erreicht":"offen"}</div></div>))}</div></section>
        <section><div className="font-extrabold mb-2">Anzahl-Ziele</div><div className="grid grid-cols-3 gap-2">{countMilestones.map(c=> (<div key={c} className={`rounded-xl border-4 border-black p-2 text-center ${visitedCount>=c?"bg-green-300":"bg-white"}`}><div className="font-black">{c}</div><div className="text-xs flex items-center justify-center gap-1">{visitedCount>=c?<Check size={14}/> : null} {visitedCount>=c?"erreicht":"offen"}</div></div>))}</div></section>
        <section><div className="font-extrabold mb-2">Linien</div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{Object.entries(lineIndex).map(([line,stat])=>{ const done=stat.visited>=stat.total&&stat.total>0; const pct=Math.round((stat.visited/stat.total)*100); return (<div key={line} className={`rounded-xl border-4 border-black p-2 ${done?"bg-green-200":"bg-white"}`}><div className="flex items-center gap-2 mb-1"><span className="px-2 py-0.5 text-xs font-black rounded-full border-2 border-black bg-white">{line}</span><div className="text-xs ml-auto">{stat.visited}/{stat.total} ({pct}%)</div></div><div className="w-full h-3 rounded-full border-2 border-black bg-white"><div className="h-full bg-green-500" style={{width:`${pct}%`}}/></div></div>); })}</div></section>
      </div>
    </Modal>
  );
}

// Utils
function formatDate(iso){ if(!iso) return ""; try{ const d=new Date(iso+(iso.length===10?"T00:00:00":"")); return d.toLocaleDateString("de-DE",{year:"numeric",month:"2-digit",day:"2-digit"}); }catch{ return iso; } }

// Self-tests (console)
if (typeof window !== "undefined"){
  try{
    console.assert(formatDate("2025-08-09") === "09.08.2025", "formatDate sollte 09.08.2025 liefern");
    console.assert(formatDate("") === "", 'formatDate("") -> leerer String');
    console.assert(formatDate("1999-12-31") === "31.12.1999", "formatDate Basisdatum");
    const g1=googleMapsUrl("Alexanderplatz"); console.assert(typeof g1 === "string" && g1.includes("Alexanderplatz"), "googleMapsUrl enthält Namen");
    const g2=googleMapsUrl("Frankfurter Allee"); console.assert(g2.includes("Frankfurter%20Allee"), "googleMapsUrl encoded Leerzeichen");
    const demo=[ {id:"a",name:"A",types:["S"],visits:[]}, {id:"b",name:"B",types:["U"],visits:[]}, {id:"c",name:"C",types:["R"],visits:[{date:"2024-01-01"}]}, {id:"d",name:"D",types:["S","U"],visits:[]}, ];
    const picked=pickThreeUnvisited(demo); console.assert(picked.length>=1 && picked.length<=3, "pickThreeUnvisited Länge 1..3"); console.assert(!picked.includes("c"), "besuchte Stationen dürfen nicht erscheinen"); console.assert(new Set(picked).size===picked.length, "keine Duplikate in Auswahl");
    const now=Date.now(); console.assert(rollAllowed(0,now)===true, "Roll erlaubt ohne vorherigen Timestamp"); console.assert(rollAllowed(now-21000,now)===true, "Roll erlaubt nach >20s"); console.assert(rollAllowed(now-5000,now)===false, "Roll gesperrt <20s");
    // Extra tests
    console.assert(typeof makeDataUrl("{}") === "string", "makeDataUrl liefert URL");
    console.assert(pickThreeUnvisited([{id:"x",name:"X",types:["S"],visits:[{date:"2020-01-01"}]}]).length===0, "keine unbesuchten -> leeres Array");
  }catch(e){ console.warn("Selbsttest warnte:", e); }
}
