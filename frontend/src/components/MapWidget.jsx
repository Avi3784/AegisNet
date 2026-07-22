import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Globe } from 'lucide-react';
import { motion } from 'framer-motion';

// List of real global cities (Lat, Lng) to ensure markers land on landmasses
const GLOBAL_CITIES = [
  [40.7128, -74.0060], // New York, USA
  [51.5074, -0.1278],  // London, UK
  [35.6762, 139.6503], // Tokyo, Japan
  [-23.5505, -46.6333], // Sao Paulo, Brazil
  [55.7558, 37.6173],  // Moscow, Russia
  [39.9042, 116.4074], // Beijing, China
  [52.5200, 13.4050],  // Berlin, Germany
  [39.0392, 125.7625], // Pyongyang, North Korea
  [28.6139, 77.2090],  // New Delhi, India
  [-33.8688, 151.2093], // Sydney, Australia
  [1.3521, 103.8198],  // Singapore
  [48.8566, 2.3522],   // Paris, France
];

const getCoordsFromIP = (ip) => {
  if (!ip) return GLOBAL_CITIES[0];
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ip.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GLOBAL_CITIES.length;
  const jitterLat = (Math.random() - 0.5) * 1.5;
  const jitterLng = (Math.random() - 0.5) * 1.5;
  return [GLOBAL_CITIES[index][0] + jitterLat, GLOBAL_CITIES[index][1] + jitterLng];
};

const MapWidget = ({ threats }) => {
  const [mapThreats, setMapThreats] = useState([]);

  useEffect(() => {
    setMapThreats(threats.map(t => ({
      ...t,
      coords: getCoordsFromIP(t.flow?.src_ip || t.ip || "1.1.1.1")
    })));
  }, [threats]);

  return (
    <div className="bg-[#0d1424]/80 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 flex flex-col h-[400px]" style={{ boxShadow: '0 0 40px rgba(139,92,246,0.06)' }}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/30">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Globe className="text-violet-400" size={20} />
          Live Global Threat Map
        </h3>
        <span className="flex items-center gap-2 text-xs text-slate-400">
          <motion.span 
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]"
          />
          Monitoring
        </span>
      </div>
      
      <div className="flex-1 rounded-xl overflow-hidden border border-slate-700/30 relative z-0">
        <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={false} style={{ height: '100%', width: '100%', backgroundColor: '#060a13' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          {mapThreats.map((threat, idx) => {
            const isApt = threat.attack_type && threat.attack_type.includes('[OSINT: APT DETECTED]');
            const displayAttack = threat.attack_type ? threat.attack_type.replace(' [OSINT: APT DETECTED]', '') : 'Unknown';
            
            return (
              <CircleMarker 
                key={threat.timestamp + idx} 
                center={threat.coords} 
                radius={isApt ? 10 : 7}
                pathOptions={{ 
                  color: isApt ? '#8b5cf6' : '#f43f5e', 
                  fillColor: isApt ? '#8b5cf6' : '#f43f5e', 
                  fillOpacity: isApt ? 0.8 : 0.6,
                  weight: isApt ? 3 : 2
                }}
              >
                <Popup className="custom-popup">
                  <div className="text-slate-800 font-bold flex flex-col gap-1">
                    {displayAttack}
                    {isApt && (
                      <span className="bg-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider w-fit">
                        APT DETECTED
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600 text-xs mt-1 font-mono">
                    SRC: {threat.flow?.src_ip || 'Unknown'}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapWidget;
