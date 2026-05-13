import { X, MapPin, Users, Bed, Bath, ChevronLeft, ChevronRight, Share2, Copy, Check, CheckCircle } from 'lucide-react';
import type { Property } from '../lib/database.types';
import BookingForm from './BookingForm';
import PropertyMapView from './PropertyMapView';
import { useMemo, useState } from 'react';
import { getAmenityIcon } from '../lib/amenities';

interface PropertyModalProps {
  property: Property;
  onClose: () => void;
}

export default function PropertyModal({ property, onClose }: PropertyModalProps) {
  const defaultCheckIn = useMemo(() => new Date(), []);
  const defaultCheckOut = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }, []);
  const modalTripPrice = useMemo(
    () => Math.max(0, (property.price_per_day || 0) * 1),
    [property.price_per_day],
  );

  const [showBooking, setShowBooking] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
  };

  const nextImage = () => {
    const imageCount = property.images?.length || 1;
    setCurrentImageIndex((prev) => (prev + 1) % imageCount);
  };

  const prevImage = () => {
    const imageCount = property.images?.length || 1;
    setCurrentImageIndex((prev) => (prev - 1 + imageCount) % imageCount);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'Escape') closeLightbox();
  };

  const getPropertyUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/property/${property.id}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getPropertyUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `Check out this property: ${property.title}\n${getPropertyUrl()}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareMenu(false);
  };

  const handleInstagramShare = () => {
    // Instagram doesn't support direct web sharing, so copy link and inform user
    handleCopyLink();
    alert('Link copied! Open Instagram and paste the link in your story or post.');
    setShowShareMenu(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="sticky top-4 left-full ml-4 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-2">
            <div className="space-y-4">
              <div
                className="aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity bg-gradient-to-br from-gray-200 to-gray-300"
                onClick={() => openLightbox(0)}
              >
                {property.images?.[0] ? (
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Bed className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
              {property.images && property.images.length > 1 && (
                <div className="grid grid-cols-2 gap-4">
                  {property.images[1] && (
                    <div
                      className="aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() => openLightbox(1)}
                    >
                      <img
                        src={property.images[1]}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {property.images.length > 2 && (
                    <div
                      className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-[#50C878] to-[#3dae68] flex items-center justify-center cursor-pointer hover:from-[#3dae68] hover:to-[#3dae68] transition-all"
                      onClick={() => openLightbox(0)}
                    >
                      <div className="text-center text-white">
                        <p className="text-3xl font-bold">+{property.images.length - 2}</p>
                        <p className="text-sm">View all photos</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{property.title}</h2>
                      {property.is_verified && (
                        <div className="relative flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-500 rounded-full shadow-lg motion-safe:hover:shadow-amber-400/50 motion-safe:hover:shadow-xl transition-all duration-300 group/badge">
                          <CheckCircle className="w-[18px] h-[18px] text-amber-950" fill="#78350f" />
                          <span className="text-sm font-bold text-amber-950 tracking-wide">Verified</span>
                          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent motion-safe:group-hover/badge:animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center text-gray-600 mb-3">
                      <MapPin className="w-5 h-5 mr-2" />
                      <span>{property.address}, {property.city}, {property.state}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-4 py-2 bg-pink-50 text-[#50C878] rounded-full font-semibold text-sm">
                      {property.property_type}
                    </span>
                    <div className="relative">
                      <button
                        onClick={() => setShowShareMenu(!showShareMenu)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="Share property"
                      >
                        <Share2 className="w-5 h-5 text-gray-700" />
                      </button>

                      {showShareMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-[60]"
                            onClick={() => setShowShareMenu(false)}
                          />
                          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-[70]">
                            <button
                              onClick={handleWhatsAppShare}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                            >
                              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                              </div>
                              <span className="font-medium text-gray-700">Share on WhatsApp</span>
                            </button>
                            <button
                              onClick={handleInstagramShare}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                            >
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                              </div>
                              <span className="font-medium text-gray-700">Share on Instagram</span>
                            </button>
                            <button
                              onClick={handleCopyLink}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                            >
                              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                                {copied ? (
                                  <Check className="w-5 h-5 text-white" />
                                ) : (
                                  <Copy className="w-5 h-5 text-white" />
                                )}
                              </div>
                              <span className="font-medium text-gray-700">
                                {copied ? 'Link Copied!' : 'Copy Link'}
                              </span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>


                <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <Bed className="w-6 h-6 mx-auto mb-2 text-[#50C878]" />
                    <p className="font-semibold text-gray-900">{property.bedrooms}</p>
                    <p className="text-sm text-gray-600">Bedrooms</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <Bath className="w-6 h-6 mx-auto mb-2 text-[#50C878]" />
                    <p className="font-semibold text-gray-900">{property.bathrooms}</p>
                    <p className="text-sm text-gray-600">Bathrooms</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <Users className="w-6 h-6 mx-auto mb-2 text-[#50C878]" />
                    <p className="font-semibold text-gray-900">{property.max_guests}</p>
                    <p className="text-sm text-gray-600">Guests</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">About this property</h3>
                  <p className="text-gray-600 leading-relaxed">{property.description}</p>
                </div>

                {property.amenities && property.amenities.length > 0 && (
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h3 className="font-bold text-lg mb-3 text-gray-900">Amenities</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {property.amenities.map((amenity, index) => {
                        const Icon = getAmenityIcon(amenity);
                        return (
                          <div key={index} className="flex items-center gap-3 text-gray-700">
                            <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center">
                              <Icon className="w-5 h-5 text-[#50C878]" />
                            </div>
                            <span className="font-medium">{amenity}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Location</h3>
                  <div className="flex items-center text-gray-600 mb-3">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span>{property.address}, {property.city}, {property.state}</span>
                  </div>
                  <PropertyMapView property={property} />
                </div>

                <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-600 mb-1">Starting from</p>
                      <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-bold text-gray-900">₹{property.price_full_day?.toLocaleString() || 0}</span>
                        <span className="text-gray-600">/full day</span>
                      </div>
                    </div>
                  </div>
                </div>

                {!showBooking ? (
                  <button
                    onClick={() => setShowBooking(true)}
                    className="w-full py-4 bg-gradient-to-r from-[#FF385C] to-[#E11D48] text-white font-bold rounded-xl hover:from-[#f43f5e] hover:to-[#be123c] transition-all shadow-lg hover:shadow-xl"
                  >
                    Book Now
                  </button>
                ) : (
                  <div>
                    <h3 className="font-bold text-xl mb-4 text-gray-900">Complete Your Booking</h3>
                    <BookingForm
                      property={property}
                      onSuccess={({ bookingId }) => {
                        onClose();
                        window.history.pushState({}, '', `/booking/${bookingId}`);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                      checkInDate={defaultCheckIn}
                      checkOutDate={defaultCheckOut}
                      calculatedPrice={modalTripPrice}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Gallery */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black bg-opacity-95 flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-[70] w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Image Counter */}
          <div className="absolute top-4 left-4 z-[70] bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-sm">
            <span className="font-semibold">{currentImageIndex + 1} / {property.images?.length || 1}</span>
          </div>

          {/* Previous Button */}
          {property.images && property.images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 z-[70] w-12 h-12 sm:w-16 sm:h-16 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </button>
          )}

          {/* Main Image */}
          <div
            className="relative max-w-7xl max-h-[85vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={property.images[currentImageIndex]}
              alt={`${property.title} - Image ${currentImageIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>

          {/* Next Button */}
          {property.images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 z-[70] w-12 h-12 sm:w-16 sm:h-16 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </button>
          )}

          {/* Thumbnail Strip */}
          {property.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[70] max-w-full overflow-x-auto">
              <div className="flex gap-2 px-4">
                {property.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(index);
                    }}
                    className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-white scale-110'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
