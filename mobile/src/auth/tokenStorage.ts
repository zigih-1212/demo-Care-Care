/**
 * Token storage.
 *
 * Access/refresh tokens are bearer credentials for patient data, so on mobile
 * they live in the platform keystore (Keychain on iOS, Keystore-backed
 * EncryptedSharedPrefs on Android) via expo-secure-store — never in AsyncStorage
 * or plain in-memory state.
 *
 * expo-secure-store has no web implementation, so on web we fall back to
 * localStorage. That is acceptable for a browser demo session but is NOT the
 * production answer for web (there you would use httpOnly cookies or a BFF);
 * this is called out in TRUST.md.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'carecare.access';
const REFRESH_KEY = 'carecare.refresh';

export interface StoredTokens {
  access: string;
  refresh: string;
}

const isWeb = Platform.OS === 'web';

const webStorage = {
  async set(key: string, value: string): Promise<void> {
    window.localStorage.setItem(key, value);
  },
  async get(key: string): Promise<string | null> {
    return window.localStorage.getItem(key);
  },
  async remove(key: string): Promise<void> {
    window.localStorage.removeItem(key);
  },
};

const nativeStorage = {
  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async remove(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};

const backend = isWeb ? webStorage : nativeStorage;

export const tokenStorage = {
  async save(tokens: StoredTokens): Promise<void> {
    await Promise.all([
      backend.set(ACCESS_KEY, tokens.access),
      backend.set(REFRESH_KEY, tokens.refresh),
    ]);
  },

  async load(): Promise<StoredTokens | null> {
    const [access, refresh] = await Promise.all([
      backend.get(ACCESS_KEY),
      backend.get(REFRESH_KEY),
    ]);
    if (!access || !refresh) return null;
    return { access, refresh };
  },

  async clear(): Promise<void> {
    await Promise.all([backend.remove(ACCESS_KEY), backend.remove(REFRESH_KEY)]);
  },
};
