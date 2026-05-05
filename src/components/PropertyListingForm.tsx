import { useState, useEffect } from 'react';
import { X, Upload, MapPin, Home, DollarSign, Users, Bed, Bath, ImagePlus, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database, Property } from '../lib/database.types';
import { AMENITY_CATEGORIES } from '../lib/amenities';
import LocationPicker from './LocationPicker';

interface PropertyListingFormProps {
  property?: Property | null;
  onClose: () => void;
  onSuccess: () => void;
}

type PropertyInsert = Database['public']['Tables']['properties']['Insert'];


const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'studio', label: 'Studio' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'condo', label: 'Condo' }
];

export default function PropertyListingForm({ property, onClose, onSuccess }: PropertyListingFormProps) {
  const { host } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    property_type: 'apartment',
    address: '',
    city: '',
    state: 'Uttar Pradesh',
    country: 'India',
    latitude: 28.5355,
    longitude: 77.3910,
    price_per_day: 0,
    bedrooms: 1,
    bathrooms: 1,
    max_guests: 2,
    amenities: [] as string[],
    images: [] as string[],
    rating: 4.5,
    total_reviews: 0,
    is_active: true
  });
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (property) {
      setFormData({
        id: property.id,
        title: property.title,
        description: property.description,
        property_type: property.property_type,
        address: property.address,
        city: property.city,
        state: property.state,
        country: property.country,
        latitude: property.latitude || 28.5355,
        longitude: property.longitude || 77.3910,
        price_per_day: property.price_full_day || property.price_per_day,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        max_guests: property.max_guests,
        amenities: property.amenities || [],
        images: property.images || [],
        rating: property.rating || 0,
        total_reviews: property.total_reviews || 0,
        is_active: property.is_active
      });
    }
  }, [property]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.title || !formData.description || !formData.address || !formData.city) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.price_per_day <= 0) {
        throw new Error('Price per day must be greater than 0');
      }

      if (formData.images.length === 0) {
        throw new Error('Please add at least one image URL');
      }

      if (!host?.id) {
        throw new Error('You must be logged in as a host to create a property');
      }

      const propertyData: PropertyInsert = {
        host_id: host.id,
        title: formData.title,
        description: formData.description,
        property_type: formData.property_type,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        latitude: formData.latitude,
        longitude: formData.longitude,
        price_per_day: formData.price_per_day,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        max_guests: formData.max_guests,
        amenities: formData.amenities,
        images: formData.images,
        rating: formData.rating,
        total_reviews: formData.total_reviews,
        is_active: formData.is_active
      };

      if (property) {
        const { error: updateError } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', property.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('properties')
          .insert([propertyData]);

        if (insertError) throw insertError;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${property ? 'update' : 'create'} property`);
    } finally {
      setLoading(false);
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 10 - formData.images.length;
    if (remainingSlots === 0) {
      setError('Maximum 10 images allowed');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    // Validate file types and sizes
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (const file of filesToUpload) {
      if (!validTypes.includes(file.type)) {
        setError('Only JPEG, PNG, WEBP, and GIF images are allowed');
        return;
      }
      if (file.size > maxSize) {
        setError('Each image must be less than 5MB');
        return;
      }
    }

    setUploadingImages(true);
    setError(null);

    try {
      const uploadedUrls: string[] = [];

      for (const file of filesToUpload) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { data, error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(data.path);

        uploadedUrls.push(publicUrl);
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));

      // Reset file input
      e.target.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleAddImage = () => {
    if (imageUrl.trim()) {
      if (formData.images.length >= 10) {
        setError('Maximum 10 images allowed');
        return;
      }
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageUrl.trim()]
      }));
      setImageUrl('');
      setError(null);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex flex-col">
        <div className="sticky top-0 bg-gradient-to-r from-[#cc2b5e] to-[#753a88] text-white px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex justify-between items-center z-10 shadow-lg">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">{property ? 'Edit Property' : 'List Your Property'}</h2>
            <p className="text-white/90 mt-1 text-sm sm:text-base">{property ? 'Update your property details' : 'Share your space with travelers'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex-1 flex items-start justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl my-8">
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl text-sm sm:text-base">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <Home className="w-4 h-4 sm:w-5 sm:h-5 text-[#cc2b5e]" />
                Property Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    Property Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cc2b5e] focus:border-transparent transition-all"
                    placeholder="Beautiful 2BR apartment in the heart of the city"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cc2b5e] focus:border-transparent transition-all"
                    placeholder="Describe your property, its unique features, and what makes it special..."
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    Property Type *
                  </label>
                  <select
                    required
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cc2b5e] focus:border-transparent transition-all bg-white"
                  >
                    {PROPERTY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-[#cc2b5e]" />
                Location
              </h3>
              <LocationPicker
                address={formData.address}
                city={formData.city}
                state={formData.state}
                latitude={formData.latitude}
                longitude={formData.longitude}
                onLocationChange={(data) => setFormData({ ...formData, ...data })}
              />

              <div className="mt-4">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  City *
                </label>
                <select
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cc2b5e] focus:border-transparent transition-all bg-white"
                >
                  <option value="">Select City</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Gurgaon">Gurgaon</option>
                  <option value="Noida">Noida</option>
                  <option value="Greater Noida">Greater Noida</option>
                  <option value="Ghaziabad">Ghaziabad</option>
                  <option value="Rishikesh">Rishikesh</option>
                </select>
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-[#cc2b5e]" />
                Pricing & Capacity
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    Price Per Day (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price_per_day}
                    onChange={(e) => setFormData({ ...formData, price_per_day: parseInt(e.target.value) })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cc2b5e] focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Bed className="w-3 h-3 sm:w-4 sm:h-4" />
                    Bedrooms *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cc2b5e] focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Bath className="w-3 h-3 sm:w-4 sm:h-4" />
                    Bathrooms *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cc2b5e] focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                    Max Guests *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.max_guests}
                    onChange={(e) => setFormData({ ...formData, max_guests: parseInt(e.target.value) })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cc2b5e] focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#cc2b5e]" />
                Amenities ({formData.amenities.length} selected)
              </h3>
              <div className="space-y-4">
                {AMENITY_CATEGORIES.map((category) => (
                  <div key={category.name} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                      className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                    >
                      <span className="font-semibold text-gray-900">{category.name}</span>
                      <div className="flex items-center gap-2">
                        {formData.amenities.filter(a => category.amenities.some(ca => ca.name === a)).length > 0 && (
                          <span className="text-xs px-2 py-1 bg-[#cc2b5e] text-white rounded-full">
                            {formData.amenities.filter(a => category.amenities.some(ca => ca.name === a)).length}
                          </span>
                        )}
                        <span className={`transition-transform ${expandedCategory === category.name ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </div>
                    </button>
                    {expandedCategory === category.name && (
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {category.amenities.map((amenity) => {
                          const Icon = amenity.icon;
                          const isSelected = formData.amenities.includes(amenity.name);
                          return (
                            <button
                              key={amenity.name}
                              type="button"
                              onClick={() => handleAmenityToggle(amenity.name)}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all text-left ${
                                isSelected
                                  ? 'border-[#cc2b5e] bg-pink-50 text-[#cc2b5e]'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-[#cc2b5e] hover:bg-gray-50'
                              }`}
                            >
                              <Icon className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-[#cc2b5e]' : 'text-gray-400'}`} />
                              <span className="flex-1">{amenity.name}</span>
                              {isSelected && <CheckCircle2 className="w-5 h-5 text-[#cc2b5e] flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-[#cc2b5e]" />
                Images ({formData.images.length}/10)
              </h3>
              <div className="space-y-4">
                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 hover:border-[#cc2b5e] transition-colors">
                  <label className="flex flex-col items-center justify-center cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleFileUpload}
                      disabled={formData.images.length >= 10 || uploadingImages}
                      className="hidden"
                    />
                    <ImagePlus className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mb-2" />
                    <p className="text-sm sm:text-base font-semibold text-gray-700 mb-1">
                      {uploadingImages ? 'Uploading...' : 'Click to upload images'}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 text-center">
                      PNG, JPG, WEBP or GIF (max 5MB each)
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      You can select multiple images at once
                    </p>
                  </label>
                </div>

                {/* URL Input */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-xs sm:text-sm">
                    <span className="px-2 bg-white text-gray-500">Or add image URL</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Enter image URL (https://...)"
                    disabled={formData.images.length >= 10}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#cc2b5e] focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    disabled={formData.images.length >= 10}
                    className="px-6 py-2 sm:py-3 bg-[#cc2b5e] text-white font-semibold text-sm sm:text-base rounded-xl hover:bg-[#d64371] transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>

                {formData.images.length >= 10 && (
                  <p className="text-sm text-amber-600 font-medium">Maximum 10 images reached. Remove an image to add more.</p>
                )}

                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    {formData.images.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img}
                          alt={`Property ${index + 1}`}
                          className="w-full h-32 object-cover rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 px-6 py-3 sm:py-4 border-2 border-gray-300 text-gray-700 font-semibold text-sm sm:text-base rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 px-6 py-3 sm:py-4 bg-gradient-to-r from-[#cc2b5e] to-[#753a88] text-white font-semibold text-sm sm:text-base rounded-xl hover:from-[#d64371] hover:to-[#8a4b9e] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (property ? 'Updating...' : 'Creating...') : (property ? 'Update Property' : 'List Property')}
            </button>
          </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
