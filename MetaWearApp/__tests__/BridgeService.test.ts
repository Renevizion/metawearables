/**
 * BridgeService.test.ts
 *
 * Unit tests for BridgeService.  Uses Jest fake timers and a global fetch mock
 * so the tests run without a real network or React Native runtime.
 */

import BridgeService, {
  MediaMetadata,
  BackendResponse,
} from '../src/services/BridgeService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockFetch(
  responseBody: unknown = {},
  ok = true,
  status = 200,
): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(responseBody),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BridgeService', () => {
  let service: BridgeService;

  beforeEach(() => {
    // Create a fresh instance for each test so state doesn't leak.
    service = new BridgeService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    service.stopPolling();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ── setBaseUrl / getBaseUrl ────────────────────────────────────────────────

  it('stores the base URL and strips a trailing slash', () => {
    service.setBaseUrl('https://example.com/');
    expect(service.getBaseUrl()).toBe('https://example.com');
  });

  it('stores the base URL unchanged when no trailing slash', () => {
    service.setBaseUrl('https://example.com');
    expect(service.getBaseUrl()).toBe('https://example.com');
  });

  // ── postEvent ─────────────────────────────────────────────────────────────

  it('POST /event with JSON content-type', async () => {
    const mockFetch = makeMockFetch();
    global.fetch = mockFetch;

    service.setBaseUrl('https://example.com');
    await service.postEvent({type: 'tap', ts: 1});

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.com/event');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
    expect(init.body).toBe(JSON.stringify({type: 'tap', ts: 1}));
  });

  it('notifies error listeners when postEvent fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));
    service.setBaseUrl('https://example.com');

    const errors: Error[] = [];
    service.onError(e => errors.push(e));

    await expect(service.postEvent({})).rejects.toThrow('network');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('network');
  });

  // ── postMedia ─────────────────────────────────────────────────────────────

  it('POST /media with octet-stream and X-Media-Metadata header', async () => {
    const mockFetch = makeMockFetch();
    global.fetch = mockFetch;

    service.setBaseUrl('https://example.com');
    const data = new Uint8Array([0x01, 0x02, 0x03]);
    const metadata: MediaMetadata = {
      mediaType: 'photo',
      capturedAt: '2024-01-01T00:00:00.000Z',
    };
    await service.postMedia(data, metadata);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.com/media');
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/octet-stream');
    expect(JSON.parse(headers['X-Media-Metadata'])).toEqual(metadata);
  });

  // ── polling ───────────────────────────────────────────────────────────────

  it('starts and stops polling', () => {
    global.fetch = makeMockFetch({msg: 'ok'});
    service.setBaseUrl('https://example.com');

    expect(service.isPolling).toBe(false);
    service.startPolling();
    expect(service.isPolling).toBe(true);
    service.stopPolling();
    expect(service.isPolling).toBe(false);
  });

  it('calling startPolling twice does not create two timers', () => {
    global.fetch = makeMockFetch({msg: 'ok'});
    service.setBaseUrl('https://example.com');

    service.startPolling();
    service.startPolling(); // second call should be a no-op
    expect(service.isPolling).toBe(true);

    // Advance 2 s → should only trigger one poll, not two
    jest.advanceTimersByTime(2_000);
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1);

    service.stopPolling();
  });

  it('fires response listeners on each successful poll', async () => {
    const body: BackendResponse = {command: 'speak', text: 'hello'};
    global.fetch = makeMockFetch(body);
    service.setBaseUrl('https://example.com');

    const responses: BackendResponse[] = [];
    service.onResponse(r => responses.push(r));

    service.startPolling();
    jest.advanceTimersByTime(2_000);
    // Allow the async microtask queue to drain
    await Promise.resolve();
    await Promise.resolve();

    expect(responses).toHaveLength(1);
    expect(responses[0]).toEqual(body);
  });

  it('fires error listeners on failed poll', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));
    service.setBaseUrl('https://example.com');

    const errors: Error[] = [];
    service.onError(e => errors.push(e));

    service.startPolling();
    jest.advanceTimersByTime(2_000);
    await Promise.resolve();
    await Promise.resolve();

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('timeout');
  });

  it('fires pollStatus listener on start and stop', () => {
    global.fetch = makeMockFetch({});
    service.setBaseUrl('https://example.com');

    const statuses: boolean[] = [];
    service.onPollStatus(s => statuses.push(s));

    service.startPolling();
    service.stopPolling();

    expect(statuses).toEqual([true, false]);
  });

  // ── listener unsubscribe ───────────────────────────────────────────────────

  it('unsubscribes response listener after calling returned cleanup fn', async () => {
    const body: BackendResponse = {x: 1};
    global.fetch = makeMockFetch(body);
    service.setBaseUrl('https://example.com');

    const received: BackendResponse[] = [];
    const unsubscribe = service.onResponse(r => received.push(r));
    unsubscribe();

    service.startPolling();
    jest.advanceTimersByTime(2_000);
    await Promise.resolve();
    await Promise.resolve();

    expect(received).toHaveLength(0);
    service.stopPolling();
  });

  // ── missing baseUrl ────────────────────────────────────────────────────────

  it('rejects with a descriptive error when baseUrl is not set', async () => {
    await expect(service.postEvent({})).rejects.toThrow(
      'BridgeService: baseUrl is not set',
    );
  });
});
