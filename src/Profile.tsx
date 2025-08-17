import React, { useEffect, useState } from 'react';
import { useI18n } from './i18n';

interface StationData {
  id: string;
  name: string;
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

  const visited = profile.data ?? [];

  return (
    <div>
      <h1>{t('profile.title', { username: profile.username })}</h1>
      {visited.length === 0 ? (
        <p>{t('profile.noneVisited')}</p>
      ) : (
        <ul>
          {visited.map((s) => (
            <li key={s.id}>{s.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
