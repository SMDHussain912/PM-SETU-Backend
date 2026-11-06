/**
 * Coordinates scheduler ticks independently of timers and provider/database work.
 * A stop request prevents new ticks and resolves only after the accepted tick settles.
 */
export function createSchedulerLifecycle(runTick: () => Promise<void>) {
  let stopped = true;
  let activeTick: Promise<void> | undefined;

  return {
    start(): void {
      stopped = false;
    },

    trigger(): void {
      if (stopped || activeTick) return;

      activeTick = Promise.resolve()
        .then(runTick)
        .finally(() => {
          activeTick = undefined;
        });
    },

    async stop(): Promise<void> {
      stopped = true;
      await activeTick;
    },
  };
}
