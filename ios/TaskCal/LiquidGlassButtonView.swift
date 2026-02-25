import UIKit
import React

@available(iOS 26.0, *)
class LiquidGlassButtonView: UIView {
    @objc var onPress: RCTBubblingEventBlock?

    @objc var buttonIcon: String = "" {
        didSet { updateButtonConfig() }
    }

    @objc var buttonLabel: String = "" {
        didSet { updateButtonConfig() }
    }

    @objc var primaryColor: UIColor = .label {
        didSet { updateButtonConfig() }
    }

    private let glassView: UIVisualEffectView
    private let button: UIButton

    override init(frame: CGRect) {
        glassView = UIVisualEffectView(effect: UIGlassEffect())
        button = UIButton(configuration: .plain())
        super.init(frame: frame)
        glassView.clipsToBounds = true
        addSubview(glassView)
        glassView.contentView.addSubview(button)
        button.addTarget(self, action: #selector(tapped), for: .touchUpInside)
    }

    required init?(coder: NSCoder) { fatalError() }

    private func updateButtonConfig() {
        var config = UIButton.Configuration.plain()
        if !buttonIcon.isEmpty {
            let symbolConfig = UIImage.SymbolConfiguration(pointSize: 17, weight: .medium)
            config.image = UIImage(systemName: buttonIcon, withConfiguration: symbolConfig)
        }
        if !buttonLabel.isEmpty {
            config.title = buttonLabel
            config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
                var outgoing = incoming
                outgoing.font = UIFont.systemFont(ofSize: 15, weight: .semibold)
                return outgoing
            }
        }
        config.baseForegroundColor = primaryColor
        button.configuration = config
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        glassView.frame = bounds
        glassView.layer.cornerRadius = bounds.height / 2
        button.frame = glassView.contentView.bounds
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOpacity = 0.12
        layer.shadowRadius = 8
        layer.shadowOffset = CGSize(width: 0, height: 2)
    }

    @objc private func tapped() { onPress?([:]) }
}
