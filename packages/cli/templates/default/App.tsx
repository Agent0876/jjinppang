import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [count, setCount] = useState(0);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#121214' : '#f8f9fa',
    flex: 1,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.badge}>⚡ Powered by Bun</Text>
          <Text style={[styles.title, { color: isDarkMode ? '#ffffff' : '#111827' }]}>
            HelloWorld
          </Text>
          <Text style={[styles.subtitle, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>
            Ultra-fast bundling with Bun & OXC
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: isDarkMode ? '#1e1e24' : '#ffffff' }]}>
          <Text style={[styles.cardTitle, { color: isDarkMode ? '#f3f4f6' : '#1f2937' }]}>
            Fast Refresh & HMR
          </Text>
          <Text style={[styles.cardText, { color: isDarkMode ? '#9ca3af' : '#4b5563' }]}>
            Modify <Text style={styles.code}>App.tsx</Text> and save to see instantaneous updates.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setCount((c) => c + 1)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Clicks: {count} 🔥</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: isDarkMode ? '#1e1e24' : '#ffffff' }]}>
          <Text style={[styles.cardTitle, { color: isDarkMode ? '#f3f4f6' : '#1f2937' }]}>
            Zero-Config Tooling
          </Text>
          <Text style={[styles.cardText, { color: isDarkMode ? '#9ca3af' : '#4b5563' }]}>
            • <Text style={styles.bold}>Linter:</Text> oxlint (Rust-based)
            {'\n'}• <Text style={styles.bold}>Formatter:</Text> oxfmt
            {'\n'}• <Text style={styles.bold}>Bundler:</Text> Bun Native Bundler
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: 32,
  },
  badge: {
    backgroundColor: '#ff70a6',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 22,
  },
  code: {
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#ff70a6',
  },
  bold: {
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#ff70a6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default App;
