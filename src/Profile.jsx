import React, { useEffect, useMemo, useState } from 'react';
import { stationLabel } from './App.jsx';
import { useI18n } from './i18n.jsx';
import LineChips from './components/LineChips.jsx';
import { Check } from 'lucide-react';
import Footer from './components/Footer.jsx';

function formatDate(iso){
  if(!iso) return '';
  try {
    const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    return d.toLocaleDateString('de-DE',{year:'numeric',month:'2-digit',day:'2-digit'});
  } catch {
    return iso;
  }
}

export default function Profile({ username }) {
  const { t } = useI18n();
  const [stations, setStations] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/profile/${encodeURIComponent(username)}`).then(r => {
      if (!r.ok) throw new Error('nf');
      return r.json();
    }).then(j => setStations(j.data || [])).catch(()=>setError(true));
  }, [username]);

  const visitedStations = useMemo(
    () => (stations||[]).filter(s => (s.visits||[]).length>0).sort((a,b)=> (a.visits[0]?.date||'').localeCompare(b.visits[0]?.date||'')),
    [stations]
  );
  const total = stations ? stations.length : 0;
  const visitedCount = visitedStations.length;
  const percent = total ? Math.round((visitedCount/total)*100) : 0;

  const lineIndex = useMemo(()=>{
    const map={};
    (stations||[]).forEach(s=>{
      (s.lines||[]).forEach(l=>{
        if(!map[l]) map[l]={total:0,visited:0};
        map[l].total+=1;
        if(s.visits.length>0) map[l].visited+=1;
      });
    });
    return map;
  },[stations]);
  const typeStats = useMemo(()=>{
    const stats={S:{total:0,visited:0},U:{total:0,visited:0},R:{total:0,visited:0}};
    (stations||[]).forEach(s=>{
      if(s.types.includes('S')){stats.S.total++; if(s.visits.length>0) stats.S.visited++;}
      if(s.types.includes('U')){stats.U.total++; if(s.visits.length>0) stats.U.visited++;}
      if(s.types.includes('R')){stats.R.total++; if(s.visits.length>0) stats.R.visited++;}
    });
    return stats;
  },[stations]);
  const firstVisitDates = useMemo(()=> (stations||[]).map(s=>s.visits[0]?.date).filter(Boolean).sort(), [stations]);

  const milestones = useMemo(()=>{
    if(!stations) return [];
    const stationMilestones=[
      { label:t('profile.milestone.first'), count:1, desc:t('profile.milestone.firstDesc') },
      { label:t('profile.milestone.hattrick'), count:3, desc:t('profile.milestone.hattrickDesc') },
      { label:'10%', percent:10 },
      { label:'25%', percent:25 },
      { label:'50%', percent:50 },
      { label:'75%', percent:75 },
      { label:t('profile.milestone.almost'), count:Math.max(total-3,0), desc:t('profile.milestone.almostDesc') },
      { label:'100%', percent:100 },
    ].map(m=>{
      const count=m.count ?? Math.ceil(total*(m.percent/100));
      const done=visitedCount>=count;
      const date=done?firstVisitDates[count-1]:null;
      return {...m,done,date};
    }).filter(m=>m.done);
    const network=[
      { label:t('profile.milestone.allS'), stat:typeStats.S },
      { label:t('profile.milestone.allU'), stat:typeStats.U },
      { label:t('profile.milestone.allR'), stat:typeStats.R },
    ].map(({label,stat})=>{
      const done=stat.visited>=stat.total && stat.total>0;
      const dates=(stations||[]).filter(s=>s.visits[0]?.date && s.types.includes(label.includes('S')?'S':label.includes('U')?'U':'R')).map(s=>s.visits[0].date).sort();
      const date=done?dates[stat.total-1]:null;
      return {label,done,date};
    }).filter(m=>m.done);
    const lines=Object.entries(lineIndex).map(([line,stat])=>{
      const done=stat.visited>=stat.total && stat.total>0;
      const dates=(stations||[]).filter(s=>(s.lines||[]).includes(line) && s.visits[0]?.date).map(s=>s.visits[0].date).sort();
      const date=done?dates[stat.total-1]:null;
      return {label:t('profile.milestone.line',{line}),done,date};
    }).filter(m=>m.done);
    return [...stationMilestones,...network,...lines];
  },[stations,total,visitedCount,firstVisitDates,typeStats,lineIndex,t]);

  if(error) return <div className="p-4">{t('profile.notFound')}</div>;
  if(!stations) return <div className="p-4">{t('profile.loading')}</div>;

  return (
    <>
    <div className="p-4">
      <div className="rounded-[28px] border-4 border-black shadow-[10px_10px_0_0_rgba(0,0,0,0.6)] bg-gradient-to-br from-teal-300 via-rose-200 to-amber-200 p-4 sm:p-6 space-y-6">
        <h1 className="text-2xl font-extrabold">{t('profile.title',{username})}</h1>
        <section>
          <h2 className="text-xl font-bold mb-2">{t('profile.milestones')}</h2>
          {milestones.length===0 && <div className="text-sm">{t('profile.noMilestones')}</div>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {milestones.map(m=> (
              <div key={m.label} className="w-full rounded-xl border-4 border-black p-2 text-center bg-green-300">
                <div className="font-black">{m.label}</div>
                {m.date && (
                  <div className="text-xs flex items-center justify-center gap-1"><Check size={14}/> {formatDate(m.date)}</div>
                )}
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-xl font-bold mb-2">{t('profile.visited')}</h2>
          <div className="text-sm mb-2">{visitedCount}/{total} ({percent}%)</div>
          {visitedStations.length===0 && <div className="text-sm">{t('profile.noneVisited')}</div>}
          <div className="space-y-4">
            {visitedStations.map(s=> {
              const photos = (s.visits||[]).flatMap(v=>v.photos||[]);
              const lastDate = s.visits[s.visits.length-1]?.date;
              return (
                <div key={s.id} className="p-2 border-4 border-black rounded-xl bg-white/80">
                  <div className="font-extrabold truncate">{stationLabel(s)}</div>
                  <LineChips lines={s.lines} types={s.types} />
                  {lastDate && <div className="text-xs mt-1">{t('station.visitedOn')} <b>{formatDate(lastDate)}</b></div>}
                  {photos.length>0 && (
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {photos.map((p,idx)=>(
                        <div key={idx} className="w-full h-48 rounded-xl border-2 border-black overflow-hidden bg-white">
                          <img src={p} alt="Foto" className="w-full h-full object-contain"/>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
    <Footer />
    </>
  );
}
