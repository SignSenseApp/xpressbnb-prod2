import { useEffect, useState } from 'react';

export default function AnimatedLogo() {
  const [isLoaded, setIsLoaded] = useState(false);
  const logoText = 'XpressBnB';
  const letters = logoText.split('');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="animated-logo-container" aria-label="XpressBnB Home">
      <h1 className="animated-logo">
        <span className={`logo-home-icon ${isLoaded ? 'loaded' : ''}`} style={{ transitionDelay: '0ms' }}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="home-svg">
            <defs>
              <linearGradient id="homeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#50C878"/>
                <stop offset="100%" stopColor="#22c55e"/>
              </linearGradient>
            </defs>
            <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" stroke="url(#homeGrad)" strokeWidth="2" strokeLinejoin="round" fill="url(#homeGrad)" fillOpacity="0.15"/>
            <path d="M12 3L3 12V21H9V15H15V21H21V12L12 3Z" stroke="url(#homeGrad)" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
        </span>
        {letters.map((letter, index) => (
          <span
            key={index}
            className={`animated-letter ${isLoaded ? 'loaded' : ''}`}
            style={{
              animationDelay: `${index * 100}ms`,
              transitionDelay: `${index * 100}ms`,
            }}
          >
            {letter}
          </span>
        ))}
      </h1>
      <style>{`
        .animated-logo-container {
          perspective: 1000px;
          perspective-origin: center;
        }

        .animated-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          font-size: 2.25rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          transform-style: preserve-3d;
          will-change: transform;
        }

        .logo-home-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: 6px;
          opacity: 0;
          transform: rotateY(-90deg) scale(0.8);
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .logo-home-icon.loaded {
          opacity: 1;
          transform: rotateY(0deg) scale(1);
          animation: float 4s ease-in-out infinite;
        }

        .home-svg {
          width: 2rem;
          height: 2rem;
        }

        .animated-letter {
          display: inline-block;
          background: linear-gradient(135deg, #50C878 0%, #22c55e 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          transform-style: preserve-3d;
          transform-origin: center center;
          position: relative;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          opacity: 0;
          transform: rotateY(-90deg) translateZ(-20px) scale(0.8);
          will-change: transform, opacity;
        }

        .animated-letter::before {
          content: attr(data-letter);
          position: absolute;
          left: 0;
          top: 0;
          transform: translateZ(-2px);
          opacity: 0.1;
          background: linear-gradient(135deg, #50C878 0%, #22c55e 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .animated-letter.loaded {
          opacity: 1;
          transform: rotateY(0deg) translateZ(0px) scale(1);
          animation: float 4s ease-in-out infinite;
        }

        .animated-letter:hover {
          transform: translateZ(15px) scale(1.1);
          filter: drop-shadow(0 8px 16px rgba(204, 43, 94, 0.3));
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animated-logo:hover .animated-letter {
          animation-play-state: paused;
        }

        @keyframes float {
          0%, 100% {
            transform: rotateY(0deg) translateY(0px) translateZ(0px) rotateX(0deg);
          }
          25% {
            transform: rotateY(2deg) translateY(-3px) translateZ(5px) rotateX(-1deg);
          }
          50% {
            transform: rotateY(0deg) translateY(0px) translateZ(0px) rotateX(0deg);
          }
          75% {
            transform: rotateY(-2deg) translateY(3px) translateZ(5px) rotateX(1deg);
          }
        }

        .animated-letter:nth-child(even) {
          animation-delay: 0.5s;
        }

        .animated-letter:nth-child(odd) {
          animation-delay: 1s;
        }

        @media (prefers-reduced-motion: reduce) {
          .animated-letter {
            animation: none !important;
            transition: opacity 0.3s ease;
            transform: none !important;
            opacity: 0;
          }

          .animated-letter.loaded {
            opacity: 1;
            transform: none !important;
          }

          .animated-letter:hover {
            transform: none !important;
            filter: brightness(1.1);
          }
        }

        @media (max-width: 1024px) {
          .animated-logo {
            font-size: 2rem;
          }
          .home-svg {
            width: 1.875rem;
            height: 1.875rem;
          }
        }

        @media (max-width: 768px) {
          .animated-logo {
            font-size: 1.875rem;
          }
          .home-svg {
            width: 1.75rem;
            height: 1.75rem;
          }

          .animated-letter:hover {
            transform: translateZ(8px) scale(1.05);
          }

          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-2px);
            }
          }
        }

        @media (max-width: 640px) {
          .animated-logo {
            font-size: 1.75rem;
          }
          .home-svg {
            width: 1.625rem;
            height: 1.625rem;
          }
        }

        @media (max-width: 480px) {
          .animated-logo {
            font-size: 1.5rem;
          }
          .home-svg {
            width: 1.5rem;
            height: 1.5rem;
          }

          .animated-letter {
            letter-spacing: 0.4px;
          }
        }

        @media (max-width: 360px) {
          .animated-logo {
            font-size: 1.375rem;
          }
          .home-svg {
            width: 1.375rem;
            height: 1.375rem;
          }

          .animated-letter {
            letter-spacing: 0.3px;
          }
        }

        @media (hover: none) {
          .animated-letter:hover {
            transform: none;
            filter: none;
          }
        }
      `}</style>
    </div>
  );
}
