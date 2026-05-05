import { MapPin, Users, Bed, Bath, CheckCircle } from 'lucide-react';
import type { Property } from '../lib/database.types';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const handleClick = () => {
    window.history.pushState({}, '', `/property/${property.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group"
    >
      <div className="relative h-64 overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
        {property.images?.[0] ? (
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Bed className="w-16 h-16 text-gray-400" />
          </div>
        )}
        {property.is_verified && (
          <div className="absolute top-3 right-3 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-500 rounded-full px-3.5 py-2 shadow-lg flex items-center gap-1.5 motion-safe:hover:shadow-amber-400/50 motion-safe:hover:shadow-xl transition-all duration-300 group/badge">
            <CheckCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-amber-950" fill="#78350f" />
            <span className="text-xs sm:text-sm font-bold text-amber-950 tracking-wide">Verified</span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent motion-safe:group-hover/badge:animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{property.title}</h3>
          <span className="text-xs px-2.5 py-1 bg-pink-50 text-[#cc2b5e] rounded-full font-medium whitespace-nowrap ml-2">
            {property.property_type}
          </span>
        </div>

        <div className="flex items-center text-gray-600 text-sm mb-3">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="line-clamp-1">{property.city}, {property.state}</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-1">
            <Bed className="w-4 h-4" />
            <span>{property.bedrooms} bed</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="w-4 h-4" />
            <span>{property.bathrooms} bath</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{property.max_guests} guests</span>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              ₹{(property.price_per_day || property.price_full_day || 0).toLocaleString()}
              <span className="text-sm font-normal text-gray-500">/day</span>
            </div>
            <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
              <CheckCircle className="w-3 h-3" />
              Lowest Price Guaranteed
            </span>
          </div>
          <button className="px-5 py-2.5 bg-gradient-to-r from-[#cc2b5e] to-[#753a88] text-white rounded-full font-semibold hover:from-[#d64371] hover:to-[#8a4b9e] transition-all shadow-md hover:shadow-lg">
            View
          </button>
        </div>
      </div>
    </div>
  );
}
