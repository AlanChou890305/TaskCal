import React, { useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LanguageContext, ThemeContext } from "../contexts";
import LiquidGlassButton from "../components/LiquidGlassButton";

const isIOS26Plus = Platform.OS === "ios" && parseInt(Platform.Version, 10) >= 26;

function SupportScreen() {
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}
      accessibilityViewIsModal={true}
      accessibilityLabel="Support Screen"
    >
      {isIOS26Plus && (
        <LiquidGlassButton
          style={{ position: "absolute", top: insets.top + 12, left: 16, width: 44, height: 44, zIndex: 10 }}
          buttonIcon="chevron.left"
          primaryColor={theme.text}
          onPress={() => navigation.goBack()}
        />
      )}
      <View
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: 40,
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
