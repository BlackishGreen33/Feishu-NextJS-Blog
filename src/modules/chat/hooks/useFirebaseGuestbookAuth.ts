import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

import { getFirebaseAuth, hasFirebaseConfig } from '@/common/libs/firebase';

export type GuestbookProviderId = 'google' | 'github';

const createProvider = (providerId: GuestbookProviderId) => {
  if (providerId === 'google') {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return provider;
  }

  const provider = new GithubAuthProvider();
  provider.addScope('read:user');
  provider.addScope('user:email');
  return provider;
};

export const useFirebaseGuestbookAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();

    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithProvider = async (providerId: GuestbookProviderId) => {
    const auth = getFirebaseAuth();

    if (!auth) {
      throw new Error('Firebase Auth 未配置');
    }

    return signInWithPopup(auth, createProvider(providerId));
  };

  const signOutUser = async () => {
    const auth = getFirebaseAuth();

    if (!auth) {
      return;
    }

    await signOut(auth);
  };

  return {
    user,
    isLoading,
    isConfigured: hasFirebaseConfig,
    signInWithProvider,
    signOutUser,
  };
};
