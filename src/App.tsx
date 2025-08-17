import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Settings as SettingsIcon, Shuffle, MapPin, Camera, Upload, Download, Trash2, ArrowUpDown, ChevronLeft, Trophy, Pencil, ImageUp, KeyRound, LogOut, ArrowUp, HelpCircle, Plus, X, Eye } from "lucide-react";
import { fetchJourneyDuration } from "./journeys";
import { seedStations } from "./seed_stations";
import HeaderLogo from "./components/navigation/HeaderLogo";
import LineChips from "./components/LineChips";
import Modal from "./components/Modal";
import ManualVisitForm from "./components/ManualVisitForm";
import ZoomBox from "./components/ZoomBox";
import ChangePasswordForm from "./components/settings/ChangePasswordForm";
import AddVisitForm from "./components/settings/AddVisitForm";
import MilestonesModal from "./components/milestones/MilestonesModal";
import useScrollTop from "./hooks/useScrollTop";
import Login from "./Login";
import { fetchData, saveData, logout as apiLogout, deleteAccount, changePassword } from "./api.js";
import { useI18n } from "./i18n";
import { fileToDataUrl } from "./imageUtils.js";
import helpDe from "./help.de.html?raw";
import helpEn from "./help.en.html?raw";
import { formatDate } from "./formatDate.js";

// Helpers & Types
const STORAGE_KEY = "zufallstour3000.v4";
const COOLDOWN_KEY = "zufallstour3000.cooldownEnabled";
const HOME_KEY = "zufallstour3000.homeStation";

export interface Visit { date: string; note?: string; photos?: string[] }
export interface Station { id: string; name: string; types: ("S"|"U"|"R")[]; lines?: string[]; visits: Visit[] }

const uid = (): string => Math.random().toString(36).slice(2, 10);
const stripRegionalPrefix = (name: string): string => {
  const match = /^([A-Z+]+)\s+(.*)$/.exec(name);
  if (!match) return name;
  const types = match[1].split('+').filter(t => t !== 'R');
  return (types.length ? types.join('+') + ' ' : '') + match[2];
};
export const googleMapsUrl = (name: string): string => {
  const clean = stripRegionalPrefix(name);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean + ", Berlin")}`;
};
export const stationLabel = (st: { name: string; types?: ("S"|"U"|"R")[] }): string => {
  const prefix = Array.isArray(st?.types) && st.types.length
    ? [...st.types].sort().join('+')
    : '';
  return prefix ? `${prefix} ${st.name}` : st.name;
};
const downloadFile = (filename: string, text: string, mime = "application/json;charset=utf-8"): void => {
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
export const makeDataUrl = (text: string, mime = "application/json;charset=utf-8"): string => URL.createObjectURL(new Blob([text], {type:mime}));
export const pickThreeUnvisited = (stations: Station[]): string[] => {
  const unvisited = stations.filter(s => (s.visits?.length || 0) === 0);
  if (!unvisited.length) return [];
  const pool = [...unvisited];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(3, pool.length)).map(s => s.id);
};
export const rollAllowed = (lastTs: number, now = Date.now()): boolean => !lastTs || (now-lastTs)>=20000;

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
          const { photo, ...rest } = v || {};
          const photos = Array.isArray(v.photos)
            ? v.photos
            : (photo ? [photo] : []);
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
  const { t, lang, setLang } = useI18n();
  const [token, setToken] = useState(()=>localStorage.getItem('authToken'));
  const [username, setUsername] = useState(()=>localStorage.getItem('authUsername') || "");
  const [stations, setStations] = useState/** @type {Station[]} */(()=>{ try{ const raw=localStorage.getItem(STORAGE_KEY); if(raw) return normalizeStations(JSON.parse(raw));}catch{ /* ignore */ } return makeSeed(); });
  const [page, setPage] = useState/** @type {"home"|"visited"|"stations"} */("home");
  const [rolled, setRolled] = useState/** @type {string[]} */([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
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
  const { showScrollTop, scrollToTop } = useScrollTop();
  const helpHtml = lang === "de" ? helpDe : helpEn;

  const stationLabelFromName = (name) => {
    const n = normName(name);
    const st = stations.find(s => normName(s.name) === n);
    return st ? stationLabel(st) : name;
  };

  const updateStations = useCallback((updater) => {
    setStations(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (token) {
        saveData(token, next).catch(() => {});
      } else {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to persist stations to localStorage', e);
        }
      }
      return next;
    });
  }, [token]);

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
    if (token) {
      fetchData(token).then(data=>{ if(data) updateStations(normalizeStations(data)); }).catch(()=>setToken(null));
    }
  }, [token, updateStations]);
  const visitedIds = useMemo(()=> new Set(stations.filter(s=>s.visits.length>0).map(s=>s.id)), [stations]);
  const origin = homeStation.trim() ? stationLabelFromName(homeStation.trim()) : null;
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
  const profileUrl = useMemo(() => username ? `${window.location.origin}/profil/${encodeURIComponent(username)}` : '', [username]);

  function handleLogin(tok, user){
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setStations(makeSeed());
    setToken(tok);
    setUsername(user);
    try { localStorage.setItem('authUsername', user); } catch { /* ignore */ }
  }
  async function handleLogout(){
    const current = token;
    try { if (current) await apiLogout(current); } catch { /* ignore */ }
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setStations(makeSeed());
    setToken(null);
    setUsername("");
    try { localStorage.removeItem('authUsername'); } catch { /* ignore */ }
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
    setUsername("");
    try { localStorage.removeItem('authUsername'); } catch { /* ignore */ }
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
  function removePhoto(stationId, visitIndex, photoIndex){
    updateStations(prev => prev.map(s => s.id===stationId
      ? {
          ...s,
          visits: s.visits.map((v,i)=> i===visitIndex
            ? { ...v, photos: (v.photos || []).filter((_,idx)=> idx!==photoIndex) }
            : v)
        }
      : s
    ));
  }

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
              <button onClick={()=>setShowMilestones(true)} className="ml-auto text-xs px-2 py-1 rounded-full border-4 border-black bg-white flex items-center gap-1"><Trophy size={14}/> Meilensteine</button>
            </div>
            <div onClick={()=>setShowMilestones(true)} className="relative h-4 rounded-full border-4 border-black bg-white cursor-pointer">
              <div className="h-full bg-green-500" style={{width:`${Math.max(4,percent)}%`}} />
              {[25,50,75,100].map(p=> (
                <div key={p} className="absolute -top-[6px]" style={{left:`${p}%`}}><div className="w-[2px] h-6 bg-black"/></div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <button onClick={doRoll} className={`w-full justify-center px-6 py-3 rounded-full text-xl font-black bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 text-white flex items-center`} style={denyShake?{animation:"shake .6s"}:{}}>
              <span className="inline-flex items-center gap-2 mx-auto"><Shuffle size={22}/> {t('roll')}</span>
            </button>
            <button onClick={()=>setPage('visited')} className="w-full justify-center px-4 py-3 rounded-full font-bold bg-white text-black flex items-center gap-2 hover:brightness-110">{t('nav.visited')}</button>
            <button onClick={()=>setPage('stations')} className="w-full justify-center px-4 py-3 rounded-full font-bold bg-white text-black flex items-center gap-2 hover:brightness-110">{t('nav.allStations')}</button>
            <button onClick={()=>setShowHelp(true)} className="w-full justify-center px-4 py-3 rounded-full font-bold bg-white text-black flex items-center gap-2 hover:brightness-110"><HelpCircle size={20}/> {t('nav.help')}</button>
            <button onClick={()=>setShowSettings(true)} className="w-full justify-center px-4 py-3 rounded-full font-bold bg-black text-white flex items-center" aria-label={t('nav.settings')} title={t('nav.settings')}><SettingsIcon size={20}/></button>
          </div>

          {lastVisitDate && (<div className="mt-3 text-sm opacity-80">{t('lastVisit.label')}: <b>{formatDate(lastVisitDate)}</b></div>)}
        </div>

        {page==='home' && (
          <div className="space-y-3">
            {rolledStations.length===0 && (<div className="text-center text-sm opacity-80" dangerouslySetInnerHTML={{__html: t('home.noRoll').replace('{{roll}}', `<b>${t('roll')}</b>`)}} />)}
            {rolledStations.map(st=> (
              <StationRow key={st.id} st={st} origin={origin} onAddVisit={()=>setAddVisitFor(st)} onUnvisit={()=>removeAllVisits(st.id)} />
            ))}
          </div>
        )}

        {page==='visited' && (
          <VisitedPage
            stations={stations}
            onBack={()=>setPage('home')}
            onAddVisit={addVisit}
            onClearVisits={removeAllVisits}
            onAttachPhotos={attachPhotos}
            onUpdateNote={updateVisitNote}
            onDeletePhoto={removePhoto}
          />
        )}

        {page==='stations' && (
          <StationsPage stations={stations} onBack={()=>setPage('home')} onAddVisit={st=>setAddVisitFor(st)} />
        )}

        <Modal open={showHelp} onClose={()=>setShowHelp(false)} title={t('help.title')}>
          <div className="text-sm" dangerouslySetInnerHTML={{__html: helpHtml}} />
        </Modal>
        <Modal open={showSettings} onClose={()=>setShowSettings(false)} title={t('settings.title')}>
          <div className="rounded-2xl border-4 border-black p-4 bg-white/80">
            <h3 className="font-extrabold text-lg mb-2">{t('settings.language')}</h3>
            <select value={lang} onChange={e=>setLang(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border-4 border-black bg-white text-sm">
              <option value="de">{t('settings.language.de')}</option>
              <option value="en">{t('settings.language.en')}</option>
            </select>
          </div>
          <div className="mt-4 rounded-2xl border-4 border-black p-4 bg-white/80">
            <h3 className="font-extrabold text-lg mb-2">{t('settings.backups')}</h3>
            <p className="text-sm mb-3">{t('settings.backups.desc')}</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={exportJson} title="JSON exportieren" className="px-4 py-2 rounded-full bg-green-500 text-black font-extrabold border-4 border-black flex items-center gap-2"><Download size={18}/> {t('settings.export')}</button>
              <label className="px-4 py-2 rounded-full bg-amber-300 text-black font-extrabold border-4 border-black flex items-center gap-2 cursor-pointer"><Upload size={18}/> {t('settings.import')}<input type="file" accept="application/json" className="hidden" onChange={(e)=>e.target.files && importJson(e.target.files[0])} /></label>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border-4 border-black p-4 bg-white/80">
            <h3 className="font-extrabold text-lg mb-2">{t('settings.homeStation')}</h3>
            <input
              type="text"
              value={homeStation}
              onChange={e=>setHomeStation(e.target.value)}
              placeholder={t('settings.homeStation.placeholder')}
              className="w-full mt-1 px-3 py-2 rounded-lg border-4 border-black bg-white text-sm"
            />
            <p className="text-xs mt-1 opacity-80">{t('settings.homeStation.hint')}</p>
          </div>
          <div className="mt-4 rounded-2xl border-4 border-black p-4 bg-white/80">
            <h3 className="font-extrabold text-lg mb-2">{t('settings.cooldown')}</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-2 border-black"
                checked={cooldownEnabled}
                onChange={e=>setCooldownEnabled(e.target.checked)}
              />
              <span>{t('settings.cooldown.label')}</span>
            </label>
            <p className="text-xs mt-1 opacity-80">{t('settings.cooldown.desc')}</p>
          </div>
          <div className="mt-4 rounded-2xl border-4 border-black p-4 bg-white/80">
            <h3 className="font-extrabold text-lg mb-2">{t('settings.account')}</h3>
            {username && (
              <>
                <div className="mb-2 text-sm">{t('settings.account.loggedInAs')} <b>{username}</b></div>
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-1">{t('settings.account.profileLink')}</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      readOnly
                      value={profileUrl}
                      className="flex-1 px-3 py-2 rounded-lg border-4 border-black bg-white text-xs"
                    />
                    <button
                      onClick={()=>navigator.clipboard.writeText(profileUrl)}
                      className="px-3 py-2 rounded-lg border-4 border-black bg-blue-500 text-white text-xs font-bold"
                    >{t('settings.account.copy')}</button>
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border-4 border-black bg-white text-black flex items-center justify-center"
                      aria-label={t('settings.account.open')}
                      title={t('settings.account.open')}
                    >
                      <Eye size={16} />
                    </a>
                  </div>
                </div>
              </>
            )}
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <button
                onClick={()=>setShowChangePassword(true)}
                className="w-full sm:flex-1 sm:basis-0 px-4 py-2 rounded-full bg-blue-500 text-white font-extrabold border-4 border-black flex items-center justify-center gap-2"
              ><KeyRound size={18}/> {t('settings.account.changePassword')}</button>

              <button
                onClick={()=>setShowDeleteAccount(true)}
                className="w-full sm:flex-1 sm:basis-0 px-4 py-2 rounded-full bg-red-600 text-white font-extrabold border-4 border-black flex items-center justify-center gap-2"
              ><Trash2 size={18}/> {t('settings.account.delete')}</button>

              <button
                onClick={handleLogout}
                className="w-full sm:flex-1 sm:basis-0 px-4 py-2 rounded-full bg-white text-black font-extrabold border-4 border-black flex items-center justify-center gap-2"
              ><LogOut size={18}/> {t('settings.account.logout')}</button>
            </div>
          </div>
        </Modal>

        <Modal open={exportDialog.open} onClose={()=>{ try{ URL.revokeObjectURL(exportDialog.href);}catch{ /* ignore */ } setExportDialog(p=>({...p, open:false})); }} title={t('settings.backupExported.title')}>
          <div className="space-y-3">
            <p className="text-sm">{t('settings.backupExported.info')}</p>
            <a href={exportDialog.href} download={exportDialog.filename} className="px-4 py-2 rounded-full bg-green-500 border-4 border-black font-extrabold inline-flex items-center gap-2 cursor-pointer"><Download size={18}/> {exportDialog.filename}</a>
            <div><p className="text-sm mb-1">{t('settings.backupExported.copy')}</p><textarea readOnly value={exportDialog.text} className="w-full h-40 p-2 rounded-lg border-4 border-black bg-white text-xs"></textarea></div>
          </div>
        </Modal>

        <Modal open={showChangePassword} onClose={()=>setShowChangePassword(false)} title={t('settings.account.changePassword')}>
          <ChangePasswordForm onSave={submitChangePassword} onCancel={()=>setShowChangePassword(false)} />
        </Modal>

        <Modal open={showDeleteAccount} onClose={()=>setShowDeleteAccount(false)} title={t('deleteAccount.title')}>
          <div className="space-y-3">
            <p className="text-sm">{t('deleteAccount.confirm')}</p>
            <div className="flex gap-2 justify-end"><button onClick={()=>setShowDeleteAccount(false)} className="px-4 py-2 rounded-lg bg-white">{t('deleteAccount.cancel')}</button><button onClick={confirmDeleteAccount} className="px-4 py-2 rounded-lg bg-red-600 text-white">{t('deleteAccount.delete')}</button></div>
          </div>
        </Modal>

        <MilestonesModal open={showMilestones} onClose={()=>setShowMilestones(false)} percent={percent} visitedCount={visitedCount} total={total} lineIndex={lineIndex} typeStats={typeStats} stations={stations} />

        <Modal open={!!addVisitFor} onClose={()=>setAddVisitFor(null)} title={`${t('station.addVisit')} – ${addVisitFor?.name ?? ''}`}>
          {addVisitFor && (<AddVisitForm onSave={addVisit} stationId={addVisitFor.id} />)}
        </Modal>

        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-black text-white flex items-center justify-center z-50"
            aria-label="Nach oben scrollen"
            type="button"
          >
            <ArrowUp size={24} />
          </button>
        )}

        <div className="mt-10 text-center text-xs opacity-70"><p>{t('footer.madeWith')}</p></div>
      </div>
    </div>
  );
}

// Station Row
function StationRow({ st, origin, onAddVisit, onUnvisit }){
  const { t } = useI18n();
  const isVisited = st.visits.length>0; const lastVisit = isVisited ? st.visits[st.visits.length-1] : null;
  const label = stationLabel(st);
  const [journey, setJourney] = useState(null);
  useEffect(()=>{
    let cancelled = false;
    if (!origin){ setJourney(null); return; }
    fetchJourneyDuration(origin, label).then(d=>{
      if(!cancelled) setJourney(d);
    }).catch(()=>{});
    return ()=>{ cancelled = true; };
  }, [origin, label]);
  return (
    <div className="rounded-[22px] border-4 border-black bg-[#8c4bd6] text-white p-3 shadow-[8px_8px_0_0_rgba(0,0,0,0.6)]">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-lg leading-tight truncate flex items-baseline gap-2">
            <span className="truncate">{label}</span>
            <span className="text-xs font-normal opacity-90 whitespace-nowrap">{journey?.minutes!=null ? `Anreise ≈ ${journey.minutes} min${journey.transfers!=null ? `, ${journey.transfers}x umsteigen` : ''}` : 'n/a'}</span>
          </div>
          <div className="text-xs opacity-90 flex flex-col gap-1">
            {isVisited ? (<span>{t('station.visitedOn')} <b>{formatDate(lastVisit.date)}</b></span>) : (<span>{t('station.notVisited')}</span>)}
            {lastVisit?.note && (<span className="opacity-90 truncate">{t('station.note')}: {lastVisit.note}</span>)}
          </div>
          <LineChips lines={st.lines} types={st.types} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <a href={googleMapsUrl(label)} target="_blank" rel="noreferrer" className="w-full justify-center px-3 py-2 rounded-full bg-white text-black font-extrabold border-4 border-black flex items-center gap-2"><MapPin size={18}/> {t('station.maps')}</a>
        <button onClick={onAddVisit} className="w-full justify-center px-3 py-2 rounded-full bg-amber-300 text-black font-extrabold border-4 border-black flex items-center gap-2"><Camera size={22}/> {t('station.addVisit')}</button>
        {isVisited && (<button onClick={onUnvisit} className="w-full justify-center px-3 py-2 rounded-full bg-red-500 text-white font-extrabold border-4 border-black flex items-center gap-2"><Trash2 size={18}/> {t('station.deleteVisit')}</button>)}
      </div>

      {lastVisit?.photos?.[0] && (<div className="mt-3"><img src={lastVisit.photos[0]} alt="Besuchsbild" className="w-full max-h-72 object-cover rounded-xl border-4 border-black"/></div>)}
    </div>
  );
}

// Stations Page
function StationsPage({ stations, onBack, onAddVisit }){
  const { t } = useI18n();
  const [typeFilter, setTypeFilter] = useState({ S: true, U: true, R: true });
  const [onlyUnvisited, setOnlyUnvisited] = useState(false);
  const sortModes = ['visitDate', 'name', 'createdAt'];
  const sortLabels = {
    visitDate: 'Besuchsdatum ↓',
    name: 'Name ↓',
    createdAt: 'Eintragsdatum ↓',
  };
  const [sortKey, setSortKey] = useState('name');
  const cycleSortKey = () => {
    setSortKey(prev => {
      const idx = sortModes.indexOf(prev);
      return sortModes[(idx + 1) % sortModes.length];
    });
  };

  const toggleType = t => setTypeFilter(f => ({ ...f, [t]: !f[t] }));

  const filtered = useMemo(
    () =>
      stations.filter(st => {
        if (onlyUnvisited && st.visits.length > 0) return false;
        if (!st.types.some(t => typeFilter[t])) return false;
        return true;
      }),
    [stations, typeFilter, onlyUnvisited],
  );

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case 'visitDate':
        arr.sort((a, b) => {
          const aDate = a.visits.length ? a.visits[a.visits.length - 1].date : '';
          const bDate = b.visits.length ? b.visits[b.visits.length - 1].date : '';
          return bDate.localeCompare(aDate);
        });
        break;
      case 'createdAt':
        arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      default:
        arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return arr;
  }, [filtered, sortKey]);

  return (
    <div className="rounded-[28px] border-4 border-black shadow-[10px_10px_0_0_rgba(0,0,0,0.6)] bg-gradient-to-br from-teal-300 via-rose-200 to-amber-200 p-4 sm:p-6 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="px-3 py-2 rounded-full border-4 border-black bg-white flex items-center gap-2"><ChevronLeft size={18}/> Zurück</button>
        <div className="font-extrabold text-lg">Alle Bahnhöfe</div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <div>{sortLabels[sortKey]}</div>
          <button
            onClick={cycleSortKey}
            className="p-1 rounded-lg bg-white"
            title="Sortierung ändern"
            type="button"
          >
            <ArrowUpDown size={16}/>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        {['S','U','R'].map(t => (
          <button
            key={t}
            onClick={()=>toggleType(t)}
            className={`px-3 py-1 rounded-full ${typeFilter[t]?"bg-black text-white":"bg-white"}`}
          >{t}</button>
        ))}
        <button
          onClick={()=>setOnlyUnvisited(v=>!v)}
          className={`px-3 py-1 rounded-full ${onlyUnvisited?"bg-black text-white":"bg-white"}`}
        >Noch nie besucht</button>
      </div>

      <div className="space-y-2 pr-1">
        {sorted.length===0 && (<div className="text-sm">Keine Bahnhöfe gefunden.</div>)}
        {sorted.map(st => (
          <div
            key={st.id}
            className={`relative p-2 border-4 border-black rounded-lg ${st.visits.length ? 'bg-[#8c4bd6] text-white' : 'bg-white'}`}
          >
            {st.visits.length===0 && (
              <button
                type="button"
                onClick={() => onAddVisit?.(st)}
                className="absolute -top-3 -right-3 w-10 h-10 rounded-full border-4 border-black bg-amber-300 flex items-center justify-center text-black"
                aria-label={t('station.addVisit')}
                title={t('station.addVisit')}
              >
                <Plus size={24}/>
              </button>
            )}
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
function VisitedPage({ stations, onBack, onAddVisit, onClearVisits, onAttachPhotos, onUpdateNote, onDeletePhoto }){
  const { t } = useI18n();
  const sortModes = useMemo(() => ['visitDate','name','createdAt'], []);
  const sortLabels = {
    visitDate: 'Besuchsdatum ↓',
    name: 'Name ↓',
    createdAt: 'Eintragsdatum ↓'
  };
  const [sortKey, setSortKey] = useState('visitDate');
  const cycleSortKey = useCallback(() => {
    setSortKey(prev => {
      const idx = sortModes.indexOf(prev);
      return sortModes[(idx + 1) % sortModes.length];
    });
  }, [sortModes]);
  const [confirmId, setConfirmId] = useState(null);
  const [zoom, setZoom] = useState(null); // {src, station, date}
  const fileRef = useRef(null);
  const [pendingPhoto, setPendingPhoto] = useState(null); // {stationId, index}
  const [manualOpen, setManualOpen] = useState(false);
  const [editing, setEditing] = useState(null); // {stationId, index, text}
  const [delPhoto, setDelPhoto] = useState(null); // {stationId, visitIndex, photoIndex}

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
            className="p-1 rounded-lg bg-white"
            title="Sortierung ändern"
            type="button"
          >
            <ArrowUpDown size={16}/>
          </button>
        </div>
      </div>

      {manualOpen ? (<ManualVisitForm stations={unvisited} onAdd={onAddVisit} onCancel={()=>setManualOpen(false)} />) : (<button onClick={()=>setManualOpen(true)} className="w-full px-6 py-4 rounded-2xl text-xl font-black bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 text-white">Besuch hinzufügen</button>)}

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
                <div className="shrink-0"><button type="button" onClick={()=>setConfirmId(st.id)} className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center" title="Besuch(e) löschen"><Trash2 size={16}/></button></div>
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
                          <button onClick={cancelEdit} className="px-3 py-1 rounded-lg bg-white text-xs">Abbrechen</button>
                          <button onClick={saveEdit} className="px-3 py-1 rounded-lg bg-black text-white text-xs">Speichern</button>
                        </div>
                      </div>
                    ) : (
                      (v.note ? (
                        <div className="text-xs px-2 py-1 rounded-md border-2 border-black bg-white/70 flex items-start gap-2">
                          <div className="flex-1 break-words">{v.note}</div>
                          <button
                            title="Notiz bearbeiten"
                            className="shrink-0 p-1 rounded-md bg-white border-2 shadow-none active:shadow-none active:translate-y-0"
                            onClick={()=>startEdit(st.id, idx, v.note)}
                          >
                            <Pencil size={14}/>
                          </button>
                        </div>
                      ) : (
                        <button
                          className="w-full rounded-md border-2 border-dashed px-2 py-1 text-xs bg-white/70 text-left shadow-none active:shadow-none active:translate-y-0"
                          onClick={()=>startEdit(st.id, idx, "")}
                        >
                          Notiz hinzufügen ✍️
                        </button>
                      ))
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(v.photos || []).map((p,pidx)=> (
                        <div key={pidx} className="relative">
                          <button
                            className="w-full h-64 rounded-xl overflow-hidden bg-white"
                            onClick={()=>setZoom({src:p, station:st.name, date:v.date})}
                          >
                            <img src={p} alt="Foto" className="w-full h-full object-contain"/>
                          </button>
                          <button
                            type="button"
                            title={t('deletePhoto.title')}
                            className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white"
                            onClick={()=>setDelPhoto({stationId:st.id, visitIndex:idx, photoIndex:pidx})}
                          >
                            <X size={14}/>
                          </button>
                        </div>
                      ))}
                      <button
                        className="w-full aspect-square rounded-xl border-2 border-dashed flex items-center justify-center bg-white shadow-none active:shadow-none active:translate-y-0"
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
          <div className="flex gap-2 justify-end"><button onClick={()=>setConfirmId(null)} className="px-4 py-2 rounded-lg bg-white">Abbrechen</button><button onClick={()=>{ onClearVisits(confirmId); setConfirmId(null); }} className="px-4 py-2 rounded-lg bg-red-600 text-white">Löschen</button></div>
        </div>
      </Modal>

      <Modal open={!!delPhoto} onClose={()=>setDelPhoto(null)} title={t('deletePhoto.title')}>
        <div className="space-y-3">
          <p className="text-sm">{t('deletePhoto.confirm')}</p>
          <div className="flex gap-2 justify-end">
            <button onClick={()=>setDelPhoto(null)} className="px-4 py-2 rounded-lg bg-white">{t('deletePhoto.cancel')}</button>
            <button
              onClick={()=>{ onDeletePhoto(delPhoto.stationId, delPhoto.visitIndex, delPhoto.photoIndex); setDelPhoto(null); }}
              className="px-4 py-2 rounded-lg bg-red-600 text-white"
            >
              {t('deletePhoto.delete')}
            </button>
          </div>
        </div>
      </Modal>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFileChange} />
      <Modal open={!!zoom} onClose={()=>setZoom(null)} title={`${zoom?.station ?? ''} ${zoom?.date ? '– ' + formatDate(zoom.date) : ''}`}>{zoom && (<ZoomBox src={zoom.src} />)}</Modal>
    </div>
  );
}

