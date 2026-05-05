import { MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Property } from '../lib/database.types';

interface MapViewProps {
  properties: Property[];
  selectedProperty?: Property | null;
  onPropertyClick: (property: Property) => void;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
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

function formatPrice(price: number): string {
  if (price >= 1000) {
    const val = price / 1000;
    return `₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}k`;
  }
  return `₹${price}`;
}

function buildPinSvg(price: number, selected: boolean): string {
  const formattedPrice = formatPrice(price);
  const bg = selected ? '#111827' : '#cc2b5e';
  const bgDark = selected ? '#000000' : '#a0203f';
  const w = 120;
  const h = 56;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <filter id="sh${selected ? 's' : 'n'}" x="-25%" y="-25%" width="150%" height="200%">
        <feDropShadow dx="0" dy="${selected ? 4 : 2}" stdDeviation="${selected ? 6 : 3}" flood-color="rgba(0,0,0,${selected ? 0.4 : 0.2})"/>
      </filter>
      <linearGradient id="grad${selected ? 's' : 'n'}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${bg};stop-opacity:1"/>
        <stop offset="100%" style="stop-color:${bgDark};stop-opacity:1"/>
      </linearGradient>
    </defs>
    <g filter="url(#sh${selected ? 's' : 'n'})">
      <rect x="4" y="2" width="${w - 8}" height="38" rx="19" fill="url(#grad${selected ? 's' : 'n'})"/>
      ${selected ? '<rect x="4" y="2" width="' + (w - 8) + '" height="38" rx="19" fill="none" stroke="white" stroke-width="2.5"/>' : ''}
      <polygon points="${w / 2 - 6},40 ${w / 2 + 6},40 ${w / 2},50" fill="${bgDark}"/>
    </g>
    <text x="${w / 2}" y="22" text-anchor="middle" dominant-baseline="middle"
      font-family="system-ui,-apple-system,sans-serif"
      font-size="${selected ? 15 : 14}" font-weight="700" fill="white" letter-spacing="0.3">
      ${formattedPrice}
    </text>
  </svg>`;
}

export default function MapView({ properties, selectedProperty, onPropertyClick }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const navigateToProperty = (property: Property) => {
    window.history.pushState({}, '', `/property/${property.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') return;

    const initMap = () => {
      if (!mapRef.current || !window.google) return;

      const centerLat = properties.length > 0
        ? properties.reduce((sum, p) => sum + p.latitude, 0) / properties.length
        : 28.5355;
      const centerLng = properties.length > 0
        ? properties.reduce((sum, p) => sum + p.longitude, 0) / properties.length
        : 77.3910;

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: centerLat, lng: centerLng },
        zoom: 12,
        styles: MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER,
        },
        gestureHandling: 'greedy',
      });

      googleMapRef.current = map;
      infoWindowRef.current = new window.google.maps.InfoWindow();

      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];

      properties.forEach((property) => {
        const price = property.price_per_day || property.price_full_day || 0;
        const isSelected = selectedProperty?.id === property.id;
        const svg = buildPinSvg(price, isSelected);

        const icon = {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
          scaledSize: new window.google.maps.Size(120, 56),
          anchor: new window.google.maps.Point(60, 50),
        };

        const marker = new window.google.maps.Marker({
          position: { lat: property.latitude, lng: property.longitude },
          map,
          title: property.title,
          icon,
          optimized: false,
          zIndex: isSelected ? 999 : 1,
        });

        marker.addListener('mouseover', () => {
          const infoContent = `
            <div style="padding:10px 12px;font-family:system-ui,-apple-system,sans-serif;min-width:160px;">
              <p style="font-weight:700;font-size:13px;margin:0 0 4px 0;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">${property.title}</p>
              <p style="color:#6b7280;font-size:11px;margin:0 0 6px 0;">${property.city}</p>
              <p style="color:#cc2b5e;font-weight:700;font-size:14px;margin:0;">${formatPrice(price)}<span style="color:#9ca3af;font-weight:400;font-size:11px;">/night</span></p>
            </div>
          `;
          infoWindowRef.current.setContent(infoContent);
          infoWindowRef.current.open(map, marker);
        });

        marker.addListener('mouseout', () => {
          infoWindowRef.current.close();
        });

        marker.addListener('click', () => {
          onPropertyClick(property);
          navigateToProperty(property);
        });

        markersRef.current.push(marker);
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
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
        script.async = true;
        script.defer = true;
        window.initMap = initMap;
        document.head.appendChild(script);
      }
    }

    return () => {
      markersRef.current.forEach(m => m.setMap(null));
    };
  }, [apiKey, properties]);

  useEffect(() => {
    if (!googleMapRef.current || !window.google) return;

    markersRef.current.forEach((marker, index) => {
      const property = properties[index];
      if (!property) return;
      const price = property.price_per_day || property.price_full_day || 0;
      const isSelected = selectedProperty?.id === property.id;
      const svg = buildPinSvg(price, isSelected);

      marker.setIcon({
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
        scaledSize: new window.google.maps.Size(120, 56),
        anchor: new window.google.maps.Point(60, 50),
      });
      marker.setZIndex(isSelected ? 999 : 1);
    });
  }, [selectedProperty, properties]);

  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    if (properties.length === 0) {
      return (
        <div className="relative w-full h-full bg-gradient-to-br from-blue-50 via-sky-50 to-blue-100 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-semibold">No properties to display on map</p>
          </div>
        </div>
      );
    }

    const centerLat = properties.reduce((sum, p) => sum + p.latitude, 0) / properties.length || 28.5355;
    const centerLng = properties.reduce((sum, p) => sum + p.longitude, 0) / properties.length || 77.3910;

    return (
      <div className="relative w-full h-full bg-gradient-to-br from-blue-50 via-sky-50 to-blue-100 overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {properties.map((property) => {
          const latDiff = property.latitude - centerLat;
          const lngDiff = property.longitude - centerLng;
          const left = Math.max(8, Math.min(88, 50 + lngDiff * 500));
          const top = Math.max(8, Math.min(88, 50 + latDiff * -500));
          const isSelected = selectedProperty?.id === property.id;
          const isHovered = hoveredId === property.id;
          const price = property.price_per_day || property.price_full_day || 0;

          return (
            <button
              key={property.id}
              onClick={() => navigateToProperty(property)}
              onMouseEnter={() => setHoveredId(property.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 cursor-pointer"
              style={{ left: `${left}%`, top: `${top}%`, zIndex: isSelected || isHovered ? 50 : 10 }}
            >
              <div className="flex flex-col items-center">
                <div className={`
                  px-3 py-1.5 rounded-full font-bold text-sm shadow-lg transition-all duration-200 whitespace-nowrap
                  ${isSelected
                    ? 'bg-gray-900 text-white scale-110 shadow-xl ring-2 ring-white'
                    : isHovered
                    ? 'bg-[#cc2b5e] text-white scale-105 shadow-xl'
                    : 'bg-[#cc2b5e] text-white hover:scale-105'
                  }
                `}>
                  {formatPrice(price)}
                </div>
                <div className={`
                  w-2 h-2 rounded-full mt-0.5 transition-all
                  ${isSelected ? 'bg-gray-900' : 'bg-[#a0203f]'}
                `} />
              </div>
            </button>
          );
        })}

        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
          <p className="font-semibold text-gray-900 text-sm">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md pointer-events-none">
        <p className="font-semibold text-gray-900 text-sm">
          {properties.length} {properties.length === 1 ? 'property' : 'properties'}
        </p>
      </div>
    </div>
  );
}
