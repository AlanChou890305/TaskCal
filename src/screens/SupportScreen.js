import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LanguageContext, ThemeContext } from "../contexts";
import SheetNav from "../components/SheetNav";
import IOSChip from "../components/IOSChip";

const TYPES = [
  { key: "love",     labelKey: "feedbackLove"     },
  { key: "bug",      labelKey: "feedbackBug"      },
  { key: "idea",     labelKey: "feedbackIdea"     },
  { key: "question", labelKey: "feedbackQuestion" },
];

function SupportScreen() {
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState("love");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSend = () => {
    const url = t.supportGithubUrl;
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      import("expo-web-browser").then((WebBrowser) => {
        WebBrowser.openBrowserAsync(url);
      });
    }
  };

  const monoFamily = theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium";
  const sansFamily = theme.typography?.title1?.fontFamily;
  const bodyFamily = theme.typography?.body?.fontFamily;

  return (
    <SafeAreaView
      edges={[]}
      style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}
      accessibilityViewIsModal={true}
      accessibilityLabel="Support Screen"
    >
      <SheetNav
        title={t.supportTitle}
        backLabel={t.settingsTitle || "Settings"}
        onBack={() => navigation.goBack()}
        actionLabel={t.feedbackSend || "Send"}
        onAction={handleSend}
        theme={theme}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View
          style={[
            styles.heroBlock,
            {
              backgroundColor: theme.background,
              borderBottomWidth: 2,
              borderBottomColor: theme.ruleStrong || "rgba(26,31,46,0.22)",
            },
          ]}
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
            {t.supportIntro || "One human reads every message."}
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
            {t.supportTitle}
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
            {t.supportGithub || "Replies usually come within two working days."}
          </Text>
        </View>

        {/* Type selector */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.divider,
            },
          ]}
        >
          <Text style={[styles.fieldLabel, { color: theme.textTertiary, fontFamily: monoFamily }]}>
            {t.feedbackType || "TYPE"}
          </Text>
          <View style={styles.chipsRow}>
            {TYPES.map((type) => (
              <IOSChip
                key={type.key}
                label={t[type.labelKey] || type.key}
                active={selectedType === type.key}
                onPress={() => setSelectedType(type.key)}
                theme={theme}
              />
            ))}
          </View>
        </View>

        {/* Subject */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.divider,
            },
          ]}
        >
          <Text style={[styles.fieldLabel, { color: theme.textTertiary, fontFamily: monoFamily }]}>
            {t.feedbackSubject || "SUBJECT"}
          </Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder={t.feedbackSubjectPlaceholder || "Short summary…"}
            placeholderTextColor={theme.textPlaceholder}
            style={{
              fontFamily: theme.typography?.callout?.fontFamily,
              fontSize: 15,
              fontWeight: "500",
              letterSpacing: -0.2,
              color: theme.text,
              paddingVertical: 4,
            }}
          />
        </View>

        {/* Message */}
        <View
          style={[
            styles.sectionFlex,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.divider,
            },
          ]}
        >
          <Text style={[styles.fieldLabel, { color: theme.textTertiary, fontFamily: monoFamily }]}>
            {t.feedbackMessage || "MESSAGE"}
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t.feedbackMessagePlaceholder || "Describe what you'd like to share…"}
            placeholderTextColor={theme.textPlaceholder}
            multiline
            style={{
              fontFamily: bodyFamily,
              fontSize: 14,
              fontWeight: "400",
              letterSpacing: -0.1,
              lineHeight: 22,
              color: theme.text,
              minHeight: 120,
              textAlignVertical: "top",
              paddingVertical: 4,
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroBlock: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
  },
  section: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  sectionFlex: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
});

export default SupportScreen;
