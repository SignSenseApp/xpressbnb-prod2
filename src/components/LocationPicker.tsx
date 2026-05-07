import { useState, useEffect, useRef } from 'react';
import { MapPin, Search } from 'lucide-react';

interface LocationPickerProps {
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  onLocationChange: (data: {
    address: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
  }) => void;
}

export default function LocationPicker({
  address,
  city,
  state,
  latitude,
  longitude,
  onLocationChange,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const searchLocation = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=10&countrycodes=in&addressdetails=1`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Error searching location:', error);
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      searchLocation(searchQuery);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  const handleSelectLocation = (location: any) => {
    const addressParts = location.display_name.split(', ');

    onLocationChange({
      address: addressParts[0] || address,
      city: addressParts[1] || city,
      state: addressParts[2] || state,
      latitude: parseFloat(location.lat),
      longitude: parseFloat(location.lon),
    });

    setSearchQuery('');
    setSuggestions([]);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Search Location
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for your property address..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#50C878] focus:border-transparent transition-all"
          />
        </div>

        {searching && (
          <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-xl p-4 shadow-xl z-[9999]">
            <p className="text-sm text-gray-500">Searching...</p>
          </div>
        )}

        {suggestions.length > 0 && !searching && (
          <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] max-h-96 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectLocation(suggestion)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-[#50C878] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {suggestion.display_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Lat: {parseFloat(suggestion.lat).toFixed(4)}, Lon:{' '}
                      {parseFloat(suggestion.lon).toFixed(4)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Selected Location</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <p><span className="font-medium">Address:</span> {address || 'Not set'}</p>
          <p><span className="font-medium">City:</span> {city || 'Not set'}</p>
          <p><span className="font-medium">State:</span> {state || 'Not set'}</p>
          <p><span className="font-medium">Coordinates:</span> {latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
        </div>
      </div>
    </div>
  );
}
