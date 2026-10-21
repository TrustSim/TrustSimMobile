import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { kycService } from '../../services/kycService';

export default function CameraSelfieScreen() {
  const router = useRouter();
  const { frontUri, backUri } = useLocalSearchParams<{ frontUri: string; backUri: string }>();
  const { refreshProfile } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const cameraRef = useRef<any>(null);

  const handleCaptureAndSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let selfieUri = 'selfie_captured.jpg';

      if (cameraRef.current && Platform.OS !== 'web') {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: false,
        });
        if (photo?.uri) {
          selfieUri = photo.uri;
        }
      }

      const res = await kycService.submitEkyc(
        frontUri || 'front.jpg',
        backUri || 'back.jpg',
        selfieUri
      );

      if (res.success && res.data) {
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
      Alert.alert(
        'Xác thực không thành công',
        err?.message || 'Không thể gửi ảnh xác thực. Vui lòng kiểm tra lại kết nối mạng và thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Live Front Camera */}
      <CameraView ref={cameraRef} facing="front" style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.overlay}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={26} color={Colors.textInverse} />
          </TouchableOpacity>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Bước 3 / 3: Chân Dung Selfie</Text>
          </View>
          <View style={{ width: 26 }} />
        </View>

        {/* Center Oval Face Guide */}
        <View style={styles.frameContainer}>
          <View style={styles.ovalFrame}>
            <View style={styles.faceTargetCrosshair} />
          </View>

          <Text style={styles.guideInstruction}>
            Đưa khuôn mặt vào giữa khung bầu dục • Nhìn thẳng máy ảnh
          </Text>
          <Text style={styles.guideSub}>Không đeo kính râm, giữ máy yên 3 giây</Text>
        </View>

        {/* Bottom Shutter Controls */}
        <View style={styles.bottomBar}>
          {isSubmitting && (
            <View style={styles.submittingBox}>
              <ActivityIndicator size="small" color={Colors.accent} />
              <Text style={styles.submittingText}>
                Hệ thống đang tiến hành nhận diện và đối chiếu khuôn mặt...
              </Text>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.shutterButton, isSubmitting && styles.shutterDisabled]}
            onPress={handleCaptureAndSubmit}
            disabled={isSubmitting}
          >
            <View style={styles.shutterInner}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="camera" size={32} color={Colors.primary} />
              )}
            </View>
          </TouchableOpacity>
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
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  stepBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
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
    width: 240,
    height: 310,
    borderRadius: 120,
    borderWidth: 3,
    borderColor: Colors.success,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceTargetCrosshair: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.4)',
  },
  guideInstruction: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textInverse,
    textAlign: 'center',
    marginTop: Spacing.lg,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  guideSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
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
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
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
});
