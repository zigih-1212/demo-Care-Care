/**
 * Demo-mode switch.
 *
 * The Cloudflare Pages build ships without a backend, so it runs against the
 * in-browser demo transport. The flag is opt-in via an env var (baked at build
 * time), which keeps production-shaped builds honest: unless the flag is set,
 * the app talks to the real API and nothing is faked.
 */
export function isDemoMode(): boolean {
  return process.env.EXPO_PUBLIC_DEMO === '1';
}
