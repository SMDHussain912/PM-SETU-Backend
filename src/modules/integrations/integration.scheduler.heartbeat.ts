export interface LeaseHeartbeatOptions {
  renew: () => Promise<boolean>;
  intervalMs: number;
  onLost: () => void;
  onError: () => void;
}

/**
 * Serializes lease renewals and makes stop() wait for an in-flight renewal.
 * Call stop() before releasing the corresponding claim token.
 */
export function createLeaseHeartbeat(options: LeaseHeartbeatOptions) {
  let timer: ReturnType<typeof setInterval> | undefined;
  let renewal: Promise<void> | undefined;
  let leaseLost = false;
  let stopped = true;

  async function renew(): Promise<void> {
    if (stopped || leaseLost || renewal) return;
    renewal = Promise.resolve()
      .then(options.renew)
      .then((renewed) => {
        if (!renewed) {
          leaseLost = true;
          options.onLost();
        }
      })
      .catch(() => {
        leaseLost = true;
        options.onError();
      })
      .finally(() => {
        renewal = undefined;
      });
    await renewal;
  }

  return {
    start(): void {
      if (timer) return;
      timer = setInterval(() => { void renew(); }, options.intervalMs);
      timer.unref?.();
    },
    pulse: renew,
    async stop(): Promise<void> {
      if (timer) clearInterval(timer);
      timer = undefined;
      await renewal;
    },
    get leaseLost(): boolean {
      return leaseLost;
    },
  };
}
