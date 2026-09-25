// Realistic coordinates for Malnad & Coastal Karnataka

// 1. All Village Risk Zones
export const ALL_VILLAGE_ZONES = [
  { id: 1, name: "Agumbe Ghat Pass", lat: 13.5025, lng: 75.0935, riskLevel: "Critical", populationAtRisk: 120 },
  { id: 2, name: "Charmadi Foothills (Ujire)", lat: 13.0032, lng: 75.3340, riskLevel: "Critical", populationAtRisk: 85 },
  { id: 3, name: "Kalasa Valley", lat: 13.2384, lng: 75.3672, riskLevel: "High", populationAtRisk: 40 },
  { id: 4, name: "Sringeri Riverside", lat: 13.4187, lng: 75.2570, riskLevel: "High", populationAtRisk: 30 },
  { id: 5, name: "Bantwal Lowlands", lat: 12.8943, lng: 75.0345, riskLevel: "Moderate", populationAtRisk: 15 },
  { id: 6, name: "Karkala Town Fringe", lat: 13.2131, lng: 74.9984, riskLevel: "Moderate", populationAtRisk: 10 },
  { id: 7, name: "Kundapura Catchment", lat: 13.6268, lng: 74.6917, riskLevel: "Low", populationAtRisk: 0 },
  { id: 8, name: "Mangaluru Coastal Plain", lat: 12.9141, lng: 74.8560, riskLevel: "Low", populationAtRisk: 0 }
];

// 2. All Regional Safe Shelters
export const SHELTERS = [
  {
    id: "shelter-1",
    name: "Belthangady Community Hall",
    lat: 12.9850,
    lng: 75.2600,
    capacity: 350,
    availableSpaces: 140,
    status: "Open"
  },
  {
    id: "shelter-2",
    name: "Mudigere Relief Camp",
    lat: 13.1360,
    lng: 75.6410,
    capacity: 500,
    availableSpaces: 210,
    status: "Open"
  },
  {
    id: "shelter-3",
    name: "Thirthahalli Indoor Stadium Shelter",
    lat: 13.6934,
    lng: 75.2447,
    capacity: 300,
    availableSpaces: 35,
    status: "Open"
  },
  {
    id: "shelter-4",
    name: "Karkala High School Safe Shelter",
    lat: 13.2200,
    lng: 75.0100,
    capacity: 250,
    availableSpaces: 0,
    status: "Full"
  }
];

// 3. Current Villager Details & Safe Route (Natural road bends, not a straight line)
export const CURRENT_USER = {
  id: "user-1",
  name: "Gowda Family (Villager)",
  lat: 13.0032,
  lng: 75.3340,
  assignedShelterId: "shelter-1",
  safeRoute: [
    [13.0032, 75.3340],
    [13.0010, 75.3210],
    [12.9985, 75.3080],
    [12.9940, 75.2920],
    [12.9890, 75.2750],
    [12.9850, 75.2600]
  ]
};

// 4. Distressed / Needy People Hotspots (SOS)
export const NEEDY_PEOPLE = [
  {
    id: "needy-1",
    groupName: "Stranded Plantation Workers (6 people)",
    lat: 13.0280,
    lng: 75.3550,
    urgency: "Immediate Evacuation Needed",
    targetShelterId: "shelter-1"
  },
  {
    id: "needy-2",
    groupName: "Elderly Family Cut Off by Water",
    lat: 13.4850,
    lng: 75.1200,
    urgency: "Medical Support Required",
    targetShelterId: "shelter-3"
  }
];

// 5. NGO Response Teams & Waypoints
export const NGO_TEAMS = [
  {
    id: "ngo-team-alpha",
    name: "Dakshina Sahaya NGO Unit 1",
    currentLocation: { lat: 12.9920, lng: 75.2850 },
    assignedNeedyId: "needy-1",
    destinationShelterId: "shelter-1",
    contact: "+91 94481 00000",
    // Route 1: NGO Base -> Needy People Site
    routeToNeedy: [
      [12.9920, 75.2850],
      [12.9970, 75.3020],
      [13.0040, 75.3200],
      [13.0150, 75.3390],
      [13.0280, 75.3550]
    ],
    // Route 2: Needy People Site -> Safe Shelter
    routeToShelter: [
      [13.0280, 75.3550],
      [13.0150, 75.3390],
      [13.0010, 75.3210],
      [12.9940, 75.2920],
      [12.9850, 75.2600]
    ]
  }
];