"use client"

interface HotnessEffectProps {
  type: 'ice' | 'warm' | 'fire' | 'lightning' | 'none'
  glowColor: string
  particleColor: string
}

export function HotnessEffect({ type, glowColor }: HotnessEffectProps) {
  if (type === 'none') return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10 rounded-2xl">
      {type === 'ice' && <IceBackground glowColor={glowColor} />}
      {type === 'warm' && <WarmBackground glowColor={glowColor} />}
      {type === 'fire' && <FireBackground glowColor={glowColor} />}
      {type === 'lightning' && <LightningBackground glowColor={glowColor} />}
    </div>
  )
}

function IceBackground({ glowColor }: { glowColor: string }) {
  return (
    // Using Aceternity-style animated gradient orbs with grid
    <div
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(circle at 20% 30%, ${glowColor}25 0%, transparent 25%),
          radial-gradient(circle at 80% 70%, rgba(0,217,255,0.15) 0%, transparent 25%),
          radial-gradient(circle at 50% 50%, rgba(0,217,255,0.08) 0%, transparent 50%),
          linear-gradient(180deg, rgba(0,217,255,0.03) 0%, transparent 50%)
        `,
      }}
    >
      {/* Animated orbs like BackgroundGradientAnimation */}
      <div
        className="absolute w-64 h-64 rounded-full animate-[moveInCircle_20s_linear_infinite]"
        style={{
          background: `radial-gradient(circle, ${glowColor}40 0%, transparent 70%)`,
          top: '-20%',
          left: '-10%',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute w-48 h-48 rounded-full animate-[moveInCircle_30s_reverse_infinite]"
        style={{
          background: `radial-gradient(circle, rgba(0,200,255,0.3) 0%, transparent 70%)`,
          top: '40%',
          right: '-15%',
          filter: 'blur(30px)',
        }}
      />
      <div
        className="absolute w-32 h-32 rounded-full animate-[moveVertical_25s_ease_infinite]"
        style={{
          background: `radial-gradient(circle, rgba(180,240,255,0.25) 0%, transparent 70%)`,
          bottom: '10%',
          left: '30%',
          filter: 'blur(20px)',
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(${glowColor}20 1px, transparent 1px),
            linear-gradient(90deg, ${glowColor}20 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <style>{`
        @keyframes moveInCircle {
          0% { transform: rotate(0deg) translateX(30px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(30px) rotate(-360deg); }
        }
        @keyframes moveVertical {
          0% { transform: translateY(-30px); }
          50% { transform: translateY(30px); }
          100% { transform: translateY(-30px); }
        }
      `}</style>
    </div>
  )
}

function WarmBackground({ glowColor: _glowColor }: { glowColor: string }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(ellipse 60% 50% at 50% 60%, rgba(255,180,50,0.2) 0%, transparent 60%),
          radial-gradient(ellipse 40% 40% at 30% 70%, rgba(255,200,100,0.12) 0%, transparent 50%),
          radial-gradient(ellipse 30% 30% at 70% 40%, rgba(255,150,50,0.08) 0%, transparent 45%)
        `,
      }}
    >
      {/* Gentle floating orbs */}
      <div
        className="absolute w-40 h-40 rounded-full animate-[moveHorizontal_20s_ease_infinite]"
        style={{
          background: `radial-gradient(circle, rgba(255,180,50,0.35) 0%, transparent 70%)`,
          top: '20%',
          left: '-10%',
          filter: 'blur(30px)',
        }}
      />
      <div
        className="absolute w-32 h-32 rounded-full animate-[moveHorizontal_25s_reverse_ease_infinite]"
        style={{
          background: `radial-gradient(circle, rgba(255,200,100,0.28) 0%, transparent 70%)`,
          bottom: '20%',
          right: '-5%',
          filter: 'blur(25px)',
        }}
      />

      {/* Soft glow dots */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,200,100,0.4) 1px, transparent 1px),
                           radial-gradient(circle at 75% 75%, rgba(255,180,50,0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      <style>{`
        @keyframes moveHorizontal {
          0% { transform: translateX(-30px) translateY(-10px); }
          50% { transform: translateX(30px) translateY(10px); }
          100% { transform: translateX(-30px) translateY(-10px); }
        }
      `}</style>
    </div>
  )
}

function FireBackground({ glowColor: _glowColor }: { glowColor: string }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(ellipse 80% 60% at 50% 100%, rgba(255,80,0,0.25) 0%, transparent 50%),
          radial-gradient(ellipse 60% 50% at 50% 85%, rgba(255,120,0,0.18) 0%, transparent 45%),
          radial-gradient(ellipse 50% 40% at 50% 70%, rgba(255,160,0,0.12) 0%, transparent 40%),
          radial-gradient(ellipse 40% 30% at 50% 55%, rgba(255,200,0,0.08) 0%, transparent 35%)
        `,
      }}
    >
      {/* Intense rising orbs - like flames */}
      <div
        className="absolute w-48 h-64 rounded-full animate-[moveVertical_4s_ease-in-out_infinite]"
        style={{
          background: `radial-gradient(ellipse at 50% 80%, rgba(255,80,0,0.4) 0%, rgba(255,100,0,0.2) 40%, transparent 70%)`,
          bottom: '0%',
          left: '30%',
          filter: 'blur(20px)',
          transform: 'translateX(-50%)',
        }}
      />
      <div
        className="absolute w-40 h-56 rounded-full animate-[moveVertical_5s_ease-in-out_infinite]"
        style={{
          background: `radial-gradient(ellipse at 50% 80%, rgba(255,100,0,0.35) 0%, rgba(255,140,0,0.15) 40%, transparent 70%)`,
          bottom: '0%',
          left: '70%',
          filter: 'blur(25px)',
          transform: 'translateX(-50%)',
          animationDelay: '1s',
        }}
      />
      <div
        className="absolute w-32 h-48 rounded-full animate-[moveVertical_6s_ease-in-out_infinite]"
        style={{
          background: `radial-gradient(ellipse at 50% 80%, rgba(255,60,0,0.3) 0%, rgba(255,100,0,0.1) 40%, transparent 70%)`,
          bottom: '0%',
          left: '50%',
          filter: 'blur(30px)',
          transform: 'translateX(-50%)',
          animationDelay: '2s',
        }}
      />

      {/* Ember particles */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 70%, rgba(255,200,0,0.6) 1px, transparent 1px),
            radial-gradient(circle at 35% 65%, rgba(255,150,0,0.5) 1px, transparent 1px),
            radial-gradient(circle at 50% 75%, rgba(255,180,0,0.55) 1px, transparent 1px),
            radial-gradient(circle at 65% 68%, rgba(255,200,50,0.5) 1px, transparent 1px),
            radial-gradient(circle at 80% 72%, rgba(255,160,0,0.6) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%',
          animation: 'emberFloat 3s ease-out infinite',
        }}
      />

      <style>{`
        @keyframes moveVertical {
          0%, 100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 0.7; }
          50% { transform: translateX(-50%) translateY(-20px) scale(1.05); opacity: 1; }
        }
        @keyframes emberFloat {
          0% { background-position: 0 0, 0 0, 0 0, 0 0, 0 0; opacity: 0; }
          20% { opacity: 0.6; }
          100% { background-position: 0 -150px, 0 -180px, 0 -160px, 0 -170px, 0 -140px; opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function LightningBackground({ glowColor }: { glowColor: string }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(ellipse 80% 60% at 50% 50%, ${glowColor}25 0%, transparent 50%),
          radial-gradient(ellipse 100% 40% at 20% 20%, rgba(255,0,128,0.1) 0%, transparent 40%),
          radial-gradient(ellipse 90% 40% at 80% 80%, rgba(0,255,200,0.08) 0%, transparent 40%)
        `,
      }}
    >
      {/* Multiple animated orbs with different speeds - cyber effect */}
      <div
        className="absolute w-56 h-56 rounded-full animate-[moveInCircle_15s_linear_infinite]"
        style={{
          background: `radial-gradient(circle, ${glowColor}50 0%, transparent 70%)`,
          top: '-25%',
          left: '-20%',
          filter: 'blur(50px)',
        }}
      />
      <div
        className="absolute w-44 h-44 rounded-full animate-[moveInCircle_20s_reverse_infinite]"
        style={{
          background: `radial-gradient(circle, rgba(255,0,128,0.35) 0%, transparent 70%)`,
          bottom: '-20%',
          right: '-15%',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute w-36 h-36 rounded-full animate-[moveVertical_18s_ease_infinite]"
        style={{
          background: `radial-gradient(circle, rgba(0,255,200,0.25) 0%, transparent 70%)`,
          top: '30%',
          left: '60%',
          filter: 'blur(35px)',
        }}
      />
      <div
        className="absolute w-28 h-28 rounded-full animate-[moveHorizontal_12s_ease_infinite]"
        style={{
          background: `radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)`,
          top: '10%',
          right: '20%',
          filter: 'blur(25px)',
        }}
      />

      {/* Circuit grid pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 49.5%, ${glowColor}30 49.5%, ${glowColor}30 50.5%, transparent 50.5%),
            linear-gradient(0deg, transparent 49.5%, ${glowColor}25 49.5%, ${glowColor}25 50.5%, transparent 50.5%)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Node points */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.6) 1.5px, transparent 1.5px),
                           radial-gradient(circle at 75% 25%, rgba(255,255,255,0.5) 1.5px, transparent 1.5px),
                           radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 2px, transparent 2px),
                           radial-gradient(circle at 25% 75%, rgba(255,255,255,0.5) 1.5px, transparent 1.5px),
                           radial-gradient(circle at 75% 75%, rgba(255,255,255,0.6) 1.5px, transparent 1.5px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <style>{`
        @keyframes moveInCircle {
          0% { transform: rotate(0deg) translateX(40px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(40px) rotate(-360deg); }
        }
        @keyframes moveVertical {
          0% { transform: translateY(-40px); }
          50% { transform: translateY(40px); }
          100% { transform: translateY(-40px); }
        }
        @keyframes moveHorizontal {
          0% { transform: translateX(-30px) translateY(-15px); }
          50% { transform: translateX(30px) translateY(15px); }
          100% { transform: translateX(-30px) translateY(-15px); }
        }
      `}</style>
    </div>
  )
}
