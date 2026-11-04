/**
 * Secure token storage.
 *
 * Access/refresh tokens are bearer credentials for patient data, so they live in
 * the platform keystore (Keychain on iOS, Keystore-backed EncryptedSharedPrefs
 * on Android) via expo-secure-store — never in AsyncStorage or plain state.
 */
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'carecare.access';
const REFRESH_KEY = 'carecare.refresh';

export interface StoredTokens {
  access: string;
  refresh: string;
}

export const tokenStorage = {
  async save(tokens: StoredTokens): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, tokens.access),
      SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh),
    ]);
  },

  async load(): Promise<StoredTokens | null> {
    const [access, refresh] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    if (!access || !refresh) return null;
    return { access, refresh };
  },

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },
};
