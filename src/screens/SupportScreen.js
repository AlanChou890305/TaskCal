import React, { useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from "react-native";

const isIOS26Plus = Platform.OS === "ios" && parseInt(Platform.Version, 10) >= 26;
import { LanguageContext, ThemeContext } from "../contexts";

function SupportScreen() {
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}
      accessibilityViewIsModal={true}
      accessibilityLabel="Support Screen"
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: isIOS26Plus ? 16 : 40,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 28,
            color: theme.text,
            fontWeight: "bold",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          {t.supportTitle}
        </Text>

        <Text
          style={{
            fontSize: 16,
            color: theme.textSecondary,
            marginBottom: 48,
            textAlign: "center",
            lineHeight: 24,
          }}
        >
          {t.supportIntro}
        </Text>

        {/* GitHub Issues */}
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS === "web") {
              window.open(t.supportGithubUrl, "_blank");
            } else {
              import("expo-web-browser").then((WebBrowser) => {
                WebBrowser.openBrowserAsync(t.supportGithubUrl);
              });
            }
          }}
          style={{
            width: "100%",
            maxWidth: 400,
            paddingVertical: 16,
            paddingHorizontal: 20,
            backgroundColor: theme.primary,
            borderRadius: 12,
            marginBottom: 16,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: "#fff",
              fontWeight: "600",
            }}
          >
            {t.supportGithub}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default SupportScreen;
