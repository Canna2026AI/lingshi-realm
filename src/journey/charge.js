import { holdProgress } from './timeline.js';
// One press produces one transition. Releasing or losing focus cancels the press.
export function createCharge() {
  let startedAt = null;
  return {
    begin(now) { if (startedAt !== null) return false; startedAt = now; return true; },
    cancel() { startedAt = null; },
    sample(now) {
      if (startedAt === null) return { progress: 0, completed: false };
      const progress = holdProgress(now - startedAt);
      const completed = progress >= 1;
      if (completed) startedAt = null;
      return { progress, completed };
    },
  };
}
