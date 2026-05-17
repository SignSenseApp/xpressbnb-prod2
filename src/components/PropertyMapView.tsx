import { useEffect, useRef } from 'react';
import type { Property } from '../lib/database.types';
// `window.google` is typed in src/types/google-maps.d.ts and is picked up
// by `tsc` via the `include: ["src"]` setting in tsconfig.app.json.

interface PropertyMapViewProps {
  property: Property;
}

declare global {
  interface Window {
    initPropertyMap: () => void;
  }
}

const MAP_STYLES = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f7' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8f8f8' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d0d0d0' }] },
];

export default function PropertyMapView({ property }: PropertyMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') return;

    const initMap = () => {
      const gmaps = window.google?.maps;
      if (!mapRef.current || !gmaps) return;

      const map = new gmaps.Map(mapRef.current, {
        center: { lat: property.latitude, lng: property.longitude },
        zoom: 15,
        styles: MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
          position: gmaps.ControlPosition.RIGHT_CENTER,
        },
        gestureHandling: 'cooperative',
      });

      const price = property.price_per_day || property.price_full_day || 0;
      const formattedPrice = price >= 1000
        ? `₹${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}k`
        : `₹${price}`;

      const pinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="120" height="56" viewBox="0 0 120 56">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="180%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,0.25)"/>
            </filter>
            <linearGradient id="pinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#50C878;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#a0203f;stop-opacity:1" />
            </linearGradient>
          </defs>
          <g filter="url(#shadow)">
            <rect x="4" y="2" width="112" height="38" rx="19" fill="url(#pinGrad)"/>
            <polygon points="56,40 64,40 60,50" fill="#a0203f"/>
          </g>
          <text x="60" y="26" text-anchor="middle" dominant-baseline="middle"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="16" font-weight="700" fill="white" letter-spacing="0.5">
            ${formattedPrice}
          </text>
        </svg>
      `;

      const markerIcon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(pinSvg),
        scaledSize: new gmaps.Size(120, 56),
        anchor: new gmaps.Point(60, 50),
      };

      const marker = new gmaps.Marker({
        position: { lat: property.latitude, lng: property.longitude },
        map,
        title: property.title,
        icon: markerIcon,
        optimized: false,
      });

      const infoContent = `
        <div style="padding:12px 14px;max-width:200px;font-family:system-ui,-apple-system,sans-serif;">
          <p style="font-weight:700;font-size:14px;margin:0 0 4px 0;color:#111;">${property.title}</p>
          <p style="color:#50C878;font-weight:600;font-size:13px;margin:0;">${formattedPrice}/night</p>
        </div>
      `;
      const infoWindow = new gmaps.InfoWindow({ content: infoContent });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    };

    if (window.google) {
      initMap();
    } else {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', initMap);
      } else {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initPropertyMap`;
        script.async = true;
        script.defer = true;
        window.initPropertyMap = initMap;
        document.head.appendChild(script);
      }
    }
  }, [apiKey, property]);

  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-emerald-50 via-rose-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-semibold">Map view unavailable</p>
          <p className="text-sm text-gray-500 mt-1">Configure Google Maps API key</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
