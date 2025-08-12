import React, { useEffect, useMemo, useState } from 'react';
import { stationLabel } from './App.jsx';
import { useI18n } from './i18n.jsx';

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
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-extrabold">{t('profile.title',{username})}</h1>
      <section>
        <h2 className="text-xl font-bold mb-2">{t('profile.milestones')}</h2>
        {milestones.length===0 && <div className="text-sm">{t('profile.noMilestones')}</div>}
        <ul className="list-disc ml-5 space-y-1">
          {milestones.map(m=> (
            <li key={m.label}>{m.label}{m.date?` – ${formatDate(m.date)}`:''}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-bold mb-2">{t('profile.visited')}</h2>
        <div className="text-sm mb-2">{visitedCount}/{total} ({percent}%)</div>
        {visitedStations.length===0 && <div className="text-sm">{t('profile.noneVisited')}</div>}
        <ul className="list-disc ml-5 space-y-1">
          {visitedStations.map(s=> (
            <li key={s.id}>{stationLabel(s)}{s.visits[0]?.date?` – ${formatDate(s.visits[0].date)}`:''}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
