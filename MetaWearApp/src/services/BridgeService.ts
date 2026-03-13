/**
 * BridgeService
 *
 * Handles all network communication with the Python backend:
 *  - POST JSON events to /event
 *  - POST binary media (ArrayBuffer / Uint8Array) to /media
 *    with a JSON summary in the X-Media-Metadata request header
 *  - Poll GET /response every POLL_INTERVAL_MS milliseconds
 *
 * This service is intentionally UI-agnostic so that native SDK
 * callbacks can drive it without touching React state directly.
 * Callers subscribe via the listener callbacks below.
 */

export interface MediaMetadata {
  mediaType: 'photo' | 'video' | 'audio';
  /** ISO-8601 timestamp produced by the glasses */
  capturedAt: string;
  /** Extra key/value pairs forwarded from the SDK */
  [key: string]: unknown;
}

export interface BackendResponse {
  /** Raw JSON body returned by GET /response */
  [key: string]: unknown;
}

export type ResponseListener = (response: BackendResponse) => void;
export type ErrorListener = (error: Error) => void;
export type PollStatusListener = (active: boolean) => void;

const POLL_INTERVAL_MS = 2_000;

class BridgeService {
  private baseUrl: string = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private responseListeners: Set<ResponseListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private pollStatusListeners: Set<PollStatusListener> = new Set();

  // ─── Configuration ────────────────────────────────────────────────────────

  /** Must be called before any network operations. */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, ''); // strip trailing slash
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // ─── Listener management ──────────────────────────────────────────────────

  onResponse(listener: ResponseListener): () => void {
    this.responseListeners.add(listener);
    return () => this.responseListeners.delete(listener);
  }

  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  onPollStatus(listener: PollStatusListener): () => void {
    this.pollStatusListeners.add(listener);
    return () => this.pollStatusListeners.delete(listener);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * POST a JSON event to /event.
   * Intended to be called from native SDK callbacks.
   */
  async postEvent(event: Record<string, unknown>): Promise<void> {
    await this.post('/event', JSON.stringify(event), 'application/json');
  }

  /**
   * POST binary media to /media.
   * Metadata is serialised as JSON in the X-Media-Metadata header.
   * Intended to be called from native SDK callbacks.
   */
  async postMedia(
    data: Uint8Array,
    metadata: MediaMetadata,
  ): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'X-Media-Metadata': JSON.stringify(metadata),
    };
    await this.fetchWithHeaders('/media', {
      method: 'POST',
      headers,
      body: data,
    });
  }

  /** Start polling GET /response every POLL_INTERVAL_MS milliseconds. */
  startPolling(): void {
    if (this.pollTimer !== null) {
      return; // already polling
    }
    this.pollTimer = setInterval(() => this.pollOnce(), POLL_INTERVAL_MS);
    this.notifyPollStatus(true);
  }

  /** Stop the polling loop. */
  stopPolling(): void {
    if (this.pollTimer === null) {
      return;
    }
    clearInterval(this.pollTimer);
    this.pollTimer = null;
    this.notifyPollStatus(false);
  }

  get isPolling(): boolean {
    return this.pollTimer !== null;
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  private async pollOnce(): Promise<void> {
    try {
      const response = await this.fetchWithHeaders('/response', {
        method: 'GET',
      });
      const body: BackendResponse = await response.json();
      this.notifyResponse(body);
    } catch (err) {
      this.notifyError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private async post(
    path: string,
    body: string,
    contentType: string,
  ): Promise<void> {
    try {
      await this.fetchWithHeaders(path, {
        method: 'POST',
        headers: {'Content-Type': contentType},
        body,
      });
    } catch (err) {
      this.notifyError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  private fetchWithHeaders(
    path: string,
    init: RequestInit,
  ): Promise<Response> {
    if (!this.baseUrl) {
      return Promise.reject(new Error('BridgeService: baseUrl is not set'));
    }
    const url = `${this.baseUrl}${path}`;
    return fetch(url, init);
  }

  private notifyResponse(response: BackendResponse): void {
    this.responseListeners.forEach(l => l(response));
  }

  private notifyError(error: Error): void {
    this.errorListeners.forEach(l => l(error));
  }

  private notifyPollStatus(active: boolean): void {
    this.pollStatusListeners.forEach(l => l(active));
  }
}

/** Singleton instance shared across the application. */
export const bridgeService = new BridgeService();
export default BridgeService;
