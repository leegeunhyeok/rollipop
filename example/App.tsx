import { Button } from '@react-navigation/elements';
import {
  NavigationContainer,
  NavigationContainerRef,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useReactNavigationDevTools } from '@rozenite/react-navigation-plugin';
import { useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';

import Logo from './logo.svg';

const windowWidth = Dimensions.get('window').width;
const logoSize = windowWidth * 0.4;

const breathe: CSSAnimationKeyframes = {
  to: {
    transform: [{ scale: 1.1 }],
  },
};

function HomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <Animated.View
        animatedProps={{
          animationName: breathe,
          animationDuration: 1000,
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationDirection: 'alternate',
        }}
      >
        <Logo width={logoSize} height={logoSize} />
      </Animated.View>
      <View style={styles.descriptionContainer}>
        <Text style={styles.title}>Rollipop</Text>
        <Text style={styles.description}>{import.meta.env.ROLLIPOP_DESCRIPTION}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button onPress={() => navigation.navigate('get_started')}>Get Started</Button>
      </View>
    </View>
  );
}

function GetStarted() {
  return (
    <View style={styles.container}>
      <View style={styles.descriptionContainer}>
        <Text style={styles.title}>Hello, world!</Text>
      </View>
    </View>
  );
}

const RootStack = createNativeStackNavigator();

export function App() {
  const navigationRef = useRef<NavigationContainerRef<ParamListBase>>(null!);

  useReactNavigationDevTools({ ref: navigationRef });

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator initialRouteName="home" screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="home" component={HomeScreen} />
        <RootStack.Screen name="get_started" component={GetStarted} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    gap: 12,
    paddingBottom: 36,
  },
  descriptionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonContainer: {
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
  },
  description: {
    fontSize: 16,
    color: '#666',
  },
});

if (import.meta.hot) {
  import.meta.hot.on('custom-server-event', (data) => {
    console.log('Received custom server event:', data);
  });
}
