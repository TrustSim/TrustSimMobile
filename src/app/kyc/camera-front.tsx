import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';

export default function CameraFrontScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<any>(null);

  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      let photoUri = 'mock_front_cccd_captured.jpg';

      if (cameraRef.current && Platform.OS !== 'web') {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: false,
        });
        if (photo?.uri) {
          photoUri = photo.uri;
        }
      }

      // Transition to Step 2: Back of CCCD
      router.push({
        pathname: '/kyc/camera-back',
        params: { frontUri: photoUri },
      });
    } catch {
      // Fallback
      router.push({
        pathname: '/kyc/camera-back',
        params: { frontUri: 'mock_front_cccd_captured.jpg' },
      });
    } finally {
      setIsCapturing(false);
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
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={60} color={Colors.primary} />
          <Text style={styles.permissionTitle}>Cần Cấp Quyền Máy Ảnh</Text>
          <Text style={styles.permissionDesc}>
            TrustSim cần quyền sử dụng máy ảnh để chụp Căn cước công dân nhằm xác minh danh tính
            tài khoản của bạn.
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
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera Live View (Back Facing) */}
      <CameraView ref={cameraRef} facing="back" style={StyleSheet.absoluteFill} />

      {/* Dark Overlay with ID-1 Cutout Frame */}
      <SafeAreaView style={styles.overlay}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color={Colors.textInverse} />
          </TouchableOpacity>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Bước 1 / 3: Mặt Trước CCCD</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        {/* Center Frame Cutout (ID-1 Standard: ~1.586:1) */}
        <View style={styles.frameContainer}>
          <View style={styles.cardFrame}>
            {/* Corner Indicators */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Guide Elements */}
            <View style={styles.cardGuideRow}>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color="rgba(255, 255, 255, 0.4)" />
              </View>
              <View style={styles.infoLinesPlaceholder}>
                <View style={styles.infoLine} />
                <View style={[styles.infoLine, { width: '80%' }]} />
                <View style={[styles.infoLine, { width: '60%' }]} />
              </View>
            </View>
          </View>

          <Text style={styles.guideInstruction}>
            Đặt toàn bộ mặt trước thẻ CCCD vào trong khung chữ nhật
          </Text>
        </View>

        {/* Bottom Shutter Controls */}
        <View style={styles.bottomBar}>
          <Text style={styles.antiFraudHint}>
            Vui lòng chụp trực tiếp rõ nét thẻ Căn cước công dân của bạn
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
    padding: Spacing.xl,
  },
  permissionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
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
    height: 202, // standard ID-1 ratio (1.586)
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'transparent',
    position: 'relative',
    justifyContent: 'center',
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
  cardGuideRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 60,
    height: 75,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLinesPlaceholder: {
    flex: 1,
    marginLeft: Spacing.md,
    gap: 8,
  },
  infoLine: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
