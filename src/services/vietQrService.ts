import { Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';

// Safe lazy import to prevent top-level native module loading errors in Expo Go
const getMediaLibrary = async () => {
  try {
    // Expo Go supports the legacy MediaLibrary native module
    return await import('expo-media-library/legacy');
  } catch {
    try {
      return await import('expo-media-library');
    } catch {
      return null;
    }
  }
};

export const vietQrService = {
  // Copy content to device clipboard
  async copyToClipboard(text: string, label = 'Thông tin'): Promise<boolean> {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Đã sao chép', `${label} đã được lưu vào bộ nhớ tạm: ${text}`);
      return true;
    } catch {
      Alert.alert('Lỗi', 'Không thể sao chép thông tin');
      return false;
    }
  },

  // Download VietQR image and save directly to phone photo gallery under 'TrustSim' album
  async saveQrImageToGallery(qrUrl: string, transactionCode: string): Promise<boolean> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(qrUrl, '_blank');
        return true;
      }
      return false;
    }

    try {
      const MediaLibrary = await getMediaLibrary();
      if (!MediaLibrary || !MediaLibrary.requestPermissionsAsync) {
        Alert.alert('Thông báo', 'Thiết bị không hỗ trợ ghi trực tiếp vào thư viện ảnh.');
        return false;
      }

      // 1. Request MediaLibrary permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Cần cấp quyền',
          'Vui lòng cấp quyền truy cập Thư viện ảnh trong Cài đặt máy để lưu mã VietQR.'
        );
        return false;
      }

      // 2. Download file to cache directory using modern SDK 57 File API
      const destination = new File(Paths.cache, `VietQR_${transactionCode}.png`);
      const downloadedFile = await File.downloadFileAsync(qrUrl, destination, { idempotent: true });

      // 3. Save into Photo Library in album 'TrustSim'
      if (MediaLibrary.createAssetAsync) {
        const asset = await MediaLibrary.createAssetAsync(downloadedFile.uri);
        try {
          if (MediaLibrary.createAlbumAsync) {
            await MediaLibrary.createAlbumAsync('TrustSim', asset, false);
          }
        } catch {
          // Album may already exist or creation varies
        }
      } else if (MediaLibrary.saveToLibraryAsync) {
        await MediaLibrary.saveToLibraryAsync(downloadedFile.uri);
      }

      Alert.alert(
        'Đã lưu mã QR!',
        'Ảnh mã QR đã được lưu vào Thư viện ảnh của máy. Bạn có thể mở ứng dụng ngân hàng và chọn ảnh để quét mã nhanh chóng.'
      );
      return true;
    } catch {
      Alert.alert('Lỗi lưu ảnh', 'Không thể lưu mã QR vào thư viện ảnh.');
      return false;
    }
  },
};
