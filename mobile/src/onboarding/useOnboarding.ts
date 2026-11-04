/**
 * Onboarding state.
 *
 * A new patient does not know what the app is for or what to do first. We track
 * a few first-step milestones locally (AsyncStorage) and show a checklist on the
 * home screen that disappears once everything is done. Persistence is local
 * because this is pure presentation — the backend has no concept of "tutorial".
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'carecare.onboarding.v1';
const DISMISS_KEY = 'carecare.onboarding.dismissed.v1';

export type StepId = 'profile' | 'log' | 'insights' | 'therapy';

export const FIRST_STEPS: Array<{ id: StepId; title: string; hint: string }> = [
  { id: 'profile', title: 'Open your profile', hint: 'Check your details and accept the privacy notice.' },
  { id: 'log', title: 'Log a symptom', hint: 'Record how you feel — it takes ten seconds.' },
  { id: 'insights', title: 'See your insights', hint: 'Watch your trend to understand your triggers.' },
  { id: 'therapy', title: 'Join a therapy program', hint: 'Follow a guided plan to manage your symptoms.' },
];

export interface Onboarding {
  done: StepId[];
  dismissed: boolean;
  complete: (id: StepId) => void;
  dismiss: () => void;
  reset: () => void;
}

export function useOnboarding(): Onboarding {
  const [done, setDone] = useState<StepId[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [raw, rawDismiss] = await Promise.all([
          AsyncStorage.getItem(KEY),
          AsyncStorage.getItem(DISMISS_KEY),
        ]);
        if (raw) setDone(JSON.parse(raw) as StepId[]);
        setDismissed(rawDismiss === '1');
      } catch {
        /* storage unavailable — onboarding simply stays at defaults */
      }
    })();
  }, []);

  const complete = useCallback((id: StepId) => {
    setDone((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    void AsyncStorage.setItem(DISMISS_KEY, '1').catch(() => undefined);
  }, []);

  const reset = useCallback(() => {
    setDone([]);
    setDismissed(false);
    void AsyncStorage.multiRemove([KEY, DISMISS_KEY]).catch(() => undefined);
  }, []);

  return { done, dismissed, complete, dismiss, reset };
}
