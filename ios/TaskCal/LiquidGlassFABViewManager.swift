import UIKit
import React

@objc(LiquidGlassFABViewManager)
class LiquidGlassFABViewManager: RCTViewManager {
    override func view() -> UIView! {
        if #available(iOS 26.0, *) {
            return LiquidGlassFABView()
        }
        return UIView()
    }
    override static func requiresMainQueueSetup() -> Bool { return true }
}
