import React, { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import LineChips from './components/LineChips';
import { formatDate } from './formatDate.js';
import { useI18n } from './i18n';

interface Visit {
  date: string;
  photos?: string[];
}

interface StationData {
  id: string;
  name: string;
  types?: string[];
  lines?: string[];
  visits: Visit[];
}

interface ProfileData {
  username: string;
  data: StationData[] | null;
}

export default function Profile({ username }: { username: string }) {
  const { t } = useI18n();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!username) return;

    fetch(`/api/profile/${encodeURIComponent(username)}`)
      .then((res) => {
        if (!res.ok) throw new Error('notfound');
        return res.json();
      })
      .then(setProfile)
      .catch(() => setError(true));
  }, [username]);

  const notFound = !username || error;

  const stations = useMemo(() => profile?.data || [], [profile]);
  const visitedStations = useMemo(
    () => stations.filter((s) => s.visits.length > 0),
    [stations],
  );
  const visitedCount = visitedStations.length;
  const total = stations.length || 1;

  const lineIndex = useMemo(() => {
    const map: Record<string, { total: number; visited: number }> = {};
    stations.forEach((s) => {
      (s.lines || []).forEach((l) => {
        if (!map[l]) map[l] = { total: 0, visited: 0 };
        map[l].total += 1;
        if (s.visits.length > 0) map[l].visited += 1;
      });
    });
    return map;
  }, [stations]);

  const typeStats = useMemo(() => {
    const stats = {
      S: { total: 0, visited: 0 },
      U: { total: 0, visited: 0 },
      R: { total: 0, visited: 0 },
    };
    stations.forEach((s) => {
      (s.types || []).forEach((t) => {
        stats[t].total += 1;
        if (s.visits.length > 0) stats[t].visited += 1;
      });
    });
    return stats;
  }, [stations]);

  const stationMilestones = useMemo(() => {
    const firstVisitDates = stations
      .map((s) => s.visits[0]?.date)
      .filter(Boolean)
      .sort();
    const dateForCount = (n: number) => firstVisitDates[n - 1] || null;
    return [
      { label: t('profile.milestone.first'), count: 1 },
      { label: t('profile.milestone.hattrick'), count: 3 },
      { label: '10%', percent: 10 },
      { label: '25%', percent: 25 },
      { label: '50%', percent: 50 },
      { label: '75%', percent: 75 },
      { label: t('profile.milestone.almost'), count: Math.max(total - 3, 0) },
      { label: '100%', percent: 100 },
    ]
      .map((m) => {
        const count = m.count ?? Math.ceil(total * ((m.percent || 0) / 100));
        const done = visitedCount >= count;
        const date = done ? dateForCount(count) : null;
        return { ...m, done, date };
      })
      .filter((m) => m.done);
  }, [t, total, visitedCount, stations]);

  const typeMilestones = useMemo(() => {
    return [
      { label: t('profile.milestone.allS'), stat: typeStats.S, type: 'S' },
      { label: t('profile.milestone.allU'), stat: typeStats.U, type: 'U' },
      { label: t('profile.milestone.allR'), stat: typeStats.R, type: 'R' },
    ]
      .map(({ label, stat, type }) => {
        const done = stat.visited >= stat.total && stat.total > 0;
        const dates = stations
          .filter((s) => s.types?.includes(type) && s.visits[0]?.date)
          .map((s) => s.visits[0].date)
          .sort();
        const date = done ? dates[stat.total - 1] : null;
        return { label, done, date };
      })
      .filter((m) => m.done);
  }, [t, typeStats, stations]);

  const lineMilestones = useMemo(() => {
    return Object.entries(lineIndex)
      .map(([line, stat]) => {
        const done = stat.visited >= stat.total && stat.total > 0;
        const dates = stations
          .filter((s) => (s.lines || []).includes(line) && s.visits[0]?.date)
          .map((s) => s.visits[0].date)
          .sort();
        const date = done ? dates[stat.total - 1] : null;
        return { label: t('profile.milestone.line', { line }), done, date };
      })
      .filter((m) => m.done);
  }, [t, lineIndex, stations]);

  const milestones = [...stationMilestones, ...typeMilestones, ...lineMilestones];

  return (
    <div className="max-w-3xl mx-auto p-4">
      {notFound ? (
        <div>{t('profile.notFound')}</div>
      ) : (
        <div className="rounded-[28px] border-4 border-black shadow-[10px_10px_0_rgba(0,0,0,0.6)] bg-gradient-to-br from-teal-300 via-rose-200 to-amber-200 p-4 sm:p-6 space-y-6">
          <h1 className="text-xl font-extrabold">{t('profile.title', { username: profile?.username || username })}</h1>

          {!profile ? (
            <div>{t('profile.loading')}</div>
          ) : (
            <>
              <section>
                <h2 className="font-extrabold mb-2">{t('profile.milestones')}</h2>
                {milestones.length === 0 ? (
                  <p>{t('profile.noMilestones')}</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {milestones.map((m) => (
                      <div
                        key={m.label}
                        className="w-full rounded-xl border-4 border-black p-2 text-center bg-green-300"
                      >
                        <div className="font-black">{m.label}</div>
                        {m.date && (
                          <div className="text-xs flex items-center justify-center gap-1">
                            <Check size={14} /> {formatDate(m.date)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2 className="font-extrabold mb-2">{t('profile.visited')}</h2>
                {visitedStations.length === 0 ? (
                  <p>{t('profile.noneVisited')}</p>
                ) : (
                  <div className="space-y-4">
                    {visitedStations.map((st) => {
                      const lastVisit = st.visits[st.visits.length - 1];
                      const photos = st.visits.flatMap((v) => v.photos || []);
                      return (
                        <div key={st.id} className="p-2 border-4 border-black rounded-xl bg-white/80">
                          <div className="font-extrabold">{st.name}</div>
                          <LineChips lines={st.lines} types={st.types} />
                          <div className="text-xs mt-1">
                            {t('station.visitedOn')} <b>{formatDate(lastVisit.date)}</b>
                          </div>
                          {photos.length > 0 && (
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {photos.map((p, i) => (
                                <img
                                  key={i}
                                  src={p}
                                  alt={st.name}
                                  className="w-full h-24 object-cover rounded-xl border-4 border-black"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
