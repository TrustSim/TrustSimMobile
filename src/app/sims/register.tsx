import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { BottomNavBar } from '../../components/BottomNavBar';
import { Input } from '../../components/Input';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { extractErrorMessage } from '../../services/apiClient';
import { simService } from '../../services/simService';
import { FormatRhythmDto } from '../../types';

export default function RegisterSimScreen() {
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [price, setPrice] = useState('');
  const [carrierCode, setCarrierCode] = useState('MBF');
  const [rhythms, setRhythms] = useState<FormatRhythmDto[]>([]);
  const [selectedRhythmId, setSelectedRhythmId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    simService
      .getFormatRhythms()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setRhythms(res.data);
          setSelectedRhythmId(res.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const carriers = [
    { code: 'MBF', name: 'Mobifone', id: 'b1c2d3e4-0000-0000-0000-000000000001' },
    { code: 'VTL', name: 'Viettel', id: 'b1c2d3e4-0000-0000-0000-000000000002' },
    { code: 'VNP', name: 'Vinaphone', id: 'b1c2d3e4-0000-0000-0000-000000000003' },
  ];

  const handleRegister = async () => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

    if (cleanPhone.length < 10) {
      setError('Vui lòng nhập số điện thoại hợp lệ 10 số.');
      return;
    }

    if (!selectedRhythmId) {
      setError('Vui lòng chọn kiểu nhịp định dạng số SIM.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await simService.registerSim({
        phoneNumber: cleanPhone,
        formatRhythmId: selectedRhythmId,
      });

      Alert.alert(
        'Đăng ký SIM thành công',
        `Số SIM ${cleanPhone} đã được thêm vào hệ thống chờ niêm yết bán hoặc mở phòng đấu giá.`,
        [{ text: 'Về Kho SIM', onPress: () => router.back() }]
      );
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Lỗi đăng ký SIM mới.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Đăng Ký SIM Mới" showBack onBack={() => router.back()} showHome />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <Text style={styles.title}>Thêm SIM Lên Sàn TrustSim</Text>
            <Text style={styles.desc}>
              Sau khi thêm số SIM, bạn có thể niêm yết giá bán công khai hoặc tạo phòng đấu giá
              trực tuyến.
            </Text>

            {error && (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorAlertText}>{error}</Text>
              </View>
            )}

            <Input
              label="Số điện thoại SIM"
              placeholder="Ví dụ: 0988888888"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              maxLength={12}
              leftIcon={<Ionicons name="phone-portrait-outline" size={18} color={Colors.primary} />}
            />

            <Input
              label="Giá niêm yết mong muốn (VNĐ)"
              placeholder="Ví dụ: 50000000"
              value={price}
              onChangeText={(val) => setPrice(val.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              leftIcon={<Ionicons name="cash-outline" size={18} color={Colors.accent} />}
            />

            {/* Carrier selection */}
            <Text style={styles.fieldLabel}>CHỌN NHÀ MẠNG:</Text>
            <View style={styles.carrierRow}>
              {carriers.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={[
                    styles.carrierChip,
                    carrierCode === c.code && styles.carrierChipSelected,
                  ]}
                  onPress={() => setCarrierCode(c.code)}
                >
                  <Text
                    style={[
                      styles.carrierChipText,
                      carrierCode === c.code && styles.carrierChipTextSelected,
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Format Rhythm selection from Backend */}
            <Text style={styles.fieldLabel}>ĐỊNH DẠNG / NHỊP SIM:</Text>
            <View style={styles.carrierRow}>
              {rhythms.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.carrierChip,
                    selectedRhythmId === r.id && styles.carrierChipSelected,
                  ]}
                  onPress={() => setSelectedRhythmId(r.id)}
                >
                  <Text
                    style={[
                      styles.carrierChipText,
                      selectedRhythmId === r.id && styles.carrierChipTextSelected,
                    ]}
                  >
                    {r.formatRhythmName || r.value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="THÊM SIM MỚI"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleRegister}
              style={{ marginTop: Spacing.lg }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNavBar activeTab="sims" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  card: {
    padding: Spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  desc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  errorAlertText: {
    flex: 1,
    color: Colors.danger,
    fontSize: 13,
    marginLeft: Spacing.xs,
    fontWeight: '500',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  carrierRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  carrierChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  carrierChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  carrierChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  carrierChipTextSelected: {
    color: Colors.textInverse,
  },
});
