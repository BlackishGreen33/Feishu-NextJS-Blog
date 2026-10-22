import { renderHook } from '@testing-library/react';

import { useFirebaseGuestbookAuth } from '@/modules/chat/hooks/useFirebaseGuestbookAuth';

jest.mock('@/common/libs/firebase', () => ({
  getFirebaseAuth: () => null,
  hasFirebaseConfig: false,
}));
jest.mock('firebase/auth', () => ({
  GithubAuthProvider: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
}));

it('settles loading without external Firebase configuration', async () => {
  const { result } = renderHook(useFirebaseGuestbookAuth);
  expect(result.current.isLoading).toBe(false);
  expect(result.current.isConfigured).toBe(false);
  expect(result.current.user).toBeNull();
  await expect(result.current.signInWithProvider('google')).rejects.toThrow(
    'Firebase Auth 未配置',
  );
  await expect(result.current.signOutUser()).resolves.toBeUndefined();
});
