import React, { useEffect, useState } from 'react';
import { useI18n } from './i18n';
import MilestonesSection from './components/milestones/MilestonesSection';
import LineChips from './components/LineChips';
import { formatDate } from './formatDate.js';

interface Visit { date: string; photos?: string[] }
interface StationData {
  id: string;
  name: string;
  types: string[];
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

  if (!username || error) {
    return <div>{t('profile.notFound')}</div>;
  }

  if (!profile) {
    return <div>{t('profile.loading')}</div>;
  }

  const stations = profile.data || [];
  const visited = stations.filter((s) => (s.visits || []).length > 0);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-extrabold mb-4">{t('profile.title', { username: profile.username })}</h1>

      <section className="rounded-[28px] border-4 border-black shadow-[10px_10px_0_0_rgba(0,0,0,0.6)] bg-gradient-to-br from-teal-300 via-rose-200 to-amber-200 p-4 sm:p-6">
        <h2 className="font-extrabold text-lg mb-4">{t('profile.milestones')}</h2>
        {visited.length === 0 ? <p>{t('profile.noMilestones')}</p> : <MilestonesSection stations={stations} />}
      </section>

      <section className="rounded-[28px] border-4 border-black shadow-[10px_10px_0_0_rgba(0,0,0,0.6)] bg-gradient-to-br from-teal-300 via-rose-200 to-amber-200 p-4 sm:p-6">
        <h2 className="font-extrabold text-lg mb-4">{t('profile.visited')}</h2>
        {visited.length === 0 ? (
          <p>{t('profile.noneVisited')}</p>
        ) : (
          <div className="space-y-4">
            {visited.map((s) => {
              const lastVisit = s.visits[s.visits.length - 1];
              const photo = lastVisit.photos?.[0];
              return (
                <div
                  key={s.id}
                  className="rounded-[22px] border-4 border-black bg-[#8c4bd6] text-white p-3 shadow-[8px_8px_0_0_rgba(0,0,0,0.6)]"
                >
                  <div className="font-extrabold text-lg leading-tight truncate">{s.name}</div>
                  <div className="text-xs opacity-90 mt-1">
                    {t('station.visitedOn')} <b>{formatDate(lastVisit.date)}</b>
                  </div>
                  <LineChips lines={s.lines} types={s.types} />
                  {photo && (
                    <div className="mt-3">
                      <img
                        src={photo}
                        alt="Besuchsbild"
                        className="w-full max-h-72 object-cover rounded-xl border-4 border-black"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

