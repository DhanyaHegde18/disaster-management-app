import { useEffect, useState } from "react";
import Login from "./Login";
import ProfileMenu from "./components/ProfileMenu";
import { apiFetch, clearSession, initials, loadSession, saveSession } from "./api";
import { AlertsView, MapView, RespondersView, SheltersView, SOSView } from "./components/ControlViews";
import VillagerDashboard from "./VillagerDashboard";
import NgoDashboard from "./NgoDashboard";
import GramPanchayatMap from "./components/map/GramPanchayatMap";
import "./App.css";

function App() {
  // Logged-in session: { role, token, user }. Kept in localStorage so a refresh stays logged in.
  const [session, setSession] = useState(() => {
    const saved = loadSession();
    return saved?.token ? saved : null;   // sessions from before OTP login have no token
  });
  const loggedIn = Boolean(session);
  const role = session?.role || null;

  // =========================================================
  // LIVE BACKEND DATA
  // =========================================================

  const [sosRequests, setSosRequests] = useState([]);   // active (not resolved)
  const [allSOS, setAllSOS] = useState([]);             // every request, for the SOS page
  const [ngos, setNgos] = useState([]);
  const [ngosLoading, setNgosLoading] = useState(true);
  const [ngosError, setNgosError] = useState("");

  // Which Control Centre page is open: dashboard | alerts | sos | map | shelters | responders
  const [activeView, setActiveView] = useState("dashboard");
  const [sosFilter, setSosFilter] = useState("active");
  const [riskZones, setRiskZones] = useState([]);
  const [shelters, setShelters] = useState([]);

  const [sosLoading, setSosLoading] = useState(true);
  const [, setRiskLoading] = useState(true);
  const [shelterLoading, setShelterLoading] = useState(true);

  const [sosError, setSosError] = useState("");
  const [, setRiskError] = useState("");
  const [shelterError, setShelterError] = useState("");

  // =========================================================
  // ALERT STATE
  // =========================================================

  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState("");

  const [showAlertModal, setShowAlertModal] = useState(false);

  const [alertVillage, setAlertVillage] = useState("Udupi");
  const [alertDistrict, setAlertDistrict] = useState("Udupi");
  const [alertRiskLevel, setAlertRiskLevel] = useState("Severe");

  const [alertLoading, setAlertLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertError, setAlertError] = useState("");

  // =========================================================
  // LOGIN
  // =========================================================

  const handleLogin = (newSession) => {
    saveSession(newSession);
    setSession(newSession);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
  };

  // =========================================================
  // FETCH SOS
  // =========================================================

  const fetchSOSRequests = async () => {
    try {
      setSosError("");

      const data = await apiFetch("/api/sos");

      setAllSOS(data);
      setSosRequests(data.filter((sos) => sos.status !== "Resolved"));
    } catch (error) {
      console.error("SOS fetch error:", error);
      setSosError(
        error.status === 401 || error.status === 403
          ? "Please log out and log in again as Control Centre."
          : "Unable to load live SOS data."
      );
    } finally {
      setSosLoading(false);
    }
  };

  // =========================================================
  // FETCH RISK ZONES
  // =========================================================

  const fetchRiskZones = async () => {
    try {
      setRiskError("");

      const data = await apiFetch("/api/risk-zones");

      setRiskZones(data);
    } catch (error) {
      console.error("Risk zones fetch error:", error);
      setRiskError("Unable to load risk zone data.");
    } finally {
      setRiskLoading(false);
    }
  };

  // =========================================================
  // FETCH SHELTERS
  // =========================================================

  const fetchShelters = async () => {
    try {
      setShelterError("");

      const data = await apiFetch("/api/shelters");

      setShelters(data);
    } catch (error) {
      console.error("Shelters fetch error:", error);
      setShelterError("Unable to load shelter data.");
    } finally {
      setShelterLoading(false);
    }
  };

  // =========================================================
  // FETCH ALERTS
  // =========================================================

  const fetchNgos = async () => {
    try {
      setNgosError("");
      const data = await apiFetch("/api/ngos");
      setNgos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("NGO fetch error:", error);
      setNgosError("Unable to load responders.");
    } finally {
      setNgosLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      setAlertsError("");

      const data = await apiFetch("/api/alerts");

      setAlerts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Alerts fetch error:", error);
      setAlertsError("Unable to load live alert data.");
    } finally {
      setAlertsLoading(false);
    }
  };

  // =========================================================
  // REFRESH LIVE DATA
  // =========================================================

  useEffect(() => {
    if (loggedIn && role === "control") {
      fetchSOSRequests();
      fetchRiskZones();
      fetchShelters();
      fetchAlerts();
      fetchNgos();

      const interval = setInterval(() => {
        fetchSOSRequests();
        fetchRiskZones();
        fetchShelters();
        fetchAlerts();
        fetchNgos();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [loggedIn, role]);

  // =========================================================
  // PAGE NAVIGATION
  // =========================================================

  const VIEW_TITLES = {
    dashboard: "OVERVIEW",
    alerts: "LIVE ALERTS",
    sos: "SOS REQUESTS",
    map: "RISK MAP",
    shelters: "SHELTERS",
    responders: "RESPONDERS",
  };

  const openView = (view, sosTab) => {
    setActiveView(view);
    if (sosTab) setSosFilter(sosTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // =========================================================
  // OPEN ALERT MODAL
  // =========================================================

  const openAlertModal = () => {
    setAlertMessage("");
    setAlertError("");

    if (riskZones.length > 0) {
      setAlertVillage(riskZones[0].village || "Udupi");
      setAlertDistrict(riskZones[0].district || "Udupi");

      if (riskZones[0].riskLevel) {
        const normalizedRisk = String(riskZones[0].riskLevel);

        const supportedRiskLevels = [
          "Low",
          "Moderate",
          "High",
          "Severe",
        ];

        setAlertRiskLevel(
          supportedRiskLevels.includes(normalizedRisk)
            ? normalizedRisk
            : "Severe"
        );
      }
    }

    setShowAlertModal(true);
  };

  // =========================================================
  // CLOSE ALERT MODAL
  // =========================================================

  const closeAlertModal = () => {
    if (alertLoading) return;

    setShowAlertModal(false);
    setAlertMessage("");
    setAlertError("");
  };

  // =========================================================
  // TRIGGER EMERGENCY ALERT
  // =========================================================

  const triggerEmergencyAlert = async () => {
    if (!alertVillage || !alertDistrict || !alertRiskLevel) {
      setAlertError(
        "Please select a village, district and risk level."
      );
      return;
    }

    try {
      setAlertLoading(true);
      setAlertError("");
      setAlertMessage("");

      const data = await apiFetch("/api/alerts/trigger", {
        method: "POST",
        body: JSON.stringify({
            village: alertVillage,
            district: alertDistrict,
            riskLevel: alertRiskLevel,
          }),
      });

      setAlertMessage(
        `${data.message || `Emergency alert triggered for ${alertVillage}`}${
          data.sms?.mode === "simulated"
            ? " · SMS: demo mode"
            : ""
        }`
      );

      // Refresh alerts immediately
      await fetchAlerts();

      setTimeout(() => {
        setShowAlertModal(false);
        setAlertMessage("");
      }, 2500);
    } catch (error) {
      console.error("Emergency alert error:", error);

      setAlertError(
        "Unable to trigger emergency alert. Please try again."
      );
    } finally {
      setAlertLoading(false);
    }
  };

  // =========================================================
  // ALERT DISPLAY HELPERS
  // =========================================================

  const formatAlertTime = (createdAt) => {
    if (!createdAt) return "Just now";

    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return "Just now";
    }

    const diffMinutes = Math.max(
      0,
      Math.floor((Date.now() - date.getTime()) / 60000)
    );

    if (diffMinutes < 1) return "Just now";

    if (diffMinutes < 60) {
      return `${diffMinutes} minute${
        diffMinutes === 1 ? "" : "s"
      } ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
      return `${diffHours} hour${
        diffHours === 1 ? "" : "s"
      } ago`;
    }

    const diffDays = Math.floor(diffHours / 24);

    return `${diffDays} day${
      diffDays === 1 ? "" : "s"
    } ago`;
  };

  const getAlertDisplayClass = (color) => {
    switch (String(color || "").toLowerCase()) {
      case "red":
        return "warning";

      case "orange":
        return "warning";

      case "yellow":
        return "info";

      case "green":
        return "safe-symbol";

      default:
        return "info";
    }
  };

  const getAlertStatusClass = (color) => {
    switch (String(color || "").toLowerCase()) {
      case "red":
      case "orange":
        return "active-status";

      case "yellow":
        return "monitoring";

      case "green":
        return "resolved";

      default:
        return "monitoring";
    }
  };

  const getAlertStatusText = (color) => {
    switch (String(color || "").toLowerCase()) {
      case "red":
      case "orange":
        return "Active";

      case "yellow":
        return "Monitoring";

      case "green":
        return "Resolved";

      default:
        return "Monitoring";
    }
  };

  // =========================================================
  // LOGIN SCREEN
  // =========================================================

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  // =========================================================
  // VILLAGER
  // =========================================================

  if (role === "villager") {
    return <VillagerDashboard user={session.user} onLogout={handleLogout} />;
  }

  // =========================================================
  // NGO
  // =========================================================

  if (role === "ngo") {
    return <NgoDashboard user={session.user} onLogout={handleLogout} />;
  }

  // =========================================================
  // CALCULATED VALUES
  // =========================================================

  const pendingSOS = sosRequests.filter(
    (sos) => sos.status === "Pending"
  ).length;

  const criticalRiskCount = riskZones.filter(
    (zone) =>
      zone.riskLevel?.toLowerCase() === "critical"
  ).length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // NGOs currently handling at least one SOS
  const busyNgoIds = new Set(
    sosRequests
      .filter((sos) => sos.status === "In Progress" && sos.assignedTo)
      .map((sos) => sos.assignedTo._id || sos.assignedTo)
  );

  const availableShelters = shelters.filter(
    (shelter) => shelter.status !== "Full"
  ).length;

  // =========================================================
  // CONTROL CENTRE
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">
            🛡️
          </div>

          <div>
            <h2>JAGRUTI</h2>
            <span>Disaster Response</span>
          </div>

        </div>


        <div className="location">

          <span className="location-dot"></span>

          <div>
            <small>CONTROL CENTRE</small>
            <p>Coastal Karnataka</p>
          </div>

        </div>


        <nav>
          <button
            className={`nav-item ${activeView === "dashboard" ? "active" : ""}`}
            onClick={() => openView("dashboard")}
          >
            <span>▦</span>
            Dashboard
          </button>

          <button
            className={`nav-item ${activeView === "alerts" ? "active" : ""}`}
            onClick={() => openView("alerts")}
          >
            <span>⚠</span>
            Live Alerts
            <b className="nav-badge">{alerts.length}</b>
          </button>

          <button
            className={`nav-item ${activeView === "sos" ? "active" : ""}`}
            onClick={() => openView("sos")}
          >
            <span>🆘</span>
            SOS Requests
            <b className="nav-badge red">{sosRequests.length}</b>
          </button>

          <button
            className={`nav-item ${activeView === "map" ? "active" : ""}`}
            onClick={() => openView("map")}
          >
            <span>⌖</span>
            Risk Map
          </button>

          <button
            className={`nav-item ${activeView === "shelters" ? "active" : ""}`}
            onClick={() => openView("shelters")}
          >
            <span>⌂</span>
            Shelters
          </button>

          <button
            className={`nav-item ${activeView === "responders" ? "active" : ""}`}
            onClick={() => openView("responders")}
          >
            <span>♧</span>
            Responders
          </button>
        </nav>


        <div className="sidebar-bottom">

          <div className="system-status">

            <span className="status-dot"></span>

            <div>
              <strong>System Online</strong>
              <small>All services operational</small>
            </div>

          </div>


          <button className="settings">
            ⚙ Settings
          </button>

        </div>

      </aside>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="main">

        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="topbar">

          <div>

            <p className="breadcrumb">
              CONTROL CENTRE / {VIEW_TITLES[activeView]}
            </p>

            <h1>
              {greeting}, {session.user?.name?.split(" ")[0] || "Officer"}
            </h1>

            <p className="subtitle">
              Here's what's happening across your monitored region.
            </p>

          </div>


          <div className="header-actions">

            <div className="live-indicator">
              <span></span>
              LIVE
            </div>

            <button
              className="notification"
              onClick={() => openView("alerts")}
              title="Open live alerts"
            >
              🔔
              <span>{alerts.length}</span>
            </button>

            <ProfileMenu
              className="profile"
              avatarClassName="avatar"
              initials={initials(session.user?.name || "Control Officer")}
              name={session.user?.name || "Control Officer"}
              subtitle="Control Centre"
              phone={session.user?.phone}
              onLogout={handleLogout}
            />

          </div>

        </header>


        {activeView === "dashboard" && (
          <>
        {/* ===================================================
            ALERT BANNER
        =================================================== */}

        <section className="critical-banner">

          <div className="critical-icon">
            ⚠
          </div>

          <div className="critical-text">

            <strong>
              CRITICAL ALERT
            </strong>

            <p>
              Heavy rainfall detected in monitored villages.
              Risk levels are being monitored in real time.
            </p>

          </div>

          <div className="critical-location">

            <span>●</span>

            {criticalRiskCount > 0
              ? `${criticalRiskCount} Critical Zone${
                  criticalRiskCount > 1 ? "s" : ""
                }`
              : "Coastal Karnataka"}

          </div>

          <button className="view-alert" onClick={() => openView("alerts")}>
            View Alert →
          </button>

        </section>


        {/* ===================================================
            STAT CARDS
        =================================================== */}

        <section className="stats">

          <div className="stat-card">

            <div className="stat-top">

              <span>ACTIVE ALERTS</span>

              <div className="stat-icon orange">
                ⚠
              </div>

            </div>

            <h2>
              {alerts.length}
            </h2>

            <p>
              <span className="up">
                {
                  alerts.filter(
                    (alert) =>
                      alert.riskLevel?.toLowerCase() ===
                      "severe"
                  ).length
                } severe
              </span>
              recent alerts
            </p>

          </div>


          <div className="stat-card">

            <div className="stat-top">

              <span>ACTIVE SOS</span>

              <div className="stat-icon red-icon">
                🆘
              </div>

            </div>

            <h2>
              {sosRequests.length}
            </h2>

            <p>
              <span className="danger">
                {pendingSOS} pending
              </span>
              requiring response
            </p>

          </div>


          <div className="stat-card">

            <div className="stat-top">

              <span>RESPONDERS</span>

              <div className="stat-icon blue">
                ♧
              </div>

            </div>

            <h2>{ngos.length}</h2>
            <p>
              <span className="up">{busyNgoIds.size}</span>
              {" "}currently responding
            </p>

          </div>


          <div className="stat-card">

            <div className="stat-top">

              <span>SHELTERS</span>

              <div className="stat-icon green">
                ⌂
              </div>

            </div>

            <h2>
              {shelters.length}
            </h2>

            <p>
              <span className="safe">
                {availableShelters} available
              </span>
              · {shelters.length - availableShelters} full
            </p>

          </div>

        </section>


        {/* ===================================================
            CONTENT GRID
        =================================================== */}

        <section className="dashboard-grid">

          {/* =================================================
              RISK MAP
          ================================================= */}

          <div className="panel map-panel">

            <div className="panel-header">

              <div>

                <h3>
                  Regional Risk Overview
                </h3>

                <p>
                  Live risk levels across monitored villages
                </p>

              </div>

              <button className="outline-btn" onClick={() => openView("map")}>
                Full Map ↗
              </button>

            </div>


            <div className="embedded-map">
              <GramPanchayatMap />
            </div>

          </div>


          {/* =================================================
              SOS
          ================================================= */}

          <div className="panel sos-panel">

            <div className="panel-header">

              <div>

                <h3>
                  Live SOS Requests
                </h3>

                <p>
                  Requests requiring attention
                </p>

              </div>

              <span className="count-pill">
                {sosRequests.length} Active
              </span>

            </div>


            <div className="sos-list">

              {sosLoading && (

                <div className="sos-item">

                  <div className="sos-info">

                    <strong>
                      Loading live SOS requests...
                    </strong>

                    <small>
                      Connecting to emergency service
                    </small>

                  </div>

                </div>

              )}


              {!sosLoading &&
                sosError && (

                  <div className="sos-item">

                    <div className="sos-info">

                      <strong>
                        Unable to load SOS requests
                      </strong>

                      <small>
                        {sosError}
                      </small>

                    </div>

                  </div>

                )}


              {!sosLoading &&
                !sosError &&
                sosRequests.length === 0 && (

                  <div className="sos-item">

                    <div className="sos-avatar">
                      ✓
                    </div>

                    <div className="sos-info">

                      <strong>
                        No active SOS requests
                      </strong>

                      <small>
                        All emergency requests are currently handled.
                      </small>

                    </div>

                  </div>

                )}


              {!sosLoading &&
                !sosError &&
                sosRequests.length > 0 &&
                sosRequests
                  .slice(0, 4)
                  .map((sos) => {

                    const village =
                      sos.village ||
                      "Unknown location";

                    const type =
                      sos.type ||
                      "Emergency";

                    const initials =
                      village
                        .split(" ")
                        .map(
                          (word) => word[0]
                        )
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();

                    const isPending =
                      sos.status === "Pending";

                    return (

                      <div
                        className={`sos-item ${
                          isPending
                            ? "critical-item"
                            : ""
                        }`}
                        key={sos._id}
                      >

                        <div className="sos-avatar">
                          {initials}
                        </div>

                        <div className="sos-info">

                          <strong>
                            {village}
                          </strong>

                          <span>
                            {village} · {type}
                          </span>

                          <small>
                            {sos.status}
                          </small>

                        </div>

                        <span
                          className={`priority ${
                            isPending
                              ? "critical-priority"
                              : "high-priority"
                          }`}
                        >

                          {isPending
                            ? "PENDING"
                            : "IN PROGRESS"}

                        </span>

                      </div>

                    );

                  })}

            </div>


            <button className="view-all" onClick={() => openView("sos", "active")}>
              View all SOS requests →
            </button>

          </div>

        </section>


        {/* ===================================================
            BOTTOM GRID
        =================================================== */}

        <section className="bottom-grid">

          {/* =================================================
              RECENT ALERTS
          ================================================= */}

          <div className="panel">

            <div className="panel-header">

              <div>

                <h3>
                  Recent Alerts
                </h3>

                <p>
                  Latest system notifications
                </p>

              </div>

              <button className="text-btn" onClick={() => openView("alerts")}>
                View all →
              </button>

            </div>


            {alertsLoading && (

              <div className="alert-row">

                <span className="alert-symbol info">
                  ●
                </span>

                <div>

                  <strong>
                    Loading live alerts...
                  </strong>

                  <p>
                    Connecting to alert service
                  </p>

                </div>

              </div>

            )}


            {!alertsLoading &&
              alertsError && (

                <div className="alert-row">

                  <span className="alert-symbol warning">
                    ⚠
                  </span>

                  <div>

                    <strong>
                      Unable to load alerts
                    </strong>

                    <p>
                      {alertsError}
                    </p>

                  </div>

                </div>

              )}


            {!alertsLoading &&
              !alertsError &&
              alerts.length === 0 && (

                <div className="alert-row">

                  <span className="alert-symbol safe-symbol">
                    ✓
                  </span>

                  <div>

                    <strong>
                      No recent alerts
                    </strong>

                    <p>
                      The alert system has no recorded alerts.
                    </p>

                  </div>

                </div>

              )}


            {!alertsLoading &&
              !alertsError &&
              alerts.slice(0, 3).map((alert) => (

                <div
                  className="alert-row"
                  key={alert._id}
                >

                  <span
                    className={`alert-symbol ${getAlertDisplayClass(
                      alert.color
                    )}`}
                  >
                    {String(alert.color || "").toLowerCase() ===
                    "green"
                      ? "✓"
                      : "⚠"}
                  </span>

                  <div>

                    <strong>
                      {alert.riskLevel
                        ? `${alert.riskLevel} risk alert`
                        : "Emergency alert"}
                    </strong>

                    <p>
                      {alert.village || "Unknown village"} ·{" "}
                      {alert.district || "Unknown district"} ·{" "}
                      {formatAlertTime(alert.createdAt)}
                    </p>

                    <small>
                      {alert.message ||
                        "Emergency warning issued."}

                      {alert.sms?.mode === "simulated"
                        ? " · SMS: demo mode"
                        : ""}
                    </small>

                  </div>

                  <span
                    className={`alert-status ${getAlertStatusClass(
                      alert.color
                    )}`}
                  >
                    {getAlertStatusText(alert.color)}
                  </span>

                </div>

              ))}


          </div>


          {/* =================================================
              SHELTERS
          ================================================= */}

          <div className="panel">

            <div className="panel-header">

              <div>

                <h3>
                  Shelter Capacity
                </h3>

                <p>
                  Current occupancy
                </p>

              </div>

              <button className="text-btn" onClick={() => openView("shelters")}>
                Manage →
              </button>

            </div>


            {shelterLoading && (

              <div className="shelter">

                <strong>
                  Loading shelters...
                </strong>

              </div>

            )}


            {!shelterLoading &&
              !shelterError &&
              shelters.slice(0, 3).map(
                (shelter, index) => {

                  const capacity =
                    Number(shelter.capacity) || 0;

                  const occupancy =
                    Number(
                      shelter.currentOccupancy
                    ) || 0;

                  const percentage =
                    capacity > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (occupancy /
                              capacity) *
                              100
                          )
                        )
                      : 0;

                  let fillClass =
                    "green-fill";

                  if (percentage >= 80) {
                    fillClass =
                      "red-fill";
                  } else if (
                    percentage >= 60
                  ) {
                    fillClass =
                      "orange-fill";
                  }

                  return (

                    <div
                      className="shelter"
                      key={
                        shelter._id || index
                      }
                    >

                      <div className="shelter-title">

                        <strong>
                          {shelter.name}
                        </strong>

                        <span>
                          {percentage}%
                        </span>

                      </div>


                      <div className="progress">

                        <div
                          className={`progress-fill ${fillClass}`}
                          style={{
                            width: `${percentage}%`,
                          }}
                        ></div>

                      </div>


                      <small>
                        {occupancy} / {capacity} people
                        {" · "}
                        {shelter.status ||
                          "Available"}
                      </small>

                    </div>

                  );

                }
              )}

          </div>


          {/* =================================================
              RESPONDERS
          ================================================= */}

          <div className="panel">

            <div className="panel-header">

              <div>

                <h3>
                  Responder Status
                </h3>

                <p>
                  NGO response activity
                </p>

              </div>

              <button className="text-btn" onClick={() => openView("responders")}>
                View all →
              </button>

            </div>


            {ngosLoading && (
              <p className="panel-empty">Loading responders...</p>
            )}

            {!ngosLoading && ngos.length === 0 && (
              <p className="panel-empty">
                No NGOs registered yet. They appear after their first login.
              </p>
            )}

            {ngos.slice(0, 3).map((ngo) => {
              const busy = busyNgoIds.has(ngo._id);
              return (
                <div className="responder" key={ngo._id}>
                  <div className="responder-icon">🚑</div>

                  <div>
                    <strong>{ngo.name}</strong>
                    <span>
                      {[ngo.district, ngo.contactPerson].filter(Boolean).join(" · ") || "NGO"}
                    </span>
                  </div>

                  <b className={busy ? "on-way" : "accepted"}>
                    {busy ? "Responding" : "Available"}
                  </b>
                </div>
              );
            })}

          </div>

        </section>


        {/* ===================================================
            EMERGENCY ALERT ACTION
        =================================================== */}

        <section className="action-bar">

          <div>

            <strong>
              Need to broadcast an emergency alert?
            </strong>

            <p>
              Send an immediate warning to affected
              villages and responders.
            </p>

          </div>


          <button
            className="alert-button"
            onClick={openAlertModal}
          >
            🔊 Activate Emergency Alert
          </button>

        </section>


          </>
        )}

        {activeView === "alerts" && (
          <AlertsView
            alerts={alerts}
            loading={alertsLoading}
            error={alertsError}
            onNewAlert={openAlertModal}
          />
        )}

        {activeView === "sos" && (
          <SOSView
            requests={allSOS}
            loading={sosLoading}
            error={sosError}
            filter={sosFilter}
            onFilterChange={setSosFilter}
          />
        )}

        {activeView === "map" && <MapView />}

        {activeView === "shelters" && (
          <SheltersView
            shelters={shelters}
            loading={shelterLoading}
            error={shelterError}
            onChanged={fetchShelters}
          />
        )}

        {activeView === "responders" && (
          <RespondersView
            ngos={ngos}
            loading={ngosLoading}
            error={ngosError}
            sosRequests={sosRequests}
          />
        )}

        {/* ===================================================
            EMERGENCY ALERT MODAL
        =================================================== */}

        {showAlertModal && (

          <div className="alert-modal-overlay">

            <div className="alert-modal">

              <div className="alert-modal-header">

                <div>

                  <div className="alert-modal-icon">
                    🚨
                  </div>

                  <h2>
                    Emergency Alert
                  </h2>

                  <p>
                    Broadcast a warning to an affected
                    village.
                  </p>

                </div>


                <button
                  className="modal-close"
                  onClick={closeAlertModal}
                  disabled={alertLoading}
                >
                  ✕
                </button>

              </div>


              {/* VILLAGE */}

              <div className="form-group">

                <label>
                  Affected Village
                </label>

                <select
                  value={alertVillage}
                  onChange={(e) =>
                    setAlertVillage(
                      e.target.value
                    )
                  }
                  disabled={alertLoading}
                >

                  {riskZones.length > 0 ? (

                    riskZones.map((zone) => (

                      <option
                        key={zone._id}
                        value={zone.village}
                      >
                        {zone.village}
                      </option>

                    ))

                  ) : (

                    <option value="Udupi">
                      Udupi
                    </option>

                  )}

                </select>

              </div>


              {/* DISTRICT */}

              <div className="form-group">

                <label>
                  District
                </label>

                <input
                  type="text"
                  value={alertDistrict}
                  onChange={(e) =>
                    setAlertDistrict(
                      e.target.value
                    )
                  }
                  disabled={alertLoading}
                  placeholder="Enter district"
                />

              </div>


              {/* RISK LEVEL */}

              <div className="form-group">

                <label>
                  Risk Level
                </label>

                <select
                  value={alertRiskLevel}
                  onChange={(e) =>
                    setAlertRiskLevel(
                      e.target.value
                    )
                  }
                  disabled={alertLoading}
                >

                  <option value="Low">
                    Low
                  </option>

                  <option value="Moderate">
                    Moderate
                  </option>

                  <option value="High">
                    High
                  </option>

                  <option value="Severe">
                    Severe
                  </option>

                </select>

              </div>


              {/* SUCCESS */}

              {alertMessage && (

                <div className="alert-success">
                  ✓ {alertMessage}
                </div>

              )}


              {/* ERROR */}

              {alertError && (

                <div className="alert-error">
                  ⚠ {alertError}
                </div>

              )}


              {/* BUTTONS */}

              <div className="alert-modal-actions">

                <button
                  className="cancel-alert"
                  onClick={closeAlertModal}
                  disabled={alertLoading}
                >
                  Cancel
                </button>


                <button
                  className="confirm-alert"
                  onClick={triggerEmergencyAlert}
                  disabled={alertLoading}
                >

                  {alertLoading
                    ? "Sending..."
                    : "🚨 Trigger Alert"}

                </button>

              </div>

            </div>

          </div>

        )}

      </main>

    </div>
  );
}

export default App;