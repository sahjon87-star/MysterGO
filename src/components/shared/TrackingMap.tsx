import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeToggle } from '../ThemeToggle';
import { Phone, MessageSquare, Move, Navigation, Crosshair, MapPin, Compass } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix default leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom styling markers
const customerIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-10 h-10 bg-primary-blue rounded-full border-4 border-cyan-400 dark:border-cyan-300 shadow-2xl animate-pulse z-[10000]">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white">
             <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
             <polyline points="9 22 9 12 15 12 15 22"></polyline>
           </svg>
           <div class="absolute -bottom-1 w-2 md:w-2.5 h-2 md:h-2.5 bg-primary-blue rounded-full border border-cyan-400 dark:border-cyan-300"></div>
         </div>`,
  className: 'custom-customer-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const providerIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-10 h-10 bg-orange-500 rounded-full border-4 border-amber-400 dark:border-amber-300 shadow-2xl z-[10000]">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white animate-bounce"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a2 2 0 0 1 2.83 0l.3.3a2 2 0 0 1 0 2.83l-3.77 3.77a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a2 2 0 0 1 2.83 0l.3.3a2 2 0 0 1 0 2.83l-3.77 3.77a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a2 2 0 0 1 2.83 0l.3.3a2 2 0 0 1 0 2.83l-3.77 3.77a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0"></path><path d="m2 22 1-1"></path><path d="m4.5 15.5-2 2"></path><path d="m15 4.5-2 2"></path><path d="m18.5 7.5-2 2"></path></svg>
           <div class="absolute -bottom-1 w-2 md:w-2.5 h-2 md:h-2.5 bg-orange-500 rounded-full border border-amber-400 dark:border-amber-300"></div>
         </div>`,
  className: 'custom-provider-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const deliveryIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-10 h-10 bg-emerald-500 rounded-full border-4 border-emerald-400 dark:border-emerald-300 shadow-2xl z-[10000]">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-brand-dark animate-bounce"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
         </div>`,
  className: 'custom-delivery-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const shopIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-8 h-8 bg-action-orange rounded-xl border-2 border-orange-400 dark:border-orange-300 shadow-xl z-[10000]">
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"></path><path d="M12 3v6"></path></svg>
         </div>`,
  className: 'custom-shop-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Standard safe marker component with coordinate validation to prevent Leaflet position crashes
const SmoothMarker: React.FC<{ position: [number, number]; icon: any; children?: React.ReactNode }> = ({ position, icon, children }) => {
  const sanitizePosition = (pos: any): [number, number] => {
    if (!pos || !Array.isArray(pos) || pos.length < 2) return [23.8103, 90.4125];
    const lat = parseFloat(String(pos[0]));
    const lng = parseFloat(String(pos[1]));
    if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
      return [23.8103, 90.4125];
    }
    return [lat, lng];
  };

  const validPos = sanitizePosition(position);

  return (
    <Marker position={validPos} icon={icon}>
      {children}
    </Marker>
  );
};

// Map Recenter & Bounds Control Module
const MapController: React.FC<{ 
  center: [number, number]; 
  points?: [number, number][]; 
  recenterCounter?: number;
}> = ({ center, points, recenterCounter }) => {
  const map = useMap();
  const hasFittedRef = useRef<string>('');
  const lastCenterRef = useRef<[number, number] | null>(null);
  const lastRecenterCounterRef = useRef<number>(0);

  useEffect(() => {
    const centerChanged = !lastCenterRef.current || 
      Math.abs(center[0] - lastCenterRef.current[0]) > 0.0001 || 
      Math.abs(center[1] - lastCenterRef.current[1]) > 0.0001;

    const recenterClicked = recenterCounter !== undefined && recenterCounter !== lastRecenterCounterRef.current;

    if (points && points.length > 1) {
      const pointsKey = JSON.stringify(points);
      // Auto fit on initial load of both points or on clicking Recenter
      if (hasFittedRef.current !== pointsKey || recenterClicked) {
        hasFittedRef.current = pointsKey;
        if (recenterCounter !== undefined) lastRecenterCounterRef.current = recenterCounter;
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    } else if (centerChanged || recenterClicked) {
      lastCenterRef.current = center;
      if (recenterCounter !== undefined) lastRecenterCounterRef.current = recenterCounter;
      map.panTo(center, { animate: true, duration: 0.5 });
    }
  }, [center, points, recenterCounter, map]);
  return null;
};

interface TrackingMapProps {
  userRole: 'customer' | 'provider' | 'shop_owner';
  customerLocation: [number, number];
  providerLocation?: [number, number] | null;
  shopLocation?: [number, number] | null;
  deliveryLocation?: [number, number] | null;
  onCall?: () => void;
  onChat?: () => void;
  height?: string;
  statusInfo?: string;
}

export const TrackingMap: React.FC<TrackingMapProps> = ({
  userRole,
  customerLocation,
  providerLocation,
  shopLocation,
  deliveryLocation,
  onCall,
  onChat,
  height = '350px',
  statusInfo = 'Tracking Active'
}) => {
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('dark');
  const [recenterCounter, setRecenterCounter] = useState(0);

  // Detect theme dynamically
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setMapTheme(isDark ? 'dark' : 'light');
    };

    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  const defaultCenter = customerLocation;
  const [viewCenter, setViewCenter] = useState<[number, number]>(defaultCenter);

  // Automatically track and follow moving coordinates on the map, with threshold checks
  useEffect(() => {
    const target = providerLocation || deliveryLocation || customerLocation;
    if (!target) return;
    
    setViewCenter(prev => {
      if (!prev) return target;
      const delta = Math.max(Math.abs(target[0] - prev[0]), Math.abs(target[1] - prev[1]));
      // Only set a new view center if it changes by > 11 meters to prevent constant visual panning
      if (delta > 0.0001) {
        return target;
      }
      return prev;
    });
  }, [customerLocation?.[0], customerLocation?.[1], providerLocation?.[0], providerLocation?.[1], deliveryLocation?.[0], deliveryLocation?.[1]]);

  // Determine active target and tracker source for measuring distance
  let trackingSource: [number, number] | null = null;
  let trackingTarget: [number, number] | null = null;

  if (providerLocation) {
    trackingSource = providerLocation;
    trackingTarget = customerLocation;
  } else if (deliveryLocation) {
    trackingSource = deliveryLocation;
    trackingTarget = customerLocation;
  } else if (shopLocation) {
    trackingSource = shopLocation;
    trackingTarget = customerLocation;
  }

  // Dual positions for map auto-zoom/bounds - memoized to prevent infinite ref-triggers
  const activePoints = React.useMemo<[number, number][]>(() => {
    const points: [number, number][] = [customerLocation];
    if (trackingSource) {
      points.push(trackingSource);
    }
    return points;
  }, [customerLocation?.[0], customerLocation?.[1], trackingSource?.[0], trackingSource?.[1]]);

  // Calculate Haversine distance and estimated travel times
  const getDistanceAndEta = () => {
    if (!trackingSource || !trackingTarget) return null;
    const [lat1, lon1] = trackingSource;
    const [lat2, lon2] = trackingTarget;
    
    // Haversine formula
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // in km

    // Average speeds (allows for dense city traffic calculations): 15 km/h
    const averageSpeedKmh = 15; 
    let etaMinutes = Math.round((distance / averageSpeedKmh) * 60);
    
    if (distance < 0.08) {
      return { distance, eta: "Arrived", rawMinutes: 0 };
    }
    if (etaMinutes < 1) {
      etaMinutes = 1;
    }

    return { 
      distance, 
      eta: `${etaMinutes} min${etaMinutes > 1 ? 's' : ''}`,
      rawMinutes: etaMinutes 
    };
  };

  const trackingMetrics = getDistanceAndEta();

  // Trigger manual fitBounds when compass is clicked
  const handleRecenter = () => {
    setRecenterCounter(prev => prev + 1);
  };

  const tileLayerUrl = mapTheme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const routePositions: [number, number][] = [];
  if (providerLocation) {
    routePositions.push(providerLocation, customerLocation);
  } else if (deliveryLocation && shopLocation) {
    routePositions.push(shopLocation, deliveryLocation, customerLocation);
  } else if (shopLocation) {
    routePositions.push(shopLocation, customerLocation);
  }

  return (
    <div className="relative rounded-[40px] overflow-hidden border border-white/5 shadow-2xl bg-brand-slate" style={{ height }}>
      <MapContainer 
        center={viewCenter} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <MapController center={viewCenter} points={activePoints} recenterCounter={recenterCounter} />
        <TileLayer
          url={tileLayerUrl}
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          className={mapTheme === 'dark' ? 'no-invert' : ''}
        />

        {/* Customer Marker - Blue Pin */}
        <SmoothMarker position={customerLocation} icon={customerIcon}>
          <Popup>
            <div className="text-center p-1 font-sans">
              <p className="font-black text-xs text-brand-blue">Destination</p>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Your Location</p>
            </div>
          </Popup>
        </SmoothMarker>

        {/* Provider Marker (For normal booking jobs) - Orange Pin */}
        {providerLocation && (
          <SmoothMarker position={providerLocation} icon={providerIcon}>
            <Popup>
              <div className="text-center p-1 font-sans">
                <p className="font-black text-xs text-brand-amber">Provider Location</p>
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">En Route</p>
              </div>
            </Popup>
          </SmoothMarker>
        )}

        {/* Shop Marker (For orders) */}
        {shopLocation && (
          <SmoothMarker position={shopLocation} icon={shopIcon}>
            <Popup>
              <div className="text-center p-1 font-sans">
                <p className="font-black text-xs text-action-orange">Merchant Hub</p>
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Order Pickup</p>
              </div>
            </Popup>
          </SmoothMarker>
        )}

        {/* Delivery Boy Marker (For active orders with delivery boy) */}
        {deliveryLocation && (
          <SmoothMarker position={deliveryLocation} icon={deliveryIcon}>
            <Popup>
              <div className="text-center p-1 font-sans">
                <p className="font-black text-xs text-emerald-500">Delivery Boy</p>
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Dispatched</p>
              </div>
            </Popup>
          </SmoothMarker>
        )}

        {/* Soft, glowing semi-transparent route polyline */}
        {routePositions.length > 1 && (
          <>
            {/* Ambient Background Track Line */}
            <Polyline 
              positions={routePositions} 
              pathOptions={{ 
                color: providerLocation ? '#0284c7' : '#10b981', 
                weight: 6, 
                opacity: 0.25,
                lineCap: 'round',
                lineJoin: 'round'
              }} 
            />
            {/* Glowing Pulse Foreground Line */}
            <Polyline 
              positions={routePositions} 
              pathOptions={{ 
                color: providerLocation ? '#38bdf8' : '#34d399', 
                weight: 3, 
                opacity: 0.85,
                dashArray: '5, 10',
                lineCap: 'round',
                lineJoin: 'round'
              }} 
            />
          </>
        )}
      </MapContainer>

      {/* Glassmorphic Map Control Overlays */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <div className="glass-card bg-brand-slate/85 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-2.5 shadow-xl backdrop-blur-md">
          <div className="w-2.5 h-2.5 bg-brand-amber rounded-full animate-ping" />
          <span className="text-[9px] font-black tracking-widest text-white uppercase leading-none">{statusInfo}</span>
        </div>

        {/* Dynamic Distance & ETA floating card overlay */}
        {trackingMetrics && (
          <div className="glass-card bg-brand-slate/90 border border-brand-amber/20 rounded-[24px] p-4 shadow-3xl backdrop-blur-md flex flex-col gap-1 min-w-[170px] animate-fadeIn">
            <span className="text-[8px] font-black tracking-widest text-gray-teal uppercase">Dispatch Route</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-black text-cream tracking-tighter leading-none">
                {trackingMetrics.distance.toFixed(1)} km
              </span>
              <span className="text-[8px] font-black text-gray-teal uppercase ml-0.5">away</span>
            </div>
            <div className="h-px bg-white/5 my-1" />
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-brand-amber rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-brand-amber uppercase tracking-wider">
                {trackingMetrics.rawMinutes === 0 ? "Arrived near site" : `Arriving in ${trackingMetrics.eta}`}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        <button 
          onClick={handleRecenter}
          className="w-11 h-11 bg-brand-slate/85 hover:bg-brand-dark/95 border border-white/10 rounded-2xl flex items-center justify-center text-white shadow-xl backdrop-blur-md transition-all duration-300 active:scale-95"
          title="Recenter Map"
        >
          <Compass className="w-5 h-5 text-brand-amber animate-spin-slow" />
        </button>

        {onCall && (
          <button 
            onClick={onCall}
            className="w-11 h-11 bg-brand-slate/85 hover:bg-brand-dark/95 border border-white/10 rounded-2xl flex items-center justify-center text-white shadow-xl backdrop-blur-md transition-all duration-300 active:scale-95"
            title="Call Contact"
          >
            <Phone className="w-5 h-5 text-brand-amber" />
          </button>
        )}

        {onChat && (
          <button 
            onClick={onChat}
            className="w-11 h-11 bg-brand-slate/85 hover:bg-brand-dark/95 border border-white/10 rounded-2xl flex items-center justify-center text-white shadow-xl backdrop-blur-md transition-all duration-300 active:scale-95"
            title="Chat Contact"
          >
            <MessageSquare className="w-5 h-5 text-brand-amber" />
          </button>
        )}
      </div>
    </div>
  );
};
