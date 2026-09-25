// Background SOS sync, ported from Vasundhara's sos-module/sw.js.
// When the page saves an SOS while offline, the browser wakes this worker
// once the connection returns, and it sends the pending SOS to the backend.

const DB_NAME = "sosDB";
const STORE_NAME = "pendingSOS";
const BACKEND_URL = "http://localhost:5000/api/sos";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore(mode, work) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const store = db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
        const request = work(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

async function markAsSynced(id) {
  const record = await withStore("readonly", (store) => store.get(id));
  if (record) {
    record.syncStatus = "synced";
    await withStore("readwrite", (store) => store.put(record));
  }
}

async function syncSOS() {
  const records = await withStore("readonly", (store) => store.getAll());

  for (const sos of records) {
    if (sos.syncStatus !== "pending") continue;

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sos.token ? { Authorization: `Bearer ${sos.token}` } : {}),
      },
      body: JSON.stringify({
        location: { lat: sos.latitude, lng: sos.longitude },
        village: sos.village || "Unknown",
        type: sos.emergencyType,
      }),
    });

    if (!response.ok) {
      // Throwing tells the browser to retry the sync later
      throw new Error(`Server returned ${response.status}`);
    }

    await markAsSynced(sos.id);
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-sos") {
    event.waitUntil(syncSOS());
  }
});
