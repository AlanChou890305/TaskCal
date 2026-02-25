import React, { useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Svg, { Line } from "react-native-svg";
import { LanguageContext, ThemeContext } from "../contexts";
import Section from "../components/Section";
import LiquidGlassButton from "../components/LiquidGlassButton";

const isIOS26Plus = Platform.OS === "ios" && parseInt(Platform.Version, 10) >= 26;

function PrivacyScreen() {
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}
      accessibilityViewIsModal={true}
      accessibilityLabel="Privacy Policy Screen"
    >
      {/* Header */}
      {isIOS26Plus ? null : (
        <View
          style={{
            backgroundColor: theme.backgroundSecondary,
            paddingTop: 8,
            paddingBottom: 16,
            paddingHorizontal: 20,
          }}
        >
          <View style={{ position: "relative" }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                position: "absolute",
                left: -10,
                top: 0,
                padding: 10,
                zIndex: 1,
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Svg width={18} height={28}>
                <Line
                  x1={12}
                  y1={6}
                  x2={4}
                  y2={14}
                  stroke={theme.text}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                />
                <Line
                  x1={4}
                  y1={14}
                  x2={12}
                  y2={22}
                  stroke={theme.text}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                />
              </Svg>
            </TouchableOpacity>
            <View style={{ alignItems: "center", paddingHorizontal: 40 }}>
              <Text
                style={{
                  fontSize: 24,
                  color: theme.text,
                  fontWeight: "bold",
                  letterSpacing: -0.5,
                  textAlign: "center",
                }}
              >
                {t.privacyTitle}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: theme.textSecondary,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                {t.privacyLastUpdated} {new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      )}
      {isIOS26Plus && (
        <LiquidGlassButton
          style={{ position: "absolute", top: insets.top + 12, left: 16, width: 44, height: 44, zIndex: 10 }}
          buttonIcon="chevron.left"
          primaryColor={theme.text}
          onPress={() => navigation.goBack()}
        />
      )}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 48,
        }}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        {isIOS26Plus && (
          <Text style={{ fontSize: 20, fontWeight: "bold", color: theme.text, letterSpacing: -0.3, textAlign: "center", marginBottom: 32 }}>
            {t.privacyTitle}
          </Text>
        )}
        {/* One big card with all sections */}
        <View
          style={{
            backgroundColor: theme.card || theme.backgroundSecondary,
            borderRadius: 12,
            padding: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Section
            title={t.privacyIntroduction}
            content={t.privacyIntroductionText}
            theme={theme}
            isFirst={true}
          />

          <Section
            title={t.privacyInformation}
            content={
              <>
                <Text style={{ fontWeight: "600" }}>{t.privacyAccountInfo}</Text>
                {"\n"}
                {t.privacyAccountInfoText}
              </>
            }
            theme={theme}
          />

          <Section
            title={t.privacyUse}
            content={t.privacyUseText}
            theme={theme}
          />

          <Section
            title={t.privacyStorage}
            content={t.privacyStorageText}
            theme={theme}
          />

          <Section
            title={t.privacySharing}
            content={t.privacySharingText}
            theme={theme}
          />

          <Section
            title={t.privacyThirdParty}
            content={t.privacyThirdPartyText}
            theme={theme}
          />

          <Section
            title={t.privacyRights}
            content={t.privacyRightsText}
            theme={theme}
          />

          <Section
            title={t.privacyRetention}
            content={t.privacyRetentionText}
            theme={theme}
          />

          <Section
            title={t.privacyChildren}
            content={t.privacyChildrenText}
            theme={theme}
          />

          <Section
            title={t.privacyInternational}
            content={t.privacyInternationalText}
            theme={theme}
          />

          <Section
            title={t.privacyChanges}
            content={t.privacyChangesText}
            theme={theme}
          />

          <Section
            title={t.privacyContact}
            content={t.privacyContactText}
            theme={theme}
          />
        </View>

        <Text
          style={{
            fontSize: 14,
            color: theme.textSecondary,
            marginTop: 16,
            lineHeight: 22,
            textAlign: "center",
          }}
        >
          {t.privacyAcknowledgment}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default PrivacyScreen;
