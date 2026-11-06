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
  let ownershipUncertain = false;
  let stopped = true;

  async function renew(): Promise<void> {
    if (stopped || ownershipUncertain || renewal) return;
    renewal = Promise.resolve()
      .then(options.renew)
      .then((renewed) => {
        if (!renewed) {
          leaseLost = true;
          ownershipUncertain = true;
          options.onLost();
        }
      })
      .catch(() => {
        ownershipUncertain = true;
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
      stopped = false;
      timer = setInterval(() => { void renew(); }, options.intervalMs);
      timer.unref?.();
    },
    pulse: renew,
    async stop(): Promise<void> {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = undefined;
      await renewal;
    },
    get leaseLost(): boolean {
      return leaseLost;
    },
    /** True when ownership was rejected or a renewal error made it unverified. */
    get ownershipUncertain(): boolean {
      return ownershipUncertain;
    },
  };
}
