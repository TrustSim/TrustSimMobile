import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  BackHandler,
  GestureResponderEvent,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { kycStore } from '../../services/kycStore';
import * as Brightness from 'expo-brightness';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { kycService } from '../../services/kycService';
import { extractErrorMessage } from '../../services/apiClient';

export default function CameraSelfieScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const { frontUri, backUri } = useLocalSearchParams<{ frontUri: string; backUri: string }>();
  const { refreshProfile } = useAuth();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  const cameraRef = useRef<any>(null);
  const originalBrightnessRef = useRef<number | null>(null);
  const wasUsingSystemBrightnessRef = useRef<boolean>(false);

  // Guarantee portrait orientation on this screen
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }, [])
  );

  // Safely restore brightness on Android and iOS across all states
  const restoreBrightness = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        // If Android was using system/auto brightness or returned negative value, reset override
        if (
          wasUsingSystemBrightnessRef.current ||
          (originalBrightnessRef.current !== null && originalBrightnessRef.current < 0)
        ) {
          await Brightness.restoreSystemBrightnessAsync();
        } else if (originalBrightnessRef.current !== null) {
          await Brightness.setBrightnessAsync(
            Math.max(0, Math.min(1, originalBrightnessRef.current))
          );
        }
      } else {
        if (originalBrightnessRef.current !== null) {
          await Brightness.setBrightnessAsync(
            Math.max(0, Math.min(1, originalBrightnessRef.current))
          );
        }
      }
    } catch {
      // Ignore restore error
    } finally {
      originalBrightnessRef.current = null;
      wasUsingSystemBrightnessRef.current = false;
    }
  }, []);

  // Mount camera with safety delay to unbind previous hardware session
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});

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

  // Safety net: Restore brightness on unmount
  useEffect(() => {
    return () => {
      restoreBrightness().catch(() => {});
    };
  }, [restoreBrightness]);

  // Safety net: Restore brightness if app goes to background / user locks screen mid-flash
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        restoreBrightness().catch(() => {});
        setIsFlashing(false);
        setIsCapturing(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [restoreBrightness]);

  const handleBack = useCallback(() => {
    if (isCapturing || isSubmitting) return;
    if (capturedUri) {
      setCapturedUri(null);
      return;
    }
    restoreBrightness().catch(() => {});
    router.back();
  }, [capturedUri, isCapturing, isSubmitting, restoreBrightness, router]);

  // Intercept Android hardware back button
  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [handleBack]);

  const handleTouchFocus = (e: GestureResponderEvent) => {
    if (capturedUri) return;
    const { pageX, pageY } = e.nativeEvent;
    setFocusPoint({ x: pageX, y: pageY });
    setTimeout(() => {
      setFocusPoint(null);
    }, 1200);
  };

  // Step A: Capture selfie with full screen flash, then enter review mode
  const handleCaptureSelfie = async () => {
    if (isCapturing || isSubmitting) return;

    let selfieUri = '';
    setIsCapturing(true);

    try {
      // 1. Read & save current brightness state (handle Android auto-brightness flag)
      try {
        if (Platform.OS === 'android') {
          wasUsingSystemBrightnessRef.current = await Brightness.isUsingSystemBrightnessAsync();
        }
        const current = await Brightness.getBrightnessAsync();
        originalBrightnessRef.current = current;
      } catch {
        // Fallback if platform does not permit reading brightness
      }

      // 2. Trigger white screen flash effect & elevate brightness to 100%
      setIsFlashing(true);
      try {
        await Brightness.setBrightnessAsync(1.0);
      } catch {
        // Fallback if platform does not permit setting brightness
      }

      // 3. Wait 450ms for camera ISP Auto-Exposure (AE/AWB) to converge on screen fill light
      await new Promise((resolve) => setTimeout(resolve, 450));

      // 4. Capture selfie photograph
      if (cameraRef.current && Platform.OS !== 'web') {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.95,
        });
        if (photo?.uri) {
          try {
            const optimized = await manipulateAsync(
              photo.uri,
              [{ resize: { width: 1200 } }],
              { compress: 0.88, format: SaveFormat.JPEG }
            );
            selfieUri = optimized.uri;
          } catch {
            selfieUri = photo.uri;
          }
        }
      }
    } catch {
      Alert.alert('Lỗi máy ảnh', 'Có lỗi xảy ra khi chụp ảnh chân dung. Vui lòng thử lại.');
      return;
    } finally {
      // 5. Instantly restore original brightness and dismiss screen flash
      await restoreBrightness();
      setIsFlashing(false);
      setIsCapturing(false);
    }

    if (!selfieUri) {
      Alert.alert('Chụp ảnh thất bại', 'Không thể chụp ảnh khuôn mặt selfie. Vui lòng bấm chụp lại.');
      return;
    }

    // 6. Switch to Review mode so user can verify photo quality before submitting
    setCapturedUri(selfieUri);
  };

  // Step B: User decides to retake
  const handleRetake = () => {
    if (isSubmitting) return;
    setCapturedUri(null);
  };

  // Step C: User confirms photo and submits all 3 KYC photos for verification
  const handleSubmitVerification = async () => {
    if (isSubmitting || !capturedUri) return;

    const rawFront = kycStore.frontUri || (Array.isArray(frontUri) ? frontUri[0] : frontUri);
    const rawBack = kycStore.backUri || (Array.isArray(backUri) ? backUri[0] : backUri);

    if (!rawFront) {
      Alert.alert(
        'Thiếu ảnh mặt trước CCCD',
        'Không tìm thấy ảnh mặt trước CCCD. Vui lòng quay lại Bước 1 để chụp.',
        [{ text: 'Quay lại', onPress: () => router.replace('/kyc/camera-front') }]
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await kycService.submitEkyc(
        rawFront,
        rawBack || '',
        capturedUri
      );

      if (res.success && res.data) {
        kycStore.clear();
        await refreshProfile();
        router.replace({
          pathname: '/kyc/result',
          params: {
            fullName: res.data.extractedFullName,
            identityNumber: res.data.extractedIdentityNumber,
            score: res.data.faceSimilarityScore.toString(),
            status: res.data.verificationStatus,
          },
        });
      } else {
        throw new Error(res.message || 'Xác thực không thành công');
      }
    } catch (err: any) {
      const errorMsg =
        err?.message ||
        extractErrorMessage(
          err,
          'Không thể gửi ảnh xác thực. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.'
        );
      Alert.alert('Xác thực không thành công', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
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
            TrustSim cần quyền sử dụng máy ảnh để chụp chân dung khuôn mặt xác thực eKYC.
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
            onPress={() => router.back()}
            style={{ marginTop: Spacing.xs, width: '100%' }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Live Front Camera with focus lifecycle safety */}
      {isCameraActive && isFocused && permission?.granted ? (
        <CameraView
          key="camera-selfie-active"
          ref={cameraRef}
          facing="front"
          mirror={true}
          autofocus="on"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={styles.cameraPlaceholder}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.placeholderText}>Đang kích hoạt camera trước...</Text>
        </View>
      )}

      {/* Screen Flash Light Overlay (Fill Light on Capture) */}
      {isFlashing && (
        <View style={styles.flashOverlay} pointerEvents="none">
          <View style={styles.flashContent}>
            <Ionicons name="sunny" size={40} color={Colors.accent} />
            <Text style={styles.flashTitle}>Đang trợ sáng & chụp chân dung...</Text>
            <Text style={styles.flashSubtitle}>Vui lòng giữ yên khuôn mặt</Text>
          </View>
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

      {/* Camera UI Overlay */}
      <SafeAreaView
        style={[styles.overlay, capturedUri ? styles.overlayReview : null]}
        onTouchStart={handleTouchFocus}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            disabled={isCapturing || isSubmitting}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textInverse} />
          </TouchableOpacity>

          <View style={[styles.stepBadge, capturedUri ? styles.stepBadgeReview : null]}>
            <Text style={styles.stepBadgeText}>
              {capturedUri ? 'Bước 3 / 3: Xem Lại Chân Dung' : 'Bước 3 / 3: Chân Dung Selfie'}
            </Text>
          </View>

          <View style={{ width: 38 }} />
        </View>

        {/* Center Frame: Oval Viewfinder or Captured Selfie Preview */}
        <View style={styles.frameContainer}>
          {capturedUri ? (
            // Review Mode: Captured Selfie Photo
            <View style={styles.reviewOvalFrame}>
              <Image
                source={{ uri: capturedUri }}
                style={styles.reviewSelfieImage}
                resizeMode="cover"
              />
              <View style={styles.reviewBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.reviewBadgeText}>Ảnh vừa chụp</Text>
              </View>
            </View>
          ) : (
            // Camera Live Mode: Oval Face Guide
            <View style={styles.ovalFrame}>
              <View style={styles.faceTargetCrosshair} />
            </View>
          )}

          <Text style={styles.guideInstruction} numberOfLines={1} adjustsFontSizeToFit>
            {capturedUri
              ? 'Kiểm tra ảnh chân dung của bạn'
              : 'Đưa khuôn mặt vào giữa khung bầu dục • Nhìn thẳng máy ảnh'}
          </Text>
          <Text style={styles.guideSub} numberOfLines={2}>
            {capturedUri
              ? 'Khuôn mặt rõ nét, nhìn thẳng, không bị mờ nhòe hoặc lóa sáng'
              : 'Không đeo kính râm, khẩu trang • Màn hình sẽ tự động trợ sáng khi chụp'}
          </Text>
        </View>

        {/* Bottom Shutter & Processing Controls */}
        <View style={styles.bottomBar}>
          {isSubmitting && (
            <View style={styles.submittingBox}>
              <ActivityIndicator size="small" color={Colors.accent} />
              <Text style={styles.submittingText}>
                Hệ thống đang nhận diện & đối chiếu khuôn mặt...
              </Text>
            </View>
          )}

          {capturedUri ? (
            // Review Action Buttons: Retake vs Submit
            <View style={styles.reviewActionsRow}>
              <TouchableOpacity
                style={styles.selfieRetakeBtn}
                onPress={handleRetake}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={18} color={Colors.textInverse} />
                <Text style={styles.selfieRetakeText}>Chụp lại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selfieConfirmBtn, isSubmitting && styles.selfieConfirmBtnDisabled]}
                onPress={handleSubmitVerification}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Ionicons name="shield-checkmark" size={20} color={Colors.textInverse} />
                )}
                <Text style={styles.selfieConfirmText}>
                  {isSubmitting ? 'Đang gửi...' : 'Gửi xác thực'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Live Shutter Button
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.shutterButton,
                (isCapturing || isSubmitting) && styles.shutterDisabled,
              ]}
              onPress={handleCaptureSelfie}
              disabled={isCapturing || isSubmitting}
            >
              <View style={styles.shutterInner}>
                {isCapturing || isSubmitting ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="camera" size={32} color={Colors.primary} />
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  flashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  flashTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: Spacing.md,
    letterSpacing: 0.2,
  },
  flashSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  overlayReview: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  stepBadgeReview: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: Colors.success,
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textInverse,
  },
  frameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovalFrame: {
    width: 250,
    height: 320,
    borderRadius: 125,
    borderWidth: 3,
    borderColor: Colors.success,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewOvalFrame: {
    width: 250,
    height: 320,
    borderRadius: 125,
    borderWidth: 3,
    borderColor: Colors.success,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  reviewSelfieImage: {
    width: '100%',
    height: '100%',
  },
  reviewBadge: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  faceTargetCrosshair: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.45)',
  },
  guideInstruction: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textInverse,
    textAlign: 'center',
    marginTop: Spacing.lg,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  guideSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: Spacing.lg,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
  submittingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  submittingText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textInverse,
    marginLeft: Spacing.xs,
  },
  shutterButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  reviewActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    width: '100%',
    maxWidth: 380,
  },
  selfieRetakeBtn: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  selfieRetakeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  selfieConfirmBtn: {
    flex: 1.4,
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  selfieConfirmBtnDisabled: {
    opacity: 0.6,
  },
  selfieConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  focusBox: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: BorderRadius.full,
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
