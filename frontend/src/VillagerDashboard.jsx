import { useCallback, useEffect, useRef, useState } from "react";
import UserMap from "./components/map/UserMap";
import ProfileMenu from "./components/ProfileMenu";
import SOSModal from "./components/SOSModal";
import FamilyStatusCard from "./components/FamilyStatusCard";
import DangerAlert from "./components/DangerAlert";
import { apiFetch, getToken, initials } from "./api";
import { getPendingCount, startAutoSync } from "./utils/offlineSOS";

// Average road speed used for the evacuation time estimate (ghat roads, rain)
const ROAD_SPEED_KMPH = 30;

// Used for shelter distances until the map reports the villager's real position (Ujire)
const DEFAULT_POSITION = [13.0032, 75.334];

// Straight-line distance in km between two [lat, lng] points
function distanceKm([lat1, lng1], [lat2, lng2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function VillagerDashboard({ user, onLogout }) {
  const [showSOS, setShowSOS] = useState(false);
  const [sosNotice, setSosNotice] = useState("");      // message after sending
  const [myRequests, setMyRequests] = useState([]);    // this villager's SOS from the backend
  const [pendingOffline, setPendingOffline] = useState(0);
  const [routeInfo, setRouteInfo] = useState(null);    // { shelter, userPos, distanceKm } from the map
  const [shelters, setShelters] = useState([]);        // live shelters from the backend
  const [alerts, setAlerts] = useState([]);            // alerts for my district

  const evacuationRef = useRef(null);

  // This villager's SOS requests, to show whether help is coming
  const fetchMyRequests = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingOffline(count);
    } catch {
      // IndexedDB unavailable (e.g. private window): nothing to show
    }

    if (!getToken()) return;

    try {
      const data = await apiFetch("/api/sos/mine");
      setMyRequests(data);
    } catch (err) {
      console.warn("Could not load your SOS status:", err.message);
    }
  }, []);

  // Shelters managed by the Control Centre, refreshed every 30 seconds
  useEffect(() => {
    const loadShelters = async () => {
      try {
        const data = await apiFetch("/api/shelters");
        setShelters(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Could not load shelters:", err.message);
      }
    };
    loadShelters();
    const interval = setInterval(loadShelters, 30000);
    return () => clearInterval(interval);
  }, []);

  // Alerts from the Gram Panchayat for my district, refreshed every 15 seconds
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const query = user?.district ? `?district=${encodeURIComponent(user.district)}` : "";
        const data = await apiFetch(`/api/alerts${query}`);
        setAlerts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Could not load alerts:", err.message);
      }
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 15000);
    return () => clearInterval(interval);
  }, [user?.district]);

  useEffect(() => {
    const stopAutoSync = startAutoSync();   // resend any SOS saved while offline
    const first = setTimeout(fetchMyRequests, 0);
    const interval = setInterval(fetchMyRequests, 10000);

    return () => {
      stopAutoSync();
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [fetchMyRequests]);

  const handleSOSSent = (result) => {
    setShowSOS(false);
    setSosNotice(
      result === "sent"
        ? "Your SOS has reached the control room. Stay where you are if it is safe."
        : "No connection right now. Your SOS is saved on this phone and will be sent automatically."
    );
    fetchMyRequests();
  };

  // Latest request that isn't finished yet
  const activeRequest = myRequests.find((sos) => sos.status !== "Resolved");
  const hasActiveSOS = Boolean(activeRequest) || pendingOffline > 0;

  // Shelters sorted by distance; the route goes to the nearest one that isn't full
  const myPosition = routeInfo?.userPos || DEFAULT_POSITION;
  const nearbyShelters = shelters
    .filter((shelter) => Number.isFinite(shelter.lat) && Number.isFinite(shelter.lng))
    .map((shelter) => ({
      ...shelter,
      distance: distanceKm(myPosition, [shelter.lat, shelter.lng]),
      isFull: shelter.status === "Full" || shelter.currentOccupancy >= shelter.capacity,
    }))
    .sort((a, b) => a.distance - b.distance);
  const nearestOpenId = nearbyShelters.find((shelter) => !shelter.isFull)?._id;
  const routeShelter = shelters.find((shelter) => shelter._id === nearestOpenId);

  // Newest alert from the last 48 hours; older ones are no longer "current"
  const latestAlert = alerts.find(
    (alert) => alert.createdAt && new Date() - new Date(alert.createdAt) < 48 * 60 * 60 * 1000
  );

  const alertTime = (timestamp) => {
    const minutes = Math.floor((new Date() - new Date(timestamp)) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  };

  const scrollToMap = () => {
    evacuationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Opens Google Maps with directions from the villager's position to the shelter
  const startNavigation = () => {
    if (!routeInfo) return;
    const { shelter, userPos } = routeInfo;
    const url =
      "https://www.google.com/maps/dir/?api=1" +
      `&origin=${userPos[0]},${userPos[1]}` +
      `&destination=${shelter.lat},${shelter.lng}` +
      "&travelmode=driving";
    window.open(url, "_blank", "noopener");
  };

  const distanceText = routeInfo ? `${routeInfo.distanceKm.toFixed(1)} km` : "Calculating...";
  const timeText = routeInfo
    ? `${Math.max(1, Math.round((routeInfo.distanceKm / ROAD_SPEED_KMPH) * 60))} min`
    : "Calculating...";

  // Text for the "Emergency request status" section
  let statusTitle = "No active emergency request";
  let statusText = "If you are in danger, use the SOS button above to request help.";
  let statusBadge = "Standby";

  if (activeRequest?.status === "In Progress") {
    const ngo = activeRequest.assignedTo;
    statusTitle = "Help is on the way";
    statusText = ngo
      ? `${ngo.name} has accepted your request${ngo.phone ? ` · Contact: ${ngo.phone}` : ""}. Stay in a safe location.`
      : "A responder has accepted your request. Stay in a safe location.";
    statusBadge = "Responder assigned";
  } else if (activeRequest?.status === "Pending") {
    statusTitle = "Your SOS has been received";
    statusText = "Waiting for the nearest responder to accept. Stay in a safe location.";
    statusBadge = "Waiting for responder";
  } else if (pendingOffline > 0) {
    statusTitle = "SOS saved on this phone";
    statusText = "There is no connection to the server yet. It will be sent automatically.";
    statusBadge = "Waiting for network";
  }

  const locationText = [user?.village, user?.district].filter(Boolean).join(", ") || "Karnataka";

  return (
    <div className="villager-page">

      {/* HEADER */}
      <header className="villager-header">

        <div className="villager-brand">
          <div className="villager-brand-icon">🛡️</div>
          <div>
            <h2>JAGRUTI</h2>
            <span>Disaster Response</span>
          </div>
        </div>

        <div className="villager-location">
          <span>●</span>
          <div>
            <small>YOUR LOCATION</small>
            <strong>{locationText}</strong>
          </div>
        </div>

        <ProfileMenu
          className="villager-profile"
          avatarClassName="villager-avatar"
          initials={initials(user?.name || "Villager")}
          name={user?.name || "Villager"}
          subtitle="My Account"
          phone={user?.phone}
          onLogout={onLogout}
        />

      </header>


      {/* MAIN */}
      <main className="villager-main">

        {/* WELCOME */}
        <section className="villager-welcome">
          <div>
            <p className="villager-label">COMMUNITY SAFETY</p>

            <h1>
              Stay safe,
              <br />
              <span>stay informed.</span>
            </h1>

            <p className="villager-subtitle">
              JAGRUTI is monitoring your area and will notify you
              when there is a change in disaster risk.
            </p>
          </div>

          <div className="monitor-status">
            <span></span>
            Area monitoring active
          </div>
        </section>


        {/* "YOU ARE IN DANGER" pop-up + siren + phone notification */}
        <DangerAlert
          alerts={alerts}
          user={user}
          onFindShelter={scrollToMap}
          onSendSOS={() => setShowSOS(true)}
        />

        {/* LATEST ALERT FOR MY AREA (from the Gram Panchayat) */}
        {latestAlert ? (
          <section className={`risk-card risk-${String(latestAlert.riskLevel).toLowerCase()}`}>

            <div className="risk-card-left">
              <div className="risk-icon">⚠</div>

              <div>
                <p className="card-label">CURRENT RISK LEVEL</p>
                <h2>{String(latestAlert.riskLevel).toUpperCase()}</h2>
                <p>{latestAlert.message}</p>
              </div>
            </div>

            <div className="risk-time">
              <small>ISSUED</small>
              <strong>{alertTime(latestAlert.createdAt)}</strong>
            </div>

          </section>
        ) : (
          <section className="risk-card risk-none">

            <div className="risk-card-left">
              <div className="risk-icon">✓</div>

              <div>
                <p className="card-label">CURRENT RISK LEVEL</p>
                <h2>NO ACTIVE ALERT</h2>
                <p>Your Gram Panchayat has not issued any alert for your area.</p>
              </div>
            </div>

          </section>
        )}


        {/* SOS + SHELTER */}
        <section className="villager-grid">

          {/* SOS */}
          <div className="villager-panel sos-card">

            <div className="villager-panel-heading">
              <div>
                <h3>Emergency SOS</h3>
                <p>Need immediate assistance?</p>
              </div>

              <span className="offline-badge">
                ● Offline Ready
              </span>
            </div>

            <div className="sos-action">

              <button
                className={`big-sos ${hasActiveSOS ? "sos-sent" : ""}`}
                onClick={() => setShowSOS(true)}
              >
                <span>{hasActiveSOS ? "✓" : "🆘"}</span>

                <strong>{hasActiveSOS ? "SOS SENT" : "SEND SOS"}</strong>

                <small>
                  {hasActiveSOS
                    ? "Tap to send another request"
                    : "Tap in an emergency"}
                </small>
              </button>

            </div>

            <div className="sos-info-row">
              <div>
                <span>📍</span>
                <p>
                  <strong>Location shared</strong>
                  <small>Your current location will be sent</small>
                </p>
              </div>

              <div>
                <span>📡</span>
                <p>
                  <strong>Works offline</strong>
                  <small>Request syncs when connection returns</small>
                </p>
              </div>
            </div>

            {sosNotice && (
              <div className="sos-confirmation">
                <span>✓</span>
                <div>
                  <strong>Emergency request saved</strong>
                  <p>{sosNotice}</p>
                </div>
              </div>
            )}

          </div>


          {/* SHELTER */}
          <div className="villager-panel">

            <div className="villager-panel-heading">

              <div>
                <h3>Nearby Safe Shelters</h3>
                <p>Available evacuation centres</p>
              </div>

            </div>


            {nearbyShelters.length === 0 && (
              <p className="shelter-empty">
                No shelters listed yet. Your Gram Panchayat will add them here.
              </p>
            )}

            {nearbyShelters.slice(0, 3).map((shelter) => {
              const percent = shelter.capacity
                ? Math.min(100, Math.round((shelter.currentOccupancy / shelter.capacity) * 100))
                : 0;
              return (
                <div className="shelter-card" key={shelter._id}>
                  <div className="shelter-icon">
                    {shelter._id === nearestOpenId ? "⭐" : "🏠"}
                  </div>

                  <div className="shelter-info">
                    <strong>{shelter.name}</strong>
                    <span>
                      {shelter.distance.toFixed(1)} km away
                      {shelter._id === nearestOpenId ? " · Nearest with space" : ""}
                    </span>

                    <div className="capacity-row">
                      <div className="capacity-bar">
                        <div
                          className={`capacity-fill ${percent >= 70 ? "orange-capacity" : "green-capacity"}`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>

                      <small>{percent}% full</small>
                    </div>
                  </div>

                  <span className={shelter.isFull ? "shelter-full" : "available"}>
                    {shelter.isFull ? "Full" : "Available"}
                  </span>
                </div>
              );
            })}


            <button className="route-button" onClick={scrollToMap}>
              🧭 Find safest shelter →
            </button>

          </div>

        </section>


        {/* FAMILY EVACUATION STATUS */}
        <FamilyStatusCard shelters={shelters} />


        {/* EVACUATION */}
        <section className="villager-panel evacuation-panel" ref={evacuationRef}>

          <div className="villager-panel-heading">

            <div>
              <h3>Safe Evacuation Route</h3>
              <p>Recommended route based on current risk</p>
            </div>

          </div>

          <div className="embedded-map">
            <UserMap shelter={routeShelter} onRouteInfo={setRouteInfo} />
          </div>

          <div className="route-preview route-preview-single">


            <div className="route-details">

              <div>
                <span>📍</span>
                <p>
                  <small>DESTINATION</small>
                  <strong>{routeInfo?.shelter.name || "Nearest shelter"}</strong>
                </p>
              </div>

              <div>
                <span>↗</span>
                <p>
                  <small>DISTANCE</small>
                  <strong>{distanceText}</strong>
                </p>
              </div>

              <div>
                <span>⏱</span>
                <p>
                  <small>ESTIMATED TIME (BY ROAD)</small>
                  <strong>{timeText}</strong>
                </p>
              </div>

              <button
                className="navigate-button"
                onClick={startNavigation}
                disabled={!routeInfo}
              >
                Start Navigation →
              </button>

            </div>

          </div>

        </section>


        {/* SOS STATUS */}
        <section className="status-section">

          <div>
            <p className="card-label">EMERGENCY REQUEST STATUS</p>

            <h3>{statusTitle}</h3>

            <p>{statusText}</p>
          </div>

          <div className={`status-indicator ${hasActiveSOS ? "active" : ""}`}>
            <span></span>
            {statusBadge}
          </div>

        </section>


        {/* FOOTER */}
        <footer className="villager-footer">

          <span>🛡️ JAGRUTI</span>

          <span>
            Emergency assistance · Coastal & Malnad Karnataka
          </span>

          <span>
            System Online ●
          </span>

        </footer>

      </main>

      {showSOS && (
        <SOSModal
          user={user}
          onClose={() => setShowSOS(false)}
          onSent={handleSOSSent}
        />
      )}

    </div>
  );
}

export default VillagerDashboard;