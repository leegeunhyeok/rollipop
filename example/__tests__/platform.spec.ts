import { Platform } from 'react-native';

describe('rollipop/jest — Platform', () => {
  it('reports ios as the default platform', () => {
    expect(Platform.OS).toBe('ios');
  });

  it('Platform.select prefers the ios branch', () => {
    const picked = Platform.select({
      ios: 'ios-branch',
      android: 'android-branch',
      default: 'default-branch',
    });
    expect(picked).toBe('ios-branch');
  });

  it('Platform.select falls back to default when the ios branch is absent', () => {
    const picked = Platform.select({
      android: 'android-branch',
      default: 'default-branch',
    });
    expect(picked).toBe('default-branch');
  });

  it('Platform flags (isPad / isTV) surface without throwing', () => {
    expect(typeof Platform.isPad).toBe('boolean');
    expect(typeof Platform.isTV).toBe('boolean');
  });
});
