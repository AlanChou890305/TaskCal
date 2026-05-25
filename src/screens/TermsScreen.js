import React, { useContext } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LanguageContext, ThemeContext } from "../contexts";
import SheetNav from "../components/SheetNav";

const Clause = ({ index, title, content, theme, isLast }) => {
  const monoFamily = theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium";
  const sansFamily = theme.typography?.headline?.fontFamily;
  const bodyFamily = theme.typography?.body?.fontFamily;

  return (
    <View
      style={{
        paddingHorizontal: 22,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: theme.divider,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
        <Text
          style={{
            fontFamily: monoFamily,
            fontSize: 11,
            fontWeight: "500",
            letterSpacing: 1.5,
            color: theme.primary,
          }}
        >
          § {index}
        </Text>
        <Text
          style={{
            fontFamily: sansFamily,
            fontSize: 15,
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

function TermsScreen() {
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const handleClose = () => navigation.goBack();

  const monoFamily = theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium";
  const sansFamily = theme.typography?.title1?.fontFamily;
  const bodyFamily = theme.typography?.body?.fontFamily;

  const clauses = [
    { title: t.termsAcceptance,    content: t.termsAcceptanceText },
    { title: t.termsDescription,   content: t.termsDescriptionText },
    { title: t.termsAccounts,      content: t.termsAccountsText },
    { title: t.termsContent,       content: t.termsContentText },
    { title: t.termsAcceptableUse, content: t.termsAcceptableUseText },
    { title: t.termsPrivacy,       content: t.termsPrivacyText },
    { title: t.termsAvailability,  content: t.termsAvailabilityText },
    { title: t.termsLiability,     content: t.termsLiabilityText },
    { title: t.termsChanges,       content: t.termsChangesText },
    { title: t.termsContact,       content: t.termsContactText },
  ];

  return (
    <SafeAreaView
      edges={[]}
      style={{ flex: 1, backgroundColor: theme.background }}
      accessibilityLabel="Terms of Use Screen"
    >
      <SheetNav
        title={t.termsTitle}
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
            {t.termsLastUpdated} {new Date().toLocaleDateString()}
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
            {t.termsTitle}
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
            {t.termsAcknowledgment}
          </Text>
        </View>

        {/* Clauses with § index */}
        {clauses.map((c, i) => (
          <Clause
            key={i}
            index={i + 1}
            title={c.title}
            content={c.content}
            theme={theme}
            isLast={i === clauses.length - 1}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default TermsScreen;
