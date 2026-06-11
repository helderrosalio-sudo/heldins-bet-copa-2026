/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Profile } from '../types';
import { HeroContainer, HeroImage, HeroOverlay } from './HeroComponents';
import heroImageLocal from '../assets/images/hero_image_local.png';

interface PosterScreenProps {
  onLoginSuccess: () => void;
}

export default function PosterScreen({ onLoginSuccess }: PosterScreenProps) {
  const [entering, setEntering] = useState(false);

  const handleEnterGame = () => {
    setEntering(true);
    
    // Beautiful delay for high-end feel before entrance
    setTimeout(() => {
      onLoginSuccess();
    }, 1000);
  };

  return (
    <div id="poster-root" className="relative flex flex-col justify-between items-center bg-[#090d16] text-[#f8fafc] min-h-screen w-full overflow-hidden font-sans select-none pb-28">
      
      {/* Decorative Lights & Glow effects themed around Brazil Colors */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#006d34]/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#004d25]/35 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#fabd00]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Premium Header */}
      <header className="relative w-full z-10 px-6 py-4 flex justify-between items-center bg-[#090d16]/80 backdrop-blur-md border-b-2 border-[#fabd00]/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#006d34] to-[#fabd00] p-[1.5px]">
            <div className="w-full h-full bg-[#090d16] rounded-[6px] flex items-center justify-center font-display-lg font-extrabold text-sm text-[#fabd00]">
              H
            </div>
          </div>
          <div className="text-left">
            <span className="block font-display-lg font-extrabold text-sm text-white tracking-widest leading-none">
              HELDIN'S BET
            </span>
            <span className="text-[10px] tracking-widest text-[#fabd00] font-mono font-bold uppercase mt-0.5 block">
              COPA DO MUNDO 2026
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-mono tracking-widest text-emerald-400 font-black uppercase">PREPARADO PARA O JOGO</span>
        </div>
      </header>

      {/* Main Content Areas */}
      <main className="relative flex-1 flex flex-col items-center justify-center w-full max-w-sm px-4 mt-6 mb-24 space-y-5">
        
        {/* Poster Wrapper with Beautiful Frame */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full"
        >
          <HeroContainer>
            <HeroImage src={heroImageLocal} alt="Heldin's Bet 2026 Official Poster Image" />
            <HeroOverlay />
            
            {/* Corner Badges */}
            <div className="absolute top-3 left-3 bg-[#006d34] text-white text-[9px] font-mono font-black py-1 px-2.5 rounded-full border border-[#fabd00]/30 shadow-md z-15">
              BRASIL 🇧🇷
            </div>
          </HeroContainer>
        </motion.div>

        {/* Short Text Description */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center bg-[#090d16]/40 backdrop-blur-sm border border-[#fabd00]/10 rounded-2xl p-3 w-full"
        >
          <p className="text-sm font-bold text-slate-200 tracking-wide">
            "Mundo inteiro no seu palpite"
          </p>
          <span className="text-[10px] tracking-wider text-[#fabd00] font-mono font-semibold uppercase mt-0.5 block">
            Arena de Apostas Oficial
          </span>
        </motion.div>

      </main>

      {/* --- BOTÃO DESTAQUE PRINCIPAL: "ENTRE NESSE JOGO" WITH PREPARED MICRO-ANIMATION --- */}
      <div className="fixed bottom-0 left-0 w-full p-5 flex flex-col items-center z-50 bg-gradient-to-t from-[#090d16] via-[#090d16]/95 to-transparent pb-6">
        <motion.button 
          id="btn-entre-nesse-jogo"
          onClick={handleEnterGame}
          disabled={entering}
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          className="group relative w-full sm:w-auto max-w-sm px-16 py-4.5 rounded-full text-white font-sans font-black text-base tracking-[0.14em] transition-all uppercase shadow-2xl flex items-center justify-center gap-3 border-2 border-[#fabd00] bg-gradient-to-r from-[#006d34] to-[#005a2b] shadow-emerald-990/30 hover:shadow-[#fabd00]/15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)', backgroundColor: '#006d34' }}
        >
          {entering ? (
            <span className="flex items-center gap-2.5">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>CONECTANDO ARENA...</span>
            </span>
          ) : (
            <>
              <span>ENTRE NESSE JOGO</span>
              {/* Prepare anim ball element */}
              <div className="relative w-6 h-6 flex items-center justify-center bg-[#fabd00] rounded-full text-slate-900 text-xs group-hover:rotate-[360deg] transition-transform duration-700 ease-out shadow-inner">
                ⚽
              </div>
            </>
          )}
          {/* Elegant active outer glow pulse */}
          <span className="absolute -inset-1 rounded-full border-2 border-[#fabd00] opacity-10 animate-pulse pointer-events-none" />
        </motion.button>

        {/* Small Premium Footer */}
        <span className="text-[10px] font-mono tracking-[0.2em] text-[#fabd00]/60 uppercase mt-4 block">
          Copa do Mundo 2026
        </span>
      </div>
    </div>
  );
}
