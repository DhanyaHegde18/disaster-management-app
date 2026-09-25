import { useEffect, useState } from "react";
import { getToken } from "../api";
import {
  getLocationWithFallback,
  requestBackgroundSync,
  saveSOSLocally,
  syncPendingSOS,
} from "../utils/offlineSOS";

const EMERGENCY_TYPES = [
  { id: "Flood", icon: "🌊", label: "Flood" },
  { id: "Landslide", icon: "⛰️", label: "Landslide" },
  { id: "Medical", icon: "🚑", label: "Medical" },
  { id: "Other", icon: "⚠️", label: "Other" },
];

// Opens when the villager taps SEND SOS.
// onSent(result) is called with "sent" (reached the backend) or "queued" (saved offline).
function SOSModal({ user, onClose, onSent }) {
  const [emergencyType, setEmergencyType] = useState("");
  const [location, setLocation] = useState(null);
  const [locationState, setLocationState] = useState("loading"); // loading | ready | missing
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const captureLocation = async () => {
    setLocationState("loading");
    const result = await getLocationWithFallback();
    setLocation(result);
    setLocationState(result ? "ready" : "missing");
  };

  // Get the location as soon as the modal opens
  useEffect(() => {
    let active = true;
    getLocationWithFallback().then((result) => {
      if (!active) return;
      setLocation(result);
      setLocationState(result ? "ready" : "missing");
    });
    return () => {
      active = false;
    };
  }, []);

  // Close with the Escape key
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape" && !sending) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, sending]);

  const handleSend = async () => {
    if (!emergencyType) {
      setMessage("Please choose the type of emergency.");
      return;
    }
    if (!location) {
      setMessage("No location available. Please allow location access and try again.");
      return;
    }

    setSending(true);
    setMessage("");

    try {
      // 1. Always save on the phone first, so the SOS is never lost
      await saveSOSLocally({
        emergencyType,
        latitude: location.latitude,
        longitude: location.longitude,
        village: user?.village || "",
        token: getToken(),
      });

      // 2. Ask the service worker to send it when the connection returns
      await requestBackgroundSync();

      // 3. If online, send it right now
      if (navigator.onLine) {
        try {
          await syncPendingSOS();
          onSent("sent");
          return;
        } catch (error) {
          console.warn("SOS saved, backend not reachable yet:", error);
        }
      }

      onSent("queued");
    } catch (error) {
      console.error("SOS error:", error);
      setMessage("Could not save the SOS on this device. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sos-modal-overlay" onClick={() => !sending && onClose()}>
      <div
        className="sos-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sos-modal-header">
          <div>
            <p className="sos-modal-label">EMERGENCY SOS</p>
            <h3 id="sos-modal-title">What kind of emergency?</h3>
          </div>

          <button
            type="button"
            className="sos-modal-close"
            onClick={onClose}
            disabled={sending}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="sos-type-grid">
          {EMERGENCY_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              className={`sos-type ${emergencyType === type.id ? "selected" : ""}`}
              onClick={() => {
                setEmergencyType(type.id);
                setMessage("");
              }}
            >
              <span>{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>

        <div className={`sos-location sos-location-${locationState}`}>
          <span>📍</span>

          <div>
            {locationState === "loading" && <strong>Getting your location...</strong>}

            {locationState === "ready" && (
              <>
                <strong>
                  {location.source === "gps" ? "Location captured" : "Using last known location"}
                </strong>
                <small>
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </small>
              </>
            )}

            {locationState === "missing" && (
              <>
                <strong>Location not available</strong>
                <small>Allow location access in your browser, then retry.</small>
              </>
            )}
          </div>

          {locationState !== "loading" && (
            <button type="button" onClick={captureLocation} disabled={sending}>
              Retry
            </button>
          )}
        </div>

        {message && <p className="sos-modal-message">{message}</p>}

        <button
          type="button"
          className="sos-modal-send"
          onClick={handleSend}
          disabled={sending || locationState === "loading"}
        >
          {sending ? "Sending..." : "🆘 SEND SOS NOW"}
        </button>

        <p className="sos-modal-note">
          Works offline: if there is no network, your SOS is saved on this phone
          and sent automatically when the connection returns.
        </p>
      </div>
    </div>
  );
}

export default SOSModal;
