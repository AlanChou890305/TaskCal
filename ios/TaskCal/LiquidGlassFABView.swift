import UIKit
import React

@available(iOS 26.0, *)
class LiquidGlassFABView: UIView {
    @objc var onPress: RCTBubblingEventBlock?
    @objc var primaryColor: UIColor = .systemIndigo {
        didSet {
            button.tintColor = primaryColor
            var config = button.configuration
            config?.baseForegroundColor = primaryColor
            button.configuration = config
        }
    }

    private let glassView: UIVisualEffectView
    private let button: UIButton

    override init(frame: CGRect) {
        glassView = UIVisualEffectView(effect: UIGlassEffect())
        let config = UIImage.SymbolConfiguration(pointSize: 22, weight: .semibold)
        var btnConfig = UIButton.Configuration.plain()
        btnConfig.image = UIImage(systemName: "plus", withConfiguration: config)
        button = UIButton(configuration: btnConfig)
        super.init(frame: frame)
        glassView.clipsToBounds = true
        addSubview(glassView)
        glassView.contentView.addSubview(button)
        button.addTarget(self, action: #selector(tapped), for: .touchUpInside)
    }

    required init?(coder: NSCoder) { fatalError() }

    override func layoutSubviews() {
        super.layoutSubviews()
        glassView.frame = bounds
        glassView.layer.cornerRadius = bounds.width / 2
        button.frame = glassView.contentView.bounds
        button.tintColor = primaryColor
        var config = button.configuration
        config?.baseForegroundColor = primaryColor
        button.configuration = config
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOpacity = 0.18
        layer.shadowRadius = 10
        layer.shadowOffset = CGSize(width: 0, height: 3)
    }

    @objc private func tapped() { onPress?([:]) }
}
