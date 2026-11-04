/* Global test setup: silence noisy native modules not under test. */
import '@testing-library/jest-native/extend-expect';

jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    setItemAsync: jest.fn(async (k: string, v: string) => {
      store[k] = v;
    }),
    getItemAsync: jest.fn(async (k: string) => store[k] ?? null),
    deleteItemAsync: jest.fn(async (k: string) => {
      delete store[k];
    }),
  };
});
