import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './maps.css';
import FixMapSize from './FixMapSize';
import { ALL_VILLAGE_ZONES, SHELTERS, NEEDY_PEOPLE } from '../../data/mockData';
import { ngoIcon, needyIcon, shelterIcon } from './MapIcons';

// Route 1: Red line from NGO depot -> Needy citizens site
const GUARANTEED_RED_ROUTE = [
  [12.9850, 75.2600],
  [12.9910, 75.2830],
  [12.9995, 75.3050],
  [13.0110, 75.3280],
  [13.0210, 75.3420],
  [13.0280, 75.3550]
];

// Route 2: Green line from Needy citizens site -> Belthangady Safe Shelter
const GUARANTEED_GREEN_ROUTE = [
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

const NgoMap = () => {
  const needyPerson = NEEDY_PEOPLE[0];
 // const targetShelter = SHELTERS[0];

  const [vehiclePos, setVehiclePos] = useState(GUARANTEED_RED_ROUTE[0]);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % GUARANTEED_RED_ROUTE.length;
      setVehiclePos(GUARANTEED_RED_ROUTE[index]);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="map-view-container">
      <div className="role-banner banner-ngo">
        <div className="banner-left">
          <span>🚐 <strong>NGO OPERATIONS MAP</strong></span>
          <span className="live-badge">● LIVE RESCUE ACTIVE</span>
        </div>
        <div className="banner-right">
          <span>Mission: Dakshina Unit 1 → SOS Hotspot</span>
        </div>
      </div>

      <MapContainer center={[13.05, 75.30]} zoom={11} scrollWheelZoom={true} className="leaflet-map-frame">
        <FixMapSize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 1. Risk Zones */}
        {ALL_VILLAGE_ZONES.map((zone) => (
          <CircleMarker
            key={`ngo-${zone.id}`}
            center={[zone.lat, zone.lng]}
            radius={18}
            pathOptions={{ color: getRiskColor(zone.riskLevel), fillColor: getRiskColor(zone.riskLevel), fillOpacity: 0.55 }}
          >
            <Popup>
              <div className="popup-card">
                <h4>⚠️ {zone.name}</h4>
                <p>Hazard Severity: <strong>{zone.riskLevel}</strong></p>
                <p>Citizens at Risk: {zone.populationAtRisk}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* 2. Shelters */}
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

        {/* 3. Stranded Citizens Hotspot */}
        <Marker position={[needyPerson.lat, needyPerson.lng]} icon={needyIcon}>
          <Popup>
            <div className="popup-card">
              <h4 style={{ color: '#dc2626' }}>🆘 SOS Distress Alert</h4>
              <p>Group: {needyPerson.groupName}</p>
              <p>Requirement: {needyPerson.urgency}</p>
            </div>
          </Popup>
        </Marker>

        {/* 4. Live Moving NGO Van */}
        <Marker position={vehiclePos} icon={ngoIcon}>
          <Popup>
            <div className="popup-card">
              <h4>🚐 Dakshina Sahaya NGO Unit 1</h4>
              <p>Status: <strong>Transit along Red Rescue Line</strong></p>
            </div>
          </Popup>
        </Marker>

        {/* 5. ROUTE 1: BOLD RED LINE (NGO -> Needy People) */}
        <Polyline
          positions={GUARANTEED_RED_ROUTE}
          pathOptions={{ color: '#dc2626', weight: 6, opacity: 0.95 }}
        >
          <Popup>
            <div className="popup-card">
              <strong style={{ color: '#dc2626' }}>Red Route: Rescue Dispatch</strong>
              <p>NGO Van heading to trapped citizens</p>
            </div>
          </Popup>
        </Polyline>

        {/* 6. ROUTE 2: BOLD GREEN LINE (Needy People -> Shelter) */}
        <Polyline
          positions={GUARANTEED_GREEN_ROUTE}
          pathOptions={{ color: '#16a34a', weight: 6, opacity: 0.95 }}
        >
          <Popup>
            <div className="popup-card">
              <strong style={{ color: '#16a34a' }}>Green Route: Safe Evacuation</strong>
              <p>Rescued citizens transported to shelter</p>
            </div>
          </Popup>
        </Polyline>
      </MapContainer>

      {/* Compact NGO Legend */}
      <div className="map-legend">
        <h4>NGO Operations</h4>

        <div className="legend-section-title">Hazard Severity</div>
        <div className="legend-entry"><span className="dot dot-critical"></span> Critical Zone</div>
        <div className="legend-entry"><span className="dot dot-high"></span> High Zone</div>
        <div className="legend-entry"><span className="dot dot-moderate"></span> Moderate Zone</div>
        <div className="legend-entry"><span className="dot dot-low"></span> Low Zone</div>

        <div className="legend-section-title">Field Entities</div>
        <div className="legend-entry">
          <span className="legend-badge pin-red">🚐</span>
          <span>NGO Unit (Live)</span>
        </div>
        <div className="legend-entry">
          <span className="legend-badge pin-sos">🆘</span>
          <span>Stranded Citizens (SOS)</span>
        </div>
        <div className="legend-entry">
          <span className="legend-badge pin-blue">🏥</span>
          <span>Safe Shelter</span>
        </div>

        <div className="legend-section-title">Rescue Corridors</div>
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

export default NgoMap;