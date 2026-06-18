
type RetryOptions<T> = {
  fn: (signal: AbortSignal) => Promise<T>;
  maxRetries?: number;
  baseDelay?: number;
  timeoutMs?: number;
  operationId?: string;
  onRetry?: (attempt: number, error: any) => void;
  onFail?: (error: any) => void;
  shouldRetry?: (error: any) => boolean;
  silentOnFail?: boolean;
};

const inFlight = new Map<string, AbortController>();

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, controller: AbortController): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      controller.abort();
      reject(new Error("Neural Engine Timeout: Operation exceeded limits"));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timeout);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

function defaultShouldRetry(error: any): boolean {
  const msg = (error?.message || "").toLowerCase();
  const status = error?.status;

  return (
    msg.includes("rpc") ||
    msg.includes("xhr") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota") ||
    status === 429
  );
}

/**
 * Robust Retry Manager for Neural Engine Operations.
 * Handles idempotency, exponential backoff, and graceful cancellation.
 */
export async function retryManager<T>({
  fn,
  maxRetries = 3,
  baseDelay = 1000,
  timeoutMs = 30000,
  operationId = "default-operation",
  onRetry,
  onFail,
  shouldRetry = defaultShouldRetry,
  silentOnFail = false,
}: RetryOptions<T>): Promise<T> {
  // 🔒 Idempotency: cancel previous identical operation if still in flight
  if (inFlight.has(operationId)) {
    console.warn(`[RETRY_MANAGER] Concurrent operation detected for ${operationId}. Aborting previous...`);
    inFlight.get(operationId)?.abort();
    inFlight.delete(operationId);
  }

  const controller = new AbortController();
  inFlight.set(operationId, controller);

  let attempt = 0;

  try {
    while (attempt <= maxRetries) {
      try {
        const result = await withTimeout(
          fn(controller.signal),
          timeoutMs,
          controller
        );

        inFlight.delete(operationId);
        return result;
      } catch (error: any) {
        if (error.name === 'AbortError') {
           throw error; // Don't retry if manually aborted
        }

        if (!shouldRetry(error) || attempt === maxRetries) {
          if (silentOnFail) {
            console.warn(`[RETRY_MANAGER] Non-critical final failure for ${operationId} (suppressed, fallback active):`, error?.message || error);
          } else {
            console.error(`[RETRY_MANAGER] Final failure for ${operationId}:`, error);
          }
          onFail?.(error);
          throw error;
        }

        attempt++;
        onRetry?.(attempt, error);

        // ⚡ Exponential backoff + jitter (prevents thundering herd)
        // If it's a quota error, we use a much more aggressive backoff
        const isQuota = (error?.message || "").toLowerCase().includes("quota") || error?.status === 429 || (error?.message || "").toLowerCase().includes("429");
        const delay = (isQuota ? baseDelay * 5 : baseDelay) * Math.pow(2, attempt) + Math.random() * 500;
        
        console.warn(`[RETRY_MANAGER] Retrying ${operationId} in ${Math.round(delay)}ms... (Attempt ${attempt}/${maxRetries})`);

        await sleep(delay);
      }
    }

    throw new Error("Retry failed unexpectedly");
  } finally {
    inFlight.delete(operationId);
  }
}
