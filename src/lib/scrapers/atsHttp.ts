export type SupportedAtsProvider = 'greenhouse' | 'lever' | 'ashby' | 'workday';

const MIN_REQUEST_INTERVAL_MS: Record<SupportedAtsProvider, number> = {
  greenhouse: 1_000,
  lever: 1_000,
  ashby: 1_000,
  workday: 2_000,
};
const MAX_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_RETRY_DELAY_MS = 4_000;
const nextAllowedAt = new Map<SupportedAtsProvider, number>();

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response | undefined, attempt: number): number {
  const retryAfter = response?.headers.get('retry-after');
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : Number.NaN;
  const retryAfterDate = retryAfter ? Date.parse(retryAfter) : Number.NaN;
  const requestedDelay = Number.isFinite(retryAfterSeconds)
    ? retryAfterSeconds * 1_000
    : Number.isFinite(retryAfterDate)
      ? retryAfterDate - Date.now()
      : 250 * 2 ** attempt;
  return Math.min(MAX_RETRY_DELAY_MS, Math.max(0, requestedDelay));
}

async function waitForProviderSlot(provider: SupportedAtsProvider): Promise<void> {
  const now = Date.now();
  const requestAt = Math.max(now, nextAllowedAt.get(provider) ?? now);
  nextAllowedAt.set(provider, requestAt + MIN_REQUEST_INTERVAL_MS[provider]);
  await delay(requestAt - now);
}

export async function fetchAtsResponse(
  provider: SupportedAtsProvider,
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await waitForProviderSlot(provider);
    let response: Response;

    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES) break;
      await delay(retryDelay(undefined, attempt));
      continue;
    }

    if (response.ok) return response;
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_RETRIES) {
      throw new Error(`${provider} request failed with HTTP ${response.status}.`);
    }
    lastError = new Error(`${provider} request failed with HTTP ${response.status}.`);
    await delay(retryDelay(response, attempt));
  }

  if (lastError instanceof Error && lastError.name === 'TimeoutError') {
    throw new Error(`${provider} request timed out after ${REQUEST_TIMEOUT_MS} ms.`);
  }
  if (lastError instanceof Error && lastError.name === 'AbortError') {
    throw new Error(`${provider} request was aborted.`);
  }
  throw new Error(
    `${provider} request failed after ${MAX_RETRIES + 1} attempts: ${
      lastError instanceof Error ? lastError.message : 'unknown network error'
    }`
  );
}

export async function parseAtsJson<T>(response: Response, provider: SupportedAtsProvider): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${provider} returned an invalid JSON response.`);
  }
}

export function parsePostedAt(value: string | number | undefined): string {
  if (value === undefined || value === '') return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}
