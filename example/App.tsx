/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NewAppScreen } from '@react-native/new-app-screen';
import { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

console.log('Hello, world!');

const FLOATING_VIEW_HEIGHT = 64;

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
  const [count, setCount] = useState(0);
  const safeAreaInsets = useSafeAreaInsets();

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((v) => v + 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.floatingView}>
        <Text style={styles.floatingViewText}>Count: {count}</Text>
      </View>
      <NewAppScreen templateFileName="App.tsx" safeAreaInsets={safeAreaInsets} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    elevation: 10,
    zIndex: 10,
    width: '100%',
    height: FLOATING_VIEW_HEIGHT,
    backgroundColor: '#387ca0',
  },
  floatingViewText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default App;
