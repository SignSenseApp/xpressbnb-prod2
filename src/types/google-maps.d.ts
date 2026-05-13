// Minimal Google Maps JS SDK types — just the surface this app actually
// touches. Avoid pulling in `@types/google.maps` for one map widget.

export interface GoogleMapsInfoWindow {
  setContent(content: string): void;
  open(map: unknown, anchor?: unknown): void;
  close(): void;
}

export interface GoogleMapsMarker {
  setMap(map: unknown): void;
  setIcon(icon: unknown): void;
  setZIndex(z: number): void;
  addListener(event: string, handler: () => void): void;
}

export interface GoogleMapsMap {
  setCenter?(latLng: { lat: number; lng: number }): void;
}

interface MapsLatLngLike {
  lat: number;
  lng: number;
}

interface MapsMapOptions {
  center: MapsLatLngLike;
  zoom: number;
  styles?: unknown[];
  disableDefaultUI?: boolean;
  zoomControl?: boolean;
  zoomControlOptions?: { position: unknown };
  gestureHandling?: string;
}

interface MapsMarkerOptions {
  position: MapsLatLngLike;
  map: unknown;
  title?: string;
  icon?: unknown;
  optimized?: boolean;
  zIndex?: number;
}

interface MapsInfoWindowOptions {
  content?: string;
}

export interface GoogleMapsNamespace {
  maps: {
    Map: new (element: Element, options: MapsMapOptions) => GoogleMapsMap;
    Marker: new (options: MapsMarkerOptions) => GoogleMapsMarker;
    InfoWindow: new (options?: MapsInfoWindowOptions) => GoogleMapsInfoWindow;
    Size: new (width: number, height: number) => unknown;
    Point: new (x: number, y: number) => unknown;
    ControlPosition: { RIGHT_CENTER: unknown };
  };
}

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
  }
}

export {};
