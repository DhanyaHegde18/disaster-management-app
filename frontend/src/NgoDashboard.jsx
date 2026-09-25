import { useEffect, useState } from "react";
import NgoMap from "./components/map/NgoMap";

function NgoDashboard() {
  const [requests, setRequests] = useState([]);
  const [requestStatus, setRequestStatus] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch real SOS requests from backend
  const fetchSOS = async () => {
    try {
      setError("");

      const response = await fetch(
        "http://localhost:5000/api/sos?status=active"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch SOS requests");
      }

      const data = await response.json();

      setRequests(data);

      if (data.length > 0) {
        setRequestStatus(data[0].status);
      } else {
        setRequestStatus("No Active Requests");
      }
    } catch (err) {
      console.error("SOS fetch error:", err);
      setError("Unable to load emergency requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSOS();

    // Refresh every 5 seconds
    const interval = setInterval(fetchSOS, 5000);

    return () => clearInterval(interval);
  }, []);

  // Accept the first/latest SOS
  const handleAccept = async () => {
    if (!requests.length || actionLoading) return;

    const sos = requests[0];

    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(
        `http://localhost:5000/api/sos/${sos._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "In Progress",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept request");
      }

      setRequestStatus("In Progress");

      // Refresh the list
      await fetchSOS();
    } catch (err) {
      console.error("Accept request error:", err);
      setError("Unable to accept this emergency request.");
    } finally {
      setActionLoading(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return "Just now";

    const date = new Date(timestamp);
    const now = new Date();

    const diffMinutes = Math.floor(
      (now - date) / (1000 * 60)
    );

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes === 1) return "1 minute ago";
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours === 1) return "1 hour ago";

    return `${diffHours} hours ago`;
  };

  const currentRequest = requests[0];

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

        <div className="ngo-profile">
          <div className="ngo-avatar">NG</div>

          <div>
            <strong>Responder</strong>
            <small>NGO Account</small>
          </div>

          <span>⌄</span>
        </div>

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
              <small>ACTIVE REQUESTS</small>
              <strong>
                {loading ? "--" : String(requests.length).padStart(2, "0")}
              </strong>
            </div>
          </div>


          <div className="ngo-stat-card">
            <span>✓</span>

            <div>
              <small>RESOLVED TODAY</small>
              <strong>12</strong>
            </div>
          </div>


          <div className="ngo-stat-card">
            <span>📍</span>

            <div>
              <small>RESPONSE AREA</small>
              <strong>Udupi</strong>
            </div>
          </div>


          <div className="ngo-stat-card">
            <span>👥</span>

            <div>
              <small>TEAM MEMBERS</small>
              <strong>08</strong>
            </div>
          </div>

        </section>


        {/* EMERGENCY REQUEST */}
        <section className="ngo-request-section">

          <div className="section-heading">

            <div>
              <h2>
                Incoming Emergency Requests
              </h2>

              <p>
                Requests matched to your location and services
              </p>
            </div>

            <span className="request-count">
              {requests.length} ACTIVE
            </span>

          </div>


          {/* ERROR */}
          {error && (
            <div
              style={{
                padding: "12px",
                marginBottom: "16px",
                borderRadius: "8px",
                background: "#fff1f1",
                color: "#c62828",
              }}
            >
              {error}
            </div>
          )}


          {/* LOADING */}
          {loading && (
            <div className="emergency-request">
              <h3>Loading emergency requests...</h3>
              <p>
                Connecting to the JAGRUTI response network.
              </p>
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

                    <h3>
                      No active emergency requests
                    </h3>
                  </div>
                </div>

                <span className="request-status">
                  Standby
                </span>
              </div>

              <div className="request-message">
                <strong>
                  Monitoring active
                </strong>

                <p>
                  New emergency requests will appear here
                  automatically.
                </p>
              </div>

            </div>
          )}


          {/* REAL REQUEST */}
          {!loading && currentRequest && (
            <div className="emergency-request">

              {/* TOP */}
              <div className="request-top">

                <div className="severity">

                  <span className="severity-icon">
                    !
                  </span>

                  <div>
                    <small>
                      CRITICAL REQUEST
                    </small>

                    <h3>
                      Immediate Assistance Required
                    </h3>
                  </div>

                </div>

                <span className="request-status">
                  {requestStatus}
                </span>

              </div>


              {/* DETAILS */}
              <div className="request-details">

                <div className="request-detail">

                  <span>📍</span>

                  <div>
                    <small>LOCATION</small>

                    <strong>
                      {currentRequest.village || "Udupi"}
                    </strong>
                  </div>

                </div>


                <div className="request-detail">

                  <span>🌊</span>

                  <div>
                    <small>EMERGENCY TYPE</small>

                    <strong>
                      {currentRequest.type || "Emergency"}
                    </strong>
                  </div>

                </div>


                <div className="request-detail">

                  <span>🕐</span>

                  <div>
                    <small>RECEIVED</small>

                    <strong>
                      {formatTime(currentRequest.timestamp)}
                    </strong>
                  </div>

                </div>

              </div>


              {/* MESSAGE */}
              <div className="request-message">

                <strong>
                  Emergency message
                </strong>

                <p>
                  Emergency assistance has been requested
                  from {currentRequest.village || "the affected village"}.
                  Immediate response may be required.
                </p>

              </div>


              {/* ACTIONS */}
              <div className="request-actions">

                <button className="view-location">
                  📍 View Location
                </button>


                {requestStatus === "Pending" ? (

                  <button
                    className="accept-request"
                    onClick={handleAccept}
                    disabled={actionLoading}
                  >
                    {actionLoading
                      ? "Accepting..."
                      : "Accept Request →"}
                  </button>

                ) : (

                  <button className="accepted-request">
                    ✓ Response Accepted
                  </button>

                )}

              </div>

            </div>
          )}


          {/* OTHER REQUESTS */}
          <div className="other-requests">

            <div className="mini-request">

              <div>
                <span className="medium-dot"></span>

                <div>
                  <strong>
                    Medical Assistance
                  </strong>

                  <small>
                    Manipal • Monitoring
                  </small>
                </div>
              </div>

              <span className="mini-status">
                NEW
              </span>

            </div>


            <div className="mini-request">

              <div>
                <span className="medium-dot"></span>

                <div>
                  <strong>
                    Evacuation Support
                  </strong>

                  <small>
                    Brahmagiri • Monitoring
                  </small>
                </div>
              </div>

              <span className="mini-status">
                NEW
              </span>

            </div>

          </div>

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

    </div>
  );
}

export default NgoDashboard;