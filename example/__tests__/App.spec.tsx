import React from 'react';
import { AppState, Dimensions, NativeModules, Platform, StyleSheet, Text, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

describe('rollipop/vitest — jest-preset parity', () => {
  it('exposes Platform.OS and Platform.constants via jest-preset NativeModules', () => {
    expect(Platform.OS).toBe('ios');
    expect(Platform.constants).toBeDefined();
    expect(Platform.select({ ios: 'yes', default: 'no' })).toBe('yes');
  });

  it('returns non-zero Dimensions from the NativeModules.DeviceInfo mock', () => {
    const window = Dimensions.get('window');
    const screen = Dimensions.get('screen');
    expect(window.width).toBeGreaterThan(0);
    expect(window.height).toBeGreaterThan(0);
    expect(screen.width).toBeGreaterThan(0);
    expect(screen.height).toBeGreaterThan(0);
  });

  it('records StyleSheet.create in a frozen table', () => {
    const styles = StyleSheet.create({
      container: { flex: 1, alignItems: 'center' },
      title: { fontSize: 24 },
    });
    expect(styles.container).toBeDefined();
    expect(styles.title).toBeDefined();
  });

  it('routes NativeModules.AlertManager.alertWithArgs through a jest.fn spy', () => {
    const alert = NativeModules.AlertManager.alertWithArgs;
    expect(typeof alert).toBe('function');
    alert({ message: 'hi' });
    expect(alert).toHaveBeenCalledWith({ message: 'hi' });
  });

  it('AppState.addEventListener hands back a subscription with remove()', () => {
    const handler = jest.fn();
    const sub = AppState.addEventListener('change', handler);
    expect(typeof sub.remove).toBe('function');
  });

  it('defines __DEV__ via the setup file', () => {
    expect((globalThis as { __DEV__?: boolean }).__DEV__).toBe(true);
  });

  it('renders a RN primitive tree through react-test-renderer', async () => {
    const Greeting = () => (
      <View>
        <Text>hello from rollipop/vitest</Text>
      </View>
    );

    let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<Greeting />);
    });

    expect(renderer).not.toBeNull();
    const tree = renderer!.toJSON();
    expect(tree).toBeTruthy();
  });
});
