/**
 * AppDelegate.mm
 */

#import "AppDelegate.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  self.moduleName = @"MetaWearApp";
  // Default props passed to the root React component.
  self.initialProps = @{};
  return [super application:application
      didFinishLaunchingWithOptions:launchOptions];
}

@end
