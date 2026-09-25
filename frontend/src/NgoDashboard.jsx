import { useCallback, useEffect, useState } from "react";
import NgoMap from "./components/map/NgoMap";
import ProfileMenu from "./components/ProfileMenu";
import LocationModal from "./components/LocationModal";
import { apiFetch, initials } from "./api";

// The id of the NGO an SOS is assigned to (populated object or plain id)
const assignedId = (sos) => sos.assignedTo?._id || sos.assignedTo || null;

function NgoDashboard({ user, onLogout }) {
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");     // problem loading the list
  const [actionError, setActionError] = useState(""); // problem with accept/resolve (stays until dismissed)
  const [notice, setNotice] = useState("");           // success message
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [locationSOS, setLocationSOS] = useState(null);

  const myNgoId = user?.ngo || null;

  // All SOS requests (needs the NGO login token). Refreshed every 5 seconds.
  const fetchSOS = useCallback(async () => {
    try {
      const data = await apiFetch("/api/sos");
      setAllRequests(Array.isArray(data) ? data : []);
      setListError("");
    } catch (err) {
      console.error("SOS fetch error:", err);
      setListError(
        err.status === 401 || err.status === 403
          ? "Your login has expired. Please log out and log in again."
          : "Unable to load emergency requests. Is the backend running?"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(fetchSOS, 0);
    const interval = setInterval(fetchSOS, 5000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [fetchSOS]);

  // What this NGO should see: requests nobody has taken yet, plus the ones it is handling
  const pending = allRequests.filter((sos) => sos.status === "Pending");
  const mine = allRequests.filter(
    (sos) => sos.status === "In Progress" && myNgoId && assignedId(sos) === myNgoId
  );
  const visible = [...mine, ...pending];

  const today = new Date().toDateString();
  const resolvedToday = allRequests.filter(
    (sos) =>
      sos.status === "Resolved" &&
      myNgoId &&
      assignedId(sos) === myNgoId &&
      sos.resolvedAt &&
      new Date(sos.resolvedAt).toDateString() === today
  ).length;

  const currentRequest = visible.find((sos) => sos._id === selectedId) || visible[0];
  const otherRequests = visible.filter((sos) => sos !== currentRequest).slice(0, 4);
  const isMine = currentRequest && assignedId(currentRequest) === myNgoId;

  const runAction = async (action, successMessage) => {
    if (!currentRequest || actionLoading) return;
    setActionLoading(true);
    setActionError("");
    setNotice("");
    try {
      await action(currentRequest);
      setNotice(successMessage);
      await fetchSOS();
    } catch (err) {
      console.error("SOS action error:", err);
      if (err.status === 409) {
        setActionError("Another NGO accepted this request first. It has been removed from your list.");
        setSelectedId(null);
        await fetchSOS();
      } else if (err.status === 401 || err.status === 403) {
        setActionError(`${err.message}. Try logging out and logging in again as NGO.`);
      } else {
        setActionError(err.status ? err.message : "Cannot reach the server. Is the backend running on port 5000?");
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Pending -> In Progress, assigned to this NGO
  const handleAccept = () =>
    runAction(
      (sos) => apiFetch(`/api/sos/${sos._id}/assign`, { method: "PATCH" }),
      "Request accepted. The villager can now see that help is on the way."
    );

  // In Progress -> Resolved
  const handleResolve = () =>
    runAction(
      (sos) =>
        apiFetch(`/api/sos/${sos._id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "Resolved" }),
        }),
      "Marked as resolved. Thank you!"
    );

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return "Just now";
    const diffMinutes = Math.floor((new Date() - new Date(timestamp)) / 60000);
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes === 1) return "1 minute ago";
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  };

  const TYPE_ICONS = { Flood: "🌊", Landslide: "⛰️", Medical: "🚑", Other: "⚠️" };

  return (
    <div className="ngo-dashboard">

      {/* HEADER */}
      <header className="ngo-header">

        <div className="ngo-brand">
          <div className="ngo-logo">🛡️</div>

          <div>
            <h2>JAGRUTI</h2>
            <span>Disaster Response</span>
          </div>
        </div>

        <div className="ngo-location">
          <span className="location-dot"></span>

          <div>
            <small>RESPONSE AREA</small>
            <strong>Udupi, Karnataka</strong>
          </div>
        </div>

        <ProfileMenu
          className="ngo-profile"
          avatarClassName="ngo-avatar"
          initials={initials(user?.name || "NGO")}
          name={user?.name || "Responder"}
          subtitle="NGO Account"
          phone={user?.phone}
          onLogout={onLogout}
        />

      </header>


      {/* MAIN */}
      <main className="ngo-main">

        {/* WELCOME */}
        <section className="ngo-welcome">

          <div>
            <p className="section-label">
              RESPONSE CENTRE
            </p>

            <h1>
              Ready to respond.
            </h1>

            <p>
              Monitor nearby emergency requests and coordinate relief
              operations in your assigned area.
            </p>
          </div>

          <div className="availability-badge">
            <span></span>
            Available for response
          </div>

        </section>


        {/* STATS */}
        <section className="ngo-stats">

          <div className="ngo-stat-card">
            <span>🚨</span>
            <div>
              <small>WAITING FOR HELP</small>
              <strong>{loading ? "--" : String(pending.length).padStart(2, "0")}</strong>
            </div>
          </div>

          <div className="ngo-stat-card">
            <span>🚐</span>
            <div>
              <small>YOU ARE HANDLING</small>
              <strong>{loading ? "--" : String(mine.length).padStart(2, "0")}</strong>
            </div>
          </div>

          <div className="ngo-stat-card">
            <span>✓</span>
            <div>
              <small>RESOLVED TODAY</small>
              <strong>{loading ? "--" : String(resolvedToday).padStart(2, "0")}</strong>
            </div>
          </div>

          <div className="ngo-stat-card">
            <span>📍</span>
            <div>
              <small>RESPONSE AREA</small>
              <strong>{user?.district || "Udupi"}</strong>
            </div>
          </div>

        </section>


        {/* EMERGENCY REQUEST */}
        <section className="ngo-request-section">

          <div className="section-heading">
            <div>
              <h2>Incoming Emergency Requests</h2>
              <p>Requests waiting for a responder, and the ones you are handling</p>
            </div>

            <span className="request-count">
              {visible.length} ACTIVE
            </span>
          </div>

          {listError && <div className="ngo-banner ngo-banner-error">{listError}</div>}

          {!myNgoId && (
            <div className="ngo-banner ngo-banner-error">
              This login is not linked to an NGO, so it cannot accept requests.
              Log out and log in again; if this stays, register the NGO again with its phone number.
            </div>
          )}

          {actionError && (
            <div className="ngo-banner ngo-banner-error">
              <span>{actionError}</span>
              <button type="button" onClick={() => setActionError("")} aria-label="Dismiss">✕</button>
            </div>
          )}

          {notice && (
            <div className="ngo-banner ngo-banner-success">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice("")} aria-label="Dismiss">✕</button>
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div className="emergency-request">
              <h3>Loading emergency requests...</h3>
              <p>Connecting to the JAGRUTI response network.</p>
            </div>
          )}

          {/* NO REQUEST */}
          {!loading && !currentRequest && (
            <div className="emergency-request">
              <div className="request-top">
                <div className="severity">
                  <span className="severity-icon">✓</span>
                  <div>
                    <small>ALL CLEAR</small>
                    <h3>No active emergency requests</h3>
                  </div>
                </div>
                <span className="request-status">Standby</span>
              </div>

              <div className="request-message">
                <strong>Monitoring active</strong>
                <p>New emergency requests will appear here automatically.</p>
              </div>
            </div>
          )}

          {/* CURRENT REQUEST */}
          {!loading && currentRequest && (
            <div className={`emergency-request ${isMine ? "request-mine" : ""}`}>

              <div className="request-top">
                <div className="severity">
                  <span className="severity-icon">{isMine ? "🚐" : "!"}</span>
                  <div>
                    <small>{isMine ? "YOU ARE RESPONDING" : "NEEDS A RESPONDER"}</small>
                    <h3>
                      {currentRequest.type || "Emergency"} at {currentRequest.village || "unknown village"}
                    </h3>
                  </div>
                </div>

                <span className="request-status">{currentRequest.status}</span>
              </div>

              <div className="request-details">
                <div className="request-detail">
                  <span>📍</span>
                  <div>
                    <small>LOCATION</small>
                    <strong>{currentRequest.village || "Not given"}</strong>
                  </div>
                </div>

                <div className="request-detail">
                  <span>{TYPE_ICONS[currentRequest.type] || "⚠️"}</span>
                  <div>
                    <small>EMERGENCY TYPE</small>
                    <strong>{currentRequest.type || "Emergency"}</strong>
                  </div>
                </div>

                <div className="request-detail">
                  <span>🕐</span>
                  <div>
                    <small>RECEIVED</small>
                    <strong>{formatTime(currentRequest.timestamp)}</strong>
                  </div>
                </div>
              </div>

              <div className="request-message">
                <strong>Contact</strong>
                <p>
                  {currentRequest.contactName
                    ? `${currentRequest.contactName}${currentRequest.contactPhone ? ` · ${currentRequest.contactPhone}` : ""}`
                    : "The villager did not share contact details."}
                  {isMine
                    ? " Mark it resolved once the person is safe."
                    : " Accept to let the villager and Control Centre know help is coming."}
                </p>
              </div>

              <div className="request-actions">
                <button
                  className="view-location"
                  onClick={() => setLocationSOS(currentRequest)}
                >
                  📍 View Location
                </button>

                {currentRequest.status === "Pending" && (
                  <button className="accept-request" onClick={handleAccept} disabled={actionLoading}>
                    {actionLoading ? "Accepting..." : "Accept Request →"}
                  </button>
                )}

                {isMine && (
                  <button className="accept-request resolve-request" onClick={handleResolve} disabled={actionLoading}>
                    {actionLoading ? "Saving..." : "✓ Mark as Resolved"}
                  </button>
                )}
              </div>

            </div>
          )}

          {/* OTHER REQUESTS: click one to open it above */}
          {otherRequests.length > 0 && (
            <div className="other-requests">
              {otherRequests.map((sos) => (
                <button
                  type="button"
                  className="mini-request"
                  key={sos._id}
                  onClick={() => {
                    setSelectedId(sos._id);
                    setActionError("");
                    setNotice("");
                  }}
                >
                  <div>
                    <span className="medium-dot"></span>
                    <div>
                      <strong>{sos.type || "Emergency"} · {sos.village || "Unknown"}</strong>
                      <small>{formatTime(sos.timestamp)}</small>
                    </div>
                  </div>

                  <span className="mini-status">
                    {assignedId(sos) === myNgoId ? "YOURS" : "NEW"}
                  </span>
                </button>
              ))}
            </div>
          )}

        </section>


        {/* RESPONSE MAP */}
        <section className="ngo-map-section">

          <div className="section-heading">

            <div>
              <h2>
                Response Area
              </h2>

              <p>
                Nearby incidents and safe locations
              </p>
            </div>

          </div>


          <div className="embedded-map">
            <NgoMap />
          </div>

        </section>


        {/* FOOTER */}
        <footer className="ngo-footer">

          <div>
            <strong>JAGRUTI</strong>
            <span>
              {" "} | Emergency Response Network
            </span>
          </div>

          <span>
            ● System operational
          </span>

        </footer>

      </main>

      {locationSOS && (
        <LocationModal sos={locationSOS} onClose={() => setLocationSOS(null)} />
      )}

    </div>
  );
}

export default NgoDashboard;