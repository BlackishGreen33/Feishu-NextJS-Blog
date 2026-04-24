import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

import { getServerEnv } from './env';

const FIREBASE_ADMIN_APP_NAME = 'guestbook-admin';

export const hasFirebaseAdminEnv = () => {
  const { firebaseAdmin, publicEnv } = getServerEnv();

  return [
    firebaseAdmin.projectId,
    firebaseAdmin.clientEmail,
    firebaseAdmin.privateKey,
    publicEnv.firebase.databaseUrl,
  ].every(Boolean);
};

const getFirebaseAdminApp = () => {
  if (!hasFirebaseAdminEnv()) {
    return null;
  }

  const existingApp = getApps().find(
    (app) => app.name === FIREBASE_ADMIN_APP_NAME,
  );

  if (existingApp) {
    return existingApp;
  }

  const { firebaseAdmin, publicEnv } = getServerEnv();

  return initializeApp(
    {
      credential: cert({
        clientEmail: firebaseAdmin.clientEmail,
        privateKey: firebaseAdmin.privateKey,
        projectId: firebaseAdmin.projectId,
      }),
      databaseURL: publicEnv.firebase.databaseUrl,
    },
    FIREBASE_ADMIN_APP_NAME,
  );
};

export const getFirebaseAdminAuth = () => {
  const app = getFirebaseAdminApp();
  return app ? getAuth(app) : null;
};

export const getFirebaseAdminDatabase = () => {
  const app = getFirebaseAdminApp();
  return app ? getDatabase(app) : null;
};
