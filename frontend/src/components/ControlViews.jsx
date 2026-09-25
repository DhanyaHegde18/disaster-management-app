import { useState } from "react";
import { apiFetch } from "../api";
import GramPanchayatMap from "./map/GramPanchayatMap";

// Full-page sections of the Control Centre, opened from the sidebar
// and from the "View all" / "Manage" buttons on the dashboard.

function timeAgo(timestamp) {
  if (!timestamp) return "";
  const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function ViewHeader({ title, subtitle, children }) {
  return (
    <div className="cc-view-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {children && <div className="cc-view-actions">{children}</div>}
    </div>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="cc-empty">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

// ---------------------------------------------------------------
// LIVE ALERTS
// ---------------------------------------------------------------

export function AlertsView({ alerts, loading, error, onNewAlert }) {
  return (
    <section className="cc-view">
      <ViewHeader title="Live Alerts" subtitle="Every alert sent to villages, newest first">
        <button className="cc-primary-btn" onClick={onNewAlert}>
          📢 Send new alert
        </button>
      </ViewHeader>

      <div className="panel cc-list">
        {loading && <EmptyState icon="⏳" title="Loading alerts..." text="Connecting to the alert service." />}
        {!loading && error && <EmptyState icon="⚠" title="Unable to load alerts" text={error} />}
        {!loading && !error && alerts.length === 0 && (
          <EmptyState icon="✓" title="No alerts yet" text="Alerts you send will appear here." />
        )}

        {!loading && !error && alerts.map((alert) => (
          <div className="cc-row" key={alert._id}>
            <span className={`cc-level cc-level-${String(alert.riskLevel || "").toLowerCase()}`}>
              {alert.riskLevel || "Alert"}
            </span>

            <div className="cc-row-main">
              <strong>
                {[alert.village, alert.district].filter(Boolean).join(", ") || "Region-wide"}
              </strong>
              <p>{alert.message}</p>
            </div>

            <div className="cc-row-meta">
              <span>{timeAgo(alert.createdAt || alert.timestamp)}</span>
              <small>
                SMS: {alert.sms?.mode === "live" ? `sent to ${alert.sms.sent ?? 0}` : "demo mode"}
              </small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// SOS REQUESTS
// ---------------------------------------------------------------

const SOS_FILTERS = [
  { id: "active", label: "Active" },
  { id: "Pending", label: "Pending" },
  { id: "In Progress", label: "In Progress" },
  { id: "Resolved", label: "Resolved" },
  { id: "all", label: "All" },
];

export function SOSView({ requests, loading, error, filter, onFilterChange }) {
  const shown = requests.filter((sos) => {
    if (filter === "all") return true;
    if (filter === "active") return sos.status !== "Resolved";
    return sos.status === filter;
  });

  const countFor = (id) =>
    requests.filter((sos) =>
      id === "all" ? true : id === "active" ? sos.status !== "Resolved" : sos.status === id
    ).length;

  return (
    <section className="cc-view">
      <ViewHeader title="SOS Requests" subtitle="Help requests from villagers, updated every 5 seconds" />

      <div className="cc-tabs">
        {SOS_FILTERS.map((tab) => (
          <button
            key={tab.id}
            className={`cc-tab ${filter === tab.id ? "active" : ""}`}
            onClick={() => onFilterChange(tab.id)}
          >
            {tab.label} <b>{countFor(tab.id)}</b>
          </button>
        ))}
      </div>

      <div className="panel cc-list">
        {loading && <EmptyState icon="⏳" title="Loading SOS requests..." text="Connecting to the server." />}
        {!loading && error && <EmptyState icon="⚠" title="Unable to load SOS requests" text={error} />}
        {!loading && !error && shown.length === 0 && (
          <EmptyState icon="✓" title="No requests here" text="Nothing matches this filter right now." />
        )}

        {!loading && !error && shown.map((sos) => (
          <div className="cc-row" key={sos._id}>
            <span className={`cc-status cc-status-${String(sos.status).replace(/\s+/g, "-").toLowerCase()}`}>
              {sos.status}
            </span>

            <div className="cc-row-main">
              <strong>
                {sos.type || "Emergency"} · {sos.village || "Unknown village"}
              </strong>
              <p>
                {sos.contactName
                  ? `${sos.contactName}${sos.contactPhone ? ` · ${sos.contactPhone}` : ""}`
                  : "Contact not shared"}
                {sos.assignedTo ? ` · Handled by ${sos.assignedTo.name}` : " · No responder yet"}
              </p>
            </div>

            <div className="cc-row-meta">
              <span>{timeAgo(sos.timestamp)}</span>
              {sos.location?.lat && sos.location?.lng && (
                <a
                  href={`https://www.google.com/maps?q=${sos.location.lat},${sos.location.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  📍 Open location
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// RISK MAP
// ---------------------------------------------------------------

export function MapView() {
  return (
    <section className="cc-view">
      <ViewHeader
        title="Risk Map"
        subtitle="Risk zones, shelters, NGO units and SOS across the region. Click the map to add a test SOS."
      />
      <div className="embedded-map cc-map-large">
        <GramPanchayatMap />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// SHELTERS (Control Centre can add, update occupancy, remove)
// ---------------------------------------------------------------

const EMPTY_SHELTER = { name: "", lat: "", lng: "", capacity: "", currentOccupancy: "" };

function AddShelterForm({ onAdded, onCancel }) {
  const [form, setForm] = useState(EMPTY_SHELTER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) =>
      setForm((current) => ({
        ...current,
        lat: pos.coords.latitude.toFixed(5),
        lng: pos.coords.longitude.toFixed(5),
      }))
    );
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/shelters", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          lat: Number(form.lat),
          lng: Number(form.lng),
          capacity: Number(form.capacity),
          currentOccupancy: Number(form.currentOccupancy) || 0,
        }),
      });
      setForm(EMPTY_SHELTER);
      onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel cc-form">
      <h3>New shelter</h3>

      <div className="cc-form-grid">
        <label className="cc-field cc-field-wide">
          <span>Name</span>
          <input value={form.name} onChange={update("name")} placeholder="e.g. Ujire Community Hall" />
        </label>

        <label className="cc-field">
          <span>Latitude</span>
          <input value={form.lat} onChange={update("lat")} placeholder="12.99850" inputMode="decimal" />
        </label>

        <label className="cc-field">
          <span>Longitude</span>
          <input value={form.lng} onChange={update("lng")} placeholder="75.32650" inputMode="decimal" />
        </label>

        <label className="cc-field">
          <span>Capacity (people)</span>
          <input value={form.capacity} onChange={update("capacity")} placeholder="300" inputMode="numeric" />
        </label>

        <label className="cc-field">
          <span>People there now</span>
          <input value={form.currentOccupancy} onChange={update("currentOccupancy")} placeholder="0" inputMode="numeric" />
        </label>
      </div>

      <p className="cc-form-hint">
        Tip: in Google Maps, right-click the building and click the numbers at the top to copy its latitude and longitude.
      </p>

      {error && <p className="cc-form-error">{error}</p>}

      <div className="cc-form-actions">
        <button type="button" className="cc-secondary-btn" onClick={useMyLocation}>
          📍 Use my location
        </button>
        <span className="cc-spacer"></span>
        <button type="button" className="cc-secondary-btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="cc-primary-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save shelter"}
        </button>
      </div>
    </div>
  );
}

function ShelterRow({ shelter, onChanged }) {
  const [draft, setDraft] = useState(null);   // typed occupancy, while editing
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const capacity = shelter.capacity || 0;
  const used = shelter.currentOccupancy || 0;
  const percent = capacity ? Math.min(100, Math.round((used / capacity) * 100)) : 0;
  const full = shelter.status === "Full" || (capacity > 0 && used >= capacity);

  const setOccupancy = async (value) => {
    const occupancy = Math.max(0, Math.min(capacity, Math.round(Number(value))));
    if (!Number.isFinite(occupancy)) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/api/shelters/${shelter._id}`, {
        method: "PATCH",
        body: JSON.stringify({ currentOccupancy: occupancy }),
      });
      setDraft(null);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Remove "${shelter.name}"?`)) return;
    try {
      await apiFetch(`/api/shelters/${shelter._id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="cc-row">
      <span className={`cc-status ${full ? "cc-status-full" : "cc-status-available"}`}>
        {full ? "Full" : "Available"}
      </span>

      <div className="cc-row-main">
        <strong>{shelter.name}</strong>
        <div className="cc-capacity">
          <div className="cc-capacity-bar">
            <div
              className={`cc-capacity-fill ${percent >= 85 ? "high" : percent >= 60 ? "medium" : ""}`}
              style={{ width: `${percent}%` }}
            ></div>
          </div>
          <small>{used} / {capacity} people · {capacity - used} places left</small>
        </div>
        {error && <p className="cc-form-error">{error}</p>}
      </div>

      <div className="cc-occupancy" title="People in the shelter now">
        <button type="button" onClick={() => setOccupancy(used - 1)} disabled={saving || used <= 0}>−</button>
        <input
          value={draft ?? used}
          inputMode="numeric"
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
          onBlur={() => draft !== null && setOccupancy(draft)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          disabled={saving}
        />
        <button type="button" onClick={() => setOccupancy(used + 1)} disabled={saving || used >= capacity}>+</button>
      </div>

      <div className="cc-row-meta">
        {shelter.lat && shelter.lng && (
          <a href={`https://www.google.com/maps?q=${shelter.lat},${shelter.lng}`} target="_blank" rel="noreferrer">
            📍 Location
          </a>
        )}
        <button type="button" className="cc-link-danger" onClick={remove}>Remove</button>
      </div>
    </div>
  );
}

export function SheltersView({ shelters, loading, error, onChanged }) {
  const [adding, setAdding] = useState(false);

  const totalCapacity = shelters.reduce((sum, s) => sum + (s.capacity || 0), 0);
  const totalOccupied = shelters.reduce((sum, s) => sum + (s.currentOccupancy || 0), 0);

  return (
    <section className="cc-view">
      <ViewHeader
        title="Shelters"
        subtitle={
          shelters.length
            ? `${shelters.length} shelters · ${totalOccupied} of ${totalCapacity} places in use · use − / + as people arrive or leave`
            : "Evacuation centres and their current occupancy"
        }
      >
        {!adding && (
          <button className="cc-primary-btn" onClick={() => setAdding(true)}>
            + Add shelter
          </button>
        )}
      </ViewHeader>

      {adding && (
        <AddShelterForm
          onAdded={() => {
            setAdding(false);
            onChanged();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <div className="panel cc-list">
        {loading && <EmptyState icon="⏳" title="Loading shelters..." text="Connecting to the server." />}
        {!loading && error && <EmptyState icon="⚠" title="Unable to load shelters" text={error} />}
        {!loading && !error && shelters.length === 0 && (
          <EmptyState
            icon="⌂"
            title="No shelters yet"
            text="Click “+ Add shelter”, or run  node seed-shelters.js  in the backend folder to add the demo shelters."
          />
        )}

        {!loading && !error && shelters.map((shelter) => (
          <ShelterRow key={shelter._id} shelter={shelter} onChanged={onChanged} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// RESPONDERS
// ---------------------------------------------------------------

export function RespondersView({ ngos, loading, error, sosRequests }) {
  // How many open SOS each NGO is handling right now
  const activeCount = (ngoId) =>
    sosRequests.filter(
      (sos) => sos.status === "In Progress" && (sos.assignedTo?._id || sos.assignedTo) === ngoId
    ).length;

  return (
    <section className="cc-view">
      <ViewHeader title="Responders" subtitle="Registered NGOs and what they are handling now" />

      <div className="panel cc-list">
        {loading && <EmptyState icon="⏳" title="Loading responders..." text="Connecting to the server." />}
        {!loading && error && <EmptyState icon="⚠" title="Unable to load responders" text={error} />}
        {!loading && !error && ngos.length === 0 && (
          <EmptyState
            icon="🚑"
            title="No NGOs registered yet"
            text="NGOs appear here after they log in once with their phone number."
          />
        )}

        {!loading && !error && ngos.map((ngo) => {
          const busy = activeCount(ngo._id);
          return (
            <div className="cc-row" key={ngo._id}>
              <span className={`cc-status ${busy ? "cc-status-in-progress" : ngo.available === false ? "cc-status-full" : "cc-status-available"}`}>
                {busy ? `${busy} active` : ngo.available === false ? "Unavailable" : "Available"}
              </span>

              <div className="cc-row-main">
                <strong>{ngo.name}</strong>
                <p>
                  {[ngo.contactPerson, ngo.phone, ngo.district].filter(Boolean).join(" · ")}
                  {ngo.services?.length ? ` · ${ngo.services.join(", ")}` : ""}
                </p>
              </div>

              <div className="cc-row-meta">
                {ngo.phone && <a href={`tel:${ngo.phone}`}>📞 Call</a>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// EVACUATION STATUS (from villagers' family reports)
// ---------------------------------------------------------------

const EVAC_GROUPS = [
  { field: "inShelter", label: "In shelter", className: "evac-shelter" },
  { field: "withRelatives", label: "With relatives", className: "evac-relatives" },
  { field: "atHome", label: "Stayed home", className: "evac-home" },
  { field: "elsewhere", label: "Place unknown", className: "evac-elsewhere" },
  { field: "unaccounted", label: "Not reported", className: "evac-unaccounted" },
];

export function EvacuationBar({ row }) {
  const total = row.totalMembers || 0;
  return (
    <div className="evac-bar" title={`${total} people`}>
      {total > 0 &&
        EVAC_GROUPS.map((group) =>
          row[group.field] > 0 ? (
            <div
              key={group.field}
              className={group.className}
              style={{ width: `${(row[group.field] / total) * 100}%` }}
            ></div>
          ) : null
        )}
    </div>
  );
}

export function EvacuationLegend() {
  return (
    <div className="evac-legend">
      {EVAC_GROUPS.map((group) => (
        <span key={group.field}>
          <i className={group.className}></i>
          {group.label}
        </span>
      ))}
    </div>
  );
}

export function EvacuationView({ data, loading, error }) {
  const totals = data?.totals;
  const villages = data?.villages || [];
  const reports = data?.reports || [];

  return (
    <section className="cc-view">
      <ViewHeader
        title="Evacuation Status"
        subtitle="Where people went after the alert, as reported by each family"
      />

      {loading && <div className="panel cc-list"><EmptyState icon="⏳" title="Loading reports..." text="Connecting to the server." /></div>}
      {!loading && error && <div className="panel cc-list"><EmptyState icon="⚠" title="Unable to load reports" text={error} /></div>}
      {!loading && !error && villages.length === 0 && (
        <div className="panel cc-list">
          <EmptyState
            icon="👪"
            title="No family reports yet"
            text="When villagers fill in “Where is your family?” on their app, the numbers appear here."
          />
        </div>
      )}

      {!loading && !error && totals && villages.length > 0 && (
        <>
          <div className="evac-totals">
            <div className="evac-total-card">
              <small>PEOPLE REPORTED</small>
              <strong>{totals.totalMembers}</strong>
              <span>{totals.families} families</span>
            </div>
            {EVAC_GROUPS.map((group) => (
              <div className={`evac-total-card ${group.className}-text`} key={group.field}>
                <small>{group.label.toUpperCase()}</small>
                <strong>{totals[group.field]}</strong>
                <span>
                  {totals.totalMembers ? Math.round((totals[group.field] / totals.totalMembers) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>

          <div className="panel cc-list">
            <div className="evac-list-head">
              <h3>By village</h3>
              <EvacuationLegend />
            </div>

            {villages.map((row) => (
              <div className="cc-row evac-row" key={row.village}>
                <div className="cc-row-main">
                  <strong>{row.village}{row.district ? `, ${row.district}` : ""}</strong>
                  <EvacuationBar row={row} />
                  <p>
                    {row.totalMembers} people from {row.families} families ·{" "}
                    {row.inShelter} in shelter · {row.withRelatives} with relatives ·{" "}
                    {row.atHome} at home · {row.elsewhere} place unknown
                    {row.unaccounted > 0 ? ` · ${row.unaccounted} not reported` : ""}
                  </p>
                </div>
                <div className="cc-row-meta">
                  <span>{timeAgo(row.lastUpdated)}</span>
                  {row.atHome + row.elsewhere + row.unaccounted > 0 && (
                    <small className="evac-followup">
                      ⚠ {row.atHome + row.elsewhere + row.unaccounted} need follow-up
                    </small>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="panel cc-list">
            <div className="evac-list-head">
              <h3>Family reports</h3>
            </div>
            {reports.map((report) => {
              const unaccounted =
                report.totalMembers -
                (report.inShelter + report.withRelatives + report.atHome + report.elsewhere);
              return (
                <div className="cc-row" key={report._id}>
                  <div className="cc-row-main">
                    <strong>
                      {report.reporterName || "Villager"} · {report.village || "Unknown village"}
                    </strong>
                    <p>
                      {report.totalMembers} members · {report.inShelter} in shelter
                      {report.shelterName ? ` (${report.shelterName})` : ""} · {report.withRelatives} with relatives ·{" "}
                      {report.atHome} at home · {report.elsewhere} place unknown
                      {unaccounted > 0 ? ` · ${unaccounted} not reported` : ""}
                    </p>
                  </div>
                  <div className="cc-row-meta">
                    <span>{timeAgo(report.updatedAt)}</span>
                    {report.reporterPhone && <a href={`tel:${report.reporterPhone}`}>📞 Call</a>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
