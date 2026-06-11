import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HERO_IMAGE_URL } from './HeroComponents';

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Elegant loading mock sequence that feels organic and fast
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Organic pacing
        const remaining = 100 - prev;
        const step = Math.max(2, Math.floor(Math.random() * remaining * 0.25 + 1));
        return prev + step;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      // Elegant exit delay for maximum premium feeling
      const timeout = setTimeout(() => {
        onComplete();
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [progress, onComplete]);

  return (
    <div 
      id="splash-root" 
      className="fixed inset-0 z-[9999] flex flex-col justify-between items-center bg-[#050c07] text-[#f8fafc] w-full h-full overflow-hidden select-none font-sans"
    >
      {/* Premium Stadium Light Beam Vignette / Glowing Accents */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#fabd00]/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-1/4 w-[400px] h-[400px] bg-[#006d34]/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute right-[-10%] top-1/3 w-[300px] h-[300px] bg-[#006d34]/15 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Decorative Golden Fine Grid Pattern overlay for stadium seat vibe */}
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(250,189,0,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(250,189,0,0.3)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      {/* Top Brand Tag */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 0.8, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="pt-12 text-center z-10"
      >
        <span className="text-[10px] sm:text-xs font-mono font-black tracking-[0.3em] text-[#fabd00] uppercase">
          COPA DO MUNDO • FIFA 2026
        </span>
      </motion.div>

      {/* Central Brand Frame */}
      <div className="relative flex-1 flex flex-col items-center justify-center w-full max-w-md px-6 z-10">
        
        {/* Rounded Diamond Shield incorporating parts of our Corrected Hero Image with premium lens effect */}
        <div className="relative w-64 h-64 md:w-72 md:h-72 p-1.5 bg-gradient-to-b from-[#fabd00] via-[#006d34] to-[#050c07] rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,109,52,0.35)] border border-[#fabd00]/30 mb-8 aspect-square">
          <div className="absolute inset-0 bg-[#090d16] rounded-[22px] overflow-hidden">
            
            {/* Extremely soft, continuous image scale simulating a high-end cinematic opening */}
            <motion.img 
              src={HERO_IMAGE_URL} 
              alt="Heldin's Bet 2026 Official Logo Asset" 
              initial={{ scale: 1.15, opacity: 0 }}
              animate={{ scale: 1.02, opacity: 0.95 }}
              transition={{ duration: 3, ease: "easeOut" }}
              className="w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050c07]/90 via-[#050c07]/45 to-[#050c07]/10" />
            
            {/* Inner Golden Overlay Details */}
            <div className="absolute inset-0 flex flex-col justify-end items-center pb-4">
              <span className="text-[9px] tracking-[0.25em] text-[#fabd00]/90 font-mono font-bold uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                ARENA OFICIAL
              </span>
            </div>
          </div>
        </div>

        {/* Logo Text with High-End Presentation */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-center space-y-2"
        >
          <h1 className="relative inline-block font-sans font-black text-3xl sm:text-4xl tracking-[0.08em] uppercase text-white leading-none">
            HELDIN'S <span className="text-[#fabd00] bg-gradient-to-r from-[#fabd00] to-[#ffd700] bg-clip-text text-transparent">BET</span>
            <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#fabd00] to-transparent shrink-0 opacity-70" />
          </h1>
          <p className="font-sans font-extrabold text-[13px] sm:text-sm text-slate-300 tracking-[0.14em] uppercase pt-1">
            Mundo inteiro no seu palpite
          </p>
        </motion.div>
      </div>

      {/* Bottom Loading Progress Status */}
      <div className="w-full max-w-xs px-6 pb-16 z-10 flex flex-col gap-3.5 items-center">
        {/* Clean, narrow golden linear progress bar */}
        <div className="relative w-full h-1.5 bg-slate-900/80 border border-[#fabd00]/10 rounded-full overflow-hidden shadow-inner">
          <motion.div 
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeInOut", duration: 0.15 }}
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#006d34] via-[#fabd00] to-[#ffd700] rounded-full shadow-[0_0_8px_rgba(250,189,0,0.6)]"
          />
        </div>
        
        {/* Loading text reflecting real actions */}
        <motion.span 
          key={progress < 40 ? 'pred' : progress < 75 ? 'pools' : 'ready'}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 0.8, y: 0 }}
          className="text-[10px] font-mono tracking-widest text-[#fabd00] uppercase font-bold text-center block"
        >
          {progress < 40 ? 'Conectando estádios...' : progress < 75 ? 'Atualizando odds e palpites...' : 'Pronto para o jogo!'}
        </motion.span>
      </div>
    </div>
  );
}
