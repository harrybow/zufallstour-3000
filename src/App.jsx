import React, { useEffect, useMemo, useRef, useState } from "react";

import { Settings as SettingsIcon, Shuffle, MapPin, Camera, Upload, Download, Trash2, ArrowUpDown, Check, ChevronLeft, Trophy, Pencil, ImageUp, KeyRound, LogOut } from "lucide-react";
import { fetchJourneyDuration } from "./journeys";
import { seedStations } from "./seed_stations";
import HeaderLogo from "./components/HeaderLogo";
import LineChips from "./components/LineChips";
import Modal from "./components/Modal";
import ComboBox from "./components/ComboBox";
import ManualVisitForm from "./components/ManualVisitForm";
import ZoomBox from "./components/ZoomBox";
import Login from "./Login";
import { fetchData, saveData, logout as apiLogout, deleteAccount, changePassword } from "./api.js";

// Helpers & Types
const STORAGE_KEY = "zufallstour3000.v4";
const COOLDOWN_KEY = "zufallstour3000.cooldownEnabled";
const HOME_KEY = "zufallstour3000.homeStation";
/** @typedef {{ id:string; name:string; types:("S"|"U"|"R")[]; lines?: string[]; visits: Visit[] }} Station */
/** @typedef {{ date: string; note?: string; photos?: string[] }} Visit */
const uid = () => Math.random().toString(36).slice(2, 10);
export const googleMapsUrl = (name) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ", Berlin")}`;
export const stationLabel = (st) => {
  const prefix = Array.isArray(st?.types) && st.types.length
    ? [...st.types].sort().join('+')
    : '';
  return prefix ? `${prefix} ${st.name}` : st.name;
};
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
export const makeDataUrl = (text, mime="application/json;charset=utf-8") => URL.createObjectURL(new Blob([text], {type:mime}));
export const pickThreeUnvisited = (stations/**:Station[]*/)=>{ const unvisited=stations.filter(s=>(s.visits?.length||0)===0); if(!unvisited.length) return []; const pool=[...unvisited]; for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]];} return pool.slice(0,Math.min(3,pool.length)).map(s=>s.id); };
export const rollAllowed = (lastTs, now=Date.now()) => !lastTs || (now-lastTs)>=20000;

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
  const [token, setToken] = useState(()=>localStorage.getItem('authToken'));
  const [stations, setStations] = useState/** @type {Station[]} */(()=>{ try{ const raw=localStorage.getItem(STORAGE_KEY); if(raw) return normalizeStations(JSON.parse(raw));}catch{ /* ignore */ } return makeSeed(); });
  const [page, setPage] = useState/** @type {"home"|"visited"|"stations"} */("home");
  const [rolled, setRolled] = useState/** @type {string[]} */([]);
  const [showSettings, setShowSettings] = useState(false);
  const [addVisitFor, setAddVisitFor] = useState/** @type {Station|null} */(null);
  const [exportDialog, setExportDialog] = useState({open:false, href:"", filename:"", text:""});
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [denyShake, setDenyShake] = useState(false);
  const [denyMessage, setDenyMessage] = useState("");
  const lastRollRef = useRef(0);
  const [showMilestones, setShowMilestones] = useState(false);
  const [cooldownEnabled, setCooldownEnabled] = useState(()=>{ try{ return JSON.parse(localStorage.getItem(COOLDOWN_KEY) ?? "true"); }catch{ return true; }});
  const [homeStation, setHomeStation] = useState(()=>{ try{ return localStorage.getItem(HOME_KEY) || ""; }catch{ return ""; }});
  const [coords, setCoords] = useState(null);

  const stationLabelFromName = (name) => {
    const n = normName(name);
    const st = stations.find(s => normName(s.name) === n);
    return st ? stationLabel(st) : name;
  };

  function updateStations(updater){
    setStations(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if(token){
        saveData(token, next).catch(()=>{});
      } else {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to persist stations to localStorage', e);
        }
      }
      return next;
    });
  }

  useEffect(()=>{
    try {
      localStorage.setItem(COOLDOWN_KEY, JSON.stringify(cooldownEnabled));
    } catch (e) {
      console.warn('Failed to persist cooldown flag', e);
    }
  }, [cooldownEnabled]);
  useEffect(()=>{
    try {
      localStorage.setItem(HOME_KEY, homeStation);
    } catch (e) {
      console.warn('Failed to persist home station', e);
    }
  }, [homeStation]);
  useEffect(()=>{
    if (typeof navigator !== 'undefined' && navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos=>{
        setCoords({lat:pos.coords.latitude, lon:pos.coords.longitude});
      }, ()=>{});
    }
  }, []);
  useEffect(()=>{
    if(token){
      fetchData(token).then(data=>{ if(data) updateStations(normalizeStations(data)); }).catch(()=>setToken(null));
    }
  }, [token]);
  const visitedIds = useMemo(()=> new Set(stations.filter(s=>s.visits.length>0).map(s=>s.id)), [stations]);
  const origin = coords ? `${coords.lat},${coords.lon}` : (homeStation.trim() ? stationLabelFromName(homeStation.trim()) : null);
  const rolledStations = rolled.map(id=>stations.find(s=>s.id===id)).filter(Boolean);
  const visitedCount = visitedIds.size, total = stations.length||1, percent = Math.round((visitedCount/total)*100);
  const lastVisitDate = useMemo(()=>{ let max=""; stations.forEach(s=> s.visits.forEach(v=>{ if((v.date||"")>max) max=v.date; })); return max; }, [stations]);
  const lineIndex = useMemo(()=>{ const map={}; stations.forEach(s=>{ (s.lines||[]).forEach(l=>{ if(!map[l]) map[l]={total:0,visited:0}; map[l].total+=1; if(s.visits.length>0) map[l].visited+=1; }); }); return map; }, [stations]);
  const typeStats = useMemo(()=>{
    const stats = { S: { total: 0, visited: 0 }, U: { total: 0, visited: 0 }, R: { total: 0, visited: 0 } };
    stations.forEach(s => {
      if (s.types.includes("S")) {
        stats.S.total += 1;
        if (s.visits.length > 0) stats.S.visited += 1;
      }
      if (s.types.includes("U")) {
        stats.U.total += 1;
        if (s.visits.length > 0) stats.U.visited += 1;
      }
      if (s.types.includes("R")) {
        stats.R.total += 1;
        if (s.visits.length > 0) stats.R.visited += 1;
      }
    });
    return stats;
  }, [stations]);
  const photoCount = useMemo(()=> stations.reduce((acc,s)=> acc + s.visits.reduce((sum,v)=> sum + (v.photos?.length||0),0),0), [stations]);

  function handleLogin(tok){
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setStations(makeSeed());
    setToken(tok);
  }
  async function handleLogout(){
    const current = token;
    try { if (current) await apiLogout(current); } catch { /* ignore */ }
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setStations(makeSeed());
    setToken(null);
  }
  async function confirmDeleteAccount(){
    if(!token) return;
    try{
      await deleteAccount(token);
    }catch{
      alert('Konto löschen fehlgeschlagen');
      return;
    }
    try{ localStorage.removeItem(STORAGE_KEY); }catch{ /* ignore */ }
    setStations(makeSeed());
    try { await apiLogout(token); } catch { /* ignore */ }
    setShowDeleteAccount(false);
    setToken(null);
  }

  async function submitChangePassword(oldPw, newPw){
    if(!token) return;
    try{
      await changePassword(token, oldPw, newPw);
      setShowChangePassword(false);
      alert('Passwort geändert');
    }catch{
      alert('Passwortänderung fehlgeschlagen');
    }
  }

  if(!token){
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-amber-200">
        <HeaderLogo />
        <Login onSuccess={handleLogin} />
      </div>
    );
  }

  function doRoll(){
    setPage('home'); setShowSettings(false); setShowMilestones(false); setAddVisitFor(null);
    if (exportDialog.open){ try{ URL.revokeObjectURL(exportDialog.href); }catch{ /* ignore */ } setExportDialog({open:false, href:"", filename:"", text:""}); }
    const now=Date.now();
    if (cooldownEnabled && !rollAllowed(lastRollRef.current, now)) { setDenyShake(true); setDenyMessage("srsly? ;)"); setTimeout(()=>setDenyShake(false),600); setTimeout(()=>setDenyMessage(""),1800); return; }
    lastRollRef.current = now; setRolled(pickThreeUnvisited(stations));
  }

  function addVisit(stationId, visit/**:Visit*/){ updateStations(prev=>prev.map(s=> s.id===stationId ? {...s, visits:[...s.visits, visit]} : s)); setAddVisitFor(null); }
  function removeAllVisits(stationId){ updateStations(prev=>prev.map(s=> s.id===stationId ? {...s, visits:[]} : s)); }
  function attachPhotos(stationId, visitIndex, photos){ updateStations(prev=>prev.map(s=> s.id===stationId ? {...s, visits:s.visits.map((v,i)=> i===visitIndex?{...v, photos:[...(v.photos||[]), ...photos]}:v)} : s)); }

  // NEW: Notiz aktualisieren (inline Edit)
  function updateVisitNote(stationId, visitIndex, note){
    const clean = (note || "").trim();
    updateStations(prev => prev.map(s => s.id===stationId
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
      updateStations(prev => {
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
  

  return (
    <div className="min-h-screen w-full bg-[repeating-linear-gradient(135deg,_#ffea61_0,_#ffea61_8px,_#ffd447_8px,_#ffd447_16px)] p-3 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <HeaderLogo className="h-16 w-auto mx-auto my-0" />
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
              <div className="text-xs opacity-80 flex items-center gap-1"><Camera size={12}/> {photoCount}</div>
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
            <button onClick={()=>setPage('stations')} className="w-full justify-center px-4 py-3 rounded-full font-bold bg-white text-black flex items-center gap-2 border-4 border-black shadow hover:brightness-110 active:translate-y-[1px]">Alle Bahnhöfe</button>
            <button onClick={()=>setShowSettings(true)} className="w-full justify-center px-4 py-3 rounded-full font-bold bg-black text-white flex items-center border-4 border-black shadow" aria-label="Einstellungen" title="Einstellungen"><SettingsIcon size={20}/></button>
          </div>

          {lastVisitDate && (<div className="mt-3 text-sm opacity-80">Letzter Besuch: <b>{formatDate(lastVisitDate)}</b></div>)}
        </div>

        {page==='home' && (
          <div className="space-y-3">
            {rolledStations.length===0 && (<div className="text-center text-sm opacity-80">Noch nichts ausgewürfelt … drück auf <b>WÜRFELN</b>! ✨</div>)}
            {rolledStations.map(st=> (
              <StationRow key={st.id} st={st} origin={origin} onAddVisit={()=>setAddVisitFor(st)} onUnvisit={()=>removeAllVisits(st.id)} />
            ))}
          </div>
        )}

        {page==='visited' && (
          <VisitedPage stations={stations} onBack={()=>setPage('home')} onAddVisit={addVisit} onClearVisits={removeAllVisits} onAttachPhotos={attachPhotos} onUpdateNote={updateVisitNote} />
        )}

        {page==='stations' && (
          <StationsPage stations={stations} onBack={()=>setPage('home')} />
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
            <h3 className="font-extrabold text-lg mb-2">Home-Station</h3>
            <input
              type="text"
              value={homeStation}
              onChange={e=>setHomeStation(e.target.value)}
              placeholder="z.B. Berlin Hbf"
              className="w-full mt-1 px-3 py-2 rounded-lg border-4 border-black bg-white text-sm"
            />
            <p className="text-xs mt-1 opacity-80">Für Fahrzeiten, falls Standort nicht verfügbar.</p>
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
          <div className="mt-4 rounded-2xl border-4 border-black p-4 bg-white/80">
            <h3 className="font-extrabold text-lg mb-2">Konto</h3>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <button
                onClick={()=>setShowChangePassword(true)}
                className="w-full sm:flex-1 sm:basis-0 px-4 py-2 rounded-full bg-blue-500 text-white font-extrabold border-4 border-black flex items-center justify-center gap-2"
              ><KeyRound size={18}/> Passwort ändern</button>

              <button
                onClick={()=>setShowDeleteAccount(true)}
                className="w-full sm:flex-1 sm:basis-0 px-4 py-2 rounded-full bg-red-600 text-white font-extrabold border-4 border-black flex items-center justify-center gap-2"
              ><Trash2 size={18}/> Konto löschen</button>

              <button
                onClick={handleLogout}
                className="w-full sm:flex-1 sm:basis-0 px-4 py-2 rounded-full bg-white text-black font-extrabold border-4 border-black flex items-center justify-center gap-2"
              ><LogOut size={18}/> Logout</button>
            </div>
          </div>
        </Modal>

        <Modal open={exportDialog.open} onClose={()=>{ try{ URL.revokeObjectURL(exportDialog.href);}catch{ /* ignore */ } setExportDialog(p=>({...p, open:false})); }} title="Backup exportiert">
          <div className="space-y-3">
            <p className="text-sm">Falls dein Browser den automatischen Download blockiert, nutze diesen Link:</p>
            <a href={exportDialog.href} download={exportDialog.filename} className="px-4 py-2 rounded-full bg-green-500 border-4 border-black font-extrabold inline-flex items-center gap-2 cursor-pointer"><Download size={18}/> {exportDialog.filename}</a>
            <div><p className="text-sm mb-1">Oder kopiere den JSON-Inhalt:</p><textarea readOnly value={exportDialog.text} className="w-full h-40 p-2 rounded-lg border-4 border-black bg-white text-xs"></textarea></div>
          </div>
        </Modal>

        <Modal open={showChangePassword} onClose={()=>setShowChangePassword(false)} title="Passwort ändern">
          <ChangePasswordForm onSave={submitChangePassword} onCancel={()=>setShowChangePassword(false)} />
        </Modal>

        <Modal open={showDeleteAccount} onClose={()=>setShowDeleteAccount(false)} title="Konto löschen">
          <div className="space-y-3">
            <p className="text-sm">Willst du dein Konto dauerhaft löschen? Alle Daten werden entfernt.</p>
            <div className="flex gap-2 justify-end"><button onClick={()=>setShowDeleteAccount(false)} className="px-4 py-2 rounded-lg bg-white border-2 border-black">Abbrechen</button><button onClick={confirmDeleteAccount} className="px-4 py-2 rounded-lg bg-red-600 text-white border-2 border-black">Löschen</button></div>
          </div>
        </Modal>

        <MilestonesModal open={showMilestones} onClose={()=>setShowMilestones(false)} percent={percent} visitedCount={visitedCount} total={total} lineIndex={lineIndex} typeStats={typeStats} stations={stations} />

        <Modal open={!!addVisitFor} onClose={()=>setAddVisitFor(null)} title={`Besuch eintragen – ${addVisitFor?.name ?? ''}`}>
          {addVisitFor && (<AddVisitForm onSave={addVisit} stationId={addVisitFor.id} />)}
        </Modal>

        <div className="mt-10 text-center text-xs opacity-70"><p>Made with ❤ in 90s WordArt • Deine Daten bleiben im Browser (localStorage).</p></div>
      </div>
    </div>
  );
}

// Station Row
function StationRow({ st, origin, onAddVisit, onUnvisit }){
  const isVisited = st.visits.length>0; const lastVisit = isVisited ? st.visits[st.visits.length-1] : null;
  const label = stationLabel(st);
  const [duration, setDuration] = useState(null);
  useEffect(()=>{
    let cancelled = false;
    if (!origin){ setDuration(null); return; }
    fetchJourneyDuration(origin, label).then(d=>{
      if(!cancelled) setDuration(d);
    }).catch(()=>{});
    return ()=>{ cancelled = true; };
  }, [origin, label]);
  return (
    <div className="rounded-[22px] border-4 border-black bg-[#8c4bd6] text-white p-3 shadow-[8px_8px_0_0_rgba(0,0,0,0.6)]">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-lg leading-tight truncate flex items-baseline gap-2">
            <span className="truncate">{label}</span>
            <span className="text-xs font-normal opacity-90 whitespace-nowrap">{duration!=null ? `≈ ${duration} min` : 'n/a'}</span>
          </div>
          <div className="text-xs opacity-90 flex flex-col gap-1">
            {isVisited ? (<span>Besucht am <b>{formatDate(lastVisit.date)}</b></span>) : (<span>Noch unbesucht</span>)}
            {lastVisit?.note && (<span className="opacity-90 truncate">Notiz: {lastVisit.note}</span>)}
          </div>
          <LineChips lines={st.lines} types={st.types} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <a href={googleMapsUrl(label)} target="_blank" rel="noreferrer" className="w-full justify-center px-3 py-2 rounded-full bg-white text-black font-extrabold border-4 border-black flex items-center gap-2"><MapPin size={18}/> Maps</a>
        <button onClick={onAddVisit} className="w-full justify-center px-3 py-2 rounded-full bg-amber-300 text-black font-extrabold border-4 border-black flex items-center gap-2"><Camera size={22}/> Besuch eintragen</button>
        {isVisited && (<button onClick={onUnvisit} className="w-full justify-center px-3 py-2 rounded-full bg-red-500 text-white font-extrabold border-4 border-black flex items-center gap-2"><Trash2 size={18}/> Besuch löschen</button>)}
      </div>

      {lastVisit?.photos?.[0] && (<div className="mt-3"><img src={lastVisit.photos[0]} alt="Besuchsbild" className="w-full max-h-72 object-cover rounded-xl border-4 border-black"/></div>)}
    </div>
  );
}

// Stations Page
function StationsPage({ stations, onBack }){
  const [typeFilter, setTypeFilter] = useState({ S:true, U:true, R:true });
  const [onlyUnvisited, setOnlyUnvisited] = useState(false);
  const [sortOldest, setSortOldest] = useState(false);

  const toggleType = (t) => setTypeFilter(f => ({ ...f, [t]: !f[t] }));

  const filtered = useMemo(() => stations.filter(st => {
    if (onlyUnvisited && st.visits.length > 0) return false;
    if (!st.types.some(t => typeFilter[t])) return false;
    return true;
  }), [stations, typeFilter, onlyUnvisited]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortOldest) {
      arr.sort((a,b)=>{
        const aDate = a.visits.length ? a.visits[a.visits.length-1].date : '9999-99-99';
        const bDate = b.visits.length ? b.visits[b.visits.length-1].date : '9999-99-99';
        return aDate.localeCompare(bDate);
      });
    } else {
      arr.sort((a,b)=>a.name.localeCompare(b.name));
    }
    return arr;
  }, [filtered, sortOldest]);

  return (
    <div className="rounded-[28px] border-4 border-black shadow-[10px_10px_0_0_rgba(0,0,0,0.6)] bg-gradient-to-br from-teal-300 via-rose-200 to-amber-200 p-4 sm:p-6 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="px-3 py-2 rounded-full border-4 border-black bg-white flex items-center gap-2"><ChevronLeft size={18}/> Zurück</button>
        <div className="font-extrabold text-lg">Alle Bahnhöfe</div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        {['S','U','R'].map(t => (
          <button
            key={t}
            onClick={()=>toggleType(t)}
            className={`px-3 py-1 rounded-full border-2 border-black ${typeFilter[t]?"bg-black text-white":"bg-white"}`}
          >{t}</button>
        ))}
        <button
          onClick={()=>setOnlyUnvisited(v=>!v)}
          className={`px-3 py-1 rounded-full border-2 border-black ${onlyUnvisited?"bg-black text-white":"bg-white"}`}
        >Noch nie besucht</button>
        <button
          onClick={()=>setSortOldest(s=>!s)}
          className={`px-3 py-1 rounded-full border-2 border-black ${sortOldest?"bg-black text-white":"bg-white"}`}
        >Am längsten her</button>
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {sorted.length===0 && (<div className="text-sm">Keine Bahnhöfe gefunden.</div>)}
        {sorted.map(st => (
          <div
            key={st.id}
            className={`p-2 border-2 border-black rounded-lg ${st.visits.length ? 'bg-[#8c4bd6] text-white' : 'bg-white'}`}
          >
            <div className="font-bold truncate">{st.name}</div>
            <LineChips lines={st.lines} types={st.types} />
            <div className="text-xs mt-1">
              {st.visits.length ? `Zuletzt am ${formatDate(st.visits[st.visits.length - 1].date)}` : 'Noch nie besucht'}
            </div>
          </div>
        ))}
      </div>
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
                  <LineChips lines={st.lines} types={st.types} />
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
                        className="w-full aspect-square rounded-xl border-2 border-dashed border-black flex items-center justify-center bg-white"
                        onClick={()=>{ setPendingPhoto({stationId:st.id, index:idx}); fileRef.current?.click(); }}
                      >
                        <ImageUp size={24}/>
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

// Change Password Form
function ChangePasswordForm({ onSave, onCancel }){
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  return (
    <div className="space-y-3">
      <div><label className="font-bold text-sm">Altes Passwort</label><input type="password" value={oldPw} onChange={e=>setOldPw(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border-4 border-black bg-white"/></div>
      <div><label className="font-bold text-sm">Neues Passwort</label><input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border-4 border-black bg-white"/></div>
      <div className="flex gap-2 justify-end"><button onClick={onCancel} className="px-4 py-2 rounded-lg bg-white border-2 border-black">Abbrechen</button><button onClick={()=>onSave(oldPw, newPw)} className="px-4 py-2 rounded-lg bg-black text-white border-2 border-black">Speichern</button></div>
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
function HoverCard({ info, children }) {
  return (
    <div className="relative group">
      {children}
      <div className="pointer-events-none absolute z-20 hidden group-hover:block group-focus-within:block left-1/2 -translate-x-1/2 top-full mt-1 w-56 p-2 rounded-lg border-2 border-black bg-white text-xs shadow">
        {info}
      </div>
    </div>
  );
}

function MilestonesModal({ open, onClose, percent, visitedCount, total, lineIndex, typeStats, stations }) {
  const firstVisitDates = useMemo(()=> stations.map(s=>s.visits[0]?.date).filter(Boolean).sort(), [stations]);
  const dateForCount = (n) => firstVisitDates[n-1] || null;
  const { S = { total:0, visited:0 }, U = { total:0, visited:0 }, R = { total:0, visited:0 } } = typeStats || {};
  if(!open) return null;
  const stationMilestones = [
    { label:"1. Besuch", count:1, desc:"Erster besuchter Bahnhof" },
    { label:"Hattrick", count:3, desc:"3 besuchte Bahnhöfe" },
    { label:"10%", percent:10 },
    { label:"25%", percent:25 },
    { label:"50%", percent:50 },
    { label:"75%", percent:75 },
    { label:"Fast geschafft!", count: Math.max(total-3,0), desc:"Nur noch 3 Bahnhöfe bis 100%" },
    { label:"100%", percent:100 }
  ].map(m=>{
    const count = m.count ?? Math.ceil(total*(m.percent/100));
    const done = visitedCount >= count;
    const date = done ? dateForCount(count) : null;
    const base = m.percent
      ? `${m.label} - das entspricht ${Math.round(total*(m.percent/100))} besuchten Bahnhöfen`
      : m.desc;
    const info = done
      ? `${base}. Erreicht am: ${formatDate(date)}`
      : `${base}. Noch nicht erreicht.`;
    return { ...m, count, done, info };
  });
  return (
    <Modal open={open} onClose={onClose} title="Meilensteine">
      <div className="space-y-6">
        <section><div className="font-extrabold mb-2">Gesamt-Fortschritt</div><div className="w-full h-4 rounded-full border-4 border-black bg-white overflow-hidden">{percent>0 && (<div className="h-full bg-green-500" style={{width:`${percent}%`}}/> )}</div><div className="text-sm mt-1">{visitedCount}/{total} ({percent}%)</div></section>
        <section><div className="font-extrabold mb-2">Stationen-Ziele</div><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{stationMilestones.map(m=> (
          <HoverCard key={m.label} info={m.info}>
            <button type="button" className={`w-full rounded-xl border-4 border-black p-2 text-center ${m.done?"bg-green-300":"bg-white"}`}>
              <div className="font-black">{m.label}</div>
              <div className="text-xs flex items-center justify-center gap-1">{m.done?<Check size={14}/> : null} {m.done?"erreicht":"offen"}</div>
            </button>
          </HoverCard>
        ))}</div></section>
        <section><div className="font-extrabold mb-2">Netz-Ziele</div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{[
          { label: "100% S-Bahnhöfe", stat: S, type:"S" },
          { label: "100% U-Bahnhöfe", stat: U, type:"U" },
          { label: "100% Regionalbahnhöfe", stat: R, type:"R" },
        ].map(({label, stat, type}) => { const done = stat.visited >= stat.total && stat.total > 0; const pct = stat.total ? Math.round((stat.visited/stat.total)*100) : 0; const dates = stations.filter(s=>s.types.includes(type) && s.visits[0]?.date).map(s=>s.visits[0].date).sort(); const date = done ? dates[stat.total-1] : null; const info = done ? `${label} - erreicht am: ${formatDate(date)}` : `${stat.visited}/${stat.total} Bahnhöfe (${pct}%)`; return (
          <HoverCard key={label} info={info}>
            <button type="button" className={`w-full rounded-xl border-4 border-black p-2 text-center ${done?"bg-green-300":"bg-white"}`}>
              <div className="font-black">{label}</div>
              <div className="text-xs flex items-center justify-center gap-1">{done?<Check size={14}/> :null} {done?"erreicht":`${stat.visited}/${stat.total} (${pct}%)`}</div>
            </button>
          </HoverCard>
        ); })}</div></section>
        <section><div className="font-extrabold mb-2">Linien</div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{Object.entries(lineIndex).map(([line,stat])=>{ const done=stat.visited>=stat.total&&stat.total>0; const pct=Math.round((stat.visited/stat.total)*100); const visitedStations=stations.filter(s=> (s.lines||[]).includes(line) && s.visits.length>0); const visitedNames=visitedStations.map(s=>s.name); const dates=visitedStations.map(s=>s.visits[0]?.date).filter(Boolean).sort(); const date=done?dates[stat.total-1]:null; const info=visitedNames.length ? (done ? `Alle Bahnhöfe besucht${date ? ` am ${formatDate(date)}` : ""}` : `Besuchte Bahnhöfe: ${visitedNames.join(", ")}`) : "Noch keine Bahnhöfe besucht"; return (
          <HoverCard key={line} info={info}>
            <button type="button" className={`w-full rounded-xl border-4 border-black p-2 ${done?"bg-green-200":"bg-white"}`}>
              <div className="flex items-center gap-2 mb-1"><span className="px-2 py-0.5 text-xs font-black rounded-full border-2 border-black bg-white">{line}</span><div className="text-xs ml-auto">{stat.visited}/{stat.total} ({pct}%)</div></div>
              <div className="w-full h-3 rounded-full border-2 border-black bg-white overflow-hidden">{pct>0 && (<div className="h-full bg-green-500" style={{width:`${pct}%`}}/> )}</div>
            </button>
          </HoverCard>
        ); })}</div></section>
      </div>
    </Modal>
  );
}

// Utils
export function formatDate(iso){ if(!iso) return ""; try{ const d=new Date(iso+(iso.length===10?"T00:00:00":"")); return d.toLocaleDateString("de-DE",{year:"numeric",month:"2-digit",day:"2-digit"}); }catch{ return iso; } }
