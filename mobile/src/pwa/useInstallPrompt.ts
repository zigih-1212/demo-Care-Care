/**
 * PWA install plumbing for the web build.
 *
 * Two responsibilities, both web-only and both no-ops on native:
 *   1. Register the service worker (makes the app installable + offline-capable).
 *   2. Capture the browser's `beforeinstallprompt` event so we can offer our own
 *      "Install" button in the UI instead of relying on the user finding the
 *      address-bar icon.
 *
 * The `beforeinstallprompt` event is Chromium-only and fires once; we stash it
 * and expose `promptInstall()`. When it has not fired (iOS Safari, desktop
 * Firefox, or already installed) `canInstall` is false and the UI falls back to
 * instructions. `isStandalone` tells the UI whether we are already running as an
 * installed app.
 */
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const isWeb = Platform.OS === 'web';

let deferredPrompt: InstallPromptEvent | null = null;
let swRegistered = false;

export function registerServiceWorker(): void {
  if (!isWeb || swRegistered) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  swRegistered = true;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // A failed SW registration must never break the app; it only costs
      // installability/offline support.
    });
  });
}

export function isStandalone(): boolean {
  if (!isWeb || typeof window === 'undefined') return false;
  const mm = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  // iOS Safari predates display-mode and uses a non-standard flag.
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return mm || iosStandalone;
}

export interface InstallPrompt {
  canInstall: boolean;
  installed: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export function useInstallPrompt(): InstallPrompt {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredPrompt = event as InstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      deferredPrompt = null;
      setCanInstall(false);
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable' as const;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    setCanInstall(false);
    return outcome;
  }, []);

  const ua = isWeb && typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return {
    canInstall,
    installed,
    isIOS: /iPad|iPhone|iPod/.test(ua),
    isAndroid: /Android/.test(ua),
    promptInstall,
  };
}
