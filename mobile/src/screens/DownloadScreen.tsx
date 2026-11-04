/**
 * "Get the app" screen.
 *
 * Delivered as a portfolio demo, so the goal is to let an HR reviewer install
 * or download the app with one tap, from the browser, with no terminal:
 *   - Web/PWA : an "Install" button that triggers the browser prompt when
 *               available, otherwise plain instructions per platform.
 *   - Android : a direct link to the APK (built with EAS) once published.
 *   - iOS     : a note that a native IPA needs an Apple account, so the PWA is
 *               the iOS path (Add to Home Screen).
 *   - Desktop : "open in a new tab" / install as a desktop app via the browser.
 *
 * All buttons degrade gracefully: if a link is not published yet, the row shows
 * a clear "not published" state instead of a dead button.
 */
import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Page, Pill, ScreenHeader, SectionTitle } from '@/components/ui';
import { useInstallPrompt } from '@/pwa/useInstallPrompt';
import { colors, spacing, typography } from '@/theme/tokens';

// Fill these in after running EAS build. Kept empty on purpose: an empty string
// means "not published", and the UI says so rather than offering a broken link.
const APK_URL = '';
const PLAY_STORE_URL = '';

export function DownloadScreen(): React.JSX.Element {
  const { canInstall, installed, isIOS, isAndroid, promptInstall } = useInstallPrompt();

  const open = (url: string) => {
    if (url) void Linking.openURL(url);
  };

  return (
    <Page>
      <ScreenHeader
        title="Get the app"
        subtitle="Install Cara Care on your device, or keep using it in the browser."
      />

      <SectionTitle title="This device" />
      <Card style={styles.card}>
        {installed ? (
          <>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Installed</Text>
              <Pill label="ready" tone="success" />
            </View>
            <Text style={styles.hint}>
              You are running the installed app. It keeps working offline and opens without the
              browser bar.
            </Text>
          </>
        ) : canInstall ? (
          <>
            <Text style={styles.cardTitle}>Install on this device</Text>
            <Text style={styles.hint}>
              Adds Cara Care to your home screen or desktop like a native app — one tap, no store.
            </Text>
            <Button label="Install" onPress={() => void promptInstall()} testID="install-app" />
          </>
        ) : (
          <>
            <Text style={styles.cardTitle}>Add to home screen</Text>
            {isIOS ? (
              <Text style={styles.hint}>
                In Safari tap the Share button, then “Add to Home Screen”. iOS does not allow a page
                to trigger this automatically.
              </Text>
            ) : isAndroid ? (
              <Text style={styles.hint}>
                Open the browser menu (⋮) and choose “Install app” or “Add to Home screen”. If the
                option is missing, use Chrome.
              </Text>
            ) : (
              <Text style={styles.hint}>
                In Chrome or Edge, click the install icon in the address bar, or open the browser
                menu and choose “Install Cara Care”. On Firefox use “Add to Home Screen”.
              </Text>
            )}
          </>
        )}
      </Card>

      <SectionTitle title="Android" />
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Android app (APK)</Text>
          <Pill label={APK_URL ? 'available' : 'soon'} tone={APK_URL ? 'success' : 'neutral'} />
        </View>
        <Text style={styles.hint}>
          {APK_URL
            ? 'Download the APK and open it to install. You may need to allow installs from this source.'
            : 'The signed APK is produced with a cloud build. The web install above already gives you the full app on Android today.'}
        </Text>
        <Button
          label="Download APK"
          variant="secondary"
          onPress={() => open(APK_URL)}
          disabled={!APK_URL}
          testID="download-apk"
        />
        <Button
          label="Google Play"
          variant="secondary"
          onPress={() => open(PLAY_STORE_URL)}
          disabled={!PLAY_STORE_URL}
        />
      </Card>

      <SectionTitle title="iPhone / iPad" />
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>iOS</Text>
        <Text style={styles.hint}>
          A native iOS build requires an Apple developer account, so the iPhone path is the web
          install above: open this site in Safari, then “Add to Home Screen”. It behaves like a
          normal app and stores no health data on the server.
        </Text>
      </Card>

      <SectionTitle title="Desktop" />
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Windows, macOS, Linux</Text>
        <Text style={styles.hint}>
          Install the same way as a phone: the install icon in Chrome/Edge adds a desktop app with
          its own window and shortcut. No download required.
        </Text>
      </Card>

      <Text style={styles.footnote}>
        Demo build. Not a medical device. Do not enter real patient data.
      </Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    ...(typography.h3 as object),
    color: colors.textPrimary,
  },
  hint: {
    ...(typography.body as object),
    color: colors.textSecondary,
  },
  footnote: {
    ...(typography.caption as object),
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
