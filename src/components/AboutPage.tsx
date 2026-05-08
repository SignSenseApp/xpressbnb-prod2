import { X, Clock, Calendar, Star, Mail, HelpCircle } from 'lucide-react';

interface AboutPageProps {
  onClose: () => void;
}

export default function AboutPage({ onClose }: AboutPageProps) {
  const faqs = [
    {
      question: 'What is the difference between Full Day and Half Day booking?',
      answer: 'Full Day booking gives you 24-hour access to the property, while Half Day booking provides 12-hour access with two time slots: Morning (11 AM - 6:30 PM) or Evening (7:30 PM - 10 AM next day).'
    },
    {
      question: 'Can I check in early or check out late?',
      answer: 'Check-in and check-out times are fixed as per your booking type. For special requests, please contact the property owner or our support team before your booking.'
    },
    {
      question: 'How do I make a booking?',
      answer: 'Browse available properties, select your preferred one, choose your booking type (Full Day or Half Day), select your dates, and complete the booking form with your details.'
    },
    {
      question: 'Is there a cancellation policy?',
      answer: 'Cancellation policies vary by property. Please review the specific property\'s cancellation terms before confirming your booking.'
    },
    {
      question: 'How do I contact customer support?',
      answer: 'You can email us at support@xpressbnb.com and our team will respond to your inquiry as soon as possible.'
    },
    {
      question: 'Are the properties verified?',
      answer: 'Yes, all properties listed on XpressBnB are verified by our team to ensure quality and safety standards.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div className="min-h-screen flex flex-col">
        <div className="sticky top-0 bg-gradient-to-r from-[#50C878] to-[#3dae68] text-white px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex justify-between items-center z-10 shadow-lg">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">About XpressBnB</h2>
            <p className="text-white/90 mt-1 text-sm sm:text-base">Your flexible stay partner</p>
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
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
              <section className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-900">Welcome to XpressBnB</h3>
                <p className="text-gray-700 leading-relaxed">
                  XpressBnB is your trusted platform for flexible short-term property rentals.
                  We understand that modern travelers and professionals need accommodation that
                  fits their schedule, not the other way around. That's why we offer both full-day
                  and half-day booking options across premium properties in Noida and Greater Noida.
                </p>
              </section>

              <section className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-[#50C878]" />
                  How Our Booking System Works
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900">Full Day Booking</h4>
                    </div>
                    <ul className="space-y-3 text-gray-700">
                      <li className="flex items-start gap-2">
                        <Star className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Duration:</strong> 24 hours of access</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Star className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Check-in:</strong> Anytime on your selected date</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Star className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Check-out:</strong> Same time next day</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Star className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Perfect for:</strong> Overnight stays, full-day events, extended visits</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border-2 border-purple-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-[#3dae68] rounded-xl flex items-center justify-center">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900">Half Day Booking</h4>
                    </div>
                    <ul className="space-y-3 text-gray-700">
                      <li className="flex items-start gap-2">
                        <Star className="w-5 h-5 text-[#3dae68] flex-shrink-0 mt-0.5" />
                        <span><strong>Duration:</strong> 12 hours of access</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Star className="w-5 h-5 text-[#3dae68] flex-shrink-0 mt-0.5" />
                        <span><strong>Morning Slot:</strong> 11:00 AM - 6:30 PM</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Star className="w-5 h-5 text-[#3dae68] flex-shrink-0 mt-0.5" />
                        <span><strong>Evening Slot:</strong> 7:30 PM - 10:00 AM (next day)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Star className="w-5 h-5 text-[#3dae68] flex-shrink-0 mt-0.5" />
                        <span><strong>Perfect for:</strong> Day meetings, short stays, budget-friendly options</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
                  <p className="text-gray-700 flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Pro Tip:</strong> Half-day bookings are ideal for business travelers,
                      day-use requirements, or when you need a space for just a few hours. Full-day
                      bookings offer the best value for overnight stays and extended events.
                    </span>
                  </p>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <HelpCircle className="w-6 h-6 text-[#50C878]" />
                  Frequently Asked Questions
                </h3>

                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <details
                      key={index}
                      className="group bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <summary className="font-semibold text-gray-900 flex items-start gap-3 list-none">
                        <HelpCircle className="w-5 h-5 text-[#50C878] flex-shrink-0 mt-0.5" />
                        <span className="flex-1">{faq.question}</span>
                      </summary>
                      <p className="mt-4 text-gray-700 pl-8 leading-relaxed">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>

              <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Need More Help?</h3>
                <p className="text-gray-700 mb-6">
                  Our customer support team is here to assist you. Email us for any inquiries and we'll get back to you as soon as possible.
                </p>

                <a
                  href="mailto:support@xpressbnb.com"
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#50C878] to-[#3dae68] text-white font-semibold rounded-xl hover:from-[#3dae68] hover:to-[#3dae68] transition-all shadow-lg hover:shadow-xl"
                >
                  <Mail className="w-5 h-5" />
                  Email Us
                </a>

                <p className="text-sm text-gray-600 mt-4 text-center">
                  Email: <strong>support@xpressbnb.com</strong>
                </p>
              </section>

              <div className="pt-6 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="w-full px-6 py-4 bg-gradient-to-r from-[#50C878] to-[#3dae68] text-white font-semibold rounded-xl hover:from-[#3dae68] hover:to-[#3dae68] transition-all shadow-lg"
                >
                  Back to Properties
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
