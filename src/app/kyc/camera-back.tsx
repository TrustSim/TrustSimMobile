import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
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

export default function CameraBackScreen() {
  const router = useRouter();
  const { frontUri } = useLocalSearchParams<{ frontUri: string }>();

  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<any>(null);

  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      let photoUri = 'mock_back_cccd_captured.jpg';

      if (cameraRef.current && Platform.OS !== 'web') {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: false,
        });
        if (photo?.uri) {
          photoUri = photo.uri;
        }
      }

      // Transition to Step 3: Front Facing Selfie
      router.push({
        pathname: '/kyc/camera-selfie',
        params: {
          frontUri: frontUri || 'mock_front.jpg',
          backUri: photoUri,
        },
      });
    } catch {
      router.push({
        pathname: '/kyc/camera-selfie',
        params: {
          frontUri: frontUri || 'mock_front.jpg',
          backUri: 'mock_back_cccd_captured.jpg',
        },
      });
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Live Back Camera View */}
      <CameraView ref={cameraRef} facing="back" style={StyleSheet.absoluteFill} />

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
            <Text style={styles.stepBadgeText}>Bước 2 / 3: Mặt Sau CCCD</Text>
          </View>
          <View style={{ width: 26 }} />
        </View>

        {/* Center Frame Cutout (ID-1 Standard with Chip & MRZ lines) */}
        <View style={styles.frameContainer}>
          <View style={styles.cardFrame}>
            {/* Corners */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Back Elements: Chip indicator */}
            <View style={styles.chipPlaceholder}>
              <Ionicons name="hardware-chip-outline" size={20} color={Colors.accent} />
              <Text style={styles.chipText}>CHIP ĐIỆN TỬ</Text>
            </View>

            {/* MRZ Lines Indicator */}
            <View style={styles.mrzContainer}>
              <View style={styles.mrzLine} />
              <View style={styles.mrzLine} />
              <View style={styles.mrzLine} />
            </View>
          </View>

          <Text style={styles.guideInstruction}>
            Chụp rõ chip điện tử và các dòng ký tự ở mặt sau thẻ
          </Text>
        </View>

        {/* Bottom Shutter Controls */}
        <View style={styles.bottomBar}>
          <Text style={styles.antiFraudHint}>
            Tránh phản chiếu đèn flash • Đặt thẻ trên mặt phẳng
          </Text>

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
  cardFrame: {
    width: 320,
    height: 202,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'transparent',
    position: 'relative',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
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
  chipPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.accent,
    marginLeft: 4,
  },
  mrzContainer: {
    gap: 6,
    marginTop: 20,
  },
  mrzLine: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  guideInstruction: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textInverse,
    textAlign: 'center',
    marginTop: Spacing.md,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
  antiFraudHint: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: Spacing.md,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
