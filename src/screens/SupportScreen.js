import React, { useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LanguageContext, ThemeContext } from "../contexts";
import LiquidGlassButton from "../components/LiquidGlassButton";

function SupportScreen() {
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const navigation = useNavigation();

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: theme.modalBackground }}
      accessibilityViewIsModal={true}
      accessibilityLabel="Support Screen"
    >
      {Platform.OS === "ios" && (
        <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.18)" }} />
        </View>
      )}
      <View style={{ height: 52, justifyContent: "center", alignItems: "center" }}>
        <LiquidGlassButton
          style={{ position: "absolute", left: 16, width: 44, height: 44 }}
          buttonIcon="xmark"
          primaryColor={theme.text}
          onPress={() => navigation.goBack()}
        />
        <Text style={{ fontSize: 17, fontWeight: "600", color: theme.text, letterSpacing: -0.3 }}>
          {t.supportTitle}
        </Text>
      </View>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: 20,
          alignItems: "center",
        }}
      >

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
