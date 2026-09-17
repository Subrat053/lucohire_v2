/**
 * firebaseOtpService.js
 * Verifies Firebase phone auth ID tokens on the backend.
 *
 * Flow:
 *  1. Frontend calls Firebase signInWithPhoneNumber() → gets idToken after user enters SMS code
 *  2. Frontend sends idToken to backend
 *  3. Backend calls verifyFirebaseIdToken(idToken) → confirms phone is verified
 *
 * Firebase Admin SDK handles the actual SMS delivery via Firebase Phone Auth.
 */

let firebaseAdmin = null;

function getAdmin() {
  if (firebaseAdmin) return firebaseAdmin;

  const projectId    = process.env.FIREBASE_PROJECT_ID;
  const clientEmail  = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey   = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[FirebaseOTP] Firebase Admin credentials not configured — phone OTP verification will be skipped.');
    return null;
  }

  try {
    const admin = require('firebase-admin');
    // Avoid re-initializing if already done by another module
    if (admin.apps.length) {
      firebaseAdmin = admin;
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
      firebaseAdmin = admin;
    }
  } catch (err) {
    console.error('[FirebaseOTP] Admin init failed:', err.message);
    return null;
  }

  return firebaseAdmin;
}

/**
 * Verify a Firebase phone auth ID token.
 * Returns { success, phone, uid } or { success: false, error }
 */
async function verifyFirebaseIdToken(idToken) {
  const admin = getAdmin();
  if (!admin) {
    return { success: false, error: 'Firebase Admin not configured' };
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const phone = decoded.phone_number || null;

    if (!phone) {
      return { success: false, error: 'No phone number in Firebase token' };
    }

    return { success: true, phone, uid: decoded.uid, decoded };
  } catch (err) {
    console.error('[FirebaseOTP] Token verification failed:', err.message);
    return { success: false, error: 'Invalid or expired Firebase token' };
  }
}

module.exports = { verifyFirebaseIdToken };
