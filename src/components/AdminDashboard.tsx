import { useEffect, useState } from 'react';
import { X, Calendar, User, Mail, Phone, Home, Clock, DollarSign, CheckCircle, XCircle, AlertCircle, Plus, Lock, Edit, Trash2, EyeOff, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Booking, Property } from '../lib/database.types';
import PropertyListingForm from './PropertyListingForm';

interface AdminDashboardProps {
  onClose: () => void;
}

interface BookingWithProperty extends Booking {
  property: Property;
}

const ADMIN_PASSWORD = 'Renu_Anil@123b';

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [bookings, setBookings] = useState<BookingWithProperty[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [activeTab, setActiveTab] = useState<'bookings' | 'properties'>('bookings');
  const [showListPropertyForm, setShowListPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadBookings();
      loadProperties();
    }
  }, [isAuthenticated]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          property:properties(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data as any);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;
      loadBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const togglePropertyActive = async (propertyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ is_active: !currentStatus })
        .eq('id', propertyId);

      if (error) throw error;
      loadProperties();
    } catch (error) {
      console.error('Error updating property status:', error);
      alert('Failed to update property status');
    }
  };

  const deleteProperty = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;
      loadProperties();
      alert('Property deleted successfully');
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property');
    }
  };

  const filteredBookings = bookings.filter(b => filter === 'all' || b.status === filter);

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    revenue: bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.total_price, 0),
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#50C878] to-[#3dae68] rounded-full mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Access</h2>
            <p className="text-gray-600">Enter password to continue</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#50C878] focus:border-transparent transition-all"
                placeholder="Enter admin password"
                autoFocus
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#50C878] to-[#3dae68] text-white font-semibold rounded-xl hover:from-[#3dae68] hover:to-[#3dae68] transition-all shadow-lg"
              >
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50">
      <div className="min-h-screen">
        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600 mt-1">Manage your bookings and properties</p>
              </div>
              <div className="flex items-center gap-4">
                {activeTab === 'properties' && (
                  <button
                    onClick={() => setShowListPropertyForm(true)}
                    className="px-6 py-3 bg-gradient-to-r from-[#50C878] to-[#3dae68] text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add Property
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-3 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex gap-4">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'bookings'
                  ? 'bg-gradient-to-r from-[#50C878] to-[#3dae68] text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-5 h-5 inline-block mr-2" />
              Bookings
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'properties'
                  ? 'bg-gradient-to-r from-[#50C878] to-[#3dae68] text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Home className="w-5 h-5 inline-block mr-2" />
              Properties
            </button>
          </div>
          {activeTab === 'bookings' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-600 font-semibold">Total Bookings</h3>
                <Calendar className="w-5 h-5 text-[#50C878]" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-600 font-semibold">Pending</h3>
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-600 font-semibold">Confirmed</h3>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.confirmed}</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-600 font-semibold">Cancelled</h3>
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">{stats.cancelled}</p>
            </div>

            <div className="bg-gradient-to-br from-[#50C878] to-[#3dae68] rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-pink-100 font-semibold">Revenue</h3>
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">₹{stats.revenue.toFixed(0)}</p>
            </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Recent Bookings</h2>
                <div className="flex gap-2">
                  {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                        filter === status
                          ? 'bg-gradient-to-r from-[#50C878] to-[#3dae68] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block w-12 h-12 border-4 border-[#50C878] border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-600 mt-4">Loading bookings...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No bookings found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <div key={booking.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <img
                            src={booking.property.images[0]}
                            alt={booking.property.title}
                            className="w-24 h-24 rounded-xl object-cover"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-bold text-gray-900 mb-1">{booking.property.title}</h3>
                                <div className="flex items-center text-sm text-gray-600 gap-4">
                                  <span className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    {booking.guest_name}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-4 h-4" />
                                    {booking.guest_email}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-4 h-4" />
                                    {booking.guest_phone}
                                  </span>
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {booking.status}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(booking.check_in_date).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {booking.booking_type === 'full_day' ? 'Full Day' :
                                  `Half Day - ${booking.time_slot === 'morning' ? '11AM-6:30PM' : '7:30PM-10AM'}`}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {booking.num_guests} guests
                              </span>
                              <span className="flex items-center gap-1 font-bold text-gray-900">
                                <DollarSign className="w-4 h-4" />
                                ₹{booking.total_price.toFixed(2)}
                              </span>
                            </div>

                            {booking.special_requests && (
                              <div className="mt-3 p-3 bg-pink-50 rounded-xl">
                                <p className="text-sm text-gray-700">
                                  <span className="font-semibold">Special requests:</span> {booking.special_requests}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {booking.status === 'pending' && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                            className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
              </div>
            </>
          )}

          {activeTab === 'properties' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">All Properties</h2>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-block w-12 h-12 border-4 border-[#50C878] border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-600 mt-4">Loading properties...</p>
                </div>
              ) : properties.length === 0 ? (
                <div className="p-12 text-center">
                  <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No properties found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {properties.map((property) => (
                    <div key={property.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="w-32 h-32 rounded-xl object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-bold text-gray-900 mb-1">{property.title}</h3>
                              <p className="text-sm text-gray-600">{property.city}, {property.state}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                property.is_active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {property.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pink-100 text-[#50C878]">
                                {property.property_type}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
                            <span>₹{property.price_full_day}/day</span>
                            {property.price_half_day > 0 && (
                              <span>₹{property.price_half_day}/half day</span>
                            )}
                            <span>{property.bedrooms} bed</span>
                            <span>{property.bathrooms} bath</span>
                            <span>{property.max_guests} guests</span>
                          </div>

                          <div className="flex items-center gap-3 mt-4">
                            <button
                              onClick={() => {
                                setEditingProperty(property);
                                setShowListPropertyForm(true);
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => togglePropertyActive(property.id, property.is_active)}
                              className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                                property.is_active
                                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {property.is_active ? (
                                <>
                                  <EyeOff className="w-4 h-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4" />
                                  Activate
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => deleteProperty(property.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showListPropertyForm && (
        <PropertyListingForm
          property={editingProperty}
          onClose={() => {
            setShowListPropertyForm(false);
            setEditingProperty(null);
          }}
          onSuccess={() => {
            setShowListPropertyForm(false);
            setEditingProperty(null);
            loadProperties();
          }}
        />
      )}
    </div>
  );
}
