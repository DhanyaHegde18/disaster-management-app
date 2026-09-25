# disaster-management-app
# disaster-management-app
# 🌊 Disaster Management & Early Warning System

> **An Early Warning and Community Response System for Floods and Landslides in Karnataka**

A disaster-management platform designed to help vulnerable communities, local authorities, emergency responders, NGOs, and volunteers **detect risks early, receive localized alerts, send emergency SOS requests, and coordinate relief operations**.

The system focuses particularly on flood- and landslide-prone regions of Karnataka, where communication and coordination can become difficult during severe weather events.

---

## 📌 Problem Statement

Floods and landslides during the monsoon season can cause loss of life, livestock, infrastructure, and property.

Some of the major challenges are:

- Generic alerts may not provide sufficient village-level information.
- Vulnerable areas, shelters, and evacuation routes are not always available in one system.
- Network and power failures can disrupt communication during disasters.
- Emergency requests may be difficult to coordinate manually.
- Officials, responders, volunteers, and affected communities need a common platform for coordination.

The project aims to address these challenges through a **localized, map-based, offline-capable disaster response system**.

---

# 💡 Proposed Solution

The platform consists of four major modules:

### 1. 🗺️ Risk-Zone Mapping & Data Integration

The system combines environmental and geographical information to identify areas that may be vulnerable to floods and landslides.

Potential data sources include:

- **KSNDMC** — rainfall and river-level information
- **IMD** — weather and forecast information
- **SRTM** — elevation data
- Slope and other geographical factors
- Historical environmental data

A machine-learning-based risk model can classify areas into different risk levels.

The interactive map can display:

- 🔴 High/Critical-risk zones
- 🟠 Medium-risk zones
- 🟢 Low-risk zones
- 🏠 Relief shelters
- 🛣️ Evacuation routes

---

### 2. 🚨 Localized Multi-Channel Alerts

Instead of relying only on general alerts, the system is designed to provide warnings based on the affected geographical zone.

Alerts can be delivered through:

- 📱 Web/app notifications
- 📩 SMS
- 🔊 Siren integration/simulation

Alerts can be triggered when monitored parameters such as rainfall or river levels cross predefined thresholds.

The SMS channel is intended to provide communication support even for users with basic mobile phones.

---

### 3. 🆘 Offline SOS

The Offline SOS module is one of the key features of the system.

During a disaster, internet connectivity may become unreliable or unavailable. The SOS module therefore follows an **offline-first approach**.

The web application uses:

- Progressive Web App concepts
- Service Workers
- IndexedDB
- Background synchronization

### SOS workflow

```text
User presses SOS
       ↓
Capture emergency information
       ↓
Capture GPS location
       ↓
Check network availability
       ↓
 ┌───────────────┐
 │               │
Online         Offline
 │               │
 ↓               ↓
Backend       IndexedDB
 │               │
 └───────┬───────┘
         ↓
   Synchronization
         ↓
      Backend
         ↓
 Response Dashboard
```

Each SOS request represents an individual emergency request and contains information such as:

```json
{
  "emergencyType": "Flood",
  "latitude": 12.34567,
  "longitude": 76.54321,
  "timestamp": "2026-09-25T10:30:00.000Z"
}
```

### SMS SOS fallback

The system can additionally support an SMS-based SOS mechanism.

A predefined SMS keyword can be received through a messaging service and forwarded to the backend through a webhook.

This provides an alternative communication channel when internet access is unavailable but cellular SMS service is available.

---

### 4. 📊 Role-Based Disaster Coordination Dashboard

A centralized dashboard helps coordinate emergency response.

Different stakeholders can have different views and responsibilities.

#### 👥 Villagers

- Receive localized alerts
- View risk information
- Access shelter information
- Send SOS requests
- View evacuation information

#### 🏛️ Gram Panchayat / DDMA

- Monitor incoming SOS requests
- View affected locations
- Monitor shelters
- Track available resources
- Coordinate volunteers and response teams

#### 🚑 NDRF / SDRF / Emergency Responders

- View emergency locations
- Receive assigned tasks
- Access map-based information
- Identify affected areas
- Coordinate response operations

#### 🤝 NGOs / Volunteers

- View pending community requirements
- Coordinate available resources
- Update request status
- Support relief operations

---

# 🏗️ System Architecture

```text
                         ┌─────────────────────┐
                         │ Environmental Data  │
                         │                     │
                         │ KSNDMC              │
                         │ IMD                 │
                         │ SRTM                │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Risk Analysis / ML  │
                         │                     │
                         │ Rainfall            │
                         │ River Level         │
                         │ Elevation           │
                         │ Slope               │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Risk Assessment   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │       Disaster Platform      │
                    └──────────────┬───────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
       🗺️ Risk Map          🚨 Alerts             🆘 SOS
              │                    │                    │
              │             ┌──────┼──────┐             │
              │             │      │      │             │
              │            App    SMS   Siren           │
              │                                           
              │                              ┌────────────┘
              │                              │
              │                         Online/Offline
              │                              │
              │                         IndexedDB
              │                              │
              └──────────────┬───────────────┘
                             ▼
                  ┌────────────────────────┐
                  │ Backend API            │
                  │ Node.js / Express      │
                  └────────────┬───────────┘
                               │
                               ▼
                     ┌──────────────────┐
                     │ MongoDB Atlas    │
                     └────────┬─────────┘
                              │
                              ▼
                  ┌────────────────────────┐
                  │ Response Dashboard     │
                  └────────────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

- HTML
- CSS
- JavaScript
- React.js
- Leaflet.js
- Chart.js

## Backend

- Node.js
- Express.js
- MongoDB
- MongoDB Atlas

## Machine Learning

- Python
- Flask / FastAPI
- Random Forest or other suitable classification models

## Disaster Alerts

- Twilio SMS API
- Web Push API
- Siren prototype/simulation

## Offline SOS

- Service Workers
- IndexedDB
- Progressive Web App (PWA)
- Background Sync API

## Maps & Geographical Data

- Leaflet.js
- SRTM elevation data
- Geographic coordinates / GPS

---

# 📂 Project Structure

```text
disaster-management-app/
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── server.js
│   └── ...
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── ...
│
├── sos-module/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── sw.js
│
├── README.md
└── .gitignore
```

> The exact folder structure may evolve as the team integrates the individual modules.

---

# 🆘 Offline SOS Module

The current SOS module is implemented as a standalone web module.

### Current functionality

- Emergency type selection
- GPS location capture
- SOS data creation
- Local SOS storage using IndexedDB
- Service Worker registration
- Service Worker fetch interception

### Current SOS data structure

```javascript
{
    emergencyType: "Flood",
    latitude: 12.34567,
    longitude: 76.54321,
    timestamp: "2026-09-25T10:30:00.000Z"
}
```

# 🔐 Security Considerations

Sensitive credentials must never be stored in frontend source code.

For example, the following must **not** be committed to GitHub:

- MongoDB passwords
- MongoDB connection strings
- Twilio Account SID
- Twilio Auth Token
- API keys
- Authentication secrets

Backend secrets should be stored using environment variables.

Example:

```env
MONGODB_URI=your_mongodb_connection_string
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
```

The `.env` file should be included in `.gitignore`.

---


# 🎯 Expected Outcomes

The system aims to provide:

### Early Warning

Localized warnings based on environmental and geographical risk information.

### Better Situational Awareness

Interactive maps showing risk zones, shelters, and evacuation routes.

### Reliable Emergency Communication

An SOS mechanism designed to continue functioning during temporary network outages.

### Faster Response

Centralized SOS and resource information for emergency response teams.

### Better Coordination

A shared platform for authorities, responders, NGOs, volunteers, and communities.

### Community Preparedness

Access to risk information, shelters, evacuation routes, and emergency communication tools.

---

# 🌍 Target Users

The platform is designed for:

- 👨‍👩‍👧‍👦 Communities in flood- and landslide-prone areas
- 🏛️ Gram Panchayats
- 🏢 District Disaster Management Authorities (DDMA)
- 🚑 NDRF / SDRF teams
- 🤝 NGOs
- 🙋 Volunteers
- 🚨 Emergency response teams

---

# 📈 Potential Impact

The proposed system can support:

- Earlier evacuation through localized warnings
- Faster reporting of emergencies
- Better visibility of affected locations
- Improved coordination of relief resources
- Better access to shelters and evacuation routes
- Communication support during temporary network disruptions
- Improved disaster preparedness at the community level

---

# 🚀 Future Enhancements

Possible future improvements include:

- Real-time government data integration
- More accurate ML-based flood and landslide prediction
- Real-time river-level monitoring
- Advanced weather forecasting integration
- Automated village-level alert generation
- Full Background Sync implementation
- SMS-based SOS integration through Twilio
- Hardware-based siren integration using ESP32/Raspberry Pi
- Real-time responder tracking
- Shelter capacity monitoring
- Resource allocation optimization
- Mobile application version
- Multilingual support, including Kannada
- Authentication and role-based access control
- Advanced analytics and disaster-response reports

---

# 👩‍💻 Team

**Project:** Jagruti

**Theme:** Disaster Management

**Focus:** Flood and Landslide Early Warning & Community Response

### Team Members

- Dhanya Hegde
- Medini M
- K Vasundhara Bhat
- Rajeshwari S

> Add or update team members according to the final team composition.



