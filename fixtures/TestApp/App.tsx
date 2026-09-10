/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NewAppScreen } from '@react-native/new-app-screen';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Svg, { Circle, Rect, Path, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from 'react-native';
import { useEffect, useState } from 'react';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const rotation = useSharedValue(0);
  const [storageStatus, setStorageStatus] = useState('Checking AsyncStorage...');

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1
    );

    async function testStorage() {
      try {
        await AsyncStorage.setItem('bun_test_key', 'Bun Native + AsyncStorage OK!');
        const val = await AsyncStorage.getItem('bun_test_key');
        setStorageStatus(val || 'No value');
      } catch (e) {
        setStorageStatus(`AsyncStorage Error: ${e}`);
      }
    }
    testStorage();
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      <View style={{ padding: 20, alignItems: 'center', backgroundColor: '#eef2ff' }}>
        <Animated.View style={animatedStyle}>
          <Svg height="100" width="100" viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="45" stroke="#4f46e5" strokeWidth="2.5" fill="#c7d2fe" />
            <Rect x="30" y="30" width="40" height="40" fill="#4338ca" rx="5" />
            <Path d="M 35 50 L 45 60 L 65 40" stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round" />
          </Svg>
        </Animated.View>
        <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '600', color: '#3730a3' }}>
          {storageStatus}
        </Text>
      </View>
      <NewAppScreen
        templateFileName="App.tsx"
        safeAreaInsets={safeAreaInsets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
