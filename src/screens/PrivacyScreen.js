import React, { useContext } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LanguageContext, ThemeContext } from "../contexts";
import SheetNav from "../components/SheetNav";
import { useLazyTermsTranslations } from "../hooks/useLazyTermsTranslations";

const NumberedSection = ({ index, title, content, theme, isLast }) => {
  const monoFamily = theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium";
  const sansFamily = theme.typography?.headline?.fontFamily;
  const bodyFamily = theme.typography?.body?.fontFamily;

  return (
    <View
      style={{
        paddingHorizontal: 22,
        paddingTop: 22,
        paddingBottom: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: theme.divider,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <Text
          style={{
            fontFamily: monoFamily,
            fontSize: 11,
            fontWeight: "500",
            letterSpacing: 1.5,
            color: theme.primary,
          }}
        >
          {String(index).padStart(2, "0")}
        </Text>
        <Text
          style={{
            fontFamily: sansFamily,
            fontSize: 16,
            fontWeight: "600",
            letterSpacing: -0.3,
            color: theme.text,
            flex: 1,
          }}
        >
          {title}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: bodyFamily,
          fontSize: 13,
          fontWeight: "400",
          lineHeight: 21,
          letterSpacing: -0.05,
          color: theme.textSecondary,
        }}
      >
        {content}
      </Text>
    </View>
  );
};

function PrivacyScreen() {
  const { t, language } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const handleClose = () => navigation.goBack();
  const privacyT = useLazyTermsTranslations(language);

  const monoFamily = theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium";
  const sansFamily = theme.typography?.title1?.fontFamily;
  const bodyFamily = theme.typography?.body?.fontFamily;

  if (!privacyT) {
    return (
      <SafeAreaView
        edges={[]}
        style={{ flex: 1, backgroundColor: theme.background }}
        accessibilityLabel="Privacy Policy Screen"
      >
        <SheetNav
          title={t.privacy}
          backLabel={t.settingsTitle || "Settings"}
          onBack={handleClose}
          theme={theme}
        />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const sections = [
    { title: privacyT.privacyIntroduction,   content: privacyT.privacyIntroductionText },
    { title: privacyT.privacyInformation,    content: privacyT.privacyAccountInfoText },
    { title: privacyT.privacyUse,            content: privacyT.privacyUseText },
    { title: privacyT.privacyStorage,        content: privacyT.privacyStorageText },
    { title: privacyT.privacySharing,        content: privacyT.privacySharingText },
    { title: privacyT.privacyThirdParty,     content: privacyT.privacyThirdPartyText },
    { title: privacyT.privacyRights,         content: privacyT.privacyRightsText },
    { title: privacyT.privacyRetention,      content: privacyT.privacyRetentionText },
    { title: privacyT.privacyChildren,       content: privacyT.privacyChildrenText },
    { title: privacyT.privacyInternational,  content: privacyT.privacyInternationalText },
    { title: privacyT.privacyChanges,        content: privacyT.privacyChangesText },
    { title: privacyT.privacyContact,        content: privacyT.privacyContactText },
  ];

  return (
    <SafeAreaView
      edges={[]}
      style={{ flex: 1, backgroundColor: theme.background }}
      accessibilityLabel="Privacy Policy Screen"
    >
      <SheetNav
        title={privacyT.privacyTitle}
        backLabel={t.settingsTitle || "Settings"}
        onBack={handleClose}
        theme={theme}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        {/* Hero block */}
        <View
          style={{
            paddingHorizontal: 22,
            paddingTop: 24,
            paddingBottom: 16,
            borderBottomWidth: 2,
            borderBottomColor: theme.ruleStrong || "rgba(26,31,46,0.22)",
          }}
        >
          <Text
            style={{
              fontFamily: monoFamily,
              fontSize: 10,
              fontWeight: "500",
              letterSpacing: 2,
              textTransform: "uppercase",
              color: theme.primary,
              marginBottom: 4,
            }}
          >
            {privacyT.privacyLastUpdated} {new Date().toLocaleDateString()}
          </Text>
          <Text
            style={{
              fontFamily: sansFamily,
              fontSize: 26,
              fontWeight: "600",
              letterSpacing: -0.8,
              lineHeight: 30,
              color: theme.text,
              marginBottom: 10,
            }}
          >
            {privacyT.privacyTitle}
          </Text>
          <Text
            style={{
              fontFamily: bodyFamily,
              fontSize: 13,
              lineHeight: 21,
              letterSpacing: -0.1,
              color: theme.textSecondary,
            }}
          >
            {privacyT.privacyAcknowledgment}
          </Text>
        </View>

        {/* Numbered sections */}
        {sections.map((s, i) => (
          <NumberedSection
            key={i}
            index={i + 1}
            title={s.title}
            content={s.content}
            theme={theme}
            isLast={i === sections.length - 1}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default PrivacyScreen;
