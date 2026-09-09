/**
 * Robust JSON fetcher with content-type checking, status validation, and graceful fallback.
 * Prevents "Unexpected token '<', '<!doctype '... is not valid JSON" errors when
 * the backend is booting up, restarting, or returning an HTML error page.
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit,
  fallbackValue: T | null = null
): Promise<{ ok: boolean; data: T | null; status: number; error?: string }> {
  try {
    const res = await fetch(url, options);
    
    // Check if the response is JSON
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Returned HTML or non-JSON (e.g. during server reload or proxy fallback)
      return {
        ok: false,
        data: fallbackValue,
        status: res.status,
        error: `Expected JSON response but received ${contentType || 'non-JSON content'}`,
      };
    }

    if (!res.ok) {
      try {
        const errorJson = await res.json();
        return {
          ok: false,
          data: fallbackValue,
          status: res.status,
          error: errorJson.message || errorJson.error || `HTTP ${res.status}`,
        };
      } catch {
        return {
          ok: false,
          data: fallbackValue,
          status: res.status,
          error: `HTTP ${res.status}`,
        };
      }
    }

    const data = (await res.json()) as T;
    return {
      ok: true,
      data,
      status: res.status,
    };
  } catch (err: any) {
    // Network error or aborted fetch
    return {
      ok: false,
      data: fallbackValue,
      status: 0,
      error: err?.message || 'Network fetch failed',
    };
  }
}
