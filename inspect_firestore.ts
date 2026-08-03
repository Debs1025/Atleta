import { db } from './utils/firebaseAdmin';

async function inspectFirestore() {
  console.log('--- Inspecting Firestore Collections ---');

  try {
    const collections = await db.listCollections();
    console.log('Collections in Firestore:', collections.map((c) => c.id));

    for (const col of collections) {
      if (col.id.toLowerCase().includes('notif')) {
        console.log(`\nInspecting collection: ${col.id}`);
        const snapshot = await col.limit(5).get();
        snapshot.docs.forEach((doc) => {
          console.log(`Doc ID: ${doc.id}`);
          console.log('Data:', JSON.stringify(doc.data(), null, 2));
        });
      }
    }
  } catch (err: any) {
    console.error('Error inspecting Firestore:', err.message || err);
  }
}

inspectFirestore();
