import React, { useContext } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LanguageContext, ThemeContext } from "../contexts";
import SheetNav from "../components/SheetNav";

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

function PrivacyScreen({ onClose }) {
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const handleClose = () => (onClose ? onClose() : navigation.goBack());

  const monoFamily = theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium";
  const sansFamily = theme.typography?.title1?.fontFamily;
  const bodyFamily = theme.typography?.body?.fontFamily;

  const sections = [
    { title: t.privacyIntroduction,   content: t.privacyIntroductionText },
    { title: t.privacyInformation,    content: t.privacyAccountInfoText },
    { title: t.privacyUse,            content: t.privacyUseText },
    { title: t.privacyStorage,        content: t.privacyStorageText },
    { title: t.privacySharing,        content: t.privacySharingText },
    { title: t.privacyThirdParty,     content: t.privacyThirdPartyText },
    { title: t.privacyRights,         content: t.privacyRightsText },
    { title: t.privacyRetention,      content: t.privacyRetentionText },
    { title: t.privacyChildren,       content: t.privacyChildrenText },
    { title: t.privacyInternational,  content: t.privacyInternationalText },
    { title: t.privacyChanges,        content: t.privacyChangesText },
    { title: t.privacyContact,        content: t.privacyContactText },
  ];

  return (
    <SafeAreaView
      edges={[]}
      style={{ flex: 1, backgroundColor: theme.background }}
      accessibilityViewIsModal={true}
      accessibilityLabel="Privacy Policy Screen"
    >
      <SheetNav
        title={t.privacyTitle}
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
            {t.privacyLastUpdated} {new Date().toLocaleDateString()}
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
            {t.privacyTitle}
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
            {t.privacyAcknowledgment}
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
