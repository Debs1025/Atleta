import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScoresheetViewerModalProps {
  visible: boolean;
  imageUrl?: string | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

export const ScoresheetViewerModal: React.FC<ScoresheetViewerModalProps> = ({
  visible,
  imageUrl,
  title = "Scoresheet Image",
  subtitle,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const windowDims = Dimensions.get("window");
  const screenWidth = windowDims.width;
  const screenHeight = windowDims.height;

  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [aspectRatio, setAspectRatio] = useState<number>(0.75);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);

  // Reset zoom on open
  useEffect(() => {
    if (visible) {
      setZoomScale(1.0);
      setImageError(false);
      setIsLoadingImage(true);

      const fallbackTimer = setTimeout(() => {
        setIsLoadingImage(false);
      }, 2500);

      if (imageUrl && !imageUrl.startsWith("data:")) {
        Image.getSize(
          imageUrl,
          (width, height) => {
            if (width > 0 && height > 0) {
              setAspectRatio(width / height);
            }
            setIsLoadingImage(false);
          },
          () => {
            setIsLoadingImage(false);
          }
        );
      } else {
        setIsLoadingImage(false);
      }

      return () => clearTimeout(fallbackTimer);
    }
  }, [visible, imageUrl]);

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(4.0, +(prev + 0.5).toFixed(1)));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(1.0, +(prev - 0.5).toFixed(1)));
  };

  const handleResetZoom = () => {
    setZoomScale(1.0);
  };

  // Base dimensions at 1.0x (fits width)
  const safeAspectRatio = aspectRatio && aspectRatio > 0.1 && aspectRatio < 10 ? aspectRatio : 0.75;
  const baseWidth = screenWidth - 16;
  const baseHeight = Math.max(baseWidth / safeAspectRatio, 350);

  // Scaled dimensions
  const scaledWidth = Math.max(baseWidth * zoomScale, screenWidth - 16);
  const scaledHeight = Math.max(baseHeight * zoomScale, 200);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { paddingTop: Math.max(insets.top, 12) }]}>
        {/* TOP TOOLBAR */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <View style={styles.sheetBadge}>
              <Ionicons name="document-text-outline" size={16} color="#00E5FF" />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {subtitle || `${Math.round(zoomScale * 100)}% Zoom • Drag to pan`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* ZOOM CONTROLS BAR */}
        <View style={styles.zoomControlBar}>
          <View style={styles.zoomPills}>
            {[1.0, 1.5, 2.0, 3.0].map((level) => {
              const isActive = zoomScale === level;
              return (
                <TouchableOpacity
                  key={`zoom_${level}`}
                  style={[styles.zoomPill, isActive && styles.zoomPillActive]}
                  onPress={() => setZoomScale(level)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.zoomPillText,
                      isActive && styles.zoomPillTextActive,
                    ]}
                  >
                    {level}x
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.zoomStepper}>
            <TouchableOpacity
              style={[styles.stepperBtn, zoomScale <= 1.0 && styles.stepperBtnDisabled]}
              onPress={handleZoomOut}
              disabled={zoomScale <= 1.0}
              activeOpacity={0.7}
            >
              <Ionicons name="remove-outline" size={18} color={zoomScale <= 1.0 ? "#475569" : "#FFFFFF"} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResetZoom} activeOpacity={0.7} style={styles.scaleIndicator}>
              <Text style={styles.scaleText}>{Math.round(zoomScale * 100)}%</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.stepperBtn, zoomScale >= 4.0 && styles.stepperBtnDisabled]}
              onPress={handleZoomIn}
              disabled={zoomScale >= 4.0}
              activeOpacity={0.7}
            >
              <Ionicons name="add-outline" size={18} color={zoomScale >= 4.0 ? "#475569" : "#FFFFFF"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* IMAGE SCROLLING VIEWPORT */}
        <View style={styles.viewportContainer}>
          {isLoadingImage && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#00E5FF" />
              <Text style={styles.loadingText}>Loading full resolution sheet...</Text>
            </View>
          )}

          {imageUrl && !imageError ? (
            <ScrollView
              style={styles.outerScroll}
              contentContainerStyle={styles.outerScrollContent}
              maximumZoomScale={5.0}
              minimumZoomScale={1.0}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <ScrollView
                horizontal
                style={styles.innerScroll}
                contentContainerStyle={styles.innerScrollContent}
                maximumZoomScale={5.0}
                minimumZoomScale={1.0}
                showsHorizontalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={{
                    width: scaledWidth,
                    height: scaledHeight,
                    borderRadius: 4,
                  }}
                  resizeMode="contain"
                  onError={() => {
                    setImageError(true);
                    setIsLoadingImage(false);
                  }}
                  onLoadEnd={() => setIsLoadingImage(false)}
                />
              </ScrollView>
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Ionicons name="image-outline" size={56} color="#64748B" />
              <Text style={styles.errorTitle}>Image Preview Unavailable</Text>
              <Text style={styles.errorSubtitle}>
                {imageUrl
                  ? "The image file could not be loaded from disk or network."
                  : "No scoresheet image was captured for this match."}
              </Text>
            </View>
          )}
        </View>

        {/* BOTTOM HELPER BAR */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Text style={styles.bottomHint}>
            Pinch or use + / - to zoom • Drag anywhere to pan across scoresheet
          </Text>
          <TouchableOpacity
            style={styles.bottomCloseButton}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.bottomCloseButtonText}>CLOSE VIEWER</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 17, 0.96)",
    justifyContent: "space-between",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    backgroundColor: "#0B1323",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sheetBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 1,
    fontWeight: "600",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  zoomControlBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#070E1B",
    borderBottomWidth: 1,
    borderBottomColor: "#172338",
  },
  zoomPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  zoomPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#0F1E36",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  zoomPillActive: {
    backgroundColor: "#00E5FF",
    borderColor: "#00E5FF",
  },
  zoomPillText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
  },
  zoomPillTextActive: {
    color: "#030712",
    fontWeight: "900",
  },
  zoomStepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1E36",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  scaleIndicator: {
    paddingHorizontal: 8,
  },
  scaleText: {
    color: "#00E5FF",
    fontSize: 12,
    fontWeight: "800",
    minWidth: 42,
    textAlign: "center",
  },
  viewportContainer: {
    flex: 1,
    backgroundColor: "#020611",
    alignItems: "center",
    justifyContent: "center",
  },
  outerScroll: {
    flex: 1,
    width: "100%",
  },
  outerScrollContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  innerScroll: {
    width: "100%",
  },
  innerScrollContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 17, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },
  errorSubtitle: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#0B1323",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  bottomHint: {
    color: "#64748B",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "600",
  },
  bottomCloseButton: {
    backgroundColor: "#00E5FF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomCloseButtonText: {
    color: "#030712",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
});
