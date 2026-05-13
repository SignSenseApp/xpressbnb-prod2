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
      className="bg-white rounded-[22px] transition-all duration-300 cursor-pointer overflow-hidden group border border-xpx-border shadow-xpx-card hover:shadow-xpx-hover"
    >
      <div className="relative h-64 overflow-hidden bg-xpx-surface-light">
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
          <div className="absolute top-3 right-3 rounded-full px-3.5 py-2 shadow-sm flex items-center gap-1.5 border border-emerald-200 bg-emerald-50">
            <CheckCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-emerald-700" />
            <span className="text-xs sm:text-sm font-semibold text-emerald-800 tracking-tight">Verified</span>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{property.title}</h3>
          <span className="text-xs px-2.5 py-1 bg-emerald-50 text-[#047857] rounded-full font-medium whitespace-nowrap ml-2 border border-emerald-100">
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
            <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-100">
              <CheckCircle className="w-3 h-3" />
              Lowest Price Guaranteed
            </span>
          </div>
          <button className="px-5 py-2.5 bg-[#059669] text-white rounded-full font-semibold hover:bg-[#047857] transition-colors">
            View
          </button>
        </div>
      </div>
    </div>
  );
}
