import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Appearance,
  Platform,
} from "react-native";

// 最外層錯誤邊界：把「某個畫面 render 失敗 → 整個 app 白屏」收斂成可恢復的錯誤畫面。
// 刻意不依賴任何 Context（ThemeContext / LanguageContext），因為錯誤可能發生在
// 這些 Provider 建立之前；樣式與文字都用 self-contained 的固定值。
//
// onError prop 預留給之後接 crash 監控（Sentry / Crashlytics）使用：
//   <ErrorBoundary onError={(error, info) => Sentry.captureException(error)} />

const COPY = {
  en: {
    title: "Something went wrong",
    message: "The app ran into an unexpected error. You can try again.",
    retry: "Try again",
  },
  "zh-Hant": {
    title: "發生了一些問題",
    message: "App 遇到非預期的錯誤，你可以再試一次。",
    retry: "再試一次",
  },
  es: {
    title: "Algo salió mal",
    message: "La app encontró un error inesperado. Puedes intentarlo de nuevo.",
    retry: "Intentar de nuevo",
  },
};

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 一律 log，方便 Xcode Organizer / console 追蹤
    console.error("[ErrorBoundary]", error, errorInfo?.componentStack);
    // 預留 crash 監控掛點
    if (typeof this.props.onError === "function") {
      try {
        this.props.onError(error, errorInfo);
      } catch (e) {
        // 監控本身出錯不能再次拖垮 app
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const language = this.props.language || "en";
    const copy = COPY[language] || COPY.en;

    const isDark = Appearance.getColorScheme() === "dark";
    const bg = isDark ? "#14182A" : "#F2F1EB";
    const fg = isDark ? "#F2F1EB" : "#14182A";
    const accent = isDark ? "#8B98D0" : "#3B4B7A";
    const onAccent = isDark ? "#14182A" : "#F2F1EB";
    const subtle = isDark ? "rgba(242,241,235,0.7)" : "rgba(20,24,42,0.7)";

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: fg,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          {copy.title}
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: subtle,
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 28,
          }}
        >
          {copy.message}
        </Text>
        <TouchableOpacity
          onPress={this.handleRetry}
          activeOpacity={0.85}
          style={{
            backgroundColor: accent,
            paddingVertical: 14,
            paddingHorizontal: 40,
            borderRadius: 14,
          }}
        >
          <Text style={{ color: onAccent, fontSize: 16, fontWeight: "600" }}>
            {copy.retry}
          </Text>
        </TouchableOpacity>

        {__DEV__ && this.state.error ? (
          <Text
            style={{
              marginTop: 24,
              fontSize: 12,
              color: subtle,
              fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
              textAlign: "center",
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </Text>
        ) : null}
      </View>
    );
  }
}
