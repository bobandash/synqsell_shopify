import {
  addStorefrontAccessToken,
  getSession,
  getStorefrontAccessToken,
  hasSession,
  hasStorefrontAccessToken,
  isAppUninstalled,
} from '../../session.server';
import { v4 as uuidv4 } from 'uuid';
import type { Session } from '@prisma/client';
import { createTestSession } from '@db/factories/session.factories';
import db from '~/db.server';

describe('Session', () => {
  const nonExistentId = uuidv4();
  let session: Session;
  beforeEach(async () => {
    session = await createTestSession();
  });

  describe('hasSession', () => {
    it('should return true when session is added', async () => {
      const sessionExists = await hasSession(session.id);
      expect(sessionExists).toBe(true);
    });

    it('should return false if session id input is incorrect', async () => {
      const sessionExists = await hasSession(nonExistentId);
      expect(sessionExists).toBe(false);
    });
  });

  describe('getSession', () => {
    it('should throw if session is not found', async () => {
      await expect(getSession(nonExistentId)).rejects.toThrow();
    });

    it('should return session if session is found', async () => {
      const res = await getSession(session.id);
      expect(res).toEqual(session);
    });
  });

  describe('isAppUninstalled', () => {
    it('should throw if random session id is inputted', async () => {
      await expect(isAppUninstalled(nonExistentId)).rejects.toThrow();
    });

    it('should return false if app is not uninstalled', async () => {
      const newSession = await createTestSession({
        isAppUninstalled: false,
      });
      const appUninstalledStatus = await isAppUninstalled(newSession.id);
      expect(appUninstalledStatus).toBe(false);
    });

    it('should return true if app is uninstalled', async () => {
      const newSession = await createTestSession({
        isAppUninstalled: true,
      });
      const appUninstalledStatus = await isAppUninstalled(newSession.id);
      expect(appUninstalledStatus).toBe(true);
    });
  });

  describe('hasStorefrontAccessToken', () => {
    it('should throw if session is not found', async () => {
      await expect(hasStorefrontAccessToken(nonExistentId)).rejects.toThrow();
    });

    it('should return false if storefront access token is not set', async () => {
      const newSession = await createTestSession({
        storefrontAccessToken: null,
      });
      const hasToken = await hasStorefrontAccessToken(newSession.id);
      expect(hasToken).toBe(false);
    });

    it('should return true if storefront access token exists', async () => {
      const newSession = await createTestSession({
        storefrontAccessToken: 'test-token',
      });
      const hasToken = await hasStorefrontAccessToken(newSession.id);
      expect(hasToken).toBe(true);
    });

    it('should return false if storefront access token is empty string', async () => {
      const newSession = await createTestSession({
        storefrontAccessToken: '',
      });
      const hasToken = await hasStorefrontAccessToken(newSession.id);
      expect(hasToken).toBe(false);
    });
  });

  describe('getStorefrontAccessToken', () => {
    it('should throw if session is not found', async () => {
      await expect(getStorefrontAccessToken(nonExistentId)).rejects.toThrow();
    });

    it('should throw if storefront access token does not exist', async () => {
      const newSession = await createTestSession({
        storefrontAccessToken: null,
      });
      await expect(getStorefrontAccessToken(newSession.id)).rejects.toThrow();
    });

    it('should return storefront access token if it exists', async () => {
      const token = 'test-token';
      const newSession = await createTestSession({
        storefrontAccessToken: token,
      });
      const storefrontAccessToken = await getStorefrontAccessToken(
        newSession.id,
      );
      expect(storefrontAccessToken).toBe(token);
    });
  });

  describe('addStorefrontAccessToken', () => {
    const initialToken = 'initial-token';
    const testToken = 'new-test-token';

    it('should throw if session is not found', async () => {
      await expect(
        addStorefrontAccessToken(nonExistentId, testToken),
      ).rejects.toThrow();
    });

    it('should add storefront access token to session', async () => {
      const newSession = await createTestSession();
      await addStorefrontAccessToken(newSession.id, testToken);
      const res = await db.session.findFirst({
        where: {
          id: newSession.id,
        },
        select: {
          storefrontAccessToken: true,
        },
      });
      expect(res?.storefrontAccessToken).toBe(testToken);
    });

    it('should update existing storefront access token', async () => {
      const newSession = await createTestSession({
        storefrontAccessToken: initialToken,
      });
      await addStorefrontAccessToken(newSession.id, testToken);
      const res = await db.session.findFirst({
        where: {
          id: newSession.id,
        },
        select: {
          storefrontAccessToken: true,
        },
      });
      expect(res?.storefrontAccessToken).toBe(testToken);
    });
  });
});
