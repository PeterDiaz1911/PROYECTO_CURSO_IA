const MAX_FAILURES = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

type AttemptState = { failures: number; lockedUntil?: number };
const attempts = new Map<string, AttemptState>();

export function isIpLocked(ip: string): boolean {
  const state = attempts.get(ip);
  if (!state?.lockedUntil) return false;
  if (Date.now() >= state.lockedUntil) {
    attempts.delete(ip);
    return false;
  }
  return true;
}

export function registerLoginFailure(ip: string): void {
  const state = attempts.get(ip) ?? { failures: 0 };
  state.failures += 1;
  if (state.failures >= MAX_FAILURES) state.lockedUntil = Date.now() + LOCK_DURATION_MS;
  attempts.set(ip, state);
}

export function clearLoginFailures(ip: string): void {
  attempts.delete(ip);
}
