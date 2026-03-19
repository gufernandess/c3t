import cron from 'node-cron';
import { env } from '../config/env.js';
import { QuotesProvider } from '../services/quotes-provider.js';

const provider = new QuotesProvider();

export function startQuotesRefreshWorker(): void {
  cron.schedule(env.QUOTE_REFRESH_CRON, async () => {
    const startedAt = Date.now();

    try {
      const result = await provider.refreshTrackedQueries();
      const elapsedMs = Date.now() - startedAt;
      console.log(
        `[quotes-worker] refresh done: refreshed=${result.refreshed} failed=${result.failed} elapsedMs=${elapsedMs}`,
      );
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      console.error(`[quotes-worker] refresh failed elapsedMs=${elapsedMs}`, error);
    }
  });
}
