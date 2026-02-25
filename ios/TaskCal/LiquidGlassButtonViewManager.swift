import UIKit
import React

@objc(LiquidGlassButtonViewManager)
class LiquidGlassButtonViewManager: RCTViewManager {
    override func view() -> UIView! {
        if #available(iOS 26.0, *) {
            return LiquidGlassButtonView()
        }
        return UIView()
    }
    override static func requiresMainQueueSetup() -> Bool { return true }
}
