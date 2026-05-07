import { useState, useEffect } from 'react';
import { Info, X, CheckCircle } from 'lucide-react';

export default function PricingPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    setShouldRender(true);
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setShouldRender(false);
    }, 300);
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-[85%] md:w-[90%] max-w-md transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="bg-white rounded-2xl md:rounded-2xl rounded-xl overflow-hidden backdrop-blur-sm" style={{ border: '1px solid var(--xpx-border)', boxShadow: '0 20px 56px rgba(15,23,42,0.10)' }}>
        <div className="p-3 md:p-4" style={{ background: 'linear-gradient(135deg, #50C878 0%, #22c55e 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Info className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <h3 className="text-sm md:text-lg font-bold text-white">100% Transparent Pricing</h3>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="flex items-start gap-2 md:gap-3 mb-3 md:mb-4">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm md:text-base text-gray-700 leading-relaxed">
              All prices are <span className="font-semibold text-gray-900">final prices</span>.
            </p>
          </div>
          <div className="flex items-start gap-2 md:gap-3 mb-3 md:mb-4">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm md:text-base text-gray-700 leading-relaxed">
              No hidden fees.
            </p>
          </div>
          <div className="flex items-start gap-2 md:gap-3 mb-4 md:mb-6">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm md:text-base text-gray-700 leading-relaxed">
              No extra taxes.
            </p>
          </div>

          <button
            onClick={handleClose}
            className="w-full px-4 py-2.5 md:px-6 md:py-3 text-white text-sm md:text-base font-semibold rounded-lg md:rounded-xl transition-all"
            style={{ background: 'var(--accent)', boxShadow: '0 8px 24px rgba(80,200,120,0.32)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-dark)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
