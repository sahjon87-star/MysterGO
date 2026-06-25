import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ProviderProfile, Booking, ShopProfile } from '../../types';
import { MapPin, Briefcase, User, Store } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

// Custom Icons with more color and distinction
const customerIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1673/1673188.png', // Red pin for customer
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const workerIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1673/1673221.png', // Green pin for worker
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const shopIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1673/1673233.png', // Blue pin for shop
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
};

const MapInvalidator = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const CenterButton = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  return (
    <button 
      onClick={() => map.setView(center, 12)}
      className="absolute top-6 right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-[1000] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
    >
      <MapPin className="w-5 h-5" />
    </button>
  );
};

export const AdminMap: React.FC = () => {
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [shops, setShops] = useState<ShopProfile[]>([]);
  const [activeJobs, setActiveJobs] = useState<Booking[]>([]);
  const [center] = useState<[number, number]>([23.8103, 90.4125]);

  useEffect(() => {
    // Listen for online providers
    const qProviders = query(collection(db, 'providers'), where('isOnline', '==', true));
    const unsubProviders = onSnapshot(qProviders, (snap) => {
      const data = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ProviderProfile))
        .filter(p => p.location && typeof p.location.lat === 'number' && typeof p.location.lng === 'number');
      setProviders(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'providers');
    });

    // Listen for shops
    const qShops = query(collection(db, 'shops'));
    const unsubShops = onSnapshot(qShops, (snap) => {
      const data = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ShopProfile))
        .filter(s => s.location && typeof s.location.lat === 'number' && typeof s.location.lng === 'number');
      setShops(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shops');
    });

    // Listen for active jobs
    const qJobs = query(collection(db, 'bookings'), where('status', 'in', ['pending', 'accepted', 'ongoing']));
    const unsubJobs = onSnapshot(qJobs, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking))
        .filter(j => j.location && typeof j.location.lat === 'number' && typeof j.location.lng === 'number');
      setActiveJobs(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    return () => {
      unsubProviders();
      unsubShops();
      unsubJobs();
    };
  }, []);

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Live Platform Map</h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Real-time view of workers and jobs</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden relative" style={{ height: '500px', width: '100%' }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <MapInvalidator />
          <ChangeView center={center} />
          <CenterButton center={center} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Providers */}
          {providers.map((p) => (
            <Marker 
              key={`provider-${p.uid}`} 
              position={[p.location!.lat, p.location!.lng]} 
              icon={workerIcon}
            >
              <Popup>
                <div className="text-center p-1 dark:text-slate-200">
                  <p className="font-black text-xs">{p.name}</p>
                  <p className="text-[10px] text-primary-blue font-bold uppercase">{p.skill}</p>
                  <p className="text-[8px] text-slate-400 dark:text-slate-500 mt-1">ONLINE</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Shops */}
          {shops.map((s) => (
            <Marker 
              key={`shop-${s.uid}`} 
              position={[s.location!.lat, s.location!.lng]} 
              icon={shopIcon}
            >
              <Popup>
                <div className="text-center p-1 dark:text-slate-200">
                  <div className="w-8 h-8 bg-primary-blue/10 rounded-lg flex items-center justify-center mx-auto mb-1">
                    <Store className="w-4 h-4 text-primary-blue" />
                  </div>
                  <p className="font-black text-xs">{s.shopName}</p>
                  <p className="text-[10px] text-primary-blue font-bold uppercase">{s.shopCategory?.replace('_', ' ') || 'Shop'}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Active Jobs */}
          {activeJobs.map((j) => (
            <Marker 
              key={`job-${j.id}`} 
              position={[j.location!.lat, j.location!.lng]} 
              icon={customerIcon}
            >
              <Popup>
                <div className="text-center p-1 dark:text-slate-200">
                  <p className="font-black text-xs">Job: {j.service}</p>
                  <p className="text-[10px] text-action-orange font-bold uppercase">{j.status}</p>
                  <p className="text-[8px] text-slate-400 dark:text-slate-500 mt-1">Customer: {j.customerName}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-6 right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-[1000] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-primary-blue rounded-full" />
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Online Workers ({providers.length})</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-action-orange rounded-full" />
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Active Jobs ({activeJobs.length})</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-primary-blue/50 rounded-full" />
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Shops ({shops.length})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
