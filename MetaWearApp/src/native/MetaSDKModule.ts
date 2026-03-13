/**
 * MetaSDKModule
 *
 * JavaScript wrapper around the native iOS MetaSDKModule (NativeModule).
 * The native side is implemented in:
 *   ios/MetaWearApp/MetaSDKModule/MetaSDKModule.h
 *   ios/MetaWearApp/MetaSDKModule/MetaSDKModule.mm
 *
 * The native module fires DeviceEventEmitter events that are relayed here.
 * Native callbacks then call bridgeService.postEvent / postMedia so that
 * all network logic stays in BridgeService.
 */

import {NativeModules, NativeEventEmitter, Platform} from 'react-native';
import {bridgeService, MediaMetadata} from '../services/BridgeService';

const LINKING_ERROR =
  `The package 'MetaSDKModule' doesn't seem to be linked. Make sure to ` +
  `run 'pod install' in the ios/ directory and rebuild the app.\n\n`;

// Lazily resolved so that missing native module only throws at call time.
const MetaSDKNative = Platform.OS === 'ios'
  ? NativeModules.MetaSDKModule ?? new Proxy(
      {},
      {get: () => { throw new Error(LINKING_ERROR); }},
    )
  : null;

const emitter =
  Platform.OS === 'ios' && NativeModules.MetaSDKModule
    ? new NativeEventEmitter(NativeModules.MetaSDKModule)
    : null;

// ─── Event names (must match the native ObjC/Swift constants) ─────────────

export const META_SDK_EVENTS = {
  /** Fired when glasses connection state changes */
  CONNECTION_STATE: 'MetaSDK_ConnectionState',
  /** Fired for telemetry / interaction events from glasses */
  GLASSES_EVENT: 'MetaSDK_GlassesEvent',
  /** Fired when the glasses capture media; payload contains base64 data */
  MEDIA_CAPTURED: 'MetaSDK_MediaCaptured',
} as const;

// ─── Native-to-JS event subscriptions ─────────────────────────────────────

let subscriptionsActive = false;

/**
 * Start listening to native Meta SDK events and relay them to BridgeService.
 * Call once after the app mounts.
 */
export function startMetaSDKListeners(): void {
  if (!emitter || subscriptionsActive) {
    return;
  }
  subscriptionsActive = true;

  emitter.addListener(META_SDK_EVENTS.GLASSES_EVENT, (event: Record<string, unknown>) => {
    bridgeService.postEvent(event).catch(() => {
      // errors already surfaced via bridgeService.onError listeners
    });
  });

  emitter.addListener(
    META_SDK_EVENTS.MEDIA_CAPTURED,
    (payload: {data: string; metadata: MediaMetadata}) => {
      try {
        const binary = Uint8Array.from(atob(payload.data), c =>
          c.charCodeAt(0),
        );
        bridgeService.postMedia(binary, payload.metadata).catch(() => {});
      } catch {
        // malformed base64 – ignore
      }
    },
  );
}

// ─── Imperative native commands ───────────────────────────────────────────

/** Scan for nearby Ray-Ban Meta glasses and attempt connection. */
export function connectGlasses(): void {
  if (Platform.OS !== 'ios') {
    return;
  }
  MetaSDKNative.connectGlasses();
}

/** Disconnect from currently paired glasses. */
export function disconnectGlasses(): void {
  if (Platform.OS !== 'ios') {
    return;
  }
  MetaSDKNative.disconnectGlasses();
}

/** Expose the raw native module for advanced SDK calls not wrapped here. */
export {MetaSDKNative};
