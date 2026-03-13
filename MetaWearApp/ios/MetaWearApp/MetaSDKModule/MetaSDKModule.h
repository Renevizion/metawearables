/**
 * MetaSDKModule.h
 *
 * Native iOS module that bridges the Meta MWDAT SDK to React Native.
 *
 * To integrate the real Meta MWDAT SDK:
 *  1. Add the MWDAT .xcframework (or CocoaPods pod) to the Xcode project.
 *  2. Import MWDAT headers here and in the .mm implementation file.
 *  3. Replace the stub method bodies in MetaSDKModule.mm with real SDK calls.
 *  4. Forward SDK delegate callbacks to the JS event emitter using
 *     `sendEventWithName:body:`.
 *
 * All three JS event names defined in src/native/MetaSDKModule.ts must match
 * the string constants in this file:
 *   MetaSDK_ConnectionState
 *   MetaSDK_GlassesEvent
 *   MetaSDK_MediaCaptured
 */

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

NS_ASSUME_NONNULL_BEGIN

@interface MetaSDKModule : RCTEventEmitter <RCTBridgeModule>

/** Scan for nearby Ray-Ban Meta glasses and attempt BLE connection. */
- (void)connectGlasses;

/** Gracefully disconnect from the currently paired glasses. */
- (void)disconnectGlasses;

@end

NS_ASSUME_NONNULL_END
