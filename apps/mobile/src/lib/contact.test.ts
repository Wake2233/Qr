import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { callPhone, contactAbout, openWhatsApp } from './contact';

jest.mock('expo-linking', () => ({ canOpenURL: jest.fn(), openURL: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));
const mockRpc = jest.fn((..._args: unknown[]) => Promise.resolve({ data: null, error: null }));
jest.mock('./supabase', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args) } }));

const canOpenURL = jest.mocked(Linking.canOpenURL);
const openURL = jest.mocked(Linking.openURL);
const PHONE = '+13473700570';
const TEXT = 'Hi! Stock #A1 at $45,990';

describe('openWhatsApp', () => {
  const os = Platform.OS;
  beforeEach(() => {
    jest.clearAllMocks();
    openURL.mockResolvedValue(true);
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });
  afterAll(() => Object.defineProperty(Platform, 'OS', { value: os, configurable: true }));

  it('opens the WhatsApp app when it is installed', async () => {
    canOpenURL.mockResolvedValue(true);
    await expect(openWhatsApp(PHONE, TEXT)).resolves.toBe('app');
    expect(openURL).toHaveBeenCalledWith(
      `whatsapp://send?phone=13473700570&text=${encodeURIComponent(TEXT)}`,
    );
  });

  it('falls back to wa.me when the app is missing', async () => {
    canOpenURL.mockResolvedValue(false);
    await expect(openWhatsApp(PHONE, TEXT)).resolves.toBe('web');
    expect(openURL).toHaveBeenCalledWith(
      `https://wa.me/13473700570?text=${encodeURIComponent(TEXT)}`,
    );
  });

  it('falls back to wa.me when the check throws (Android package visibility)', async () => {
    canOpenURL.mockRejectedValue(new Error('no queries'));
    await expect(openWhatsApp(PHONE, TEXT)).resolves.toBe('web');
  });

  it('skips the app check on web, where canOpenURL is always true', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    await expect(openWhatsApp(PHONE, TEXT)).resolves.toBe('web');
    expect(canOpenURL).not.toHaveBeenCalled();
  });
});

describe('contactAbout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    openURL.mockResolvedValue(true);
  });

  it('dials with tel:', async () => {
    await callPhone(PHONE);
    expect(openURL).toHaveBeenCalledWith('tel:+13473700570');
  });

  it('logs the tap without waiting for it, then opens the link', async () => {
    mockRpc.mockReturnValueOnce(new Promise(() => undefined)); // never settles
    await contactAbout('v1', 'call', PHONE, TEXT);
    expect(mockRpc).toHaveBeenCalledWith('track_contact_click', {
      p_vehicle_id: 'v1',
      p_channel: 'call',
      p_platform: expect.any(String),
    });
    expect(openURL).toHaveBeenCalledWith('tel:+13473700570');
  });
});
