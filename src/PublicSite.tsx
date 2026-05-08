import { useEffect, useState, useRef } from 'react';
import Header from './components/Header';
import MapView from './components/MapView';
import PropertyCard from './components/PropertyCard';
import AboutPage from './components/AboutPage';
import BlogPage from './components/BlogPage';
import PricingPopup from './components/PricingPopup';
import SEOHead from './components/SEOHead';
import { supabase } from './lib/supabase';
import { generateOrganizationStructuredData } from './lib/seo';
import type { Property } from './lib/database.types';

export default function PublicSite() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [showAbout, setShowAbout] = useState(false);
  const [showBlog, setShowBlog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const heroMapRef = useRef<HTMLDivElement>(null);
  const propertiesRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    filterProperties();
  }, [properties, selectedCity]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (!isMobile || showAbout || showBlog) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }

        rafRef.current = requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isMobile, showAbout, showBlog]);

  const filterProperties = () => {
    let filtered = properties;

    if (selectedCity === 'Delhi NCR') {
      const ncrCities = ['Delhi', 'Gurgaon', 'Noida', 'Greater Noida', 'Ghaziabad'];
      filtered = filtered.filter(property => ncrCities.includes(property.city));
    } else if (selectedCity !== 'all') {
      filtered = filtered.filter(property => property.city === selectedCity);
    }

    setFilteredProperties(filtered);
  };

  const getParallaxStyles = () => {
    if (!isMobile) return {};

    const heroMapTranslateY = scrollY * -0.3;

    const startOverlay = 200;
    const overlayAmount = Math.max(0, scrollY - startOverlay);
    const propertiesTranslateY = -overlayAmount * 0.6;

    return {
      heroMap: {
        transform: `translateY(${heroMapTranslateY}px)`,
      },
      properties: {
        transform: `translateY(${propertiesTranslateY}px)`,
      },
    };
  };

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .order('is_verified', { ascending: false })
        .order('rating', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
      setFilteredProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };



  if (showAbout) {
    return <AboutPage onClose={() => setShowAbout(false)} />;
  }

  if (showBlog) {
    return <BlogPage onClose={() => setShowBlog(false)} />;
  }

  const parallaxStyles = getParallaxStyles();

  return (
    <div className="min-h-screen bg-gray-50 md:overflow-auto parallax-container">
      <SEOHead
        config={{
          title: 'XpressBnB - Verified Stays in Delhi NCR at Best Price | No Commissions, No Extra Fees',
          description: 'Book verified homes, serviced apartments, and premium stays in Delhi NCR directly from trusted hosts. No platform commissions, no hidden charges. Best market prices with complete transparency across Delhi, Gurgaon, Noida, Greater Noida.',
          keywords: 'verified stays delhi ncr, no commission booking, serviced apartments delhi, homes for rent delhi, best price accommodation, trusted hosts delhi, verified properties gurgaon, no hidden fees stays, premium stays noida',
          canonical: 'https://xpressbnb.com',
          structuredData: generateOrganizationStructuredData(),
        }}
      />
      <Header
        onAboutClick={() => setShowAbout(true)}
        onBlogClick={() => setShowBlog(true)}
        onHostLoginClick={() => {
          window.history.pushState({}, '', '/auth/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
      />

      <div
        ref={heroMapRef}
        className="md:relative parallax-hero"
        style={isMobile ? {
          ...parallaxStyles.heroMap,
          transition: 'none',
          willChange: 'transform',
        } : {}}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Smarter Way to Book Verified Stays, Connect Directly with B&B Hosts - No Commissions, No Extra Fees
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              XpressBnB do not charge platform commissions and hidden charges from both Guests and our Hosts, ensuring the best market prices with complete transparency. Every property is carefully verified for comfort, reliability, and peace of mind across Delhi, Gurgaon, Noida, and Greater Noida.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <span className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold">
                Verified Properties
              </span>
              <span className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
                No Commission Booking
              </span>
              <span className="inline-flex items-center px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-semibold">
                Best Price Guaranteed
              </span>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-center mb-8">
              <div className="inline-flex flex-wrap items-center justify-center bg-white rounded-2xl shadow-lg p-2 gap-2 border-2 border-gray-100">
                <button
                  onClick={() => setSelectedCity('all')}
                  className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                    selectedCity === 'all'
                      ? 'bg-gradient-to-r from-[#50C878] to-[#3dae68] text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  All Locations
                </button>
                <button
                  onClick={() => setSelectedCity('Delhi NCR')}
                  className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                    selectedCity === 'Delhi NCR'
                      ? 'bg-gradient-to-r from-[#50C878] to-[#3dae68] text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Delhi NCR
                </button>
                <button
                  onClick={() => setSelectedCity('Rishikesh')}
                  className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                    selectedCity === 'Rishikesh'
                      ? 'bg-gradient-to-r from-[#50C878] to-[#3dae68] text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Rishikesh
                </button>
              </div>
            </div>

            <MapView
              properties={filteredProperties}
              selectedProperty={null}
              onPropertyClick={() => {}}
            />
          </div>
        </div>
      </div>

      <div
        ref={propertiesRef}
        className="bg-gray-50 md:relative md:transform-none parallax-properties"
        style={isMobile ? {
          ...parallaxStyles.properties,
          position: 'relative',
          zIndex: 10,
          minHeight: '100vh',
          transition: 'none',
          willChange: 'transform',
          marginTop: '-48px',
          paddingTop: '48px',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
        } : {}}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-4 border-[#50C878] border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-2 border-4 border-[#3dae68] border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
                <div className="absolute inset-4 border-4 border-[#50C878] border-t-transparent rounded-full animate-spin" style={{ animationDuration: '0.6s' }} />
              </div>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="text-xl font-bold text-gray-900 mb-2">No properties found</h3>
              <p className="text-gray-600">No properties available at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                />
              ))}
            </div>
          )}
        </div>

        <section className="bg-white py-16 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Why Choose XpressBnB — India's Smarter Stay
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                We connect you directly with verified hosts across Delhi NCR, eliminating commissions and hidden fees to ensure you get the best prices on quality accommodations for families, business travelers, and long stays.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#50C878] to-[#3dae68] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">100% Verified Properties</h3>
                <p className="text-gray-600">Every property is personally verified by our team to ensure quality, comfort, and reliability. Book with complete confidence.</p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#50C878] to-[#3dae68] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Hidden Fees</h3>
                <p className="text-gray-600">Best market prices guaranteed with complete transparency. No platform commissions, no surprise charges — just honest pricing.</p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#50C878] to-[#3dae68] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Prime Locations</h3>
                <p className="text-gray-600">Quality accommodations across Delhi, Gurgaon, Noida, and Greater Noida — perfect for families and business travelers.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Popular Locations in Delhi NCR</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delhi</h3>
                <p className="text-gray-600">Verified stays in the heart of the capital with easy access to all major areas and attractions.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Gurgaon</h3>
                <p className="text-gray-600">Premium accommodations in Gurgaon's corporate hub with modern amenities and convenience.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Noida</h3>
                <p className="text-gray-600">Quality verified properties in Noida offering comfort and great value for families and professionals.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Greater Noida</h3>
                <p className="text-gray-600">Affordable, verified accommodations in Greater Noida with transparent pricing and trusted hosts.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ghaziabad</h3>
                <p className="text-gray-600">Verified properties in Ghaziabad offering convenient access to Delhi NCR with great value.</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">XpressBnB</h3>
                <p className="text-gray-600">India's Smarter Stay — Verified accommodations at the best prices in Delhi NCR with no commissions.</p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-4">Quick Links</h4>
                <ul className="space-y-2 text-gray-600">
                  <li><button onClick={() => setShowAbout(true)} className="hover:text-[#50C878] transition-colors">About Us</button></li>
                  <li><button onClick={() => setShowBlog(true)} className="hover:text-[#50C878] transition-colors">Blog</button></li>
                  <li><a href="mailto:support@xpressbnb.com" className="hover:text-[#50C878] transition-colors">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-4">Locations</h4>
                <ul className="space-y-2 text-gray-600">
                  <li>Delhi</li>
                  <li>Gurgaon</li>
                  <li>Noida</li>
                  <li>Greater Noida</li>
                  <li>Ghaziabad</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-4">Services</h4>
                <ul className="space-y-2 text-gray-600">
                  <li>Verified Properties</li>
                  <li>No Commission Booking</li>
                  <li>Best Price Guarantee</li>
                  <li>Trusted Hosts</li>
                </ul>
              </div>
            </div>
            <div className="text-center pt-8 border-t border-gray-200">
              <p className="text-gray-500 text-sm">
                © 2025 XpressBnB. All rights reserved. | India's Smarter Stay — Verified Properties in Delhi NCR
              </p>
            </div>
          </div>
        </footer>
      </div>

      <PricingPopup />
    </div>
  );
}
