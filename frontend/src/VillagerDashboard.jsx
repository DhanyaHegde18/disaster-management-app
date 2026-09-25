import { useCallback, useEffect, useRef, useState } from "react";
import UserMap from "./components/map/UserMap";
import ProfileMenu from "./components/ProfileMenu";
import SOSModal from "./components/SOSModal";
import { apiFetch, getToken, initials } from "./api";
import { getPendingCount, startAutoSync } from "./utils/offlineSOS";

// Average road speed used for the evacuation time estimate (ghat roads, rain)
const ROAD_SPEED_KMPH = 30;

function VillagerDashboard({ user, onLogout }) {
  const [showSOS, setShowSOS] = useState(false);
  const [sosNotice, setSosNotice] = useState("");      // message after sending
  const [myRequests, setMyRequests] = useState([]);    // this villager's SOS from the backend
  const [pendingOffline, setPendingOffline] = useState(0);
  const [routeInfo, setRouteInfo] = useState(null);    // { shelter, userPos, distanceKm } from the map

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


        {/* CURRENT RISK */}
        <section className="risk-card">

          <div className="risk-card-left">

            <div className="risk-icon">⚠</div>

            <div>
              <p className="card-label">CURRENT RISK LEVEL</p>

              <h2>HIGH</h2>

              <p>
                Heavy rainfall detected in your region.
              </p>
            </div>

          </div>

          <div className="risk-time">
            <small>LAST UPDATED</small>
            <strong>2 minutes ago</strong>
          </div>

        </section>


        {/* ALERT */}
        <section className="villager-alert">

          <div className="villager-alert-icon">⚠</div>

          <div className="villager-alert-content">
            <div className="alert-heading">
              <strong>HEAVY RAINFALL WARNING</strong>
              <span>ACTIVE</span>
            </div>

            <p>
              Heavy rainfall is expected in your area. Avoid
              low-lying areas and stay near a safe shelter.
            </p>

            <small>
              Issued by Coastal Karnataka Control Centre · 12 min ago
            </small>
          </div>

        </section>


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

              <button className="small-link" onClick={scrollToMap}>
                View map →
              </button>

            </div>


            <div className="shelter-card">

              <div className="shelter-icon">🏠</div>

              <div className="shelter-info">
                <strong>Government PU College</strong>
                <span>1.2 km away · Udupi</span>

                <div className="capacity-row">
                  <div className="capacity-bar">
                    <div
                      className="capacity-fill orange-capacity"
                      style={{ width: "78%" }}
                    ></div>
                  </div>

                  <small>78% full</small>
                </div>

              </div>

              <span className="available">
                Available
              </span>

            </div>


            <div className="shelter-card">

              <div className="shelter-icon">🏫</div>

              <div className="shelter-info">
                <strong>Community Hall</strong>
                <span>2.4 km away · Udupi</span>

                <div className="capacity-row">
                  <div className="capacity-bar">
                    <div
                      className="capacity-fill green-capacity"
                      style={{ width: "42%" }}
                    ></div>
                  </div>

                  <small>42% full</small>
                </div>

              </div>

              <span className="available">
                Available
              </span>

            </div>


            <button className="route-button" onClick={scrollToMap}>
              🧭 Find safest shelter →
            </button>

          </div>

        </section>


        {/* EVACUATION */}
        <section className="villager-panel evacuation-panel" ref={evacuationRef}>

          <div className="villager-panel-heading">

            <div>
              <h3>Safe Evacuation Route</h3>
              <p>Recommended route based on current risk</p>
            </div>

            <span className="route-status">
              ✓ Route Safe
            </span>

          </div>

          <div className="embedded-map">
            <UserMap onRouteInfo={setRouteInfo} />
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