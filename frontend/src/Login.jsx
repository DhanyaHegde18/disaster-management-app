import { useState } from "react";
import { apiFetch } from "./api";

const ROLES = [
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

const DISTRICTS = [
  "Dakshina Kannada",
  "Udupi",
  "Uttara Kannada",
  "Shivamogga",
  "Chikkamagaluru",
  "Kodagu",
  "Hassan",
];

const roleTitle = (id) => ROLES.find((role) => role.id === id)?.title;

// Login steps:
//   "phone" -> choose role, enter mobile number, send code
//   "code"  -> enter the code (and name/village etc. the first time), verify
function Login({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState("villager");
  const [step, setStep] = useState("phone");

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  // First-time registration details
  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("Dakshina Kannada");
  const [ngoName, setNgoName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Control Centre has no account type in the backend yet, so it opens directly
  const needsOtp = selectedRole !== "official";

  const chooseRole = (roleId) => {
    setSelectedRole(roleId);
    setStep("phone");
    setError("");
  };

  // STEP 1: send the code
  const handleSendCode = async () => {
    if (!needsOtp) {
      onLogin({ role: "official", token: null, user: null });
      return;
    }

    const digits = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await apiFetch("/api/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ phone: digits }),
      });

      setIsNewUser(Boolean(data.isNewUser));
      setDemoOtp(data.demoOtp || "");
      setCode("");
      setStep("code");
    } catch (err) {
      setError(
        err.status
          ? err.message
          : "Cannot reach the server. Is the backend running on port 5000?"
      );
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: check the code (and create the account the first time)
  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Please enter the 6-digit code.");
      return;
    }
    if (isNewUser && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (isNewUser && selectedRole === "ngo" && !ngoName.trim()) {
      setError("Please enter your NGO's name.");
      return;
    }

    setLoading(true);
    setError("");

    const body = { phone: phone.replace(/\D/g, ""), code: code.trim() };

    if (isNewUser) {
      body.name = name.trim();
      body.district = district;
      if (selectedRole === "ngo") {
        body.registerAs = "ngo";
        body.ngoName = ngoName.trim();
      } else {
        body.village = village.trim();
      }
    }

    try {
      const data = await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify(body),
      });

      // The number is already registered under the other role
      if (data.user.role !== selectedRole) {
        setError(
          `This number is registered as ${roleTitle(data.user.role)}. Please choose "${roleTitle(data.user.role)}" to log in.`
        );
        setStep("phone");
        return;
      }

      onLogin({ role: data.user.role, token: data.token, user: data.user });
    } catch (err) {
      setError(
        err.status
          ? err.message
          : "Cannot reach the server. Is the backend running on port 5000?"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event, action) => {
    if (event.key === "Enter") action();
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
            <p>
              {step === "phone"
                ? "Select your role to continue to JAGRUTI."
                : `Enter the code sent to +91 ${phone.replace(/\D/g, "")}`}
            </p>
          </div>

          {step === "phone" && (
            <>
              {/* ROLE SELECTION */}
              <div className="role-section">
                <label>CONTINUE AS</label>

                <div className="role-list">
                  {ROLES.map((role) => (
                    <button
                      key={role.id}
                      className={`role-card ${
                        selectedRole === role.id ? "selected" : ""
                      }`}
                      onClick={() => chooseRole(role.id)}
                      type="button"
                    >
                      <div className="role-icon">{role.icon}</div>

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

              {/* MOBILE NUMBER */}
              {needsOtp && (
                <div className="input-section">
                  <label htmlFor="mobile">MOBILE NUMBER</label>
                  <div className="input-wrapper">
                    <span>+91</span>
                    <input
                      id="mobile"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Enter your mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => handleKeyDown(e, handleSendCode)}
                    />
                  </div>
                </div>
              )}

              {error && <p className="login-error">{error}</p>}

              <button
                className="login-button"
                onClick={handleSendCode}
                disabled={loading}
                type="button"
              >
                {loading
                  ? "Sending code..."
                  : needsOtp
                  ? "Send OTP"
                  : `Continue as ${roleTitle(selectedRole)}`}
                <span>→</span>
              </button>
            </>
          )}

          {step === "code" && (
            <>
              {demoOtp && (
                <div className="otp-demo-box">
                  <small>DEMO MODE · SMS is off, your code is</small>
                  <strong>{demoOtp}</strong>
                </div>
              )}

              <div className="input-section">
                <label htmlFor="otp">6-DIGIT CODE</label>
                <div className="input-wrapper">
                  <span>🔑</span>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    placeholder="Enter the code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => handleKeyDown(e, handleVerify)}
                  />
                </div>
              </div>

              {/* FIRST-TIME REGISTRATION */}
              {isNewUser && (
                <div className="register-fields">
                  <p className="register-title">
                    New here? Tell us a little about you.
                  </p>

                  <div className="input-section">
                    <label htmlFor="name">
                      {selectedRole === "ngo" ? "CONTACT PERSON NAME" : "YOUR NAME"}
                    </label>
                    <div className="input-wrapper">
                      <input
                        id="name"
                        type="text"
                        placeholder="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>

                  {selectedRole === "ngo" ? (
                    <div className="input-section">
                      <label htmlFor="ngoName">NGO NAME</label>
                      <div className="input-wrapper">
                        <input
                          id="ngoName"
                          type="text"
                          placeholder="Organisation name"
                          value={ngoName}
                          onChange={(e) => setNgoName(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="input-section">
                      <label htmlFor="village">VILLAGE</label>
                      <div className="input-wrapper">
                        <input
                          id="village"
                          type="text"
                          placeholder="e.g. Ujire"
                          value={village}
                          onChange={(e) => setVillage(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="input-section">
                    <label htmlFor="district">DISTRICT</label>
                    <div className="input-wrapper">
                      <select
                        id="district"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                      >
                        {DISTRICTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {error && <p className="login-error">{error}</p>}

              <button
                className="login-button"
                onClick={handleVerify}
                disabled={loading}
                type="button"
              >
                {loading
                  ? "Verifying..."
                  : `Verify & continue as ${roleTitle(selectedRole)}`}
                <span>→</span>
              </button>

              <div className="otp-links">
                <button type="button" onClick={handleSendCode} disabled={loading}>
                  Resend code
                </button>
                <button type="button" onClick={() => { setStep("phone"); setError(""); }}>
                  Change number
                </button>
              </div>
            </>
          )}

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
              SMS is off, so the login code is shown on screen.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;
