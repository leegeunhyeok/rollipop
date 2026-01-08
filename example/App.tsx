import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screenOptions: {
    headerShown: false,
  },
  screens: {
    Home: HomeScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export function App() {
  return <Navigation />;
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
