/**
 * MetaSDKModule.mm
 *
 * Stub implementation of the Meta MWDAT iOS native module.
 *
 * All methods are safe no-ops until the real Meta MWDAT SDK is integrated.
 * Replace the TODO sections with real SDK calls once the SDK is available.
 *
 * Event emission follows the RCTEventEmitter pattern; JavaScript listeners
 * are registered in src/native/MetaSDKModule.ts using NativeEventEmitter.
 */

#import "MetaSDKModule.h"

// ── Event name constants ─────────────────────────────────────────────────────
// Must match META_SDK_EVENTS in src/native/MetaSDKModule.ts
static NSString *const kConnectionStateEvent = @"MetaSDK_ConnectionState";
static NSString *const kGlassesEvent         = @"MetaSDK_GlassesEvent";
static NSString *const kMediaCapturedEvent   = @"MetaSDK_MediaCaptured";

@implementation MetaSDKModule

// ── RCTBridgeModule ───────────────────────────────────────────────────────────

RCT_EXPORT_MODULE()

// ── RCTEventEmitter ───────────────────────────────────────────────────────────

- (NSArray<NSString *> *)supportedEvents {
  return @[
    kConnectionStateEvent,
    kGlassesEvent,
    kMediaCapturedEvent,
  ];
}

// Required to prevent warning when no JS listeners are registered yet.
+ (BOOL)requiresMainQueueSetup {
  return NO;
}

// ── Exported methods ─────────────────────────────────────────────────────────

RCT_EXPORT_METHOD(connectGlasses) {
  // TODO: Replace with real Meta MWDAT SDK initialisation and scan call.
  //
  // Example (pseudo-code):
  //   [[MWDATManager sharedManager] startScan:^(MWDATDevice *device) {
  //     [[MWDATManager sharedManager] connectDevice:device];
  //   }];
  //
  // On connection success fire kConnectionStateEvent:
  //   [self sendEventWithName:kConnectionStateEvent
  //                     body:@{@"connected": @YES, @"deviceName": device.name}];

  NSLog(@"[MetaSDKModule] connectGlasses called (stub)");
  [self sendEventWithName:kConnectionStateEvent
                    body:@{@"connected": @YES, @"deviceName": @"stub-device"}];
}

RCT_EXPORT_METHOD(disconnectGlasses) {
  // TODO: Replace with real Meta MWDAT SDK disconnect call.
  //
  // Example (pseudo-code):
  //   [[MWDATManager sharedManager] disconnectCurrentDevice];

  NSLog(@"[MetaSDKModule] disconnectGlasses called (stub)");
  [self sendEventWithName:kConnectionStateEvent
                    body:@{@"connected": @NO, @"deviceName": [NSNull null]}];
}

// ── SDK delegate forwarding ───────────────────────────────────────────────────
//
// When the real SDK is integrated, implement the MWDAT delegate protocol and
// call these helper methods from the delegate callbacks.
//
// - (void)forwardGlassesEvent:(NSDictionary *)eventPayload {
//     [self sendEventWithName:kGlassesEvent body:eventPayload];
// }
//
// - (void)forwardMediaCapture:(NSData *)mediaData
//                    metadata:(NSDictionary *)metadata {
//     NSString *base64 = [mediaData base64EncodedStringWithOptions:0];
//     [self sendEventWithName:kMediaCapturedEvent
//                       body:@{@"data": base64, @"metadata": metadata}];
// }

@end
