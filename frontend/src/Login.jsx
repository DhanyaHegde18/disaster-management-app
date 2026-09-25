import { useState } from "react";

function Login({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState("villager");

  const roles = [
    {
      id: "villager",
      icon: "👨‍🌾",
      title: "Villager",
      description: "Receive alerts, send SOS and find safe shelters",
    },
    {
      id: "official",
      icon: "🏢",
      title: "Control Centre",
      description: "Monitor risks, alerts, SOS requests and response",
    },
    {
      id: "ngo",
      icon: "🚑",
      title: "NGO / Responder",
      description: "Respond to emergency requests and coordinate rescue",
    },
  ];

  const handleLogin = () => {
    onLogin(selectedRole);
  };

  return (
    <div className="login-page">

      {/* LEFT SIDE */}
      <div className="login-hero">

        <div className="login-brand">
          <div className="login-brand-icon">🛡️</div>

          <div>
            <h1>JAGRUTI</h1>
            <span>Disaster Response Platform</span>
          </div>
        </div>

        <div className="hero-content">

          <div className="hero-badge">
            ● PROTECTING COASTAL KARNATAKA
          </div>

          <h2>
            Predict.
            <br />
            Alert.
            <br />
            <span>Respond.</span>
          </h2>

          <p>
            An intelligent disaster response platform connecting
            communities, control centres and responders when every
            second matters.
          </p>

          <div className="hero-features">

            <div>
              <span>⚠</span>
              <p>
                <strong>Early Warning</strong>
                <small>Village-level risk alerts</small>
              </p>
            </div>

            <div>
              <span>🆘</span>
              <p>
                <strong>Offline SOS</strong>
                <small>Stay connected during outages</small>
              </p>
            </div>

            <div>
              <span>🚑</span>
              <p>
                <strong>Rapid Response</strong>
                <small>Connect with nearby responders</small>
              </p>
            </div>

          </div>

        </div>

        <div className="login-footer">
          <span>JAGRUTI</span>
          <span>•</span>
          <span>Coastal & Malnad Karnataka</span>
        </div>

      </div>


      {/* RIGHT SIDE */}
      <div className="login-form-area">

        <div className="login-card">

          <div className="mobile-brand">
            <div>🛡️</div>
            <strong>JAGRUTI</strong>
          </div>

          <div className="login-heading">
            <span>SECURE ACCESS</span>
            <h2>Welcome back</h2>
            <p>Select your role to continue to JAGRUTI.</p>
          </div>


          {/* ROLE SELECTION */}
          <div className="role-section">

            <label>CONTINUE AS</label>

            <div className="role-list">

              {roles.map((role) => (
                <button
                  key={role.id}
                  className={`role-card ${
                    selectedRole === role.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedRole(role.id)}
                  type="button"
                >

                  <div className="role-icon">
                    {role.icon}
                  </div>

                  <div className="role-info">
                    <strong>{role.title}</strong>
                    <span>{role.description}</span>
                  </div>

                  <div className="role-radio">
                    {selectedRole === role.id && <span></span>}
                  </div>

                </button>
              ))}

            </div>

          </div>


          {/* LOGIN FIELDS */}
          <div className="input-section">

            <label htmlFor="mobile">MOBILE NUMBER</label>

            <div className="input-wrapper">
              <span>+91</span>

              <input
                id="mobile"
                type="tel"
                placeholder="Enter your mobile number"
              />
            </div>

          </div>


          <button
            className="login-button"
            onClick={handleLogin}
          >
            Continue as{" "}
            {roles.find((role) => role.id === selectedRole)?.title}
            <span>→</span>
          </button>


          <div className="security-note">
            <span>🔒</span>
            <p>
              Your information is securely handled for emergency
              response purposes.
            </p>
          </div>


          <div className="demo-note">
            <strong>DEMO MODE</strong>
            <span>
              No real phone number required for this prototype.
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;