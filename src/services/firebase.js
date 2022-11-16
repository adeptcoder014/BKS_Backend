import admin from 'firebase-admin';
import path from 'path';

const firebase = admin.initializeApp({
  credential: admin.credential.cert(path.resolve('./firebase-services.json')),
});

export default firebase;
