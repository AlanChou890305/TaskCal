import { memo, Fragment } from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet, Switch } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Ionicons } from "@expo/vector-icons";

export const GeneralSettingsCard = memo(function GeneralSettingsCard({
  theme,
  t,
  switchTrackOff,
  language,
  setLanguage,
  languageDropdownVisible,
  setLanguageDropdownVisible,
  themeMode,
  setThemeMode,
  themeDropdownVisible,
  setThemeDropdownVisible,
  reminderSettings,
  isLoadingSettings,
  reminderDropdownVisible,
  setReminderDropdownVisible,
  shimmerAnim,
  onUpdateReminderSettings,
  dailySummaryEnabled,
  onToggleDailySummary,
}) {
  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View
      style={{
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: theme.rule,
        overflow: "hidden",
      }}
    >
      {/* Language Selection */}
      <TouchableOpacity
        onPress={() => {
          setLanguageDropdownVisible(!languageDropdownVisible);
          setThemeDropdownVisible(false);
          setReminderDropdownVisible(false);
        }}
        activeOpacity={0.6}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 14,
          paddingHorizontal: 22,
          borderBottomWidth: 1,
          borderBottomColor: languageDropdownVisible
            ? "transparent"
            : theme.rule,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <MaterialIcons
            name="language"
            size={18}
            color={theme.textSecondary}
            style={{ marginRight: 14 }}
          />
          <Text
            style={{
              color: theme.text,
              fontSize: 15,
              fontWeight: "500",
              letterSpacing: -0.2,
            }}
          >
            {t.language}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{
              color: theme.textTertiary,
              fontSize: 13,
              letterSpacing: -0.1,
              marginRight: 4,
            }}
          >
            {language === "en"
              ? t.english
              : language === "zh"
                ? t.chinese
                : t.spanish}
          </Text>
          <MaterialIcons
            name={
              languageDropdownVisible ? "keyboard-arrow-up" : "chevron-right"
            }
            size={14}
            color={theme.textTertiary}
          />
        </View>
      </TouchableOpacity>

      {languageDropdownVisible && (
        <>
          {[
            { value: "en", label: t.english },
            { value: "zh", label: t.chinese },
            { value: "es", label: t.spanish },
          ].map((option) => {
            const active = language === option.value;
            return (
              <Fragment key={option.value}>
                <View
                  style={{
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: theme.rule,
                  }}
                />
                <TouchableOpacity
                  onPress={() => {
                    setLanguage(option.value);
                    setLanguageDropdownVisible(false);
                  }}
                  activeOpacity={0.6}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 14,
                    paddingHorizontal: 22,
                    backgroundColor: active
                      ? theme.primaryTint
                      : theme.background,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: theme.typography?.body?.fontFamily,
                      color: active ? theme.primary : theme.text,
                      fontSize: 15,
                      fontWeight: active ? "600" : "400",
                      letterSpacing: -0.2,
                    }}
                  >
                    {option.label}
                  </Text>
                  {active && (
                    <Ionicons name="checkmark" size={16} color={theme.primary} />
                  )}
                </TouchableOpacity>
              </Fragment>
            );
          })}
        </>
      )}

      {/* Theme Selection */}
      <TouchableOpacity
        onPress={() => {
          setThemeDropdownVisible(!themeDropdownVisible);
          setLanguageDropdownVisible(false);
          setReminderDropdownVisible(false);
        }}
        activeOpacity={0.6}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 14,
          paddingHorizontal: 22,
          borderBottomWidth: 1,
          borderBottomColor: themeDropdownVisible ? "transparent" : theme.rule,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <MaterialIcons
            name="palette"
            size={18}
            color={theme.textSecondary}
            style={{ marginRight: 14 }}
          />
          <Text
            style={{
              color: theme.text,
              fontSize: 15,
              fontWeight: "500",
              letterSpacing: -0.2,
            }}
          >
            {t.theme}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{
              color: theme.textTertiary,
              fontSize: 13,
              letterSpacing: -0.1,
              marginRight: 4,
            }}
          >
            {themeMode === "light"
              ? t.lightMode
              : themeMode === "dark"
                ? t.darkMode
                : t.autoMode || "Auto"}
          </Text>
          <MaterialIcons
            name={themeDropdownVisible ? "keyboard-arrow-down" : "chevron-right"}
            size={14}
            color={theme.textTertiary}
          />
        </View>
      </TouchableOpacity>

      {themeDropdownVisible && (
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.rule,
          }}
        >
          {[
            {
              value: "auto",
              label: t.autoModeShort || "Auto",
              icon: "contrast-outline",
            },
            {
              value: "light",
              label: t.lightModeShort || "Light",
              icon: "sunny-outline",
            },
            {
              value: "dark",
              label: t.darkModeShort || "Dark",
              icon: "moon-outline",
            },
          ].map((option) => {
            const active = themeMode === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  setThemeMode(option.value);
                  setThemeDropdownVisible(false);
                }}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 16,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: active ? theme.primary : theme.rule,
                  backgroundColor: active ? theme.primaryTint : theme.background,
                  gap: 8,
                }}
              >
                <Ionicons
                  name={option.icon}
                  size={22}
                  color={active ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={{
                    fontFamily: theme.typography?.body?.fontFamily,
                    color: active ? theme.primary : theme.text,
                    fontSize: 13,
                    fontWeight: active ? "600" : "400",
                    letterSpacing: -0.1,
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Reminder Settings */}
      <TouchableOpacity
        onPress={() => {
          setReminderDropdownVisible(!reminderDropdownVisible);
          setLanguageDropdownVisible(false);
          setThemeDropdownVisible(false);
        }}
        activeOpacity={0.6}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 14,
          paddingHorizontal: 22,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          {isLoadingSettings ? (
            <Animated.View
              style={{
                height: 16,
                borderRadius: 4,
                backgroundColor: theme.shimmer,
                width: "60%",
                opacity: shimmerOpacity,
              }}
            />
          ) : (
            <>
              <MaterialIcons
                name="notifications"
                size={18}
                color={theme.textSecondary}
                style={{ marginRight: 14 }}
              />
              <Text
                style={{
                  color: theme.text,
                  fontSize: 15,
                  fontWeight: "500",
                  letterSpacing: -0.2,
                }}
              >
                {t.reminderSettings}
              </Text>
            </>
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {!isLoadingSettings && (
            <Text
              style={{
                color: theme.textTertiary,
                fontSize: 13,
                letterSpacing: -0.1,
                marginRight: 4,
              }}
            >
              {reminderSettings?.enabled === true
                ? t.reminderEnabled || "Enable"
                : t.reminderOffShort || "Off"}
            </Text>
          )}
          <MaterialIcons
            name={
              reminderDropdownVisible ? "keyboard-arrow-down" : "chevron-right"
            }
            size={14}
            color={theme.textTertiary}
          />
        </View>
      </TouchableOpacity>

      {reminderDropdownVisible && (
        <>
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              backgroundColor: theme.rule,
            }}
          />

          {/* Enable reminders toggle row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 14,
              paddingHorizontal: 22,
            }}
          >
            <Text
              style={{
                fontFamily: theme.typography?.body?.fontFamily,
                color: theme.text,
                fontSize: 15,
                fontWeight: "500",
                letterSpacing: -0.2,
              }}
            >
              {t.enableReminders || "Enable reminders"}
            </Text>
            <Switch
              value={reminderSettings?.enabled === true}
              onValueChange={(value) => {
                try {
                  const newTimes = value
                    ? [30, 10, 5]
                    : Array.isArray(reminderSettings?.times)
                      ? reminderSettings.times
                      : [30, 10, 5];
                  onUpdateReminderSettings({
                    enabled: value,
                    times: newTimes,
                  });
                } catch (error) {
                  console.error("Error toggling reminder enabled:", error);
                }
              }}
              trackColor={{
                false: switchTrackOff,
                true: theme.primary,
              }}
              ios_backgroundColor={switchTrackOff}
            />
          </View>

          {reminderSettings?.enabled !== false && (
            <>
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.rule,
                }}
              />

              {/* NOTIFY BEFORE TASK kicker */}
              <View
                style={{
                  paddingHorizontal: 22,
                  paddingTop: 12,
                  paddingBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontFamily:
                      theme.typography?.monoKicker?.fontFamily ||
                      "JetBrainsMono_500Medium",
                    fontSize: 10,
                    fontWeight: "500",
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: theme.textTertiary,
                  }}
                >
                  {t.notifyBeforeTask || "Notify before task"}
                </Text>
              </View>

              {/* Pill buttons row */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  paddingHorizontal: 14,
                  paddingBottom: 14,
                }}
              >
                {[
                  { value: 30, label: t.reminder30minShort || "30 min" },
                  { value: 10, label: t.reminder10minShort || "10 min" },
                  { value: 5, label: t.reminder5minShort || "5 min" },
                ].map((option) => {
                  const times = Array.isArray(reminderSettings.times)
                    ? reminderSettings.times
                    : [30, 10, 5];
                  const isSelected = times.includes(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => {
                        const currentTimes = Array.isArray(
                          reminderSettings.times,
                        )
                          ? reminderSettings.times
                          : [30, 10, 5];
                        const newTimes = isSelected
                          ? currentTimes.filter((time) => time !== option.value)
                          : [...currentTimes, option.value].sort(
                              (a, b) => b - a,
                            );
                        onUpdateReminderSettings({
                          ...reminderSettings,
                          times: newTimes,
                        });
                      }}
                      activeOpacity={0.7}
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 13,
                        borderRadius: 50,
                        borderWidth: 1.5,
                        borderColor: isSelected ? theme.primary : theme.rule,
                        backgroundColor: isSelected
                          ? theme.primaryTint
                          : theme.background,
                        gap: 5,
                      }}
                    >
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={13}
                          color={theme.primary}
                        />
                      )}
                      <Text
                        style={{
                          fontFamily: theme.typography?.body?.fontFamily,
                          color: isSelected ? theme.primary : theme.text,
                          fontSize: 14,
                          fontWeight: isSelected ? "600" : "400",
                          letterSpacing: -0.1,
                        }}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.rule,
                }}
              />
              <View style={{ paddingHorizontal: 22, paddingVertical: 10 }}>
                <Text
                  style={{
                    fontFamily: theme.typography?.caption?.fontFamily,
                    color: theme.textTertiary,
                    fontSize: 12,
                    letterSpacing: -0.1,
                  }}
                >
                  {t.reminderNote}
                </Text>
              </View>
            </>
          )}
        </>
      )}

      {/* Divider above daily to-do reminder */}
      <View
        style={{
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.rule,
        }}
      />

      {/* Daily to-do reminder (07:00 local time) toggle row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 14,
          paddingHorizontal: 22,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
            marginRight: 12,
          }}
        >
          <MaterialIcons
            name="wb-sunny"
            size={18}
            color={theme.textSecondary}
            style={{ marginRight: 14 }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: theme.text,
                fontSize: 15,
                fontWeight: "500",
                letterSpacing: -0.2,
              }}
            >
              {t.dailySummaryReminder || "Daily to-do reminder"}
            </Text>
            <Text
              style={{
                fontFamily: theme.typography?.caption?.fontFamily,
                color: theme.textTertiary,
                fontSize: 12,
                letterSpacing: -0.1,
                marginTop: 2,
              }}
            >
              {t.dailySummaryCaption ||
                "A 7:00 AM nudge to check today's to-dos"}
            </Text>
          </View>
        </View>
        <Switch
          value={dailySummaryEnabled}
          onValueChange={onToggleDailySummary}
          trackColor={{
            false: switchTrackOff,
            true: theme.primary,
          }}
          ios_backgroundColor={switchTrackOff}
        />
      </View>
    </View>
  );
});
