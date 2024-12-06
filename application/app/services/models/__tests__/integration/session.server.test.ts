import { createSampleSession } from '@factories/session.factories';
import {
  addStorefrontAccessToken,
  getSession,
  getStorefrontAccessToken,
  hasSession,
  hasStorefrontAccessToken,
  isAppUninstalled,
} from '../../session.server';
import { sampleSession } from '@fixtures/session.fixture';
import { v4 as uuidv4 } from 'uuid';

describe('Session', () => {
  const nonExistentId = uuidv4();

  describe('hasSession', () => {
    it('should return true when session is added', async () => {
      await createSampleSession();
      const sessionExists = await hasSession(sampleSession.id);
      expect(sessionExists).toBe(true);
    });

    it('should return false if session is not added', async () => {
      const sessionExists = await hasSession(sampleSession.id);
      expect(sessionExists).toBe(false);
    });

    it('should return false if session id input is incorrect', async () => {
      const sessionExists = await hasSession(nonExistentId);
      expect(sessionExists).toBe(false);
    });
  });

  describe('getSession', () => {
    it('should throw if session is not found', async () => {
      await expect(getSession(sampleSession.id)).rejects.toThrow();
    });

    it('should throw if random session id is inputted', async () => {
      await createSampleSession();
      await expect(getSession(nonExistentId)).rejects.toThrow();
    });

    it('should return session if session is found', async () => {
      const newSession = await createSampleSession();
      const session = await getSession(sampleSession.id);
      expect(session).toEqual(newSession);
    });
  });

  describe('isAppUninstalled', () => {
    it('should throw if session is not found', async () => {
      await expect(isAppUninstalled(sampleSession.id)).rejects.toThrow();
    });

    it('should throw if random session id is inputted', async () => {
      await createSampleSession();
      await expect(isAppUninstalled(nonExistentId)).rejects.toThrow();
    });

    it('should return false if app is not uninstalled', async () => {
      await createSampleSession({
        isAppUninstalled: false,
      });
      const appUninstalledStatus = await isAppUninstalled(sampleSession.id);
      expect(appUninstalledStatus).toBe(false);
    });

    it('should return true if app is uninstalled', async () => {
      await createSampleSession({
        isAppUninstalled: true,
      });
      const appUninstalledStatus = await isAppUninstalled(sampleSession.id);
      expect(appUninstalledStatus).toBe(true);
    });
  });

  describe('hasStorefrontAccessToken', () => {
    it('should throw if session is not found', async () => {
      await expect(
        hasStorefrontAccessToken(sampleSession.id),
      ).rejects.toThrow();
    });

    it('should throw if random session id is inputted', async () => {
      await createSampleSession();
      await expect(hasStorefrontAccessToken(nonExistentId)).rejects.toThrow();
    });

    it('should return false if storefront access token is not set', async () => {
      await createSampleSession({
        storefrontAccessToken: null,
      });
      const hasToken = await hasStorefrontAccessToken(sampleSession.id);
      expect(hasToken).toBe(false);
    });

    it('should return true if storefront access token exists', async () => {
      await createSampleSession({
        storefrontAccessToken: 'test-token',
      });
      const hasToken = await hasStorefrontAccessToken(sampleSession.id);
      expect(hasToken).toBe(true);
    });

    it('should return false if storefront access token is empty string', async () => {
      await createSampleSession({
        storefrontAccessToken: '',
      });
      const hasToken = await hasStorefrontAccessToken(sampleSession.id);
      expect(hasToken).toBe(false);
    });
  });

  describe('getStorefrontAccessToken', () => {
    it('should throw if session is not found', async () => {
      await expect(
        getStorefrontAccessToken(sampleSession.id),
      ).rejects.toThrow();
    });

    it('should throw if random session id is inputted', async () => {
      await createSampleSession();
      await expect(getStorefrontAccessToken(nonExistentId)).rejects.toThrow();
    });

    it('should throw if storefront access token does not exist', async () => {
      await createSampleSession({
        storefrontAccessToken: null,
      });
      await expect(getStorefrontAccessToken(sampleSession.id)).rejects.toThrow(
        'Storefront access token does not exist.',
      );
    });

    it('should return storefront access token if it exists', async () => {
      const token = 'test-token';
      await createSampleSession({
        storefrontAccessToken: token,
      });
      const storefrontAccessToken = await getStorefrontAccessToken(
        sampleSession.id,
      );
      expect(storefrontAccessToken).toBe(token);
    });
  });

  describe('addStorefrontAccessToken', () => {
    const initialToken = 'initial-token';
    const testToken = 'new-test-token';

    it('should throw if session is not found', async () => {
      await expect(
        addStorefrontAccessToken(sampleSession.id, testToken),
      ).rejects.toThrow();
    });

    it('should throw if random session id is inputted', async () => {
      await createSampleSession();
      await expect(
        addStorefrontAccessToken(nonExistentId, testToken),
      ).rejects.toThrow();
    });

    it('should add storefront access token to session', async () => {
      await createSampleSession();
      await addStorefrontAccessToken(sampleSession.id, testToken);

      const session = await getSession(sampleSession.id);
      expect(session.storefrontAccessToken).toBe(testToken);
    });

    it('should update existing storefront access token', async () => {
      await createSampleSession({
        storefrontAccessToken: initialToken,
      });
      await addStorefrontAccessToken(sampleSession.id, testToken);
      const session = await getSession(sampleSession.id);
      expect(session.storefrontAccessToken).toBe(testToken);
    });
  });
});
