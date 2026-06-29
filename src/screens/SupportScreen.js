import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import { LanguageContext, ThemeContext } from "../contexts";
import SheetNav from "../components/SheetNav";
import { supabase } from "../services/supabaseClient";
import { mixpanelService } from "../services/mixpanelService";

const TYPES = [
  { key: "love",     labelKey: "feedbackLove",     icon: "heart-outline"              },
  { key: "bug",      labelKey: "feedbackBug",       icon: "bug-outline"                },
  { key: "idea",     labelKey: "feedbackIdea",      icon: "flag-outline"               },
  { key: "question", labelKey: "feedbackQuestion",  icon: "information-circle-outline" },
];

function SupportScreen() {
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState("love");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachDiag, setAttachDiag] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const version = Application.nativeApplicationVersion || "1.4.0";
  const build = Application.nativeBuildVersion || "1";

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert(t.detailsRequired, t.pleaseEnterFeedback);
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t.confirm, t.pleaseLoginFirst);
        return;
      }
      const { error } = await supabase.from("user_feedback").insert({
        user_id: user.id,
        email: user.email,
        category: selectedType,
        title: subject.trim() || null,
        feedback: message.trim(),
        app_version: Application.nativeApplicationVersion,
        build_number: Application.nativeBuildVersion,
        os_version: Platform.Version,
        platform: Platform.OS,
      });
      if (error) throw error;
      mixpanelService.track("Feedback Submitted", {
        category: selectedType,
        feedback_length: message.trim().length,
        app_version: Application.nativeApplicationVersion,
        platform: Platform.OS,
      });
      Alert.alert(t.submitSuccess, t.thanksFeedback, [{
        text: t.done || "Done",
        onPress: () => navigation.goBack(),
      }]);
    } catch (err) {
      console.error("Error submitting feedback:", err);
      Alert.alert(t.submitFailed, t.pleaseTryAgainLater);
    } finally {
      setIsSubmitting(false);
    }
  };

  const monoKickerFamily = theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium";
  const monoSectionFamily = theme.typography?.monoSection?.fontFamily || "JetBrainsMono_500Medium";

  return (
    <SafeAreaView
      edges={[]}
      style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}
      accessibilityViewIsModal={true}
      accessibilityLabel="Support Screen"
    >
      <SheetNav
        title={t.feedback || "Send feedback"}
        backLabel={t.settingsTitle || "Settings"}
        onBack={() => navigation.goBack()}
        actionLabel={isSubmitting ? "..." : (t.send || "Send")}
        onAction={handleSend}
        actionColor={isSubmitting ? theme.textTertiary : undefined}
        theme={theme}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
        {/* Hero */}
        <View
          style={[
            styles.heroBlock,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.ruleStrong,
            },
          ]}
        >
          <Text
            style={[
              styles.kicker,
              { color: theme.primary, fontFamily: monoKickerFamily },
            ]}
          >
            {`FROM V${version} · BUILD ${build}`}
          </Text>
          <Text
            style={[
              styles.heroTitle,
              {
                color: theme.text,
                fontFamily: theme.typography?.title1?.fontFamily,
              },
            ]}
          >
            {t.feedbackHero || "Tell us what's\non your mind."}
          </Text>
          <Text
            style={[
              styles.heroDesc,
              {
                color: theme.textSecondary,
                fontFamily: theme.typography?.subheadline?.fontFamily,
              },
            ]}
          >
            {t.feedbackDesc ||
              "One human reads every message."}
          </Text>
        </View>

        {/* Type selector */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.rule,
            },
          ]}
        >
          <Text
            style={[
              styles.fieldLabel,
              { color: theme.textTertiary, fontFamily: monoSectionFamily },
            ]}
          >
            {t.feedbackType || "TYPE"}
          </Text>
          <View style={styles.chipsRow}>
            {TYPES.map((type) => {
              const active = selectedType === type.key;
              return (
                <TouchableOpacity
                  key={type.key}
                  onPress={() => setSelectedType(type.key)}
                  activeOpacity={0.7}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? theme.primary : theme.ruleStrong,
                      backgroundColor: active ? theme.primaryTint : "transparent",
                    },
                  ]}
                >
                  <Ionicons
                    name={type.icon}
                    size={13}
                    color={active ? theme.primary : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.chipLabel,
                      {
                        color: active ? theme.primary : theme.textSecondary,
                        fontFamily: active
                          ? theme.typography?.headline?.fontFamily
                          : theme.typography?.callout?.fontFamily,
                        fontWeight: active ? "600" : "500",
                      },
                    ]}
                  >
                    {t[type.labelKey] || type.key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Subject */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.rule,
            },
          ]}
        >
          <Text
            style={[
              styles.fieldLabel,
              { color: theme.textTertiary, fontFamily: monoSectionFamily },
            ]}
          >
            {t.feedbackTitle || "SUBJECT"}
          </Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder={t.feedbackTitlePlaceholder || "Brief summary…"}
            placeholderTextColor={theme.textPlaceholder}
            style={{
              fontFamily: theme.typography?.headline?.fontFamily,
              fontSize: 15,
              fontWeight: "500",
              letterSpacing: -0.2,
              color: theme.text,
              paddingVertical: 2,
              textAlignVertical: "center",
            }}
          />
        </View>

        {/* Message */}
        <View
          style={[
            styles.messageSection,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.rule,
            },
          ]}
        >
          <Text
            style={[
              styles.fieldLabel,
              { color: theme.textTertiary, fontFamily: monoSectionFamily },
            ]}
          >
            {t.feedbackDetails || "MESSAGE"}
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t.feedbackPlaceholder || "What's on your mind?"}
            placeholderTextColor={theme.textPlaceholder}
            multiline
            style={{
              fontFamily: theme.typography?.body?.fontFamily,
              fontSize: 14,
              fontWeight: "400",
              letterSpacing: -0.1,
              lineHeight: 22,
              color: theme.text,
              minHeight: 180,
              textAlignVertical: "top",
              paddingVertical: 4,
            }}
          />
        </View>

        {/* Attach diagnostic info */}
        <TouchableOpacity
          onPress={() => setAttachDiag(!attachDiag)}
          activeOpacity={0.7}
          style={[
            styles.attachSection,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.rule,
              paddingBottom: 14 + insets.bottom,
            },
          ]}
        >
          <Ionicons
            name={attachDiag ? "checkbox" : "square-outline"}
            size={16}
            color={attachDiag ? theme.primary : theme.textTertiary}
          />
          <Text
            style={[
              styles.attachText,
              {
                color: theme.textSecondary,
                fontFamily: theme.typography?.callout?.fontFamily,
              },
            ]}
          >
            {t.feedbackAttach || "Attach diagnostic info"}
            {"  "}
            <Text style={{ color: theme.textTertiary }}>
              {t.feedbackAttachSub || "· device, version, last 7d crashes"}
            </Text>
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroBlock: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "600",
    letterSpacing: -0.8,
    lineHeight: 30,
    marginBottom: 10,
  },
  heroDesc: {
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  section: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 12,
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
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 12,
    letterSpacing: -0.1,
  },
  messageSection: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  attachSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  attachText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.1,
    flex: 1,
  },
});

export default SupportScreen;
