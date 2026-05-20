import React, { useContext, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LanguageContext, ThemeContext } from "../contexts";

const IMAGES = [
  require("../../assets/screenshots/marketing/en/11_calendar_month.jpg"),
  require("../../assets/screenshots/marketing/en/05_task_detail.jpg"),
  require("../../assets/screenshots/marketing/en/07_widget.jpg"),
];

const SLIDES = [
  { key: "1", titleKey: "onboarding1Title", descKey: "onboarding1Desc", kicker: "Step · 01 / 03" },
  { key: "2", titleKey: "onboarding2Title", descKey: "onboarding2Desc", kicker: "Step · 02 / 03" },
  { key: "3", titleKey: "onboarding3Title", descKey: "onboarding3Desc", kicker: "Step · 03 / 03" },
];

export default function OnboardingScreen({ navigation }) {
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const { width: windowWidth, height: SCREEN_HEIGHT } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const [flatListHeight, setFlatListHeight] = useState(0);
  const SCREEN_WIDTH = containerWidth > 0 ? containerWidth : windowWidth;
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleDone = async () => {
    await AsyncStorage.setItem("onboarding_completed", "true");
    navigation.replace("Splash");
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    } else {
      handleDone();
    }
  };

  const screenWidthRef = useRef(SCREEN_WIDTH);
  screenWidthRef.current = SCREEN_WIDTH;

  const onScroll = useRef((event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / screenWidthRef.current);
    setCurrentIndex(index);
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const getItemLayout = (_, index) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

  const isLast = currentIndex === SLIDES.length - 1;
  const paperColor = theme.buttonText || "#F2F1EB";
  const washBg = theme.primaryWash || theme.primary;
  const monoFamily = theme.typography?.monoKicker?.fontFamily || "JetBrainsMono_500Medium";
  const sansFamily = theme.typography?.largeTitle?.fontFamily || "InterTight_600SemiBold";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: washBg }]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Slides */}
      {SCREEN_WIDTH === 0 ? null : (
        <FlatList
          style={{ flex: 1 }}
          onLayout={(e) => setFlatListHeight(e.nativeEvent.layout.height)}
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={getItemLayout}
          renderItem={({ item, index }) => (
            <View style={[styles.slide, { width: SCREEN_WIDTH, height: flatListHeight > 0 ? flatListHeight : undefined }]}>
              {/* Kicker + Skip row */}
              <View style={styles.kickerRow}>
                <Text style={[styles.kicker, { color: paperColor, fontFamily: monoFamily }]}>
                  {item.kicker}
                </Text>
                <TouchableOpacity style={styles.skipButton} onPress={handleDone}>
                  <Text style={[styles.skipText, { color: paperColor, fontFamily: theme.typography?.body?.fontFamily }]}>
                    {t.onboardingSkip}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Hero image — paper panel */}
              <View style={[styles.imageContainer, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.42, backgroundColor: theme.background }]}>
                <Image
                  source={IMAGES[index]}
                  style={[styles.screenshot, { width: SCREEN_WIDTH }]}
                  resizeMode="contain"
                />
              </View>

              {/* Title + body */}
              <View style={styles.textContainer}>
                <Text style={[styles.title, { color: paperColor, fontFamily: sansFamily }]}>
                  {t[item.titleKey]}
                </Text>
                <Text style={[styles.desc, { color: `${paperColor}C7`, fontFamily: theme.typography?.body?.fontFamily }]}>
                  {t[item.descKey]}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Progress + CTA */}
      <View style={styles.footer}>
        <View style={styles.progressRow}>
          {/* Mono counter */}
          <Text style={[styles.progressCount, { color: paperColor, fontFamily: monoFamily }]}>
            {String(currentIndex + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </Text>
          {/* Expanding dots */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: paperColor,
                    opacity: i === currentIndex ? 1 : 0.35,
                    width: i === currentIndex ? 22 : 6,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.nextButton,
            {
              backgroundColor: theme.background,
              borderRadius: theme.radius?.lg || 8,
            },
          ]}
          onPress={handleNext}
        >
          <Text style={[styles.nextText, { color: theme.primary, fontFamily: theme.typography?.headline?.fontFamily }]}>
            {isLast ? t.onboardingGetStarted : t.onboardingNext}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    flex: 1,
    flexDirection: "column",
  },
  kickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 14,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 2.0,
    textTransform: "uppercase",
    opacity: 0.85,
  },
  skipButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.1,
    opacity: 0.8,
  },
  imageContainer: {
    overflow: "hidden",
  },
  screenshot: {
    height: "100%",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: "600",
    letterSpacing: -1.3,
    lineHeight: 38,
    marginBottom: 14,
  },
  desc: {
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: -0.05,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 28,
    gap: 18,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressCount: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1.5,
    opacity: 0.78,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  nextButton: {
    width: "100%",
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  nextText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
