import { useState } from 'react';
import UserMap from './components/map/UserMap';
import NgoMap from './components/map/NgoMap';
import GramPanchayatMap from './components/map/GramPanchayatMap';

function App() {
  const [activeRole, setActiveRole] = useState('user'); // 'user' | 'ngo' | 'gp'

  return (
    <div className="jagruthi-app-layout">
      <header className="dashboard-header">
        <div className="brand">
          <h2>JAGRUTI | Disaster Management</h2>
          <span className="sub-title">GIS Spatial Command System</span>
        </div>

        {/* 3 Map View Switchers */}
        <div className="role-switch-group">
          <button
            className={`role-btn ${activeRole === 'user' ? 'active' : ''}`}
            onClick={() => setActiveRole('user')}
          >
            👤 Villager View
          </button>
          <button
            className={`role-btn ${activeRole === 'ngo' ? 'active' : ''}`}
            onClick={() => setActiveRole('ngo')}
          >
            🚐 NGO View
          </button>
          <button
            className={`role-btn ${activeRole === 'gp' ? 'active' : ''}`}
            onClick={() => setActiveRole('gp')}
          >
            🏛️ Gram Panchayat
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {activeRole === 'user' && <UserMap />}
        {activeRole === 'ngo' && <NgoMap />}
        {activeRole === 'gp' && <GramPanchayatMap />}
      </main>
    </div>
  );
}

export default App;