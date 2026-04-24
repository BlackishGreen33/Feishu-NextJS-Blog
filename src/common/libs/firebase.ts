import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

import { getPublicEnv, hasFirebasePublicEnv } from '@/common/config/env';

const { firebase: firebaseEnv } = getPublicEnv();

const firebaseConfig = {
  apiKey: firebaseEnv.apiKey,
  appId: firebaseEnv.appId,
  authDomain: firebaseEnv.authDomain,
  databaseURL: firebaseEnv.databaseUrl,
  measurementId: firebaseEnv.measurementId,
  messagingSenderId: firebaseEnv.messagingSenderId,
  projectId: firebaseEnv.projectId,
  storageBucket: firebaseEnv.storageBucket,
};

const hasFirebaseConfig = hasFirebasePublicEnv();

const firebase = hasFirebaseConfig
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

const getFirebaseAuth = () => {
  if (typeof window === 'undefined' || !firebase) {
    return null;
  }

  return getAuth(firebase);
};

export { firebase, getFirebaseAuth, hasFirebaseConfig };
