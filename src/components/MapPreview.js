import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { MaterialIcons } from "@expo/vector-icons";
import { isGoogleMapsUrl, getGoogleMapsEmbedUrl } from "../utils/mapUtils";
import { mixpanelService } from "../services/mixpanelService";

// 動態導入 WebView，如果不可用則為 null
let WebView = null;
try {
  WebView = require("react-native-webview").WebView;
} catch (error) {
  console.warn("WebView not available, will use external browser instead");
}

/**
 * Google Maps 預覽組件
 * 當任務連結是 Google Maps URL 時，顯示一個可以打開地圖預覽的按鈕
 */
export const MapPreview = ({ url, theme, t, onOpenInBrowser }) => {
  const [modalVisible, setModalVisible] = useState(false);

  if (!url || !isGoogleMapsUrl(url)) {
    return null;
  }

  const embedUrl = getGoogleMapsEmbedUrl(url);

  const handleOpenMap = () => {
    // Mixpanel: Track map preview opened
    mixpanelService.track("Map Preview Opened", {
      has_webview: !!WebView,
      opened_in_modal: !!WebView,
      platform: Platform.OS,
    });

    // 如果 WebView 不可用，直接在外部分瀏覽器打開
    if (!WebView) {
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;
      WebBrowser.openBrowserAsync(fullUrl).catch((err) =>
        console.error("Failed to open URL:", err)
      );
      return;
    }
    setModalVisible(true);
  };

  const handleCloseMap = () => {
    setModalVisible(false);
  };

  const handleOpenInBrowser = () => {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    Linking.openURL(fullUrl).catch((err) =>
      console.error("Failed to open URL:", err)
    );
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.mapPreviewButton, { backgroundColor: theme.input }]}
        onPress={handleOpenMap}
        activeOpacity={0.7}
      >
        <MaterialIcons name="map" size={20} color={theme.primary} />
        <Text style={[styles.mapPreviewText, { color: theme.text }]}>
          {t?.viewMap || "View Map"}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={handleCloseMap}
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.inputBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t?.map || "Map"}</Text>
            <View style={styles.modalHeaderButtons}>
              {onOpenInBrowser && (
                <TouchableOpacity
                  style={styles.modalHeaderButton}
                  onPress={handleOpenInBrowser}
                >
                  <MaterialIcons name="open-in-new" size={24} color={theme.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.modalHeaderButton}
                onPress={handleCloseMap}
              >
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* WebView */}
          {embedUrl && WebView ? (
            <WebView
              source={{ uri: embedUrl }}
              style={styles.webview}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={[styles.loadingText, { color: theme.textPlaceholder }]}>
                    {t?.mapLoading || "Loading map..."}
                  </Text>
                </View>
              )}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error("WebView error: ", nativeEvent);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error("WebView HTTP error: ", nativeEvent);
              }}
              // 允許地圖互動
              javaScriptEnabled={true}
              domStorageEnabled={true}
              // 處理導航請求（僅在非 Web 平台）
              {...(Platform.OS !== "web" && {
                onShouldStartLoadWithRequest: (request) => {
                  // 允許載入地圖相關的 URL
                  if (
                    request.url.includes("google.com/maps") ||
                    request.url.includes("gstatic.com") ||
                    request.url.includes("googleapis.com") ||
                    request.url.includes("googleusercontent.com")
                  ) {
                    return true;
                  }
                  // 其他 URL（如點擊地點詳情）在外部瀏覽器打開
                  if (onOpenInBrowser && request.url !== embedUrl) {
                    Linking.openURL(request.url).catch((err) =>
                      console.error("Failed to open URL:", err)
                    );
                    return false;
                  }
                  return true;
                },
              })}
            />
          ) : embedUrl ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="info-outline" size={48} color={theme.primary} />
              <Text style={[styles.errorText, { color: theme.text }]}>
                {t?.mapPreviewRequiresBuild || "Map preview requires rebuilding the app"}
              </Text>
              <Text style={[styles.errorText, { color: theme.textPlaceholder, marginTop: 8, fontSize: 14 }]}>
                {t?.mapOpenInBrowserHint || "Please tap the button below to view the map in your browser"}
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: theme.primary }]}
                onPress={handleOpenInBrowser}
              >
                <Text style={[styles.retryButtonText, { color: theme.background }]}>
                  {t?.openInBrowser || "Open in Browser"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={48} color={theme.error} />
              <Text style={[styles.errorText, { color: theme.text }]}>
                {t?.mapLoadFailed || "Failed to load map"}
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: theme.primary }]}
                onPress={handleOpenInBrowser}
              >
                <Text style={[styles.retryButtonText, { color: theme.background }]}>
                  {t?.openInBrowser || "Open in Browser"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  mapPreviewButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  mapPreviewText: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalHeaderButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalHeaderButton: {
    padding: 4,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
