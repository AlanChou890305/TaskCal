#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(LiquidGlassFABViewManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(onPress, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, UIColor)
@end
