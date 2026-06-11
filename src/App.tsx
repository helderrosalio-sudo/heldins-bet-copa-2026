/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Splash from './components/Splash';
import PosterScreen from './components/PosterScreen';
import DashboardScreen from './components/DashboardScreen';

const isSupabaseConfigured = !!(import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

function MainApp() {
  const { profile, loading, signOut } = useAuth();
  const [hasEntered, setHasEntered] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  const handleEnterGameGuest = () => {
    setHasEntered(true);
  };

  if (showSplash) {
    return <Splash onComplete={() => setShowSplash(false)} />;
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 sm:p-6 font-sans text-slate-100 selection:bg-[#fabd00] selection:text-slate-900">
        <div className="relative w-full max-w-lg bg-[#0f172a] border border-[#334155]/60 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
          {/* Ambient Background Glows */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#006d34]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#fabd00]/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative flex flex-col items-center text-center">
            {/* Elegant Shield/Lock Badge */}
            <div className="w-16 h-16 bg-[#1e293b] border border-[#334155] rounded-2xl flex items-center justify-center shadow-inner mb-6">
              <span className="text-3xl">🔑</span>
            </div>
            
            {/* Headings */}
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
              Configuração Necessária
            </h1>
            <p className="text-xs font-semibold text-[#fabd00] uppercase tracking-wider font-mono mt-1">
              Heldin's Bet • Copa do Mundo 2026
            </p>
            
            <p className="text-[#94a3b8] text-sm mt-4 leading-relaxed">
              Para conectar o aplicativo com o banco de dados oficial e carregar os jogos, classificações e palpites de forma segura no <strong>Supabase</strong>, você precisa fornecer a chave API anônima.
            </p>
            
            {/* Guide Steps */}
            <div className="w-full bg-[#1e293b]/50 border border-[#334155]/40 rounded-2xl p-4 sm:p-5 text-left mt-6 space-y-3.5 font-sans">
              <div className="flex gap-3">
                <span className="flex items-center justify-center w-5 h-5 bg-[#006d34] text-white rounded-full text-xs font-bold shrink-0 mt-0.5 font-mono">
                  1
                </span>
                <p className="text-xs text-[#94a3b8] leading-normal">
                  Abra o menu de <strong>Configurações (Settings)</strong> ou painel de segredos do ambiente do <strong>Google AI Studio</strong>.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="flex items-center justify-center w-5 h-5 bg-[#006d34] text-white rounded-full text-xs font-bold shrink-0 mt-0.5 font-mono">
                  2
                </span>
                <p className="text-xs text-[#94a3b8] leading-normal">
                  Cadastre uma nova variável de ambiente com o seguinte nome exatamente: <br />
                  <code className="inline-block bg-[#0f172a] text-[#fabd00] font-mono px-2 py-0.5 rounded border border-[#334155] mt-1 text-[11px] select-all font-bold">
                    VITE_SUPABASE_ANON_KEY
                  </code>
                </p>
              </div>
              <div className="flex gap-3">
                <span className="flex items-center justify-center w-5 h-5 bg-[#006d34] text-white rounded-full text-xs font-bold shrink-0 mt-0.5 font-mono">
                  3
                </span>
                <p className="text-xs text-[#94a3b8] leading-normal">
                  Cole como valor a chave anônima (<strong>anon public</strong>) do seu projeto Supabase e salve as configurações.
                </p>
              </div>
            </div>

            {/* Support Message */}
            <div className="flex items-center gap-2 mt-6 text-[11px] text-zinc-500 font-mono">
              <span>⚡</span>
              <span>Backend oficial: mafskxlkvlagfbbabpvh.supabase.co</span>
            </div>
            
            <div className="w-full border-t border-[#334155]/40 pt-4 mt-6">
              <p className="text-xs text-zinc-400">
                O aplicativo atualizará automaticamente assim que a variável for detectada.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white p-6 font-sans">
        <div className="w-10 h-10 border-4 border-[#006d34] border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-mono tracking-widest text-[#fabd00] uppercase animate-pulse">
          Iniciando Heldin's Bet...
        </span>
      </div>
    );
  }

  // Dashboard transitions to visible if they are logged in OR click enter as Guest
  const showDashboard = profile !== null || hasEntered;

  return (
    <div className="min-h-screen bg-[#020617] font-sans antialiased text-[#191c1d]">
      {showDashboard ? (
        <DashboardScreen 
          currentUser={profile} 
          onLogout={signOut}
        />
      ) : (
        <PosterScreen onLoginSuccess={handleEnterGameGuest} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
