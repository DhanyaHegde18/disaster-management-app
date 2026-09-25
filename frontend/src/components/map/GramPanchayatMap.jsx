import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './maps.css';
import { ALL_VILLAGE_ZONES, SHELTERS, NEEDY_PEOPLE, NGO_TEAMS } from '../../data/mockData';
import { ngoIcon, needyIcon, shelterIcon } from './MapIcons';

const RED_DISPATCH_ROUTE = [
  [12.9850, 75.2600],
  [12.9910, 75.2830],
  [12.9995, 75.3050],
  [13.0110, 75.3280],
  [13.0210, 75.3420],
  [13.0280, 75.3550]
];

const GREEN_SHELTER_ROUTE = [
  [13.0280, 75.3550],
  [13.0180, 75.3350],
  [13.0070, 75.3120],
  [12.9960, 75.2890],
  [12.9880, 75.2710],
  [12.9850, 75.2600]
];

const getRiskColor = (level) => {
  switch (level?.toLowerCase()) {
    case 'critical': return '#991b1b';
    case 'high':     return '#dc2626';
    case 'moderate': return '#d97706';
    default:         return '#16a34a';
  }
};

function ClickToAddDistress({ onNewSOS }) {
  useMapEvents({
    click(e) {
      onNewSOS({
        id: `sos-${Date.now()}`,
        groupName: "Live SOS Incident",
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        urgency: "Immediate Boat Rescue Required"
      });
    }
  });
  return null;
}

const GramPanchayatMap = () => {
  const [distressList, setDistressList] = useState(NEEDY_PEOPLE);
  const [liveNgoPos, setLiveNgoPos] = useState(RED_DISPATCH_ROUTE[0]);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % RED_DISPATCH_ROUTE.length;
      setLiveNgoPos(RED_DISPATCH_ROUTE[idx]);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="map-view-container">
      <div className="role-banner banner-gp">
        <div className="banner-left">
          <span>🏛️ <strong>GRAM PANCHAYAT COMMAND CENTER</strong></span>
          <span className="live-badge">TALUK LEVEL</span>
        </div>
        <div className="banner-right">
          <span style={{ color: '#4338ca', fontSize: '0.8rem' }}>💡 Click map to add live SOS</span>
        </div>
      </div>

      <MapContainer center={[13.15, 75.25]} zoom={10} scrollWheelZoom={true} className="leaflet-map-frame">
        <ClickToAddDistress onNewSOS={(newSOS) => setDistressList((prev) => [...prev, newSOS])} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Risk Zones */}
        {ALL_VILLAGE_ZONES.map((zone) => (
          <CircleMarker
            key={`gp-${zone.id}`}
            center={[zone.lat, zone.lng]}
            radius={18}
            pathOptions={{ color: getRiskColor(zone.riskLevel), fillColor: getRiskColor(zone.riskLevel), fillOpacity: 0.6 }}
          >
            <Popup>
              <div className="popup-card">
                <h4>⚠️ {zone.name}</h4>
                <p>Risk: <strong>{zone.riskLevel}</strong></p>
                <p>Citizens at Risk: {zone.populationAtRisk}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Shelters */}
        {SHELTERS.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={shelterIcon}>
            <Popup>
              <div className="popup-card">
                <h4>🏥 {s.name}</h4>
                <p>Status: <span className="status-badge open">{s.status}</span></p>
                <p>Capacity: {s.availableSpaces} / {s.capacity} beds</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Live Moving NGO Unit */}
        {NGO_TEAMS.map((team) => (
          <Marker key={team.id} position={liveNgoPos} icon={ngoIcon}>
            <Popup>
              <div className="popup-card">
                <h4>🚐 {team.name}</h4>
                <p>Status: <strong>Active Inbound Rescue (Live Tracking)</strong></p>
                <p>Contact: {team.contact}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Citizens in Distress */}
        {distressList.map((needy) => (
          <Marker key={needy.id} position={[needy.lat, needy.lng]} icon={needyIcon}>
            <Popup>
              <div className="popup-card">
                <h4 style={{ color: '#dc2626' }}>🆘 SOS: {needy.groupName}</h4>
                <p>Priority: {needy.urgency}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* RED LINE: NGO to Needy */}
        <Polyline positions={RED_DISPATCH_ROUTE} pathOptions={{ color: '#dc2626', weight: 5, opacity: 0.95 }}>
          <Popup>
            <div className="popup-card">
              <strong style={{ color: '#dc2626' }}>Red Route: NGO Dispatch Corridor</strong>
              <p>From NGO Depot → Distress Site</p>
            </div>
          </Popup>
        </Polyline>

        {/* GREEN LINE: Needy to Shelter */}
        <Polyline positions={GREEN_SHELTER_ROUTE} pathOptions={{ color: '#16a34a', weight: 5, opacity: 0.95 }}>
          <Popup>
            <div className="popup-card">
              <strong style={{ color: '#16a34a' }}>Green Route: Evacuation Corridor</strong>
              <p>From Distress Site → Safe Shelter</p>
            </div>
          </Popup>
        </Polyline>
      </MapContainer>

      {/* Compact Gram Panchayat Legend */}
      <div className="map-legend">
        <h4>Command Center</h4>

        <div className="legend-section-title">Hazard Severity</div>
        <div className="legend-entry"><span className="dot dot-critical"></span> Critical Zone</div>
        <div className="legend-entry"><span className="dot dot-high"></span> High Zone</div>
        <div className="legend-entry"><span className="dot dot-moderate"></span> Moderate Zone</div>
        <div className="legend-entry"><span className="dot dot-low"></span> Low Zone</div>

        <div className="legend-section-title">Field Assets</div>
        <div className="legend-entry">
          <span className="legend-badge pin-red">🚐</span>
          <span>NGO Rescue Unit</span>
        </div>
        <div className="legend-entry">
          <span className="legend-badge pin-sos">🆘</span>
          <span>Civilian Distress (SOS)</span>
        </div>
        <div className="legend-entry">
          <span className="legend-badge pin-blue">🏥</span>
          <span>Designated Shelter</span>
        </div>

        <div className="legend-section-title">Corridors</div>
        <div className="legend-entry">
          <span className="legend-line line-red"></span>
          <span>NGO → Distress Site</span>
        </div>
        <div className="legend-entry">
          <span className="legend-line line-green"></span>
          <span>Distress Site → Shelter</span>
        </div>
      </div>
    </div>
  );
};

export default GramPanchayatMap;