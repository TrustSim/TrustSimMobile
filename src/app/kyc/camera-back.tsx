import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  GestureResponderEvent,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { kycStore } from '../../services/kycStore';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';

export default function CameraBackScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const { frontUri } = useLocalSearchParams<{ frontUri: string }>();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [enableTorch, setEnableTorch] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const cameraRef = useRef<any>(null);

  // Guarantee landscape while this screen is focused
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT).catch(() => {});
    }, [])
  );

  const handleBack = useCallback(() => {
    if (isCapturing) return;
    setEnableTorch(false);
    if (capturedUri) {
      setCapturedUri(null);
      return;
    }
    // Both front and back are landscape; no orientation toggle needed
    router.back();
  }, [capturedUri, isCapturing, router]);

  // Intercept Android hardware back button to navigate back to front camera
  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [handleBack]);

  // Give previous camera 250ms to completely unbind native hardware
  useEffect(() => {
    let timer: any;
    if (isFocused) {
      timer = setTimeout(() => {
        setIsCameraActive(true);
      }, 250);
    } else {
      setIsCameraActive(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
      setIsCameraActive(false);
    };
  }, [isFocused]);

  // Handle manual tap-to-focus indicator inside camera view
  const handleTouchFocus = (e: GestureResponderEvent) => {
    if (capturedUri) return;
    const { locationX, locationY } = e.nativeEvent;
    setFocusPoint({ x: locationX, y: locationY });
    setTimeout(() => {
      setFocusPoint(null);
    }, 1200);
  };

  // Dimensions: Standard 4:3 camera aspect ratio in landscape
  const screenWidth = Math.max(windowWidth, windowHeight);
  const screenHeight = Math.min(windowWidth, windowHeight);

  // Center camera container fills full vertical height with 4:3 ratio
  let cameraViewHeight = screenHeight;
  let cameraViewWidth = Math.round(cameraViewHeight * (4 / 3));

  if (cameraViewWidth > screenWidth) {
    cameraViewWidth = screenWidth;
    cameraViewHeight = Math.round(cameraViewWidth * (3 / 4));
  }

  // Left and right side panels occupy the remaining space
  const sidePanelWidth = Math.max(80, Math.floor((screenWidth - cameraViewWidth) / 2));

  // ID-1 Card Frame inside 4:3 Camera View (Aspect ratio ~1.586)
  const targetCardWidth = Math.round(cameraViewWidth * 0.86);
  let cardWidth = targetCardWidth;
  let cardHeight = Math.round(cardWidth / 1.586);
  const maxCardHeight = Math.round(cameraViewHeight * 0.78);

  if (cardHeight > maxCardHeight) {
    cardHeight = maxCardHeight;
    cardWidth = Math.round(cardHeight * 1.586);
  }

  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      let photoUri = '';
      let rawPhoto: any = null;

      if (cameraRef.current && Platform.OS !== 'web') {
        rawPhoto = await cameraRef.current.takePictureAsync({
          quality: 0.95,
        });
        if (rawPhoto?.uri) {
          photoUri = rawPhoto.uri;
        }
      }

      if (!photoUri || !rawPhoto) {
        Alert.alert('Chụp ảnh thất bại', 'Không thể lưu ảnh mặt sau CCCD. Vui lòng bấm chụp lại.');
        return;
      }

      // Auto-crop to CCCD card boundary with ~6% safety padding
      let finalUri = photoUri;
      try {
        let sourceUri = photoUri;
        let sourceWidth = rawPhoto.width || 4032;
        let sourceHeight = rawPhoto.height || 3024;

        // If photo orientation is portrait, rotate to landscape first
        if (sourceWidth < sourceHeight) {
          const rotated = await manipulateAsync(
            sourceUri,
            [{ rotate: 90 }],
            { compress: 0.88, format: SaveFormat.JPEG }
          );
          sourceUri = rotated.uri;
          sourceWidth = rotated.width;
          sourceHeight = rotated.height;
        }

        const scaleX = sourceWidth / cameraViewWidth;
        const scaleY = sourceHeight / cameraViewHeight;

        const frameLeft = (cameraViewWidth - cardWidth) / 2;
        const frameTop = (cameraViewHeight - cardHeight) / 2;

        const rawCropX = frameLeft * scaleX;
        const rawCropY = frameTop * scaleY;
        const rawCropW = cardWidth * scaleX;
        const rawCropH = cardHeight * scaleY;

        // Add 6% padding so corners and MRZ lines are never clipped
        const padX = rawCropW * 0.06;
        const padY = rawCropH * 0.06;

        const originX = Math.max(0, Math.round(rawCropX - padX));
        const originY = Math.max(0, Math.round(rawCropY - padY));
        const cropWidth = Math.min(sourceWidth - originX, Math.round(rawCropW + padX * 2));
        const cropHeight = Math.min(sourceHeight - originY, Math.round(rawCropH + padY * 2));

        const cropped = await manipulateAsync(
          sourceUri,
          [
            {
              crop: {
                originX,
                originY,
                width: cropWidth,
                height: cropHeight,
              },
            },
          ],
          {
            compress: 0.95,
            format: SaveFormat.JPEG,
          }
        );

        if (cropped?.uri) {
          finalUri = cropped.uri;
        }
      } catch (cropErr) {
        console.warn('Auto-crop CCCD back failed, fallback to original:', cropErr);
      }

      // Enter review mode with high-resolution cropped photo
      setEnableTorch(false);
      setCapturedUri(finalUri);
    } catch {
      Alert.alert('Lỗi máy ảnh', 'Có lỗi xảy ra khi chụp ảnh mặt sau CCCD. Vui lòng thử lại.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    setCapturedUri(null);
  };

  const handleConfirmPhoto = () => {
    if (!capturedUri) return;
    kycStore.setBack(capturedUri);
    const rawF = Array.isArray(frontUri) ? frontUri[0] : frontUri;
    if (rawF && !kycStore.frontUri) kycStore.setFront(rawF);

    const rawFront = Array.isArray(frontUri) ? frontUri[0] : frontUri;
    if (!rawFront) {
      Alert.alert('Thiếu ảnh mặt trước', 'Chưa có ảnh mặt trước CCCD. Vui lòng quay lại Bước 1.', [
        {
          text: 'Quay lại',
          onPress: () => router.replace('/kyc/camera-front'),
        },
      ]);
      return;
    }

    // Transition to Step 3: Front Facing Selfie (Portrait)
    router.push({
      pathname: '/kyc/camera-selfie',
      params: {
        frontUri: rawFront,
        backUri: capturedUri,
      },
    });
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={56} color={Colors.primary} />
          <Text style={styles.permissionTitle}>Cần Cấp Quyền Máy Ảnh</Text>
          <Text style={styles.permissionDesc}>
            TrustSim cần quyền sử dụng máy ảnh để chụp mặt sau Căn cước công dân.
          </Text>
          <Button
            title="Cấp Quyền Camera"
            variant="primary"
            size="md"
            onPress={requestPermission}
            style={{ marginTop: Spacing.md, width: '100%' }}
          />
          <Button
            title="Quay lại"
            variant="ghost"
            size="sm"
            onPress={handleBack}
            style={{ marginTop: Spacing.xs, width: '100%' }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. LEFT CONTROL PANEL */}
      <View
        style={[
          styles.sidePanel,
          styles.leftPanel,
          {
            width: sidePanelWidth,
            paddingLeft: Math.max(insets.left, Spacing.sm),
            paddingTop: Math.max(insets.top, 10),
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
          disabled={isCapturing}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textInverse} />
        </TouchableOpacity>

        <View style={styles.sideBadgeContainer}>
          <View style={[styles.sideBadge, capturedUri ? styles.sideBadgeReview : null]}>
            <Text style={styles.sideBadgeStep}>BƯỚC 2 / 3</Text>
            <Text style={styles.sideBadgeTitle}>
              {capturedUri ? 'XEM LẠI' : 'MẶT SAU'}
            </Text>
          </View>
          <Text style={styles.sideBadgeHint}>
            {capturedUri ? 'Kiểm tra độ nét' : 'Rõ chip và MRZ'}
          </Text>
        </View>

        <View style={{ width: 40, height: 40 }} />
      </View>

      {/* 2. CENTER 4:3 CAMERA VIEW CONTAINER (Zero Zoom In / True Aspect Ratio) */}
      <View
        style={[
          styles.cameraContainer,
          {
            width: cameraViewWidth,
            height: cameraViewHeight,
          },
        ]}
        onTouchStart={handleTouchFocus}
      >
        {/* Live Camera View */}
        {isCameraActive && isFocused && permission?.granted ? (
          <CameraView
            key="camera-back-active"
            ref={cameraRef}
            facing="back"
            ratio="4:3"
            enableTorch={enableTorch}
            autofocus="on"
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={styles.cameraPlaceholder}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.placeholderText}>Đang kích hoạt camera 4:3 mặt sau...</Text>
          </View>
        )}

        {/* Focus Indicator Reticle */}
        {focusPoint && !capturedUri && (
          <View
            style={[
              styles.focusBox,
              {
                left: focusPoint.x - 32,
                top: focusPoint.y - 32,
              },
            ]}
            pointerEvents="none"
          >
            <View style={styles.focusDot} />
          </View>
        )}

        {/* Viewfinder Overlay */}
        <View style={[styles.viewfinderOverlay, capturedUri ? styles.viewfinderReview : null]}>
          {capturedUri ? (
            // Review Mode: Captured & Cropped ID Card Photo
            <View style={[styles.reviewCardContainer, { width: cardWidth, height: cardHeight }]}>
              <Image
                source={{ uri: capturedUri }}
                style={styles.reviewImage}
                resizeMode="cover"
              />

              {/* Corner Indicators */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />

              <View style={styles.reviewBadge}>
                <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
                <Text style={styles.reviewBadgeText}>Ảnh đã căn chỉnh chuẩn</Text>
              </View>
            </View>
          ) : (
            // Camera Live Mode: ID-1 Card Frame Guide
            <View style={[styles.cardFrame, { width: cardWidth, height: cardHeight }]}>
              {/* Corner Indicators */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />

              {/* ID-1 Back Mock Markings: Chip & MRZ lines */}
              <View style={styles.cardBackTopRow}>
                <View style={styles.chipPlaceholder}>
                  <Ionicons name="hardware-chip-outline" size={18} color={Colors.accent} />
                  <Text style={styles.chipText}>CHIP ĐIỆN TỬ</Text>
                </View>

                <View style={styles.fingerprintPlaceholder}>
                  <Ionicons name="finger-print-outline" size={22} color="rgba(255, 255, 255, 0.4)" />
                </View>
              </View>

              {/* MRZ Lines Indicator */}
              <View style={styles.mrzContainer}>
                <View style={styles.mrzLine} />
                <View style={styles.mrzLine} />
                <View style={[styles.mrzLine, { width: '85%' }]} />
              </View>

              <Text style={styles.cardWatermark}>MẶT SAU CCCD GẮN CHIP</Text>
            </View>
          )}

          {/* Guide Instruction under Card Frame */}
          <View style={styles.guideTextContainer}>
            <Text style={styles.guideInstruction} numberOfLines={1} adjustsFontSizeToFit>
              {capturedUri
                ? 'Kiểm tra ảnh rõ chip, rõ các dòng ký tự mã MRZ'
                : 'Căn chỉnh mặt sau CCCD rõ chip và các dòng ký tự'}
            </Text>
            <Text style={styles.antiFraudHint} numberOfLines={1} adjustsFontSizeToFit>
              {capturedUri
                ? 'Không bị chói lóa đèn flash • Thông tin sắc nét'
                : 'Tránh phản chiếu đèn flash • Đặt thẻ trên mặt phẳng'}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. RIGHT CONTROL PANEL */}
      <View
        style={[
          styles.sidePanel,
          styles.rightPanel,
          {
            width: sidePanelWidth,
            paddingRight: Math.max(insets.right, Spacing.sm),
            paddingTop: Math.max(insets.top, 10),
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        {/* Top: Torch Button (Hidden in Review mode) */}
        {!capturedUri ? (
          <TouchableOpacity
            style={[styles.iconButton, enableTorch && styles.iconButtonActive]}
            onPress={() => setEnableTorch((prev) => !prev)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
            disabled={isCapturing}
          >
            <Ionicons
              name={enableTorch ? 'flash' : 'flash-off-outline'}
              size={20}
              color={enableTorch ? '#F59E0B' : Colors.textInverse}
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40, height: 40 }} />
        )}

        {/* Center: Shutter or Review Action Buttons */}
        <View style={styles.actionsContainer}>
          {capturedUri ? (
            <View style={styles.reviewActionsColumn}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.confirmButton}
                onPress={handleConfirmPhoto}
              >
                <Ionicons name="checkmark-circle" size={18} color={Colors.textInverse} />
                <Text style={styles.confirmButtonText}>Dùng ảnh</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.retakeButton}
                onPress={handleRetake}
              >
                <Ionicons name="refresh" size={16} color={Colors.textInverse} />
                <Text style={styles.retakeButtonText}>Chụp lại</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.shutterButton, isCapturing && styles.shutterDisabled]}
              onPress={handleCapture}
              disabled={isCapturing}
            >
              <View style={styles.shutterInner}>
                {isCapturing ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="camera" size={30} color={Colors.primary} />
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Spacer for perfect balance */}
        <View style={{ width: 40, height: 40 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraContainer: {
    position: 'relative',
    backgroundColor: '#000000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: Spacing.sm,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600',
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderReview: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  permissionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  permissionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  sidePanel: {
    height: '100%',
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  leftPanel: {
    alignItems: 'center',
  },
  rightPanel: {
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  sideBadgeContainer: {
    alignItems: 'center',
    gap: 4,
  },
  sideBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  sideBadgeReview: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: Colors.success,
  },
  sideBadgeStep: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  sideBadgeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textInverse,
    marginTop: 2,
  },
  sideBadgeHint: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  actionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFrame: {
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    position: 'relative',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  reviewCardContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: Colors.accent,
    backgroundColor: '#000000',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  reviewImage: {
    width: '100%',
    height: '100%',
  },
  reviewBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  reviewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Colors.accent,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: BorderRadius.lg,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: BorderRadius.lg,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: BorderRadius.lg,
  },
  cardBackTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  chipPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Colors.accent,
    marginLeft: 5,
  },
  fingerprintPlaceholder: {
    padding: 2,
  },
  mrzContainer: {
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  mrzLine: {
    height: 6.5,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  cardWatermark: {
    fontSize: 9.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.38)',
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  guideTextContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  guideInstruction: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textInverse,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  antiFraudHint: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.accent,
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  reviewActionsColumn: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  confirmButton: {
    width: '100%',
    maxWidth: 108,
    height: 46,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
    gap: 5,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  retakeButton: {
    width: '100%',
    maxWidth: 108,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
    gap: 5,
  },
  retakeButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  focusBox: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  focusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
});
