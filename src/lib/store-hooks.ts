'use client';

import { useEffect, useState } from 'react';
import type { Settings } from '@/types';
import { getSettings, subscribeStore } from '@/lib/store';

export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings>(() => getSettings());

  useEffect(() => {
    const refresh = () => setSettings(getSettings());
    return subscribeStore(refresh);
  }, []);

  return settings;
}
