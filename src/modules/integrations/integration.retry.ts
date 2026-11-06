export interface RetryResult<T> {
  value?: T;
  attempts: number;
  exhausted: boolean;
}

/**
 * Retry one adapter operation with bounded exponential backoff.
 * The caller owns the operation closure, so each attempt can reuse the same
 * immutable cursor/since checkpoint context.
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    attempts?: number;
    wait?: (milliseconds: number) => Promise<void>;
    baseDelayMs?: number;
    maxDelayMs?: number;
  } = {},
): Promise<RetryResult<T>> {
  const attempts = options.attempts ?? 4;
  const wait = options.wait ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 8000;

  if (!Number.isInteger(attempts) || attempts < 1) throw new Error("Retry attempts must be a positive integer");

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return { value: await operation(), attempts: attempt, exhausted: false };
    } catch {
      if (attempt === attempts) return { attempts: attempt, exhausted: true };
      await wait(Math.min(baseDelayMs * (2 ** (attempt - 1)), maxDelayMs));
    }
  }

  // The validated positive attempt count makes this unreachable.
  throw new Error("Retry operation ended unexpectedly");
}
