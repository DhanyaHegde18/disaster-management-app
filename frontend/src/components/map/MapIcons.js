import L from 'leaflet';

export const shelterIcon = L.divIcon({
  className: 'custom-map-icon',
  html: `<div class="badge-pin pin-blue">🏥</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

export const userIcon = L.divIcon({
  className: 'custom-map-icon',
  html: `<div class="badge-pin pin-sky">👤</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

export const ngoIcon = L.divIcon({
  className: 'custom-map-icon',
  html: `<div class="badge-pin pin-red">🚐</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

export const needyIcon = L.divIcon({
  className: 'custom-map-icon',
  html: `<div class="badge-pin pin-sos">🆘</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});