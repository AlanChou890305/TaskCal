#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(LiquidGlassButtonViewManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(onPress, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(buttonIcon, NSString)
RCT_EXPORT_VIEW_PROPERTY(buttonLabel, NSString)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, UIColor)
@end
