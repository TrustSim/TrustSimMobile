import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

class StorageService {
  private memoryStore: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return this.memoryStore.get(key) || null;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return this.memoryStore.get(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      this.memoryStore.set(key, value);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn('Storage setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      this.memoryStore.delete(key);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn('Storage removeItem error:', error);
    }
  }
}

export const appStorage = new StorageService();
