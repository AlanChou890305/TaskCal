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
  { key: "1", titleKey: "onboarding1Title", descKey: "onboarding1Desc" },
  { key: "2", titleKey: "onboarding2Title", descKey: "onboarding2Desc" },
  { key: "3", titleKey: "onboarding3Title", descKey: "onboarding3Desc" },
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Slides */}
      {SCREEN_WIDTH === 0 ? null : <FlatList
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
            <View style={[styles.imageContainer, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.52 }]}>
              <Image
                source={IMAGES[index]}
                style={[styles.screenshot, { width: SCREEN_WIDTH }]}
                resizeMode="contain"
              />
              <TouchableOpacity style={styles.skipButton} onPress={handleDone}>
                <Text style={styles.skipText}>{t.onboardingSkip}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: theme.text }]}>{t[item.titleKey]}</Text>
              <Text style={[styles.desc, { color: theme.textSecondary }]}>{t[item.descKey]}</Text>
            </View>
          </View>
        )}
      />}

      {/* Dots + Next/Get Started */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentIndex ? theme.primary : theme.backgroundTertiary,
                  width: i === currentIndex ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: theme.primary }]}
          onPress={handleNext}
        >
          <Text style={[styles.nextText, { color: theme.buttonText }]}>
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
  skipButton: {
    position: "absolute",
    top: 12,
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(50, 40, 120, 0.85)",
  },
  slide: {
    flex: 1,
    flexDirection: "column",
  },
  imageContainer: {
    backgroundColor: "#BEBAFF",
    overflow: "hidden",
  },
  screenshot: {
    height: "100%",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  desc: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: "center",
    gap: 16,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  nextText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
