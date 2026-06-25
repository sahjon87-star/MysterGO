import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ProviderProfile, ShopProfile } from '../../types';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LiveMapProps {
  height?: string;
  filterType?: 'workers' | 'shops';
}

const workerIcon = L.divIcon({
  html: `<div class="w-8 h-8 bg-primary-blue rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a2 2 0 0 1 2.83 0l.3.3a2 2 0 0 1 0 2.83l-3.77 3.77a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a2 2 0 0 1 2.83 0l.3.3a2 2 0 0 1 0 2.83l-3.77 3.77a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a2 2 0 0 1 2.83 0l.3.3a2 2 0 0 1 0 2.83l-3.77 3.77a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0"></path><path d="m2 22 1-1"></path><path d="m4.5 15.5-2 2"></path><path d="m15 4.5-2 2"></path><path d="m18.5 7.5-2 2"></path></svg></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const shopIcon = L.divIcon({
  html: `<div class="w-8 h-8 bg-action-orange rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"></path><path d="M12 3v6"></path></svg></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const MapController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.panTo(center, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
};

export const LiveMap: React.FC<LiveMapProps> = ({ height = '300px', filterType = 'workers' }) => {
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const [markers, setMarkers] = useState<(ProviderProfile | ShopProfile)[]>([]);
  
  useEffect(() => {
    if (filterType === 'workers') {
      const q = query(collection(db, 'providers'), where('isOnline', '==', true));
      return onSnapshot(q, (snap) => {
        setMarkers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ProviderProfile)));
      });
    } else {
      return onSnapshot(collection(db, 'shops'), (snap) => {
        setMarkers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ShopProfile)));
      });
    }
  }, [filterType]);

  const defaultCenter: [number, number] = [23.8103, 90.4125]; // Dhaka
  const center: [number, number] = (profile?.location?.lat && profile?.location?.lng) 
    ? [profile.location.lat, profile.location.lng]
    : defaultCenter;

  return (
    <div className="rounded-[32px] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-xl" style={{ height }}>
      <MapContainer 
        center={center} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <MapController center={center} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {markers.map((m) => {
          if (!m.location || typeof m.location.lat !== 'number' || typeof m.location.lng !== 'number') return null;
          if (isNaN(m.location.lat) || isNaN(m.location.lng) || !isFinite(m.location.lat) || !isFinite(m.location.lng)) return null;
          return (
            <Marker 
              key={m.uid} 
              position={[m.location.lat, m.location.lng]}
              icon={filterType === 'workers' ? workerIcon : shopIcon}
            >
              <Popup>
                <div className="p-2 space-y-2">
                  <h4 className="font-bold text-slate-800">{'shopName' in m ? m.shopName : m.name}</h4>
                  <p className="text-[10px] text-slate-500">
                    {'shopName' in m ? m.shopCategory : m.skill || m.providerType}
                  </p>
                  <button 
                    onClick={() => {}}
                    className="w-full bg-primary-blue text-white text-[10px] font-bold py-2 rounded-lg"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
