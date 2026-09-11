import fs from 'node:fs';
import path from 'node:path';

export interface SetupWebviewResult {
  configured: boolean;
  componentPath: string;
}

/**
 * Configures react-native-webview with a typed WebView demo component and dependency.
 */
export function setupWebview(
  projectDir: string,
  projectName: string,
  dryRun = false,
  _hasRedux = false
): SetupWebviewResult {
  const componentsDir = path.join(projectDir, 'src/components');
  const webviewComponentPath = path.join(componentsDir, 'WebViewDemo.tsx');
  const appPath = path.join(projectDir, 'App.tsx');

  if (dryRun) {
    return { configured: true, componentPath: webviewComponentPath };
  }

  fs.mkdirSync(componentsDir, { recursive: true });

  // 1. src/components/WebViewDemo.tsx
  const webviewComponentContent = `import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

export interface WebViewDemoProps {
  initialUrl?: string;
}

export function WebViewDemo({ initialUrl = 'https://reactnative.dev' }: WebViewDemoProps) {
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>🌐 Native WebView Demo</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.pillButton, url === 'https://reactnative.dev' && styles.pillActive]}
            onPress={() => setUrl('https://reactnative.dev')}
            activeOpacity={0.8}
          >
            <Text style={styles.pillText}>React Native</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillButton, url === 'https://bun.sh' && styles.pillActive]}
            onPress={() => setUrl('https://bun.sh')}
            activeOpacity={0.8}
          >
            <Text style={styles.pillText}>Bun.sh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.webviewWrapper}>
        <WebView
          source={{ uri: url }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          style={styles.webview}
        />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#764abc" />
            <Text style={styles.loadingText}>Loading web content...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 480,
    height: 360,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e1e24',
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#27272a',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillButton: {
    backgroundColor: '#3f3f46',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillActive: {
    backgroundColor: '#764abc',
  },
  pillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  webviewWrapper: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24, 24, 27, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#f3f4f6',
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
  },
});
`;
  fs.writeFileSync(webviewComponentPath, webviewComponentContent, 'utf8');

  // 2. Update App.tsx if it exists
  if (fs.existsSync(appPath)) {
    let appContent = fs.readFileSync(appPath, 'utf8');

    // Add import if not present
    if (!appContent.includes('WebViewDemo')) {
      appContent = `import { WebViewDemo } from './src/components/WebViewDemo';\n` + appContent;
    }

    // Insert WebViewDemo into App layout
    if (appContent.includes('<CounterSection />')) {
      // Redux app: add WebViewDemo below CounterSection
      appContent = appContent.replace(
        '<CounterSection />',
        `<CounterSection />\n\n        <WebViewDemo />`
      );
    } else if (appContent.includes('</ScrollView>')) {
      // Standard app: add WebViewDemo before closing ScrollView
      appContent = appContent.replace('</ScrollView>', `  <WebViewDemo />\n      </ScrollView>`);
    }

    fs.writeFileSync(appPath, appContent, 'utf8');
  }

  // 3. Add dependency to package.json
  const pkgPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies['react-native-webview'] = '^13.16.0';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  }

  return { configured: true, componentPath: webviewComponentPath };
}
