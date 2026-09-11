import fs from 'node:fs';
import path from 'node:path';

export interface SetupReduxResult {
  configured: boolean;
  storeDir: string;
}

/**
 * Configures Redux Toolkit (@reduxjs/toolkit & react-redux) with typed store and hooks.
 */
export function setupRedux(
  projectDir: string,
  projectName: string,
  dryRun = false
): SetupReduxResult {
  const storeDir = path.join(projectDir, 'src/store');
  const storeIndexPath = path.join(storeDir, 'index.ts');
  const storeHooksPath = path.join(storeDir, 'hooks.ts');
  const counterSlicePath = path.join(storeDir, 'counterSlice.ts');
  const appPath = path.join(projectDir, 'App.tsx');

  if (dryRun) {
    return { configured: true, storeDir };
  }

  fs.mkdirSync(storeDir, { recursive: true });

  // 1. src/store/counterSlice.ts
  const counterSliceContent = `import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface CounterState {
  value: number;
}

const initialState: CounterState = {
  value: 0,
};

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
    reset: (state) => {
      state.value = 0;
    },
  },
});

export const { increment, decrement, incrementByAmount, reset } = counterSlice.actions;
export default counterSlice.reducer;
`;
  fs.writeFileSync(counterSlicePath, counterSliceContent, 'utf8');

  // 2. src/store/hooks.ts
  const hooksContent = `import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
`;
  fs.writeFileSync(storeHooksPath, hooksContent, 'utf8');

  // 3. src/store/index.ts
  const storeIndexContent = `import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './counterSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export { useAppDispatch, useAppSelector } from './hooks';
`;
  fs.writeFileSync(storeIndexPath, storeIndexContent, 'utf8');

  // 4. Update App.tsx with Redux Provider & Counter demo
  const appContent = `import React from 'react';
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
import { Provider } from 'react-redux';
import { store, useAppDispatch, useAppSelector } from './src/store';
import { increment, decrement, reset } from './src/store/counterSlice';

function CounterSection() {
  const isDarkMode = useColorScheme() === 'dark';
  const count = useAppSelector((state) => state.counter.value);
  const dispatch = useAppDispatch();

  return (
    <View style={[styles.card, { backgroundColor: isDarkMode ? '#1e1e24' : '#ffffff' }]}>
      <Text style={[styles.cardTitle, { color: isDarkMode ? '#f3f4f6' : '#1f2937' }]}>
        Redux Toolkit State
      </Text>
      <Text style={[styles.cardText, { color: isDarkMode ? '#9ca3af' : '#4b5563' }]}>
        Global state managed with @reduxjs/toolkit & react-redux.
      </Text>

      <View style={styles.counterRow}>
        <TouchableOpacity
          style={[styles.counterButton, { backgroundColor: '#ef4444' }]}
          onPress={() => dispatch(decrement())}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>- 1</Text>
        </TouchableOpacity>

        <Text style={[styles.counterValue, { color: isDarkMode ? '#ffffff' : '#111827' }]}>
          {count}
        </Text>

        <TouchableOpacity
          style={[styles.counterButton, { backgroundColor: '#10b981' }]}
          onPress={() => dispatch(increment())}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>+ 1</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.resetButton}
        onPress={() => dispatch(reset())}
        activeOpacity={0.8}
      >
        <Text style={styles.resetButtonText}>Reset Counter</Text>
      </TouchableOpacity>
    </View>
  );
}

function AppContent() {
  const isDarkMode = useColorScheme() === 'dark';

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
          <Text style={styles.badge}>⚡ Powered by Bun & Redux Toolkit</Text>
          <Text style={[styles.title, { color: isDarkMode ? '#ffffff' : '#111827' }]}>
            ${projectName}
          </Text>
          <Text style={[styles.subtitle, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>
            Ultra-fast bundling with Bun, Redux & OXC
          </Text>
        </View>

        <CounterSection />

        <View style={[styles.card, { backgroundColor: isDarkMode ? '#1e1e24' : '#ffffff' }]}>
          <Text style={[styles.cardTitle, { color: isDarkMode ? '#f3f4f6' : '#1f2937' }]}>
            Zero-Config Tooling
          </Text>
          <Text style={[styles.cardText, { color: isDarkMode ? '#9ca3af' : '#4b5563' }]}>
            • <Text style={styles.bold}>State:</Text> Redux Toolkit (RTK)
            {'\\n'}• <Text style={styles.bold}>Linter:</Text> oxlint (Rust-based)
            {'\\n'}• <Text style={styles.bold}>Formatter:</Text> oxfmt
            {'\\n'}• <Text style={styles.bold}>Bundler:</Text> Bun Native Bundler
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
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
    backgroundColor: '#764abc',
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
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    gap: 20,
  },
  counterValue: {
    fontSize: 32,
    fontWeight: '800',
    minWidth: 60,
    textAlign: 'center',
  },
  counterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  bold: {
    fontWeight: '700',
  },
});

export default App;
`;
  fs.writeFileSync(appPath, appContent, 'utf8');

  // 5. Add dependencies to package.json
  const pkgPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies['@reduxjs/toolkit'] = '^2.6.1';
    pkg.dependencies['react-redux'] = '^9.2.0';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  }

  return { configured: true, storeDir };
}
