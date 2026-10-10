const fs = require('fs');
const dotenv = require('dotenv');

/**
 * Migration Import Script
 * Imports Firestore data and Auth users from firebase_export_backup.json into the active Firebase project configured in backend/.env
 */
async function importData() {
  const backupFile = 'firebase_export_backup.json';
  if (!fs.existsSync(backupFile)) {
    console.error('❌ Backup file not found: ' + backupFile);
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  console.log(`📦 Loaded backup created at ${backup.timestamp}`);

  const env = dotenv.parse(fs.readFileSync('.env'));
  const admin = require('firebase-admin');

  let sa;
  if (env.FIREBASE_SERVICE_ACCOUNT) {
    sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  } else if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    sa = {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  } else {
    console.error('❌ No Firebase credentials found in backend/.env');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: sa.projectId || sa.project_id,
      clientEmail: sa.clientEmail || sa.client_email,
      privateKey: sa.privateKey || sa.private_key
    })
  });

  const targetProjectId = sa.projectId || sa.project_id;
  console.log(`🚀 Target Firebase Project: ${targetProjectId}`);

  // 1. Import Auth Users (preserves exact UIDs so relations match)
  if (backup.authUsers && backup.authUsers.length > 0) {
    console.log(`👥 Importing ${backup.authUsers.length} Auth users...`);
    const userImportRecords = backup.authUsers.map(u => ({
      uid: u.uid,
      email: u.email,
      emailVerified: u.emailVerified,
      displayName: u.displayName,
      photoURL: u.photoURL,
      phoneNumber: u.phoneNumber,
      disabled: u.disabled
    }));

    try {
      const result = await admin.auth().importUsers(userImportRecords);
      console.log(`✅ Imported ${result.successCount} users (${result.failureCount} failed)`);
      if (result.errors && result.errors.length > 0) {
        console.warn('User import notices:', result.errors.map(e => e.error));
      }
    } catch (e) {
      console.error('Auth user import error:', e.message);
    }
  }

  // Helper to convert ISO dates or Firestore timestamp dicts
  function reviveTimestamps(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
      return new admin.firestore.Timestamp(obj._seconds, obj._nanoseconds);
    }
    for (const key of Object.keys(obj)) {
      obj[key] = reviveTimestamps(obj[key]);
    }
    return obj;
  }

  // 2. Import Firestore Collections
  const db = admin.firestore();
  for (const [colName, docs] of Object.entries(backup.firestore)) {
    const docIds = Object.keys(docs);
    console.log(`📄 Importing collection '${colName}' (${docIds.length} documents)...`);
    
    for (const docId of docIds) {
      const docData = docs[docId];
      const subMessages = docData._messages;
      delete docData._messages;

      const revived = reviveTimestamps(docData);
      await db.collection(colName).doc(docId).set(revived, { merge: true });

      // Import messages subcollection if present
      if (subMessages && Object.keys(subMessages).length > 0) {
        for (const [msgId, msgData] of Object.entries(subMessages)) {
          const revivedMsg = reviveTimestamps(msgData);
          await db.collection(colName).doc(docId).collection('messages').doc(msgId).set(revivedMsg, { merge: true });
        }
      }
    }
    console.log(`✅ Finished collection '${colName}'`);
  }

  console.log('\n🎉 ALL DATA SUCCESSFULLY RESTORED TO NEW FIREBASE PROJECT!');
}

importData().catch(e => {
  console.error('Fatal error during import:', e);
  process.exit(1);
});
