// Offline-capable SOS, ported from Vasundhara's sos-module (app.js + sw.js).
//
// How it works:
//   1. Every SOS is saved in the browser (IndexedDB) first, so it is never lost.
//   2. If online, it is sent to the backend straight away.
//   3. If offline, it stays "pending" and is sent when the connection returns
//      (service worker background sync, the "online" event, and a 30-second retry).

import { API_URL } from "../api";

const DB_NAME = "sosDB";
const STORE_NAME = "pendingSOS";
const LAST_LOCATION_KEY = "lastKnownLocation";

// ---------- IndexedDB ----------

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

async function withStore(mode, work) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = work(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------- Location ----------

function readLastKnownLocation() {
  try {
    const saved = localStorage.getItem(LAST_LOCATION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

// Resolves to { latitude, longitude, source: "gps" | "saved" }, or null if nothing is available.
export function getLocationWithFallback() {
  return new Promise((resolve) => {
    const useSaved = () => {
      const saved = readLastKnownLocation();
      resolve(saved ? { ...saved, source: "saved" } : null);
    };

    if (!navigator.geolocation) {
      useSaved();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(location));
        resolve({ ...location, source: "gps" });
      },
      useSaved,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

// ---------- Save and send ----------

// sosData: { emergencyType, latitude, longitude, village, token }
export async function saveSOSLocally(sosData) {
  const record = {
    id: crypto.randomUUID(),
    ...sosData,
    timestamp: new Date().toISOString(),
    syncStatus: "pending",
  };
  await withStore("readwrite", (store) => store.add(record));
  return record;
}

async function markSOSAsSynced(id) {
  const record = await withStore("readonly", (store) => store.get(id));
  if (record) {
    record.syncStatus = "synced";
    await withStore("readwrite", (store) => store.put(record));
  }
}

export async function getPendingCount() {
  const records = await withStore("readonly", (store) => store.getAll());
  return records.filter((sos) => sos.syncStatus === "pending").length;
}

// Sends every pending SOS. Throws if the backend can't be reached.
export async function syncPendingSOS() {
  const records = await withStore("readonly", (store) => store.getAll());

  for (const sos of records) {
    if (sos.syncStatus !== "pending") continue;

    const response = await fetch(`${API_URL}/api/sos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // The token links the SOS to the villager's account (name + phone for responders)
        ...(sos.token ? { Authorization: `Bearer ${sos.token}` } : {}),
      },
      body: JSON.stringify({
        location: { lat: sos.latitude, lng: sos.longitude },
        village: sos.village || "Unknown",
        type: sos.emergencyType,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    await markSOSAsSynced(sos.id);
  }
}

// Asks the service worker to send pending SOS when the connection returns.
export async function requestBackgroundSync() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    if ("sync" in registration) {
      await registration.sync.register("sync-sos");
    }
  } catch (error) {
    console.warn("Background sync not available:", error);
  }
}

// Keeps retrying pending SOS while the app is open. Returns a cleanup function.
export function startAutoSync() {
  const trySync = async () => {
    if (!navigator.onLine) return;
    try {
      await syncPendingSOS();
    } catch {
      // Backend unreachable: the SOS stays pending and is retried later
    }
  };

  window.addEventListener("online", trySync);
  const interval = setInterval(trySync, 30000);
  trySync();

  return () => {
    window.removeEventListener("online", trySync);
    clearInterval(interval);
  };
}
