import { useEffect, useState } from 'react';
import { profileService } from '@/services/profileService';

/** Signed URL foto profil untuk banyak path sekaligus (bucket privat). */
export function useAvatarUrls(paths: Array<string | null | undefined>) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = Array.from(new Set(paths.filter((p): p is string => Boolean(p))))
    .sort()
    .join('|');

  useEffect(() => {
    if (!key) return;
    let alive = true;
    profileService.getAvatarUrls(key.split('|')).then((res) => {
      if (alive) setUrls((prev) => ({ ...prev, ...res }));
    });
    return () => {
      alive = false;
    };
  }, [key]);

  return urls;
}
