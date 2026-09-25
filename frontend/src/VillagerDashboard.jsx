import { useState } from "react";

function VillagerDashboard() {
  const [sosSent, setSosSent] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosError, setSosError] = useState("");

  // SEND SOS TO BACKEND
  const handleSOS = async () => {
    if (sosLoading || sosSent) return;

    setSosLoading(true);
    setSosError("");

    try {
      const response = await fetch("http://localhost:5000/api/sos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location: {
            lat: 13.3409,
            lng: 74.7421,
          },
          village: "Udupi",
          type: "Flood",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send SOS");
      }

      console.log("SOS successfully sent:", data);
      setSosSent(true);
    } catch (error) {
      console.error("SOS error:", error);
      setSosError(
        "Unable to send SOS right now. Please try again."
      );
    } finally {
      setSosLoading(false);
    }
  };

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
            <strong>Udupi, Karnataka</strong>
          </div>
        </div>

        <div className="villager-profile">
          <div className="villager-avatar">VB</div>
          <div>
            <strong>Villager</strong>
            <small>My Account</small>
          </div>
          <span>⌄</span>
        </div>

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
                className={`big-sos ${sosSent ? "sos-sent" : ""}`}
                onClick={handleSOS}
                disabled={sosLoading || sosSent}
              >
                <span>
                  {sosSent ? "✓" : sosLoading ? "⏳" : "🆘"}
                </span>

                <strong>
                  {sosSent
                    ? "SOS SENT"
                    : sosLoading
                    ? "SENDING..."
                    : "SEND SOS"}
                </strong>

                <small>
                  {sosSent
                    ? "Help request is being processed"
                    : sosLoading
                    ? "Connecting to emergency services..."
                    : "Tap in an emergency"}
                </small>
              </button>

              {sosError && (
                <p className="sos-error">
                  {sosError}
                </p>
              )}

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

            {sosSent && (
              <div className="sos-confirmation">
                <span>✓</span>
                <div>
                  <strong>Emergency request received</strong>
                  <p>
                    A nearby responder will be notified.
                  </p>
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

              <button className="small-link">
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


            <button className="route-button">
              🧭 Find safest shelter →
            </button>

          </div>

        </section>


        {/* EVACUATION */}
        <section className="villager-panel evacuation-panel">

          <div className="villager-panel-heading">

            <div>
              <h3>Safe Evacuation Route</h3>
              <p>Recommended route based on current risk</p>
            </div>

            <span className="route-status">
              ✓ Route Safe
            </span>

          </div>

          <div className="route-preview">

            <div className="route-map">

              <div className="route-road"></div>

              <div className="route-point start-point">
                <span>●</span>
                You
              </div>

              <div className="route-point shelter-point">
                <span>⌂</span>
                Shelter
              </div>

              <div className="route-line"></div>

            </div>


            <div className="route-details">

              <div>
                <span>📍</span>
                <p>
                  <small>DESTINATION</small>
                  <strong>Government PU College</strong>
                </p>
              </div>

              <div>
                <span>↗</span>
                <p>
                  <small>DISTANCE</small>
                  <strong>1.2 km</strong>
                </p>
              </div>

              <div>
                <span>⏱</span>
                <p>
                  <small>ESTIMATED TIME</small>
                  <strong>8 min</strong>
                </p>
              </div>

              <button className="navigate-button">
                Start Navigation →
              </button>

            </div>

          </div>

        </section>


        {/* SOS STATUS */}
        <section className="status-section">

          <div>
            <p className="card-label">EMERGENCY REQUEST STATUS</p>

            <h3>
              {sosSent
                ? "Your SOS is being processed"
                : "No active emergency request"}
            </h3>

            <p>
              {sosSent
                ? "A responder has been notified. Please stay in a safe location."
                : "If you are in danger, use the SOS button above to request help."}
            </p>
          </div>

          <div className={`status-indicator ${sosSent ? "active" : ""}`}>
            <span></span>
            {sosSent ? "Responder notified" : "Standby"}
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

    </div>
  );
}

export default VillagerDashboard;