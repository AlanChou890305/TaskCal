import { memo } from "react";
import { View, Text, Animated, Image, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

export const ProfileCard = memo(function ProfileCard({
  theme,
  t,
  isLoadingProfile,
  userProfile,
  userName,
  shimmerAnim,
}) {
  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 6,
        backgroundColor: theme.background,
        borderWidth: 1,
        borderColor: theme.rule,
        overflow: "hidden",
      }}
    >
      {/* Profile row */}
      <View
        style={{
          paddingVertical: 16,
          paddingHorizontal: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        {isLoadingProfile ? (
          <>
            <Animated.View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: theme.shimmer,
                opacity: shimmerOpacity,
              }}
            />
            <View style={{ flex: 1 }}>
              <Animated.View
                style={{
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: theme.shimmer,
                  width: "55%",
                  marginBottom: 7,
                  opacity: shimmerOpacity,
                }}
              />
              <Animated.View
                style={{
                  height: 12,
                  borderRadius: 4,
                  backgroundColor: theme.shimmer,
                  width: "40%",
                  opacity: shimmerOpacity,
                }}
              />
            </View>
          </>
        ) : (
          <>
            {userProfile?.avatar_url ? (
              <Image
                source={{ uri: userProfile.avatar_url }}
                style={{ width: 44, height: 44, borderRadius: 22 }}
              />
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: theme.primary,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: theme.typography?.title1?.fontFamily,
                    color: theme.buttonText || "#F2F1EB",
                    fontSize: 16,
                    fontWeight: "600",
                    letterSpacing: -0.4,
                  }}
                >
                  {(userProfile?.name || userName || "U")
                    .split(" ")
                    .map((w) => w.charAt(0))
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: theme.typography?.title1?.fontFamily,
                  color: theme.text,
                  fontSize: 15,
                  fontWeight: "600",
                  letterSpacing: -0.2,
                }}
              >
                {userProfile?.name || userName || "User"}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: theme.typography?.body?.fontFamily,
                  color: theme.textSecondary,
                  fontSize: 12,
                  letterSpacing: 0,
                }}
              >
                {userProfile?.email || "No email available"}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Login Method row */}
      {!isLoadingProfile && (
        <>
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              backgroundColor: theme.rule,
            }}
          />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 12,
              paddingHorizontal: 18,
            }}
          >
            <Text
              style={{
                fontFamily: theme.typography?.body?.fontFamily,
                color: theme.primary,
                fontSize: 14,
                fontWeight: "500",
              }}
            >
              {t.loginMethod}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              {userProfile?.provider === "google" ? (
                <Svg width="16" height="16" viewBox="0 0 24 24">
                  <Path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <Path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <Path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <Path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </Svg>
              ) : userProfile?.provider === "apple" ? (
                <Ionicons name="logo-apple" size={16} color={theme.text} />
              ) : null}
              <Text
                style={{
                  fontFamily: theme.typography?.body?.fontFamily,
                  color: theme.text,
                  fontSize: 14,
                }}
              >
                {userProfile?.provider === "google"
                  ? "Google"
                  : userProfile?.provider === "apple"
                    ? "Apple"
                    : userProfile?.provider
                      ? userProfile.provider.charAt(0).toUpperCase() +
                        userProfile.provider.slice(1)
                      : "—"}
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
});
