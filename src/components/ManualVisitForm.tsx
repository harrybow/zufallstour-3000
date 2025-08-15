import React, { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import ComboBox from "./ComboBox";
import { useI18n } from "../i18n";
import { fileToDataUrl } from "../imageUtils.js";

type StationOption = { id: string; name: string };
type VisitInput = { date: string; note?: string; photos?: string[] };
export default function ManualVisitForm({ stations, onAdd, onCancel }: { stations: StationOption[]; onAdd: (stationId: string, visit: VisitInput) => void; onCancel?: () => void }){
  const { t } = useI18n();
  const [stationId, setStationId] = useState(stations[0]?.id || "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);
  useEffect(()=>{ if(stations.length && !stations.find(s=>s.id===stationId)) setStationId(stations[0].id); }, [stations, stationId]);
  async function onFile(e){ const files=Array.from(e.target.files||[]); if(!files.length) return; const urls=await Promise.all(files.map(fileToDataUrl)); setPhotos(p=>[...p, ...urls]); }
  function submit(){ if(!stationId) return alert(t('manualVisit.chooseStation')); onAdd(stationId, { date, note: note.trim()||undefined, photos: photos.length?photos:undefined }); setNote(""); setPhotos([]); }
  return (
    <div className="rounded-xl border-4 border-black bg:white/80 p-3">
      <div className="font-extrabold mb-2">{t('manualVisit.add')}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
        <ComboBox options={stations} value={stationId} onChange={setStationId} />
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="px-3 py-2 rounded-lg border-4 border-black bg-white"/>
      </div>
      <div className="flex items-start gap-2 mb-2">
        <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder={t('manualVisit.notePlaceholder')} className="flex-1 px-3 py-2 rounded-lg border-2 border-black bg-white"/>
        <label className="w-16 h-16 rounded-xl bg-amber-300 border-4 border-black cursor-pointer font-extrabold flex items-center justify-center overflow-hidden" title={t('manualVisit.addPhoto')}>
          {photos.length ? (<img src={photos[0]} alt="Foto" className="w-full h-full object-cover"/>) : (<Camera size={28}/>)}
          <input type="file" accept="image/*" multiple className="hidden" onChange={onFile}/>
        </label>
      </div>
      {photos.length>1 && (<div className="flex flex-wrap gap-2 mb-2">{photos.slice(1).map((p,i)=>(<img key={i} src={p} alt="Foto" className="w-16 h-16 object-cover rounded-xl border-4 border-black"/>))}</div>)}
      <div className="flex flex-col md:flex-row gap-2 justify-end">
        <button type="button" onClick={submit} className="w-full md:w-auto px-6 py-2 rounded-lg bg-black text-white font-extrabold border-4 border-black">{t('manualVisit.addButton')}</button>
        {onCancel && (<button type="button" onClick={onCancel} className="w-full md:w-auto px-6 py-2 rounded-lg bg-white border-4 border-black font-extrabold">{t('manualVisit.cancelButton')}</button>)}
      </div>
    </div>
  );
}

