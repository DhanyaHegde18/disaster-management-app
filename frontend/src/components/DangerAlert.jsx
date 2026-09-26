import { useEffect, useRef, useState } from "react";
import "./DangerAlert.css";

// Only these levels interrupt the villager with a full-screen warning.
// Low/Moderate still appear in the normal risk card on the dashboard.
const DANGER_LEVELS = ["High", "Severe"];

// Alerts older than this are not "current" any more (same rule as the dashboard card)
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

const SEEN_KEY = "jagrutiSeenAlerts";

function loadSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY)) || [];
  } catch {
    return [];
  }
}

function markSeen(id) {
  const seen = loadSeen();
  if (!seen.includes(id)) {
    // keep the list short
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id].slice(-50)));
  }
}

const isRecent = (alert) =>
  Boolean(alert.createdAt) && new Date() - new Date(alert.createdAt) < MAX_AGE_MS;

const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

// Does this alert cover the villager's own village?
// The backend already filters by district, so here we only check the village.
function isForMyVillage(alert, user) {
  if (!alert.village) return true;                      // district-wide alert
  if (same(alert.village, alert.district)) return true; // village field holds the district name
  if (!user?.village) return true;                      // we don't know their village: warn anyway
  return same(alert.village, user.village);
}

// Siren made with the Web Audio API, so no sound file is needed.
// The pitch sweeps up and down like an emergency siren until stopped.
function startSiren(audioCtxRef) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;

  if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
  const ctx = audioCtxRef.current;
  ctx.resume().catch(() => {});

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  gain.gain.value = 0.15;
  osc.connect(gain).connect(ctx.destination);

  const sweep = () => {
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(1200, t + 0.6);
    osc.frequency.linearRampToValueAtTime(600, t + 1.2);
  };
  sweep();
  const timer = setInterval(sweep, 1200);
  osc.start();

  return () => {
    clearInterval(timer);
    try {
      osc.stop();
    } catch {
      // already stopped
    }
    osc.disconnect();
  };
}

// Notification in the phone's notification bar (works while the app is open
// or in a background tab). Goes through the service worker when possible
// because mobile Chrome does not allow `new Notification()` directly.
async function showPhoneNotification(alert) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const title = `⚠ ${String(alert.riskLevel).toUpperCase()} ALERT – You are in danger`;
  const options = {
    body: alert.message,
    tag: `alert-${alert._id}`,       // same alert never shows twice
    requireInteraction: true,        // stays until the villager taps it
    vibrate: [500, 200, 500, 200, 500],
    icon: "/favicon.svg",
  };

  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration?.showNotification) {
      await registration.showNotification(title, options);
      return;
    }
  } catch {
    // fall through to the plain Notification API
  }
  new Notification(title, options);
}

function DangerAlert({ alerts, user, onFindShelter, onSendSOS }) {
  const [seen, setSeen] = useState(loadSeen);    // alert ids the villager already acknowledged
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [needsTap, setNeedsTap] = useState(false); // browser blocked sound until a tap

  const audioCtxRef = useRef(null);
  const stopSirenRef = useRef(null);
  const voiceRef = useRef(null);

  // Newest danger alert for my village that I haven't acknowledged yet
  // (alerts come newest first from the backend)
  const active = (alerts || []).find(
    (alert) =>
      DANGER_LEVELS.includes(alert.riskLevel) &&
      isRecent(alert) &&
      !seen.includes(alert._id) &&
      isForMyVillage(alert, user)
  );
  const activeId = active?._id;

  // When a new danger alert appears: phone notification, vibration and siren
  useEffect(() => {
    if (!active) return;

    showPhoneNotification(active);
    navigator.vibrate?.([800, 300, 800, 300, 800]);
    stopSirenRef.current = startSiren(audioCtxRef);

    // If the page was just reloaded, browsers keep audio muted until the first tap
    const ctx = audioCtxRef.current;
    if (ctx) {
      Promise.resolve().then(() => setNeedsTap(ctx.state === "suspended"));
    }

    return () => {
      stopSirenRef.current?.();
      stopSirenRef.current = null;
    };
    // run once per alert, not on every poll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Stop everything when the dashboard closes
  useEffect(() => {
    return () => {
      voiceRef.current?.pause();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const enableNotifications = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);

    // This tap also unlocks sound for later alerts
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx && !audioCtxRef.current) audioCtxRef.current = new Ctx();
    audioCtxRef.current?.resume().catch(() => {});
  };

  const unmute = () => {
    audioCtxRef.current?.resume().then(() => setNeedsTap(false)).catch(() => {});
  };

  const playKannadaVoice = () => {
    stopSirenRef.current?.();
    stopSirenRef.current = null;
    if (!voiceRef.current) voiceRef.current = new Audio("/kannada_evac.mp3");
    voiceRef.current.currentTime = 0;
    voiceRef.current.play().catch((err) => console.warn("Voice guide failed:", err));
  };

  const close = (next) => {
    markSeen(active._id);
    setSeen(loadSeen());
    voiceRef.current?.pause();
    setNeedsTap(false);
    next?.();
  };

  return (
    <>
      {/* One-time prompt so alerts can reach the phone's notification bar */}
      {permission === "default" && (
        <div className="danger-permission">
          <span>🔔 Get a loud warning on this phone when your village is in danger.</span>
          <button type="button" onClick={enableNotifications}>
            Turn on danger alerts
          </button>
        </div>
      )}

      {active && (
        <div
          className={`danger-overlay danger-${String(active.riskLevel).toLowerCase()}`}
          role="alertdialog"
          aria-live="assertive"
          aria-labelledby="danger-title"
          onClick={needsTap ? unmute : undefined}
        >
          <div className="danger-box">
            <div className="danger-icon">⚠</div>
            <p className="danger-level">{String(active.riskLevel).toUpperCase()} ALERT</p>
            <h1 id="danger-title">You are in danger</h1>
            <p className="danger-kn">ನೀವು ಅಪಾಯದಲ್ಲಿದ್ದೀರಿ</p>

            <p className="danger-message">{active.message}</p>
            <p className="danger-place">
              📍 {[active.village, active.district].filter(Boolean).join(", ")} ·{" "}
              {new Date(active.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>

            {needsTap && <p className="danger-tap">Tap anywhere to turn on the alarm sound</p>}

            <div className="danger-actions">
              <button type="button" className="danger-primary" onClick={() => close(onFindShelter)}>
                Show route to nearest shelter
              </button>
              <button type="button" className="danger-sos" onClick={() => close(onSendSOS)}>
                I need help – send SOS
              </button>
              <button type="button" className="danger-secondary" onClick={playKannadaVoice}>
                🔊 ಕನ್ನಡದಲ್ಲಿ ಸೂಚನೆ ಕೇಳಿ
              </button>
              <button type="button" className="danger-secondary" onClick={() => close()}>
                I understand
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DangerAlert;
