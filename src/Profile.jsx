import React, { useEffect, useMemo, useState } from 'react';
import { stationLabel } from './App.jsx';
import { useI18n } from './i18n.jsx';
import { formatDate } from './formatDate.js';
import MilestonesView from './components/milestones/MilestonesView.jsx';
import LineChips from './components/LineChips.jsx';

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
  if(error) return <div className="p-4">{t('profile.notFound')}</div>;
  if(!stations) return <div className="p-4">{t('profile.loading')}</div>;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-extrabold">{t('profile.title',{username})}</h1>
      <section>
        <h2 className="text-xl font-bold mb-2">{t('profile.milestones')}</h2>
        <MilestonesView
          percent={percent}
          visitedCount={visitedCount}
          total={total}
          lineIndex={lineIndex}
          typeStats={typeStats}
          stations={stations}
        />
      </section>
      <section>
        <h2 className="text-xl font-bold mb-2">{t('profile.visited')}</h2>
        <div className="text-sm mb-2">{visitedCount}/{total} ({percent}%)</div>
        {visitedStations.length===0 && <div className="text-sm">{t('profile.noneVisited')}</div>}
        <div className="space-y-2">
          {visitedStations.map(s => (
            <div key={s.id} className="p-2 border-4 border-black rounded-xl bg-white/80">
              <div className="font-extrabold truncate">{stationLabel(s)}</div>
              <LineChips lines={s.lines} types={s.types} />
              <div className="text-xs mt-1">{t('station.visitedOn')} <b>{formatDate(s.visits[0].date)}</b></div>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {s.visits.flatMap(v => v.photos || []).map((p, idx) => (
                  <img
                    key={idx}
                    src={p}
                    alt="Foto"
                    className="w-full h-32 sm:h-48 object-cover rounded-xl border-2 border-black"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
