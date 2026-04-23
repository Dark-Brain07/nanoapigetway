'use client';
import { useState, useEffect } from 'react';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState(0);
  // Phase 0: Black screen
  // Phase 1: "BUILT ON" text fades in
  // Phase 2: Arc logo spins in with lightning
  // Phase 3: Screen flash (thunder)
  // Phase 4: Second flash
  // Phase 5: Final flash + fade out

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),      // "BUILT ON" appears
      setTimeout(() => setPhase(2), 1400),      // Logo spins in
      setTimeout(() => setPhase(3), 2600),      // First lightning flash
      setTimeout(() => setPhase(4), 2900),      // Second lightning flash
      setTimeout(() => setPhase(5), 3200),      // Third lightning flash
      setTimeout(() => setPhase(6), 3800),      // Fade out
      setTimeout(() => onFinish(), 4600),        // Done, remove splash
    ];
    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-700 ${
        phase >= 6 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ background: '#050a18' }}
    >
      {/* Lightning flash overlays */}
      {(phase === 3 || phase === 5) && (
        <div className="absolute inset-0 z-50 animate-flash-bright" />
      )}
      {phase === 4 && (
        <div className="absolute inset-0 z-50 animate-flash-dim" />
      )}

      {/* Electric particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {phase >= 2 && (
          <>
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-particle"
                style={{
                  width: `${Math.random() * 4 + 2}px`,
                  height: `${Math.random() * 4 + 2}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  background: i % 3 === 0 ? '#a855f7' : i % 3 === 1 ? '#3b82f6' : '#fff',
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${Math.random() * 1 + 0.5}s`,
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Lightning bolts SVG */}
      {phase >= 2 && (
        <div className="absolute inset-0 pointer-events-none z-30">
          <svg className="w-full h-full animate-bolt-left" viewBox="0 0 800 600" fill="none">
            <path
              d="M100 0 L180 180 L120 180 L200 350 L130 350 L250 600"
              stroke="url(#boltGrad1)"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#glow)"
              opacity="0.8"
            />
            <defs>
              <linearGradient id="boltGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>
          <svg className="absolute inset-0 w-full h-full animate-bolt-right" viewBox="0 0 800 600" fill="none">
            <path
              d="M700 0 L620 200 L680 200 L580 400 L650 400 L550 600"
              stroke="url(#boltGrad2)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#glow2)"
              opacity="0.7"
            />
            <defs>
              <linearGradient id="boltGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
              <filter id="glow2">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>
        </div>
      )}

      {/* "BUILT ON" text */}
      <div
        className={`text-center z-40 transition-all duration-700 ${
          phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        } ${phase >= 2 ? 'mb-2' : 'mb-0'}`}
      >
        <span
          className="text-sm sm:text-lg tracking-[0.5em] uppercase font-bold"
          style={{
            background: 'linear-gradient(90deg, #a855f7, #3b82f6, #ffffff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: 'none',
          }}
        >
          Built On
        </span>
      </div>

      {/* Arc logo - spins in */}
      <div
        className={`z-40 transition-all duration-1000 ease-out ${
          phase >= 2
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-0'
        }`}
        style={{
          animation: phase >= 2 && phase < 6 ? 'logoSpin 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards' : 'none',
          filter: phase >= 3 ? 'drop-shadow(0 0 40px rgba(168,85,247,0.8)) drop-shadow(0 0 80px rgba(59,130,246,0.5))' : 'drop-shadow(0 0 20px rgba(168,85,247,0.4))',
        }}
      >
        <img
          src="/ARC_C.png"
          alt="Arc"
          className="w-48 h-auto sm:w-64 select-none"
          style={{ imageRendering: 'auto' }}
          onError={(e) => {
            // Fallback: if arc_logo.png doesn't exist, use dev_wallet_logo.png
            (e.target as HTMLImageElement).src = '/dev_wallet_logo.png';
          }}
        />
      </div>

      {/* Radial glow behind logo */}
      {phase >= 2 && (
        <div
          className="absolute z-30 rounded-full animate-pulse-glow"
          style={{
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(59,130,246,0.08) 40%, transparent 70%)',
          }}
        />
      )}

      {/* Inline keyframe styles */}
      <style>{`
        @keyframes logoSpin {
          0% { transform: rotate(-720deg) scale(0); opacity: 0; }
          60% { transform: rotate(20deg) scale(1.1); opacity: 1; }
          80% { transform: rotate(-5deg) scale(0.95); }
          100% { transform: rotate(0deg) scale(1); opacity: 1; }
        }

        .animate-flash-bright {
          animation: flashBright 0.15s ease-out forwards;
        }
        @keyframes flashBright {
          0% { background: rgba(255,255,255,0.9); }
          100% { background: transparent; }
        }

        .animate-flash-dim {
          animation: flashDim 0.12s ease-out forwards;
        }
        @keyframes flashDim {
          0% { background: rgba(168,85,247,0.4); }
          100% { background: transparent; }
        }

        .animate-particle {
          animation: particleFly linear forwards;
        }
        @keyframes particleFly {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(2); }
          100% { opacity: 0; transform: scale(0) translateY(-100px); }
        }

        .animate-bolt-left {
          animation: boltFlicker 0.6s ease-in-out forwards;
        }
        @keyframes boltFlicker {
          0% { opacity: 0; }
          20% { opacity: 0.9; }
          40% { opacity: 0.2; }
          60% { opacity: 0.85; }
          80% { opacity: 0.1; }
          100% { opacity: 0; }
        }

        .animate-bolt-right {
          animation: boltFlicker 0.6s 0.15s ease-in-out forwards;
          opacity: 0;
        }

        .animate-pulse-glow {
          animation: pulseGlow 1.5s ease-in-out infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
