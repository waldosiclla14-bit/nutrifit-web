/**
 * @jest-environment jsdom
 */
import { pushSupported, pushPermission, unsubscribePush, sendTestPush } from './push';
import { apiFetch } from './api';

jest.mock('./api', () => ({
  apiFetch: jest.fn(),
}));

describe('lib/push', () => {
  it('degrades gracefully without SW support', () => {
    expect(pushSupported()).toBe(false);
    expect(pushPermission()).toBe('unsupported');
  });

  it('unsubscribe/sendTest never throw without support', async () => {
    await expect(unsubscribePush('')).resolves.toBeUndefined();
    (apiFetch as jest.Mock).mockRejectedValue(new Error('nope'));
    await expect(sendTestPush('')).resolves.toBe(false);
  });
});
