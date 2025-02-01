const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin with your service account
const serviceAccount = require("./key.json");
const config = JSON.parse(
  fs.readFileSync("./config.env", { encoding: "utf-8" })
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: config.storageBucket, // Replace with your bucket name
});

const bucket = admin.storage().bucket();
const db = admin.firestore();

async function backupSubcollections(docRef, basePath, localPath) {
  const subcollections = await docRef.listCollections();

  for (const subcollection of subcollections) {
    // Create a path-safe name for the subcollection file
    const subcollectionPath = `${basePath}/${docRef.id}/${subcollection.id}`;
    console.log(`Backing up subcollection: ${subcollectionPath}`);

    const subcollectionSnapshot = await subcollection.get();
    const subcollectionDocs = [];

    for (const subdoc of subcollectionSnapshot.docs) {
      subcollectionDocs.push({
        id: subdoc.id,
        data: subdoc.data(),
      });

      // Recursively backup nested subcollections
      // Move this inside the loop to process each document's subcollections
      await backupSubcollections(subdoc.ref, `${subcollectionPath}`, localPath);
    }

    // Save with full path structure
    const safeFileName = subcollectionPath.replace(
      /[\/\\\?\*\:\"\<\>\|]/g,
      "_"
    );
    const subFilePath = path.join(localPath, `${safeFileName}.json`);

    // Ensure the directory exists
    const dir = path.dirname(subFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(subFilePath, JSON.stringify(subcollectionDocs, null, 2));
  }
}

async function backupFirestore(localPath = "./backups/firestore") {
  try {
    if (!fs.existsSync(localPath)) {
      fs.mkdirSync(localPath, { recursive: true });
    }

    const collections = await db.listCollections();
    console.log(`Found ${collections.length} root collections`);

    for (const collection of collections) {
      const collectionName = collection.id;
      console.log(`Backing up collection: ${collectionName}`);

      const snapshot = await collection.get();
      const documents = [];

      snapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          data: doc.data(),
        });
      });

      // Save main collection
      const filePath = path.join(localPath, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));

      // Backup subcollections for each document
      for (const doc of snapshot.docs) {
        await backupSubcollections(doc.ref, collectionName, localPath);
      }
    }

    console.log("Firestore backup completed successfully!");
  } catch (error) {
    console.error("Error backing up Firestore:", error);
    throw error;
  }
}

async function downloadFolder(prefix = "", localPath = "./backups/storage") {
  try {
    if (!fs.existsSync(localPath)) {
      fs.mkdirSync(localPath, { recursive: true });
    }

    const [files] = await bucket.getFiles({ prefix: prefix });
    console.log(`Found ${files.length} files in ${prefix || "root"}`);

    for (const file of files) {
      const filePath = file.name;

      if (filePath.endsWith("/")) continue;

      const localFilePath = path.join(localPath, filePath);
      const localFileDir = path.dirname(localFilePath);

      if (!fs.existsSync(localFileDir)) {
        fs.mkdirSync(localFileDir, { recursive: true });
      }

      console.log(`Downloading: ${filePath}`);
      await file.download({
        destination: localFilePath,
      });
    }

    console.log("Storage download completed successfully!");
  } catch (error) {
    console.error("Error downloading files:", error);
    throw error;
  }
}

async function startBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = `./backups_${timestamp}`;

    console.log("Starting Firestore backup...");
    await backupFirestore(path.join(backupDir, "firestore"));

    console.log("\nStarting Storage backup...");
    const [files] = await bucket.getFiles();
    const folders = new Set(
      files.map((file) => file.name.split("/")[0]).filter((name) => name)
    );

    console.log("Found folders:", Array.from(folders));

    for (const folder of folders) {
      console.log(`Processing folder: ${folder}`);
      await downloadFolder(folder, path.join(backupDir, "storage"));
    }

    console.log("\nBackup completed successfully!");
    console.log(`Backup location: ${backupDir}`);
  } catch (error) {
    console.error("Error in backup process:", error);
  } finally {
    admin.app().delete();
  }
}

startBackup();
