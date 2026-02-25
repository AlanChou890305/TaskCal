import React, { useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from "react-native";

const isIOS26Plus = Platform.OS === "ios" && parseInt(Platform.Version, 10) >= 26;
import { useNavigation } from "@react-navigation/native";
import Svg, { Line } from "react-native-svg";
import { LanguageContext, ThemeContext } from "../contexts";
import Section from "../components/Section";

function TermsScreen() {
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const navigation = useNavigation();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}
      accessibilityViewIsModal={true}
      accessibilityLabel="Terms of Use Screen"
    >
      {/* Custom Header with Back Chevron, Title and Date (non-iOS 26 only) */}
      {!isIOS26Plus && (
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
                {t.termsTitle}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: theme.textSecondary,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                {t.termsLastUpdated} {new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
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
            title={t.termsAcceptance}
            content={t.termsAcceptanceText}
            theme={theme}
            isFirst={true}
          />

          <Section
            title={t.termsDescription}
            content={t.termsDescriptionText}
            theme={theme}
          />

          <Section
            title={t.termsAccounts}
            content={t.termsAccountsText}
            theme={theme}
          />

          <Section
            title={t.termsContent}
            content={t.termsContentText}
            theme={theme}
          />

          <Section
            title={t.termsAcceptableUse}
            content={t.termsAcceptableUseText}
            theme={theme}
          />

          <Section
            title={t.termsPrivacy}
            content={t.termsPrivacyText}
            theme={theme}
          />

          <Section
            title={t.termsAvailability}
            content={t.termsAvailabilityText}
            theme={theme}
          />

          <Section
            title={t.termsLiability}
            content={t.termsLiabilityText}
            theme={theme}
          />

          <Section
            title={t.termsChanges}
            content={t.termsChangesText}
            theme={theme}
          />

          <Section
            title={t.termsContact}
            content={t.termsContactText}
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
          {t.termsAcknowledgment}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default TermsScreen;
