import { X, MapPin, Clock, Shield, Home, Sparkles, TrendingUp, MessageCircle, Mail } from 'lucide-react';

interface BlogPageProps {
  onClose: () => void;
}

export default function BlogPage({ onClose }: BlogPageProps) {
  const whatsappLink = 'https://wa.me/message/NA2UB7SED5B3G1';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div className="min-h-screen flex flex-col">
        <div className="sticky top-0 bg-gradient-to-r from-[#cc2b5e] to-[#753a88] text-white px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex justify-between items-center z-10 shadow-lg">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">XpressBnB Blog</h2>
            <p className="text-white/90 mt-1 text-sm sm:text-base">Stay Smart with XpressBnB.com</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex-1 flex items-start justify-center p-4">
          <article className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl my-8">
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
              <header className="space-y-4 border-b border-gray-200 pb-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
                  Couple Friendly Hourly Stays in Delhi NCR - Safe & Private Short-Term Rentals
                </h1>
                <p className="text-lg text-gray-600">
                  Discover Safe, Couple-Friendly Properties for Hourly Booking in Delhi, Gurgaon, Noida, Greater Noida & Ghaziabad
                </p>
              </header>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-[#cc2b5e]">
                  <Home className="w-6 h-6" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Couple Friendly Hourly Stays in Delhi NCR - Your Safe & Private Partner
                  </h2>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Looking for <strong>couple friendly stays in Delhi NCR</strong>? Need a <strong>safe, private hourly booking</strong> for couples?
                  At <strong>XpressBnB.com</strong>, we specialize in <strong>couple safe stays</strong> with verified properties that respect your privacy.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Whether you need an <strong>hourly hotel in Delhi</strong>, a <strong>couple-friendly stay in Gurgaon</strong>, or
                  a <strong>private accommodation in Noida</strong> — our platform connects you with verified hosts offering safe,
                  comfortable properties available for hourly, daily, or weekly stays.
                </p>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 text-[#cc2b5e]">
                  <MapPin className="w-6 h-6" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Top Locations for Couple Friendly Hourly Stays in Delhi NCR
                  </h2>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Delhi NCR offers endless possibilities for couples seeking safe, private accommodations.
                  Here are the most popular areas for <strong>couple friendly hourly stays</strong> and safe properties:
                </p>

                <div className="grid gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      1. Delhi - Couple Friendly Hourly Hotels
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      Find the best <strong>couple friendly stays in Delhi</strong> with verified properties. Our
                      <strong> hourly hotels in Delhi</strong> offer complete privacy and security, perfect for couples seeking
                      safe accommodations in the capital city.
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border-2 border-purple-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-[#753a88]" />
                      2. Gurgaon – Premium Couple Safe Stays
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      Looking for <strong>couple friendly hotels in Gurgaon</strong>? This corporate hub offers
                      high-end <strong>couple safe stays</strong> with modern amenities, perfect privacy, and flexible
                      hourly booking options near major business districts.
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-green-600" />
                      3. Noida – Safe Private Hourly Stays
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      Discover <strong>hourly booking options in Noida</strong> for couples. We offer
                      <strong> couple friendly stays near Sector 18, 62, and Supernova</strong> with complete privacy,
                      security, and verified hosts — perfect for safe, short-term stays.
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 border-2 border-amber-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-amber-600" />
                      4. Greater Noida – Affordable Couple Accommodations
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      Find affordable <strong>couple safe stays in Greater Noida</strong> with spacious properties and
                      peaceful neighborhoods. Perfect for couples seeking privacy and comfort with flexible hourly booking options.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 text-[#cc2b5e]">
                  <Sparkles className="w-6 h-6" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Why Guests Love Short-Term Rentals with XpressBnB
                  </h2>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  At <strong>XpressBnB.com</strong>, we understand that every stay is unique. That's why we offer
                  flexible booking options — whether it's for a few hours, a day, or a week.
                </p>
                <p className="text-gray-700 leading-relaxed font-semibold">
                  Here's why guests love staying with us:
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                    <Shield className="w-5 h-5 text-[#cc2b5e] flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Fully Furnished Rentals</h4>
                      <p className="text-sm text-gray-600">Move in with zero hassle</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                    <Shield className="w-5 h-5 text-[#cc2b5e] flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Verified Hosts</h4>
                      <p className="text-sm text-gray-600">Every property is approved by our team</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                    <Clock className="w-5 h-5 text-[#cc2b5e] flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Flexible Time Slots</h4>
                      <p className="text-sm text-gray-600">Book for half-day or full-day — you decide</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                    <MapPin className="w-5 h-5 text-[#cc2b5e] flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Prime Locations</h4>
                      <p className="text-sm text-gray-600">Near metros, IT hubs, and shopping centers</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                    <TrendingUp className="w-5 h-5 text-[#cc2b5e] flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Affordable Pricing</h4>
                      <p className="text-sm text-gray-600">Save up to 40% compared to hotels</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                    <Home className="w-5 h-5 text-[#cc2b5e] flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900">No Sign-In Listing</h4>
                      <p className="text-sm text-gray-600">Property owners can list easily</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Perfect for All Types of Stays</h2>
                <p className="text-gray-700 mb-4">XpressBnB offers perfect short-term solutions for:</p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-[#cc2b5e] font-bold">•</span>
                    <span>Corporate travelers attending meetings in Noida</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#cc2b5e] font-bold">•</span>
                    <span>Families on vacation exploring Delhi NCR</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#cc2b5e] font-bold">•</span>
                    <span>Event visitors attending expos in Greater Noida</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#cc2b5e] font-bold">•</span>
                    <span>Students or interns seeking affordable short-term homes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#cc2b5e] font-bold">•</span>
                    <span>Digital nomads looking for peaceful stays with Wi-Fi and workspace</span>
                  </li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Book Your Stay in Minutes — Simple & Fast!
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  With <strong>XpressBnB.com</strong>, you can browse listings, choose your time slot (half-day, full-day,
                  or multi-day), and send a booking request instantly.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Our admin dashboard ensures every property is verified, and booking enquiries are managed quickly —
                  giving you a safe and reliable experience.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Experience Noida & Greater Noida Like a Local
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  From IT parks and corporate zones to cafes, malls, and green parks, Noida and Greater Noida have
                  something for everyone. Staying at a short-term rental gives you the freedom and flexibility that
                  hotels simply can't match.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Whether you're booking a studio near Sector 62, a flat in Supernova Sector 94, or a villa in Greater Noida,
                  you'll find the perfect home away from home — only on <strong>XpressBnB.com</strong>.
                </p>
              </section>

              <section className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Popular Searches (That Lead You Here)</h2>
                <p className="text-gray-700 mb-4">Many couples find XpressBnB.com by searching for:</p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">•</span>
                    <span>"Couple friendly stays Delhi NCR"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">•</span>
                    <span>"Couple safe stays Delhi"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">•</span>
                    <span>"Hourly stays for couples"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">•</span>
                    <span>"Hourly hotels Delhi"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">•</span>
                    <span>"Couple friendly hotels Gurgaon"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">•</span>
                    <span>"Private stays for couples Noida"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">•</span>
                    <span>"Hourly booking Noida"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">•</span>
                    <span>"Safe couple accommodation Delhi NCR"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">•</span>
                    <span>"Couple hotels Greater Noida"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">•</span>
                    <span>"Short stay for couples Delhi"</span>
                  </div>
                </div>
                <p className="text-gray-700 mt-4 font-semibold">
                  If you searched for any of these — congratulations! You've found the most trusted platform for couple-friendly stays in Delhi NCR.
                </p>
              </section>

              <section className="bg-gradient-to-r from-[#cc2b5e] to-[#753a88] rounded-2xl p-6 text-white">
                <h2 className="text-2xl font-bold mb-4">Find Your Perfect Stay Today at XpressBnB.com</h2>
                <p className="leading-relaxed mb-4">
                  Whether it's a weekend trip, business visit, or long-term project stay, your next comfortable home
                  is just a click away. Visit <strong>XpressBnB.com</strong> and book your verified short-term rental
                  in Noida or Greater Noida today.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">Final Thoughts</h2>
                <p className="text-gray-700 leading-relaxed">
                  Short-term rentals are the future of flexible living — offering freedom, comfort, and affordability
                  for modern travelers. At <strong>XpressBnB</strong>, we're redefining short stays in Noida and Greater Noida,
                  one verified home at a time.
                </p>
              </section>

              <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Ready to Book or List Your Property?</h2>

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp Support
                  </a>

                  <a
                    href="mailto:support@xpressbnb.com"
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#cc2b5e] to-[#753a88] text-white font-semibold rounded-xl hover:from-[#d64371] hover:to-[#8a4b9e] transition-all shadow-lg hover:shadow-xl"
                  >
                    <Mail className="w-5 h-5" />
                    Email Us
                  </a>
                </div>

                <div className="text-sm text-gray-700 space-y-2">
                  <p><strong>Website:</strong> www.XpressBnB.com</p>
                  <p><strong>Email:</strong> support@xpressbnb.com</p>
                  <p><strong>Service Areas:</strong> Noida | Greater Noida | Noida Extension | Delhi NCR</p>
                </div>
              </section>

              <div className="pt-6 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="w-full px-6 py-4 bg-gradient-to-r from-[#cc2b5e] to-[#753a88] text-white font-semibold rounded-xl hover:from-[#d64371] hover:to-[#8a4b9e] transition-all shadow-lg"
                >
                  Back to Properties
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
