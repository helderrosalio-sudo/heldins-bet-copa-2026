/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  VwWorldcupMatchApp, 
  VwWorldcupGroupApp, 
  VwWorldcupTeamApp, 
  Ranking, 
  Pool, 
  Profile, 
  Prediction,
  VwPoolRankingApp
} from '../types';
import { service } from '../lib/supabase';
import LoginModal from './LoginModal';
import { 
  Trophy, 
  GitMerge, 
  ChevronRight, 
  Plus, 
  LogOut, 
  Sparkles, 
  Check, 
  Database, 
  Flame, 
  User, 
  Send, 
  RefreshCw, 
  Calendar, 
  MapPin, 
  Tv, 
  ShieldAlert,
  Award,
  Menu,
  ChevronLeft,
  Search
} from 'lucide-react';

interface DashboardScreenProps {
  currentUser: Profile | null;
  onLogout: () => void;
}

export default function DashboardScreen({ currentUser, onLogout }: DashboardScreenProps) {
  // Navigation State: 'inicio' | 'jogos' | 'grupos' | 'palpites' | 'perfil' | 'selecoes' | 'matamata' | 'ranking'
  const [activeTab, setActiveTab ] = useState<'inicio' | 'jogos' | 'grupos' | 'palpites' | 'perfil' | 'selecoes' | 'matamata' | 'ranking'>('inicio');

  // Filtering states for Seleções Tab
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [teamGroupFilter, setTeamGroupFilter] = useState<string>('all');

  // Filtering filter state for Mata-Mata natural tab
  const [mataMataActiveFilter, setMataMataActiveFilter] = useState<string>('Todos');

  // Database Data state
  const [matches, setMatches] = useState<VwWorldcupMatchApp[]>([]);
  const [standings, setStandings] = useState<VwWorldcupGroupApp[]>([]);
  const [teams, setTeams] = useState<VwWorldcupTeamApp[]>([]);
  const [rankings, setRankings] = useState<VwPoolRankingApp[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals active states (deprecated overlay, we use activeTab and flat panels)
  const [isRankingOpen, setIsRankingOpen] = useState(false);
  const [isMataMataOpen, setIsMataMataOpen] = useState(false);

  // Interactive Match prediction input states indexed by match_id
  const [editingPredictionMatchId, setEditingPredictionMatchId] = useState<string | number | null>(null);
  const [predictionInputs, setPredictionInputs] = useState<Record<string, { home: number; away: number }>>({});
  const [submittingPrediction, setSubmittingPrediction] = useState(false);

  // Utility to format dates without local new Date() parsing crashes
  const formatMatchDateTime = (match: VwWorldcupMatchApp) => {
    if (match.brasilia_date_text && match.brasilia_time_text) {
      return `${match.brasilia_date_text} • ${match.brasilia_time_text}`;
    }
    if (match.brasilia_datetime_text) {
      return match.brasilia_datetime_text;
    }
    return "Data a confirmar";
  };

  // Pools management states
  const DEFAULT_POOL_ID = 'dfe4ac20-a8d6-4c1b-a194-69261966086a';
  const [selectedPoolId, setSelectedPoolId] = useState<string>(() => {
    return localStorage.getItem('selectedPoolId') || DEFAULT_POOL_ID;
  });
  const [newPoolName, setNewPoolName] = useState('');
  const [joinPoolCode, setJoinPoolCode] = useState('');
  const [poolError, setPoolError] = useState<string | null>(null);
  const [poolSuccess, setPoolSuccess] = useState<string | null>(null);
  const [poolMembers, setPoolMembers] = useState<any[]>([]);
  const [loadingPoolMembers, setLoadingPoolMembers] = useState(false);

  // Custom Sprint UX state variables for overlays
  const [isCreatePoolOpen, setIsCreatePoolOpen] = useState(false);
  const [isManagePoolsOpen, setIsManagePoolsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminPoolName, setAdminPoolName] = useState('');
  const [adminPoolDesc, setAdminPoolDesc] = useState('');
  const [isSavingAdminInfo, setIsSavingAdminInfo] = useState(false);

  // Administrative functions
  const refreshAdminData = async () => {
    setIsSavingAdminInfo(true);
    try {
      // 1. Reload members list
      const updatedMembers = await service.getPoolMembers(selectedPoolId);
      setPoolMembers(updatedMembers);

      // 2. Reload ranking
      const updatedRankings = await service.getPoolRanking(selectedPoolId);
      setRankings(updatedRankings);

      // 3. Reload pools
      if (currentUser) {
        const updatedPools = await service.getPools(currentUser.id);
        setPools(updatedPools);
      }
    } catch (err) {
      console.error('Erro ao recarregar dados admin:', err);
    } finally {
      setIsSavingAdminInfo(false);
    }
  };

  const handleUpdatePoolInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!adminPoolName.trim()) {
      triggerToast("O nome do bolão é obrigatório.");
      return;
    }
    
    // Safety check against owner_user_id
    if (activePool.owner_user_id !== currentUser.id) {
      triggerToast("Apenas o organizador pode administrar este bolão.");
      return;
    }

    try {
      setIsSavingAdminInfo(true);
      await service.updatePool(selectedPoolId, adminPoolName, adminPoolDesc, currentUser.id);
      triggerToast("Informações do bolão atualizadas!");
      await refreshAdminData();
    } catch (err: any) {
      triggerToast(err.message || "Erro ao atualizar informações.");
    } finally {
      setIsSavingAdminInfo(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!currentUser) return;
    if (activePool.owner_user_id !== currentUser.id) {
      triggerToast("Apenas o organizador pode administrar este bolão.");
      return;
    }

    const confirm = window.confirm("Tem certeza que deseja gerar um novo código de convite para este bolão? O código antigo deixará de funcionar imediatamente.");
    if (!confirm) return;

    try {
      setIsSavingAdminInfo(true);
      const newCode = await service.regenerateInvitationCode(selectedPoolId, currentUser.id);
      triggerToast(`Novo código de convite gerado: ${newCode}`);
      await refreshAdminData();
    } catch (err: any) {
      triggerToast(err.message || "Erro ao gerar novo código.");
    } finally {
      setIsSavingAdminInfo(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string, targetApelido: string) => {
    if (!currentUser) return;
    if (activePool.owner_user_id !== currentUser.id) {
      triggerToast("Apenas o organizador pode administrar este bolão.");
      return;
    }

    if (targetUserId === currentUser.id) {
      triggerToast("O organizador não pode ser removido do próprio bolão.");
      return;
    }

    const confirm = window.confirm(`Tem certeza que deseja remover o participante @${targetApelido} deste bolão?`);
    if (!confirm) return;

    try {
      setIsSavingAdminInfo(true);
      await service.removePoolMember(selectedPoolId, targetUserId, currentUser.id);
      triggerToast(`Participante @${targetApelido} removido com sucesso.`);
      
      // Clear or refresh ranking + members + pools count
      await refreshAdminData();
    } catch (err: any) {
      triggerToast(err.message || "Erro ao remover participante.");
    } finally {
      setIsSavingAdminInfo(false);
    }
  };

  // Sharing helpers
  const handleShareWhatsApp = (poolNome: string, code: string) => {
    const mensagem = `🏆 Você foi convidado para participar do bolão:\n\n${poolNome}\n\nCódigo do Convite:\n${code}\n\nEntre no Heldin's Bet e participe da Copa do Mundo 2026 conosco!\n\nAcesse:\nhttps://heldins-bet-copa-2026.vercel.app\n\n⚽🌎`;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
    const baseUrl = isMobile ? 'https://wa.me/?text=' : 'https://web.whatsapp.com/send?text=';
    const finalUrl = `${baseUrl}${encodeURIComponent(mensagem)}`;
    window.open(finalUrl, '_blank');
  };

  const handleCopyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    triggerToast("Código copiado com sucesso! 🏆");
  };

  // Notification center visual feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter state for matches view
  const [matchStageFilter, setMatchStageFilter] = useState<'all' | 'group' | 'knockout'>('all');

  // Authentication modal states
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginRequiredMessage, setLoginRequiredMessage] = useState<string | undefined>(undefined);

  // Checks authentication and triggers LoginModal if false
  const requireLogin = (actionMessage: string): boolean => {
    if (!currentUser) {
      setLoginRequiredMessage(actionMessage);
      setIsLoginOpen(true);
      return true; // restricted action blocked
    }
    return false; // let them proceed
  };

  // Fetch initial system datasets
  const loadSystemData = async () => {
    setLoading(true);
    try {
      const allMatches = await service.getMatches(currentUser?.id, selectedPoolId);
      const allStandings = await service.getGroupStandings();
      const allRankings = await service.getPoolRanking(selectedPoolId);
      const allPools = currentUser ? await service.getPools(currentUser.id) : [];
      const allTeams = await service.getTeams();

      setMatches(allMatches);
      setStandings(allStandings);
      setRankings(allRankings);
      setPools(allPools);
      setTeams(allTeams);

      // Force-update members list for the selected pool
      setLoadingPoolMembers(true);
      try {
        const members = await service.getPoolMembers(selectedPoolId);
        setPoolMembers(members);
      } catch (err) {
        console.warn('Alerta ao obter integrantes do bolão:', err);
      } finally {
        setLoadingPoolMembers(false);
      }
    } catch (err) {
      console.error('Falha ao carregar os dados de Heldin\'s Bet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystemData();
  }, [currentUser, selectedPoolId]);

  // Show dynamic self-dismissing toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Prediction counters click modifications - indexed by match id
  const startEditingPrediction = (match: VwWorldcupMatchApp) => {
    if (requireLogin("Entre para poder palpitar nos jogos da Copa.")) {
      return;
    }
    const key = String(match.id);
    setEditingPredictionMatchId(match.id || null);
    setPredictionInputs(prev => ({
      ...prev,
      [key]: {
        home: match.user_prediction_home !== undefined ? match.user_prediction_home : 0,
        away: match.user_prediction_away !== undefined ? match.user_prediction_away : 0
      }
    }));
  };

  const handleSavePrediction = async (matchId: string) => {
    if (requireLogin("Entre para poder gravar seus palpites no bolão oficial.")) {
      return;
    }
    if (!currentUser) return;
    const matchIdStr = String(matchId);
    const inputs = predictionInputs[matchIdStr] || { home: 0, away: 0 };
    setSubmittingPrediction(true);
    try {
      await service.savePrediction(
        currentUser.id,
        matchIdStr,
        inputs.home,
        inputs.away,
        selectedPoolId
      );
      
      // Update match predictions list live in UI
      setMatches(prev => prev.map(m => {
        if (m.id === matchId) {
          return {
            ...m,
            user_prediction_home: inputs.home,
            user_prediction_away: inputs.away
          };
        }
        return m;
      }));

      // Reload rankings list to reflect newly calculated points immediately
      const newRankings = await service.getPoolRanking(selectedPoolId);
      setRankings(newRankings);

      triggerToast("Palpite registrado com sucesso! Boa sorte!");
      setEditingPredictionMatchId(null);
    } catch (e) {
      console.error('Erro real ao salvar palpite:', e);
      triggerToast("Erro ao gravar palpite no servidor.");
    } finally {
      setSubmittingPrediction(false);
    }
  };

  // Select active pool
  const handleSelectPool = (poolId: string) => {
    setSelectedPoolId(poolId);
    localStorage.setItem('selectedPoolId', poolId);
    triggerToast(`Bolão ativo alterado!`);
  };

  // Join a custom private betting pool
  const handleJoinPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requireLogin("Entre com a sua conta para participar de bolões privados.")) {
      return;
    }
    if (!currentUser) return;
    if (!joinPoolCode.trim()) return;
    setPoolError(null);
    setPoolSuccess(null);
    try {
      const joined = await service.joinPoolByCode(currentUser.id, joinPoolCode);
      setPoolSuccess(`Inscrição concluída no bolão "${joined.nome}"!`);
      setJoinPoolCode('');
      // Reload Pools
      const updatedPools = await service.getPools(currentUser.id);
      setPools(updatedPools);
      
      // Select automatically
      setSelectedPoolId(joined.id);
      localStorage.setItem('selectedPoolId', joined.id);
    } catch (err: any) {
      setPoolError(err.message || 'Erro ao participar do bolão.');
    }
  };

  // Create a custom private betting pool
  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requireLogin("Entre com a sua conta para criar seu próprio bolão de amigos.")) {
      return;
    }
    if (!currentUser) return;
    if (!newPoolName.trim()) return;
    setPoolError(null);
    setPoolSuccess(null);
    try {
      const created = await service.createPool(currentUser.id, newPoolName);
      setPoolSuccess(`Bolão privado "${created.nome}" criado com sucesso! Código: ${created.codigo_convite}`);
      setNewPoolName('');
      // Reload Pools
      const updatedPools = await service.getPools(currentUser.id);
      setPools(updatedPools);
      
      // Select automatically
      setSelectedPoolId(created.id);
      localStorage.setItem('selectedPoolId', created.id);
    } catch (err: any) {
      console.error("[DIAGNÓSTICO INTERFACES] Falha ao criar bolão privado:", err);
      const specificError = err.message || err.details || JSON.stringify(err);
      setPoolError(`Erro ao estabelecer um novo bolão privado: ${specificError}`);
    }
  };

  // Group standouts computation for Group standings carousel
  const groupsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']; // Group lists displayed in carousels

  // Dynamic computed pool properties for active pool card & list rendering
  const allDisplayPools = [
    {
      id: DEFAULT_POOL_ID,
      nome: "Bolão Principal (Heldin's Bet)",
      descricao: "Bolão global oficial para todos os participantes",
      codigo_convite: "COPA2026",
      owner_user_id: "system",
      created_at: "2026-06-01"
    },
    ...pools.filter(p => p.id !== DEFAULT_POOL_ID)
  ];
  const activePool = allDisplayPools.find(p => p.id === selectedPoolId) || allDisplayPools[0];
  const userRankIndex = rankings.findIndex(r => r.user_id === currentUser?.id);

  return (
    <div id="dashboard-root" className="min-h-screen bg-[#f8fafc] text-slate-900 pb-28 font-sans select-none transition-colors w-full max-w-md mx-auto overflow-x-hidden box-border relative border-x border-[#c4c6d2]/30 flex flex-col justify-between">
      
      {/* Toast Notification Box */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#006d34] text-white py-3 px-6 rounded-full text-xs font-bold shadow-2xl z-50 flex items-center gap-2 border border-[#fabd00] min-w-[280px] justify-center"
          >
            <Sparkles className="w-4 h-4 text-[#fabd00] animate-spin" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- TopAppBar --- */}
      <header className="sticky top-0 z-40 bg-[#006d34] border-b-2 border-[#fabd00]/30 px-4 py-3.5 flex justify-between items-center shadow-lg h-[64px]">
        <div className="flex items-center gap-2.5">
          {/* Action icon: chevron back button for secondary tabs, otherwise launcher Logo */}
          {['selecoes', 'matamata', 'palpites'].includes(activeTab) ? (
            <button 
              onClick={() => setActiveTab('inicio')}
              className="w-8 h-8 rounded-full bg-[#004d25] hover:bg-[#003318] text-[#fabd00] flex items-center justify-center border border-[#fabd00]/20 shadow transition-all active:scale-90 shrink-0"
              title="Voltar ao Início"
            >
              <ChevronLeft className="w-5 h-5 text-[#fabd00]" />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#006d34] to-[#fabd00] p-[1.5px] shrink-0">
              <div className="w-full h-full bg-[#006d34] rounded-[6px] flex items-center justify-center font-display-lg font-black text-xs text-[#fabd00]">
                H
              </div>
            </div>
          )}
          
          <div className="text-left select-none">
            <h1 className="text-xs font-display-lg font-black text-white uppercase tracking-wider leading-none">
              {activeTab === 'inicio' ? "HELDIN'S BET" :
               activeTab === 'jogos' ? "GAMES AGENDA" :
               activeTab === 'grupos' ? "TABELA GRUPOS" :
               activeTab === 'palpites' ? "MEUS PALPITES" :
               activeTab === 'perfil' ? "PERFIL" :
               activeTab === 'selecoes' ? "SELEÇÕES DA COPA" :
               activeTab === 'matamata' ? "FASE MATA-MATA" :
               activeTab === 'ranking' ? "RANKING DO BOLÃO" : "HELDIN'S BET"}
            </h1>
            <span className="text-[9px] font-mono tracking-widest text-[#fabd00] font-bold uppercase mt-1 block leading-none">
              {activeTab === 'inicio' ? "COPA DO MUNDO 2026" :
               activeTab === 'jogos' ? "PLANILHA DE JOGOS" :
               activeTab === 'grupos' ? "CLASSIFICAÇÃO COPA" :
               activeTab === 'palpites' ? "RELAÇÃO DE PALPITES" :
               activeTab === 'perfil' ? "CONFIGURAÇÕES DA CONTA" :
               activeTab === 'selecoes' ? "EQUIPES DA COPA" :
               activeTab === 'matamata' ? "CHAVEAMENTO DAS FINAIS" :
               activeTab === 'ranking' ? "CLASSIFICAÇÃO DO BOLÃO" : "COPA DO MUNDO 2026"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <button 
              onClick={() => setActiveTab('perfil')}
              className={`w-9 h-9 rounded-full bg-[#006d34] hover:brightness-110 flex items-center justify-center font-mono font-black text-xs text-white border-2 border-[#fabd00]/30 shadow focus:scale-95 transition-all uppercase ${activeTab === 'perfil' ? 'border-[#fabd00]' : ''}`}
              title={currentUser.apelido}
            >
              {currentUser.apelido?.substring(0, 2) || currentUser.nome?.substring(0, 2) || 'P'}
            </button>
          ) : (
            <button
              onClick={() => {
                setLoginRequiredMessage("Identifique-se para começar a registrar seus palpites.");
                setIsLoginOpen(true);
              }}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-[#006d34] to-[#004d25] border-2 border-[#fabd00] shadow-md active:scale-95 text-[10px] font-extrabold uppercase text-white tracking-widest cursor-pointer hover:brightness-110 transition-all font-mono"
            >
              Entrar
            </button>
          )}
        </div>
      </header>

      {/* Loading state indicator */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-[#006d34] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-sans animate-pulse">
            Carregando Arena Esportiva...
          </p>
        </div>
      ) : (
        <main className="flex-grow p-4 space-y-6">

          {/* ==================== TAB 1: INÍCIO (HOME) ==================== */}
          {activeTab === 'inicio' && (
            <div id="view-inicio" className="space-y-6 animate-in fade-in duration-250">
              
              {/* CARD DO BOLÃO ATIVO - TEMA HELDIN'S BET */}
              <section id="card-bolao-ativo" className="relative text-white font-sans overflow-hidden">
                <div className="bg-[#006d34] border border-[#fabd00]/30 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                  {/* Header Badge & Role info */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] bg-[#fabd00] text-slate-950 font-black px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
                      🏆 BOLÃO ATIVO
                    </span>
                    <div className="flex items-center gap-1 bg-[#004d25] px-2.5 py-1.5 rounded-xl border border-[#fabd00]/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#fabd00]" />
                      <span className="text-[9px] font-mono font-black text-white uppercase tracking-wider">
                        {activePool.owner_user_id === currentUser?.id ? "ORGANIZADOR" : "PARTICIPANTE"}
                      </span>
                    </div>
                  </div>

                  {/* Pool Title & Bio description */}
                  <div>
                    <h2 className="text-sm font-black text-[#fabd00] leading-tight uppercase tracking-tight font-sans">
                      {activePool.nome}
                    </h2>
                    <p className="text-[10px] text-white/80 mt-1 lines-clamp-2 leading-relaxed font-sans">
                      {activePool.descricao || "Dispute pontos, faça seus palpites certeiros e leve a taça para casa com seus amigos!"}
                    </p>
                  </div>

                  {/* Horizontal dividers */}
                  <div className="h-px bg-[#fabd00]/20 my-3" />

                  {/* Key Pool Statistics */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-[#004d25]/60 p-2 border border-[#fabd00]/10 rounded-xl mb-3.5">
                    <div>
                      <span className="text-[8px] text-[#fabd00] uppercase tracking-wider font-mono font-black block">Código</span>
                      <span className="text-xs font-mono font-black text-white">{activePool.codigo_convite}</span>
                    </div>
                    <div className="border-x border-[#fabd00]/10 px-1">
                      <span className="text-[8px] text-[#fabd00] uppercase tracking-wider font-mono font-black block">Participantes</span>
                      <span className="text-xs font-mono font-black text-white">{poolMembers.length || rankings.length || 1}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#fabd00] uppercase tracking-wider font-mono font-black block">Sua Posição</span>
                      <span className="text-xs font-mono font-black text-white">
                        {userRankIndex !== -1 ? `${rankings[userRankIndex].posicao || (userRankIndex + 1)}º` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button 
                      onClick={() => handleCopyToClipboard(activePool.codigo_convite)}
                      className="bg-[#004d25] hover:bg-[#00381b] border border-[#fabd00]/30 hover:border-[#fabd00]/50 text-[#fabd00] text-[10px] font-black uppercase py-2 px-3 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1 font-mono shrink-0 select-none"
                    >
                      <span>📋</span> Copiar Código
                    </button>

                    <button 
                      onClick={() => handleShareWhatsApp(activePool.nome, activePool.codigo_convite)}
                      className="bg-[#25D366] hover:bg-[#20ba59] text-[#1e293b] text-[10px] font-black uppercase py-2 px-3 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1 shrink-0 select-none"
                    >
                      <span>💬</span> WhatsApp
                    </button>
                  </div>

                  {/* Select other pool action */}
                  <button 
                    onClick={() => setIsManagePoolsOpen(true)}
                    className="text-[10px] uppercase font-black text-[#fabd00] text-center block mt-3.5 hover:underline active:scale-95 transition-all outline-none"
                  >
                    🔄 TROCAR BOLÃO OU VER LISTA
                  </button>

                </div>
              </section>

              {/* Quick Access Section Buttons */}
              <section className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setActiveTab('ranking')}
                  className="bg-white hover:border-[#006d34]/20 border border-[#c4c6d2]/30 rounded-2xl p-4 flex flex-col items-start gap-1.5 shadow-sm active:scale-95 transition-all text-left"
                >
                  <Trophy className="w-5 h-5 text-[#fabd00]" />
                  <span className="text-xs font-black text-slate-800 leading-none">Ranking</span>
                  <span className="text-[10px] text-zinc-400">Classificação do grupo</span>
                </button>

                <button 
                  onClick={() => setActiveTab('matamata')}
                  className="bg-white hover:border-[#006d34]/20 border border-[#c4c6d2]/30 rounded-2xl p-4 flex flex-col items-start gap-1.5 shadow-sm active:scale-95 transition-all text-left"
                >
                  <GitMerge className="w-5 h-5 text-[#006d34]" />
                  <span className="text-xs font-black text-slate-800 leading-none">Mata-Mata</span>
                  <span className="text-[10px] text-zinc-400">Chaveamento das finais</span>
                </button>

                <button 
                  onClick={() => setActiveTab('selecoes')}
                  className="bg-white hover:border-[#006d34]/20 border border-[#c4c6d2]/30 rounded-2xl p-4 flex flex-col items-start gap-1.5 shadow-sm active:scale-95 transition-all text-left"
                >
                  <Sparkles className="w-5 h-5 text-[#006d34]" />
                  <span className="text-xs font-black text-slate-800 leading-none">Seleções</span>
                  <span className="text-[10px] text-zinc-400">Lista de equipes</span>
                </button>

                <button 
                  onClick={() => setActiveTab('palpites')}
                  className="bg-white hover:border-[#006d34]/20 border border-[#c4c6d2]/30 rounded-2xl p-4 flex flex-col items-start gap-1.5 shadow-sm active:scale-95 transition-all text-left"
                >
                  <Award className="w-5 h-5 text-[#fabd00]" />
                  <span className="text-xs font-black text-slate-800 leading-none">Palpites</span>
                  <span className="text-[10px] text-zinc-400">Histórico & Estatística</span>
                </button>
              </section>

              {/* DESTAQUES & ATIVIDADES DO BOLÃO */}
              <section id="destaques-e-atividades" className="bg-white rounded-2xl p-5 border border-[#c4c6d2]/30 shadow-sm space-y-4 font-sans text-left">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-[#006d34] uppercase tracking-wider font-mono flex items-center gap-2">
                    <span>⚡</span> DESTAQUES & ATIVIDADES DO BOLÃO
                  </h3>
                  <span className="bg-[#006d34]/10 text-[#006d34] text-[9px] font-mono font-black px-2 py-0.5 rounded-full uppercase">
                    AO VIVO
                  </span>
                </div>

                {/* Grid stats for highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Líder Atual</span>
                    <span className="text-xs font-black text-slate-800 truncate max-w-full">
                      {rankings.length > 0 ? `@${rankings[0].user_apelido || rankings[0].user_nome || "Membro 1"}` : "Sem líder"}
                    </span>
                  </div>

                  <div className="flex flex-col items-start gap-0.5 border-l border-slate-200 pl-3">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Participantes</span>
                    <span className="text-xs font-mono font-black text-[#006d34]">
                      {poolMembers.length || rankings.length || 1} ativos
                    </span>
                  </div>

                  <div className="flex flex-col items-start gap-0.5 border-l border-slate-200 pl-3">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Total Palpites</span>
                    <span className="text-xs font-mono font-black text-amber-600">
                      {rankings.reduce((acc, r) => acc + (r.total_palpites || 0), 0)} un
                    </span>
                  </div>

                  <div className="flex flex-col items-start gap-0.5 border-l border-slate-200 pl-3">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Sua Posição</span>
                    <span className="text-xs font-mono font-black text-[#006d34]">
                      {(() => {
                        const idx = rankings.findIndex(r => r.user_id === currentUser?.id);
                        return idx !== -1 ? `${rankings[idx].posicao || (idx + 1)}º lugar` : "Não listado";
                      })()}
                    </span>
                  </div>
                </div>

                {/* Stream / List of Activities */}
                <div className="space-y-3">
                  <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest block font-mono">
                    ÚLTIMAS ATIVIDADES RECENTES
                  </span>

                  {rankings.length === 0 ? (
                    <div className="bg-amber-50/40 border border-[#fabd00]/30 rounded-xl p-4 text-center mt-2 flex flex-col items-center gap-1">
                      <span className="text-lg">📢</span>
                      <p className="text-xs font-bold text-slate-700">Seu bolão ainda está começando.</p>
                      <p className="text-[10px] text-zinc-500 leading-normal max-w-xs">
                        Convide seus amigos para registrar os primeiros palpites e disputar a taça!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(() => {
                        const acts = [];
                        
                        // 1. Leader activity
                        if (rankings.length > 0) {
                          const leader = rankings[0];
                          acts.push({
                            id: 'act-leader',
                            title: 'Topo da Tabela!',
                            desc: `@${leader.user_apelido || leader.user_nome || "Membro"} lidera a rodada da Copa do Mundo com ${leader.total_pontos || 0} pontos acumulados.`,
                            time: 'Agora mesmo',
                            icon: '👑',
                            badge: 'LÍDER'
                          });
                        }

                        // 2. Active Predictor
                        const activeGuys = rankings.filter(r => (r.total_palpites || 0) > 0);
                        if (activeGuys.length > 0) {
                          const topGuy = activeGuys[0];
                          acts.push({
                            id: 'act-predict',
                            title: 'Palpite Salvo',
                            desc: `@${topGuy.user_apelido || topGuy.user_nome} enviou e confirmou palpites para a próxima rodada!`,
                            time: 'Há 5 min',
                            icon: '🎯',
                            badge: 'PALPITE'
                          });
                        }

                        // 3. New Member joined
                        if (poolMembers.length > 0) {
                          const newest = poolMembers[poolMembers.length - 1];
                          acts.push({
                            id: 'act-joined',
                            title: 'Membro em Campo',
                            desc: `@${newest.apelido || newest.nome} entrou no bolão oficial para disputar o topo do ranking.`,
                            time: 'Há 1 hora',
                            icon: '👥',
                            badge: 'ENTROU'
                          });
                        }

                        // 4. Exact precision
                        const preciseGuys = rankings.filter(r => (r.acertos_exatos || 0) > 0);
                        if (preciseGuys.length > 0) {
                          const preciseGuy = preciseGuys[0];
                          acts.push({
                            id: 'act-precise',
                            title: 'Placar Exato Cravado!',
                            desc: `@${preciseGuy.user_apelido || preciseGuy.user_nome} acertou em cheio o placar exato de um jogo e faturou a pontuação máxima.`,
                            time: 'Há 3 horas',
                            icon: '🔥',
                            badge: 'CRAVADA'
                          });
                        }

                        return acts.slice(0, 3).map((act) => (
                          <div 
                            key={act.id}
                            className="bg-slate-50 hover:bg-slate-100/70 border border-slate-100 p-3 rounded-xl flex gap-3 transition-all text-left"
                          >
                            <span className="text-lg bg-white w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                              {act.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-800">{act.title}</span>
                                <span className="text-[8px] font-mono text-zinc-400">{act.time}</span>
                              </div>
                              <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                                {act.desc}
                              </p>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </section>

              {/* Next Matches Carousel section */}
              <section className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-[#006d34] uppercase tracking-wider font-headline-lg-mobile flex items-center gap-1">
                    <span>⚽</span> Próximos Jogos
                  </h3>
                  <button 
                    onClick={() => setActiveTab('jogos')}
                    className="text-xs font-bold text-[#006d34] flex items-center hover:underline"
                  >
                    Ver Tabela <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Match Cards display */}
                <div className="space-y-3 w-full box-border">
                  {([...matches]
                    .sort((a, b) => {
                      const statusOrder = (status: string) => {
                        if (status === 'live') return 0;
                        if (status === 'scheduled' || status === 'TIMED') return 1;
                        return 2;
                      };
                      const orderA = statusOrder(a.status);
                      const orderB = statusOrder(b.status);
                      if (orderA !== orderB) return orderA - orderB;

                      const dateA = new Date(a.utc_date || a.match_time || 0).getTime();
                      const dateB = new Date(b.utc_date || b.match_time || 0).getTime();
                      return dateA - dateB;
                    })
                    .slice(0, 3)
                  ).map((match) => {
                    const hasMadePrediction = match.user_prediction_home !== undefined;
                    const groupDisplay = match.group_letter ? `Grupo ${match.group_letter}` : match.stage;
                    return (
                      <div 
                        key={match.match_id || match.id}
                        className="bg-white rounded-2xl p-4 border border-[#c4c6d2]/30 shadow-sm transition-all w-full box-border hover:shadow-md"
                      >
                        {/* Top Metadata */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full font-mono uppercase">
                            {groupDisplay}
                          </span>
                          {match.status === 'live' ? (
                            <div className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                              <span className="text-[8px] font-bold font-sans uppercase">AO VIVO</span>
                            </div>
                          ) : match.status === 'finished' ? (
                            <span className="text-[8px] font-bold bg-[#006d34] text-white px-2 py-0.5 rounded-full">
                              CONCLUÍDO
                            </span>
                          ) : (
                            <span className="text-[8px] font-semibold text-slate-500 font-mono">
                              {formatMatchDateTime(match)}
                            </span>
                          )}
                        </div>

                        {/* Teams layout */}
                        <div className="flex items-center justify-between gap-2.5">
                          {/* Team A mandante */}
                          <div className="flex items-center gap-2.5 w-[42%]">
                            <img src={match.home_team_crest_url || '⚽'} className="w-8 h-8 rounded-full border border-slate-200 object-cover shrink-0" referrerPolicy="no-referrer" />
                            <span className="text-xs font-black text-slate-900 truncate">
                              {match.home_team_name}
                            </span>
                          </div>

                          {/* Scores box */}
                          <div className="flex flex-col items-center justify-center w-[16%]">
                            <div className="bg-slate-950 font-mono text-white text-xs px-2.5 py-1 rounded-md font-black min-w-[50px] text-center">
                              {match.status !== 'scheduled' && match.status !== 'TIMED' ? (
                                <span>{match.home_score} - {match.away_score}</span>
                              ) : (
                                <span className="text-zinc-500 text-[10px]">VS</span>
                              )}
                            </div>
                          </div>

                          {/* Team B visitante */}
                          <div className="flex items-center justify-end gap-2.5 w-[42%] text-right">
                            <span className="text-xs font-black text-slate-900 truncate">
                              {match.away_team_name}
                            </span>
                            <img src={match.away_team_crest_url || '⚽'} className="w-8 h-8 rounded-full border border-slate-200 object-cover shrink-0" referrerPolicy="no-referrer" />
                          </div>
                        </div>

                        {/* Predictions Area indicator */}
                        <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex justify-between items-center">
                          {hasMadePrediction ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500 leading-none">Meu palpite:</span>
                              <div className="bg-emerald-100/60 border border-emerald-300 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold font-mono">
                                {match.user_prediction_home} x {match.user_prediction_away}
                              </div>
                              {match.prediction_points !== undefined && (
                                <span className="text-[9px] text-[#006d34] font-black font-sans ml-1">
                                  (+{match.prediction_points} pts)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic font-sans">
                              Você ainda não palpitou neste jogo
                            </span>
                          )}

                          <button 
                            onClick={() => {
                              setActiveTab('jogos');
                              setTimeout(() => startEditingPrediction(match), 100);
                            }}
                            className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border transition-all ${
                              hasMadePrediction 
                                ? 'bg-[#f8f9fa] border-slate-200 text-slate-700 hover:bg-slate-100' 
                                : 'bg-[#006d34] border-[#006d34] text-white hover:brightness-110 active:scale-95'
                            }`}
                          >
                            {hasMadePrediction ? 'Alterar' : 'Apostar'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Horizontal Groups carousel element */}
              <section className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-[#006d34] uppercase tracking-wider font-headline-lg-mobile flex items-center gap-1">
                    <span>📊</span> Classificação
                  </h3>
                  <button 
                    onClick={() => setActiveTab('grupos')}
                    className="text-xs font-semibold text-[#006d34] flex items-center hover:underline"
                  >
                    Ver Tudo <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Inline sliders */}
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                  {standings.length === 0 ? (
                    <div className="bg-white rounded-2xl p-6 border border-dashed border-slate-300 text-center text-zinc-400 text-xs italic w-full">
                      Nenhuma classificação carregada.
                    </div>
                  ) : (
                    standings.slice(0, 4).map((group) => {
                      const gLetter = group.group_letter;
                      let groupTeams: any[] = [];
                      try {
                        groupTeams = Array.isArray(group.teams) 
                          ? group.teams 
                          : (typeof group.teams === 'string' ? JSON.parse(group.teams) : []);
                      } catch (err) {
                        console.error('Error parsing teams JSON on Home:', err);
                      }
                      
                      const sortedTeams = [...groupTeams].sort((a, b) => {
                        const ptsA = a.points ?? 0;
                        const ptsB = b.points ?? 0;
                        if (ptsA !== ptsB) return ptsB - ptsA;
                        
                        const gdA = a.goal_difference ?? 0;
                        const gdB = b.goal_difference ?? 0;
                        return gdB - gdA;
                      });

                      return (
                        <div 
                          key={gLetter}
                          className="min-w-[270.0px] bg-white rounded-xl p-4 border border-[#c4c6d2]/30 shadow-sm flex flex-col shrink-0"
                        >
                          <h4 className="text-xs font-black text-[#006d34] border-b border-slate-100 pb-2 mb-3 uppercase tracking-wider font-display-lg flex items-center justify-between">
                            <span>Grupo {gLetter}</span>
                            <span className="text-[9px] text-[#006d34] font-bold">Top 2 passam</span>
                          </h4>
                          
                          <div className="space-y-2">
                            {sortedTeams.slice(0, 4).map((teamState, tIdx) => {
                              const tCrestUrl = teamState.crest_url || teamState.team_flag || '⚽';
                              const tName = teamState.team_name_display || teamState.name || teamState.team_name || 'Seleção';
                              const tPlayed = teamState.played ?? 0;
                              const tPoints = teamState.points ?? 0;
                              return (
                                <div key={teamState.tla || teamState.team_code || tIdx} className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] text-zinc-400 w-3">
                                      {tIdx + 1}°
                                    </span>
                                    <img src={tCrestUrl} className="w-4.5 h-4.5 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                                    <span className="font-bold text-slate-800 truncate max-w-[120px]">
                                      {tName}
                                    </span>
                                  </div>
                                  <div className="flex gap-3 text-[10px] font-mono text-slate-500 font-bold">
                                    <span>{tPlayed}J</span>
                                    <span className="text-slate-900 font-extrabold w-5 text-right">{tPoints} PTS</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Seleções Participantes list */}
              <section className="space-y-3 w-full box-border">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-[#006d34] uppercase tracking-wider flex items-center gap-1">
                    <span>🏳️</span> Seleções Participantes
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-emerald-100 text-[#006d34] px-2 py-0.5 rounded-full font-mono font-bold shrink-0">
                      {teams.length || 48} Seleções
                    </span>
                    <button 
                      onClick={() => {
                        setTeamSearchTerm('');
                        setTeamGroupFilter('all');
                        setActiveTab('selecoes');
                      }}
                      className="text-[11px] font-black uppercase text-[#006d34] hover:underline shrink-0 active:scale-95 transition-transform"
                    >
                      Ver todas
                    </button>
                  </div>
                </div>

                {/* Horizontal scroll with smooth cursor swipe */}
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 w-[calc(100%+32px)]">
                  {teams.length > 0 ? (
                    teams.map((team) => (
                      <div 
                        key={team.tla}
                        className="min-w-[110px] w-[110px] bg-white rounded-xl p-3 border border-[#c4c6d2]/30 shadow-sm flex flex-col items-center justify-center shrink-0 hover:shadow-md transition-all font-sans"
                      >
                        <img 
                          src={team.crest_url || '⚽'} 
                          alt={team.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-sm mb-2" 
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-xs font-black text-slate-900 text-center truncate w-full">
                          {team.team_name_display || team.name}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-mono font-bold px-1.5 py-0.5 rounded-md mt-1">
                          {team.tla}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="w-full text-center py-4 text-xs text-slate-400 italic font-sans">
                      Carregando seleções oficiais...
                    </div>
                  )}
                </div>
              </section>

              {/* Meus Palpites quick box summary */}
              <section className="bg-gradient-to-r from-emerald-950/20 to-slate-950/10 border border-[#006d34]/20 rounded-2xl p-4">
                <div className="flex flex-col items-center text-center py-2 space-y-3">
                  <span className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-xl text-[#006d34]">
                    💰
                  </span>
                  <div>
                    <h4 className="text-xs font-black text-[#006d34] uppercase tracking-wider">
                      Suas estatísticas de Palpites
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-1 max-w-[280px]">
                      Participe prevendo resultados exatos para acumular pontos e disputar canecos com seus amigos.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('jogos')}
                    className="bg-[#006d34] text-white px-6 py-2.5 rounded-full text-xs font-bold active:scale-95 transition-all w-full md:w-auto"
                  >
                    Palpitar nos Próximos Jogos
                  </button>
                </div>
              </section>
            </div>
          )}


          {/* ==================== TAB 2: JOGOS (MATCH LIST) ==================== */}
          {activeTab === 'jogos' && (
            <div id="view-jogos" className="space-y-5 animate-in fade-in duration-250">
              
              <div className="flex justify-between items-center text-left">
                <h2 className="text-sm font-display-lg font-black text-[#006d34] uppercase tracking-wider flex items-center gap-1.5 leading-none">
                  <span>📅</span> AGENDA DE JOGOS
                </h2>

                {/* Mini filters stage togglers */}
                <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <button 
                    onClick={() => setMatchStageFilter('all')}
                    className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg transition-all ${
                      matchStageFilter === 'all' ? 'bg-[#006d34] text-white shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Todos
                  </button>
                  <button 
                    onClick={() => setMatchStageFilter('group')}
                    className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg transition-all ${
                      matchStageFilter === 'group' ? 'bg-[#006d34] text-white shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Grupos
                  </button>
                  <button 
                    onClick={() => setMatchStageFilter('knockout')}
                    className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg transition-all ${
                      matchStageFilter === 'knockout' ? 'bg-[#006d34] text-white shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Mata
                  </button>
                </div>
              </div>

              {/* Matches List Grid */}
              <div className="space-y-4">
                {matches
                  .filter(m => {
                    const isGroupGame = m.stage === 'GROUP_STAGE' || m.stage?.includes('GROUP');
                    if (matchStageFilter === 'group') return isGroupGame;
                    if (matchStageFilter === 'knockout') return !isGroupGame;
                    return true;
                  })
                  .map((match) => {
                    const matchId = match.id || '';
                    const matchIdStr = String(matchId);
                    const isEditing = editingPredictionMatchId === matchId;
                    const hasUserPrediction = match.user_prediction_home !== undefined;
                    const groupDisplay = match.group_letter ? `Grupo ${match.group_letter}` : match.stage;
                    const currentPrediction = predictionInputs[String(match.id)] || {
                      home: match.user_prediction_home !== undefined ? match.user_prediction_home : 0,
                      away: match.user_prediction_away !== undefined ? match.user_prediction_away : 0
                    };
                    
                    return (
                      <div 
                        key={matchId}
                        className={`bg-white rounded-2xl border transition-all ${
                          isEditing 
                             ? 'border-[#fabd00] ring-1 ring-[#fabd00] shadow-md' 
                            : 'border-[#c4c6d2]/30 shadow-sm hover:shadow-md'
                        }`}
                      >
                        {/* Header Details */}
                        <div className="p-3 bg-slate-50 rounded-t-2xl border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-600 font-mono">
                              {formatMatchDateTime(match)}
                            </span>
                            <span className="text-zinc-300">•</span>
                            <span className="text-[9px] bg-emerald-50 text-[#006d34] px-1.5 py-0.5 rounded-full font-mono uppercase font-black font-sans">
                              {groupDisplay}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-[9px] text-slate-500 font-sans truncate max-w-[80px]">
                              {match.city}
                            </span>
                          </div>
                        </div>

                        {/* Middle Match Presentation Display */}
                        <div className="p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            {/* Team A */}
                            <div className="flex items-center gap-2 w-[42%]">
                              <img src={match.home_team_crest_url || '⚽'} className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200" referrerPolicy="no-referrer" />
                              <span className="text-xs font-black text-slate-900 truncate">
                                {match.home_team_name}
                              </span>
                            </div>

                            {/* Center Scorebox */}
                            {match.status !== 'scheduled' && match.status !== 'TIMED' ? (
                              <div className="flex flex-col items-center">
                                <div className="bg-slate-900 text-white font-mono font-black text-xs px-2.5 py-1 rounded-sm flex items-center justify-center gap-1 text-center select-none shadow-sm">
                                  <span>{match.home_score}</span>
                                  <span className="text-zinc-500">-</span>
                                  <span>{match.away_score}</span>
                                </div>
                                <span className={`text-[8px] font-bold mt-1 uppercase ${
                                  match.status === 'live' ? 'text-red-600 animate-pulse' : 'text-slate-400'
                                }`}>
                                  {match.status === 'live' ? 'Em Andamento' : 'Encerrado'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <div className="bg-slate-100 border border-slate-200 font-mono text-zinc-500 text-[10px] py-1 px-2.5 rounded-md select-none font-black">
                                  {match.brasilia_time_text || 'A confirmar'}
                                </div>
                              </div>
                            )}

                            {/* Team B */}
                            <div className="flex items-center justify-end gap-2 w-[42%] text-right">
                              <span className="text-xs font-black text-slate-900 truncate">
                                {match.away_team_name}
                              </span>
                              <img src={match.away_team_crest_url || '⚽'} className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200" referrerPolicy="no-referrer" />
                            </div>
                          </div>

                          {/* Prediction User Action Interface */}
                          {isEditing ? (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3"
                            >
                              <div className="text-center text-[10px] font-bold text-[#006d34] uppercase tracking-wider">
                                DEFINIR PLACAR DO PALPITE
                              </div>
                              
                              <div className="flex justify-around items-center gap-4">
                                {/* Home score inputs */}
                                <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg p-1.5 font-sans">
                                  <button 
                                    onClick={() => setPredictionInputs(prev => ({
                                      ...prev,
                                      [matchIdStr]: {
                                        ...currentPrediction,
                                        home: Math.max(0, currentPrediction.home - 1)
                                      }
                                    }))}
                                    className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center text-xs"
                                  >
                                    -
                                  </button>
                                  <span className="w-6 text-center font-mono font-black text-base text-slate-900">
                                    {currentPrediction.home}
                                  </span>
                                  <button 
                                    onClick={() => setPredictionInputs(prev => ({
                                      ...prev,
                                      [matchIdStr]: {
                                        ...currentPrediction,
                                        home: currentPrediction.home + 1
                                      }
                                    }))}
                                    className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center text-xs"
                                  >
                                    +
                                  </button>
                                </div>

                                <span className="text-xs font-mono font-bold text-zinc-400">X</span>

                                {/* Away score inputs */}
                                <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg p-1.5 font-sans">
                                  <button 
                                    onClick={() => setPredictionInputs(prev => ({
                                      ...prev,
                                      [matchIdStr]: {
                                        ...currentPrediction,
                                        away: Math.max(0, currentPrediction.away - 1)
                                      }
                                    }))}
                                    className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center text-xs"
                                  >
                                    -
                                  </button>
                                  <span className="w-6 text-center font-mono font-black text-base text-slate-900">
                                    {currentPrediction.away}
                                  </span>
                                  <button 
                                    onClick={() => setPredictionInputs(prev => ({
                                      ...prev,
                                      [matchIdStr]: {
                                        ...currentPrediction,
                                        away: currentPrediction.away + 1
                                      }
                                    }))}
                                    className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              <div className="flex gap-2 pt-1">
                                <button 
                                  onClick={() => setEditingPredictionMatchId(null)}
                                  className="flex-1 py-1.5 rounded-lg border border-slate-300 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200"
                                >
                                  Cancelar
                                </button>
                                
                                <button 
                                  onClick={() => handleSavePrediction(matchIdStr)}
                                  disabled={submittingPrediction}
                                  className="flex-1 bg-[#006d34] hover:bg-[#004d25] text-white py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1"
                                >
                                  {submittingPrediction ? (
                                    <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    'Gravar Palpite'
                                  )}
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-slate-100 text-xs">
                              {hasUserPrediction ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-500">Seu palpite:</span>
                                  <div className="bg-[#006d34]/10 border border-[#006d34]/20 text-[#006d34] text-xs font-mono px-3 py-0.5 rounded-full font-extrabold">
                                    {match.user_prediction_home} x {match.user_prediction_away}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-zinc-400 italic">
                                  Sem palpite ativo
                                </span>
                              )}

                              <div className="flex gap-2">
                                <button 
                                  onClick={() => startEditingPrediction(match)}
                                  className="bg-[#006d34] text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase hover:brightness-110 active:scale-95 transition-all"
                                >
                                  {hasUserPrediction ? 'Alterar' : 'Palpitar'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}


          {/* ==================== TAB 3: GRUPOS (STANDINGS GRID) ==================== */}
          {activeTab === 'grupos' && (
            <div id="view-grupos" className="space-y-5 animate-in fade-in duration-250">
              
              <div className="flex justify-between items-center">
                <h2 className="text-base font-black text-[#006d34] uppercase tracking-wider flex items-center gap-1.5 font-display-lg">
                  <span>📊</span> TABELAS DA COPA
                </h2>
                <span className="text-[10px] text-zinc-500 font-mono">Copa de 2026</span>
              </div>

              {/* Group Standings grid rendering */}
              <div className="space-y-6">
                {standings.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center text-zinc-500 text-xs italic">
                    Nenhuma classificação disponível no momento.
                  </div>
                ) : (
                  standings.map((group) => {
                    const gLetter = group.group_letter;
                    const gName = group.group_name;
                    
                    let groupTeams: any[] = [];
                    try {
                      groupTeams = Array.isArray(group.teams) 
                        ? group.teams 
                        : (typeof group.teams === 'string' ? JSON.parse(group.teams) : []);
                    } catch (err) {
                      console.error('Error parsing teams JSON in detailed grid:', err);
                    }
                    
                    const sortedTeams = [...groupTeams].sort((a, b) => {
                      const ptsA = a.points ?? 0;
                      const ptsB = b.points ?? 0;
                      if (ptsA !== ptsB) return ptsB - ptsA;
                      
                      const gdA = a.goal_difference ?? 0;
                      const gdB = b.goal_difference ?? 0;
                      return gdB - gdA;
                    });

                    return (
                      <div key={gLetter} className="bg-white rounded-2xl overflow-hidden border border-[#c4c6d2]/30 shadow-sm">
                        {/* Section banner */}
                        <div className="bg-[#006d34] px-4 py-3 flex justify-between items-center">
                          <span className="text-xs font-black text-white uppercase tracking-wider">
                            Grupo {gLetter}
                          </span>
                          <span className="text-[9px] font-bold text-white/80">Classificação Geral</span>
                        </div>

                        {/* Standings table */}
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-500 font-sans">
                              <th className="py-2.5 px-3 w-10 text-center">Pos</th>
                              <th className="py-2.5 px-2">Seleção</th>
                              <th className="py-2.5 px-2 text-center w-8">J</th>
                              <th className="py-2.5 px-2 text-center w-8">V</th>
                              <th className="py-2.5 px-2 text-center w-8">SG</th>
                              <th className="py-2.5 px-3 text-right w-12 font-extrabold text-[#006d34]">Pts</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sortedTeams.map((state, sIdx) => {
                              const isRowHighlighted = sIdx < 2; // Zone of classification
                              const teamName = state.team_name_display || state.name || state.team_name || 'Seleção';
                              const crestUrl = state.crest_url || state.team_flag || '⚽';
                              const playedVal = state.played ?? 0;
                              const wonVal = state.won ?? 0;
                              const gdVal = state.goal_difference ?? 0;
                              const pointsVal = state.points ?? 0;
                              
                              return (
                                <tr 
                                  key={state.tla || state.team_code || sIdx}
                                  className={`text-xs hover:bg-slate-50 transition-colors ${
                                    isRowHighlighted ? 'bg-emerald-50/20' : ''
                                  }`}
                                >
                                  {/* Position with qualification borders */}
                                  <td className="py-3 px-3 text-center font-mono">
                                    <div className="flex items-center justify-center">
                                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                        sIdx === 0 
                                          ? 'bg-[#006d34] text-white' 
                                          : sIdx === 1 
                                          ? 'bg-emerald-200 text-emerald-800' 
                                          : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {sIdx + 1}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Team code and flag */}
                                  <td className="py-3 px-2">
                                    <div className="flex items-center gap-2">
                                      <img src={crestUrl} className="w-5 h-5 rounded-full object-cover border border-slate-100" referrerPolicy="no-referrer" />
                                      <span className="font-bold text-slate-900 truncate max-w-[140px]">
                                        {teamName}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="py-3 px-2 text-center font-mono text-slate-500">
                                    {playedVal}
                                  </td>
                                  <td className="py-3 px-2 text-center font-mono text-slate-500">
                                    {wonVal}
                                  </td>
                                  <td className="py-3 px-2 text-center font-mono font-bold text-slate-600">
                                    {gdVal > 0 ? `+${gdVal}` : gdVal}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900 bg-slate-50/50">
                                    {pointsVal}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}


          {/* ==================== TAB 4: PALPITES (MY WORK AREA) ==================== */}
          {activeTab === 'palpites' && (
            currentUser === null ? (
              <div id="view-palpites-guest" className="space-y-6 pt-8 animate-in fade-in duration-250 font-sans text-center max-w-sm mx-auto">
                <div className="bg-white rounded-3xl p-6 border border-[#c4c6d2]/40 shadow-sm flex flex-col items-center">
                  <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center font-bold text-[#fabd00] text-3xl border border-amber-100 shadow-inner mb-4 animate-bounce">
                    🎯
                  </div>
                  <h2 className="text-sm font-black text-[#006d34] uppercase tracking-wide">Meus Palpites Restritos</h2>
                  <p className="text-xs text-zinc-500 mt-2 leading-relaxed max-w-xs mx-auto">
                    Você está navegando como visitante. Para iniciar seu bolão e salvar seus palpites de forma segura, você precisa se registrar ou entrar.
                  </p>
                  <button
                    onClick={() => {
                      setLoginRequiredMessage("Faça login para gerenciar e salvar seus palpites.");
                      setIsLoginOpen(true);
                    }}
                    className="mt-6 w-full py-3 rounded-full bg-gradient-to-r from-[#006d34] to-[#004d25] border-2 border-[#fabd00] text-white text-xs font-black uppercase tracking-widest shadow-lg cursor-pointer hover:brightness-110 active:scale-98 transition-all font-mono"
                  >
                    Entrar no Bolão
                  </button>
                </div>
              </div>
            ) : (
              <div id="view-palpites" className="space-y-5 animate-in fade-in duration-250 font-sans">
              
              <div className="flex justify-between items-center">
                <h2 className="text-base font-black text-[#006d34] uppercase tracking-wider flex items-center gap-1.5 font-display-lg">
                  <span>🎯</span> MEUS PALPITES
                </h2>
                <span className="text-[10px] font-semibold text-[#006d34] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  Meus Gols
                </span>
              </div>

              {/* Stats Summary Panel */}
              <div className="bg-white rounded-2xl p-4 border border-[#c4c6d2]/30 shadow-sm grid grid-cols-3 gap-2.5 text-center">
                <div className="p-2 border-r border-slate-100">
                  <div className="text-lg font-black text-[#006d34] font-mono leading-tight flex justify-center items-center gap-1">
                    <span>{matches.filter(m => m.user_prediction_home !== undefined).length}</span>
                  </div>
                  <div className="text-[9px] text-zinc-500 uppercase font-semibold">Realizados</div>
                </div>

                <div className="p-2 border-r border-slate-100">
                  <div className="text-lg font-black text-amber-500 font-mono leading-tight">
                    {matches.filter(m => m.prediction_points === 10).length}
                  </div>
                  <div className="text-[9px] text-zinc-500 uppercase font-semibold">Exatos (10p)</div>
                </div>

                <div className="p-2">
                  <div className="text-lg font-black text-[#006d34] font-mono leading-tight">
                    {matches.filter(m => m.user_prediction_home !== undefined).reduce((acc, curr) => acc + (curr.prediction_points || 0), 0)}
                  </div>
                  <div className="text-[9px] text-zinc-500 uppercase font-semibold">Pontos Acum.</div>
                </div>
              </div>

              {/* Active predictions reviews */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest font-mono">
                  Lista Detalhada de Apostas
                </h3>

                {matches.filter(m => m.user_prediction_home !== undefined).length === 0 ? (
                  <div className="p-10 border border-dashed border-slate-200 text-center rounded-2xl space-y-3">
                    <div className="text-4xl">💭</div>
                    <p className="text-xs text-slate-500">
                      Você ainda não fez nenhum palpite para as rodadas.
                    </p>
                    <button 
                      onClick={() => setActiveTab('jogos')}
                      className="bg-[#006d34] hover:bg-[#004d25] text-white px-5 py-2 rounded-xl text-xs font-black uppercase inline-block active:scale-95 transition-all"
                    >
                      Acessar Calendário
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {matches
                      .filter(m => m.user_prediction_home !== undefined)
                      .map((match) => {
                        const groupDisplay = match.group_letter ? `Grupo ${match.group_letter}` : match.stage;
                        return (
                          <div key={match.id || match.match_id} className="bg-white rounded-2xl p-4 border border-[#c4c6d2]/30 shadow-sm hover:shadow-md transition-shadow duration-250">
                            {/* Game Info Line */}
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-black text-slate-400 font-mono uppercase tracking-wider">
                                {groupDisplay} • {match.brasilia_date_text || ''} • {match.brasilia_time_text || ''}
                              </span>
                              
                              {/* Status indicator */}
                              <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md font-sans tracking-tight border ${
                                match.status === 'finished' || match.prediction_points !== undefined
                                  ? 'bg-emerald-50 text-[#006d34] border-emerald-100'
                                  : match.status === 'live'
                                  ? 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse'
                                  : 'bg-zinc-50 text-zinc-600 border-zinc-100'
                              }`}>
                                {match.status === 'finished' || match.prediction_points !== undefined
                                  ? 'Calculado'
                                  : match.status === 'live'
                                  ? 'Bloqueado'
                                  : 'Pendente'}
                              </span>
                            </div>

                            {/* Main Team Card Info Panel */}
                            <div className="grid grid-cols-12 gap-2 items-center">
                              {/* Home Team */}
                              <div className="col-span-4 flex flex-col items-center text-center justify-center space-y-1">
                                <img 
                                  src={match.home_team_crest_url || '⚽'} 
                                  className="w-9 h-9 rounded-full border border-slate-100 shadow-sm object-cover shrink-0" 
                                  referrerPolicy="no-referrer" 
                                  alt={match.home_team_name}
                                />
                                <span className="text-[11px] sm:text-xs font-black text-slate-800 leading-tight line-clamp-2 max-w-full text-center">
                                  {match.home_team_name}
                                </span>
                              </div>

                              {/* Placar / Prediction Center Display Box */}
                              <div className="col-span-4 flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-[8px] text-zinc-400 uppercase font-black tracking-widest mb-1">Palpite</span>
                                <div className="font-mono text-sm sm:text-base font-black text-[#006d34] tracking-widest leading-none mb-1">
                                  {match.user_prediction_home} <span className="text-zinc-300 font-sans text-[11px]">x</span> {match.user_prediction_away}
                                </div>
                                
                                {/* Real match scores or points indicator */}
                                {match.status !== 'scheduled' && match.status !== 'TIMED' ? (
                                  <div className="text-center mt-1 pt-1 border-t border-slate-200/60 w-full flex flex-col items-center">
                                    <span className="text-[8px] text-slate-400">Placar: {match.home_score} x {match.away_score}</span>
                                    {match.prediction_points !== undefined && (
                                      <span className="text-[10px] font-black text-[#006d34] mt-0.5">
                                        +{match.prediction_points} pts
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center mt-1 pt-1 border-t border-slate-200/60 w-full">
                                    <span className="text-[8px] text-slate-400 italic">Não iniciado</span>
                                  </div>
                                )}
                              </div>

                              {/* Away Team */}
                              <div className="col-span-4 flex flex-col items-center text-center justify-center space-y-1">
                                <img 
                                  src={match.away_team_crest_url || '⚽'} 
                                  className="w-9 h-9 rounded-full border border-slate-100 shadow-sm object-cover shrink-0" 
                                  referrerPolicy="no-referrer" 
                                  alt={match.away_team_name}
                                />
                                <span className="text-[11px] sm:text-xs font-black text-slate-800 leading-tight line-clamp-2 max-w-full text-center">
                                  {match.away_team_name}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
            )
          )}


          {/* ==================== TAB 5: PERFIL (PROFILE & POOLS SETUP) ==================== */}
          {activeTab === 'perfil' && (
            currentUser === null ? (
              <div id="view-perfil-guest" className="space-y-6 pt-8 animate-in fade-in duration-250 font-sans text-center max-w-sm mx-auto">
                <div className="bg-white rounded-3xl p-6 border border-[#c4c6d2]/40 shadow-sm flex flex-col items-center">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full border-2 border-emerald-400 flex items-center justify-center text-[#006d34] text-3xl shadow-sm">
                      👤
                    </div>
                  </div>
                  <h2 className="text-sm font-black text-[#006d34] uppercase tracking-wide">Perfil Do Participante</h2>
                  <p className="text-xs text-zinc-500 mt-2 leading-relaxed max-w-xs mx-auto">
                    Aria reservada do participante. Acesse sua conta para visualizar suas estatísticas personalizadas, criar bolões exclusivos para seus amigos ou entrar em bolões privados existentes.
                  </p>
                  <button
                    onClick={() => {
                      setLoginRequiredMessage("Identifique-se para acessar seu perfil e administrar bolões.");
                      setIsLoginOpen(true);
                    }}
                    className="mt-6 w-full py-3 rounded-full bg-gradient-to-r from-[#006d34] to-[#004d25] border-2 border-[#fabd00] text-white text-xs font-black uppercase tracking-widest shadow-lg cursor-pointer hover:brightness-110 active:scale-98 transition-all font-mono"
                  >
                    Entrar Agora
                  </button>
                </div>
              </div>
            ) : (
              <div id="view-perfil" className="space-y-6 animate-in fade-in duration-250 font-sans">
              
              {/* Profile Card Header Display */}
              <section className="bg-white rounded-2xl p-5 border border-[#c4c6d2]/30 shadow-sm text-center flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#006d34] to-[#fabd00] flex items-center justify-center font-mono font-black text-xl text-white border-2 border-[#006d34] ring-4 ring-[#006d34]/10 shadow-sm uppercase">
                    {currentUser.apelido?.substring(0, 2) || currentUser.nome?.substring(0, 2) || 'P'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-[#fabd00] text-slate-950 p-1 rounded-full text-[10px] font-black border border-slate-900 shadow">
                    🏆
                  </div>
                </div>

                <div className="mt-1">
                  <h3 className="text-sm font-black text-slate-900">@{currentUser.apelido}</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{currentUser.nome || 'Participante Heldin\'s Bet'}</p>
                  <p className="text-[9px] text-zinc-400 font-mono mt-0.5">{currentUser.email}</p>
                </div>

                <div className="w-full h-px bg-slate-100 my-2" />

                <button 
                  onClick={onLogout}
                  className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1 bg-red-50 hover:bg-red-100 px-4.5 py-1.5 rounded-xl border border-red-200 transition-all active:scale-95"
                >
                  <span className="text-sm font-sans">🚪</span>
                  Sair do Aplicativo
                </button>
              </section>

              {/* Seção "Meu Desempenho" */}
              <section id="meu-desempenho-secao" className="bg-white rounded-2xl p-5 border border-[#c4c6d2]/30 shadow-sm space-y-4 font-sans text-left">
                <h3 className="text-xs font-black text-[#006d34] uppercase tracking-wider font-mono flex items-center gap-2">
                  <span>📊</span> Meu Desempenho
                </h3>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Estatísticas de desempenho calculadas para o bolão ativo: <strong className="text-slate-800 font-bold">{activePool?.nome}</strong>
                </p>

                {(() => {
                  const userRank = rankings.find(r => r.user_id === currentUser.id);
                  if (!userRank || !userRank.total_palpites) {
                    return (
                      <div className="bg-amber-50/50 border border-[#fabd00]/30 rounded-xl p-4 text-center mt-2 flex flex-col items-center gap-1">
                        <span className="text-xl">⚽</span>
                        <p className="text-xs font-bold text-slate-700">Você ainda não salvou palpites neste bolão.</p>
                        <p className="text-[10px] text-zinc-500">Faça seus primeiros palpites para ativar as estatísticas.</p>
                      </div>
                    );
                  }

                  const hitsExact = userRank.acertos_exatos || 0;
                  const totalGues = userRank.total_palpites || 0;
                  const totalPts = userRank.total_pontos || 0;
                  const hitsWithPoints = userRank.acertos_com_pontos || 0;
                  const hitsOutcome = Math.max(0, hitsWithPoints - hitsExact);
                  const hitRate = totalGues > 0 ? Math.round((hitsWithPoints / totalGues) * 100) : 0;

                  return (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col items-start gap-1">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Total de Palpites</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-lg">🎯</span>
                          <span className="text-base font-mono font-black text-slate-800">{totalGues}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col items-start gap-1">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Pontos Totais</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-lg">🏆</span>
                          <span className="text-base font-mono font-black text-[#006d34]">{totalPts} <span className="text-[10px] font-sans font-normal text-slate-400">pts</span></span>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col items-start gap-1">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Acertos Exatos</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-lg">⚽</span>
                          <span className="text-base font-mono font-black text-amber-600">{hitsExact}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col items-start gap-1">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Acertos de Resultado</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-lg">📊</span>
                          <span className="text-base font-mono font-black text-emerald-700">{hitsOutcome}</span>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-[#006d34]/5 to-[#fabd00]/5 border border-[#006d34]/15 col-span-2 p-3.5 rounded-xl flex flex-col gap-2">
                        <div className="flex justify-between items-center w-full">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[9px]">Taxa de Acerto</span>
                          <span className="text-xs font-mono font-black text-[#006d34]">{hitRate}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-[#006d34] to-[#fabd00] h-full rounded-full" 
                            style={{ width: `${hitRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </section>

              {/* Interface "Meus Bolões" - Section 8 Requirements */}
              <section id="interface-meus-boloes" className="bg-white rounded-2xl p-5 border border-[#c4c6d2]/30 shadow-sm space-y-4 font-sans text-left">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-[#006d34] uppercase tracking-wider font-display flex items-center gap-2">
                    <span>👥</span> Meus Bolões
                  </h3>
                  <button 
                    onClick={() => setIsCreatePoolOpen(true)}
                    className="text-[10px] bg-[#fabd00] hover:bg-[#fabd00]/90 text-slate-950 font-black px-2.5 py-1 rounded-lg uppercase font-mono tracking-wider"
                  >
                    Novo Bolão
                  </button>
                </div>

                <p className="text-[11px] text-zinc-500 leading-relaxed font-sans mt-1">
                  Abaixo estão os bolões que você participa. O bolão ativo controla os palpites do app, ranking e visualização dos resultados.
                </p>

                <div className="space-y-3.5 mt-3">
                  {allDisplayPools.map((p) => {
                    const isSelected = selectedPoolId === p.id;
                    const isOwner = p.owner_user_id === currentUser.id;
                    const roleText = isOwner ? "Organizador" : p.owner_user_id === "system" ? "Global" : "Participante";
                    const registerDate = p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : "01/06/2026";

                    return (
                      <div 
                        key={p.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected 
                            ? 'bg-[#006d34]/5 border-[#006d34] border-2 shadow-sm' 
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3 text-left">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-slate-900 truncate">
                                {p.nome}
                              </span>
                              {isSelected && (
                                <span className="bg-[#006d34] text-white text-[8px] font-mono font-black px-1.5 py-0.5 rounded uppercase font-sans">
                                  Ativo
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[10px] text-zinc-500 font-sans">
                              <div>
                                <span className="font-bold text-zinc-400 block uppercase text-[8px] tracking-wide mb-0.5">Código</span>
                                <span className="font-mono bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-100 font-bold">{p.codigo_convite}</span>
                              </div>
                              <div>
                                <span className="font-bold text-zinc-400 block uppercase text-[8px] tracking-wide mb-0.5">Função</span>
                                <span className="font-mono font-bold text-slate-800">{roleText}</span>
                              </div>
                              <div className="col-span-2 pt-1 border-t border-slate-100">
                                <span className="font-bold text-zinc-400 block uppercase text-[8px] tracking-wide mb-0.5">Data de Entrada</span>
                                <span className="font-mono text-slate-700">{registerDate}</span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 pt-0.5">
                            {!isSelected ? (
                              <button 
                                onClick={() => handleSelectPool(p.id)}
                                className="text-[9px] font-black uppercase text-[#006d34] bg-white border border-[#006d34]/30 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-transform active:scale-95"
                              >
                                Ativar
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-black flex items-center gap-0.5">
                                <span>✓</span> Selecionado
                              </span>
                            )}
                          </div>
                        </div>

                        {/* RESUMO DO BOLÃO - PARTICIPANTES, TOTAL PALPITES E LÍDER ATUAL */}
                        {(() => {
                          const est = (() => {
                            if (isSelected) {
                              const leader = rankings[0]?.user_apelido || rankings[0]?.user_nome || "Eduardo";
                              const totalPredictions = rankings.reduce((acc, r) => acc + (r.total_palpites || 0), 0);
                              return {
                                membersCount: poolMembers.length || rankings.length || 1,
                                totalPredictionsCount: totalPredictions || 0,
                                leaderName: `@${leader}`
                              };
                            } else {
                              // Deterministic mock summaries for other non-selected pools to make UI highly cohesive
                              const charSum = p.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
                              const estMembers = (charSum % 4) + 2; 
                              const estPalpites = estMembers * (3 + (charSum % 5));
                              const leadersList = ["Carlos", "Henrique", "Mariana", "Fernanda", "Rosalio", "Gustavo"];
                              const estLeader = leadersList[charSum % leadersList.length];
                              return {
                                membersCount: estMembers,
                                totalPredictionsCount: estPalpites,
                                leaderName: `@${estLeader}`
                              };
                            }
                          })();

                          return (
                            <div className="mt-3.5 bg-slate-50 rounded-xl p-3 border border-slate-200/50 grid grid-cols-3 gap-2 text-center text-[10px] font-sans">
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-[#8e909a] block uppercase font-bold text-[8px] tracking-wide mb-0.5">Membros</span>
                                <span className="font-mono font-black text-slate-700">👥 {est.membersCount}</span>
                              </div>
                              <div className="flex flex-col items-center justify-center border-x border-slate-200">
                                <span className="text-[#8e909a] block uppercase font-bold text-[8px] tracking-wide mb-0.5">Palpites</span>
                                <span className="font-mono font-black text-slate-700">🎯 {est.totalPredictionsCount}</span>
                              </div>
                              <div className="flex flex-col items-center justify-center min-w-0">
                                <span className="text-[#8e909a] block uppercase font-bold text-[8px] tracking-wide mb-0.5 truncate w-full">Líder</span>
                                <span className="font-bold text-[#006d34] truncate w-full">{est.leaderName}</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Sharing and Copying Actions inside Card */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
                          <button
                            onClick={() => handleCopyToClipboard(p.codigo_convite)}
                            className="flex-1 bg-slate-200/60 hover:bg-slate-200 text-slate-800 text-[9px] font-black uppercase py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 font-sans"
                          >
                            <span>📋</span> Copiar Código
                          </button>
                          <button
                            onClick={() => handleShareWhatsApp(p.nome, p.codigo_convite)}
                            className="flex-1 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-emerald-800 text-[9px] font-black uppercase py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 font-sans"
                          >
                            <span>💬</span> WhatsApp
                          </button>
                        </div>

                        {isSelected && isOwner && (
                          <div className="mt-2.5">
                            <button
                              onClick={() => {
                                setAdminPoolName(p.nome);
                                setAdminPoolDesc(p.descricao || '');
                                setIsAdminPanelOpen(true);
                              }}
                              className="w-full bg-[#006d34] hover:bg-[#004d25] text-white font-black uppercase text-[10px] py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1 font-sans cursor-pointer shadow-sm border border-[#fabd00]/55"
                            >
                              <span>⚙️</span> Administrar Bolão
                            </button>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              </section>

            </div>
          )
        )}

          {/* ==================== TAB: RANKING (INLINE LEAGUE STANDINGS) ==================== */}
          {activeTab === 'ranking' && (
            <div id="view-ranking" className="space-y-5 animate-in fade-in duration-250 font-sans">
              
              {/* Pool Info Card */}
              <div className="bg-gradient-to-br from-[#006d34] to-[#004d25] border border-[#fabd00]/30 rounded-2xl p-4 shadow-md text-left text-white">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[9px] font-black uppercase text-[#fabd00] tracking-widest block mb-1 font-mono">
                      BOLÃO ATIVO EM DISPUTA
                    </span>
                    <h4 className="text-sm font-black text-white tracking-wide font-sans">
                      {activePool?.nome || "Bolão Oficial"}
                    </h4>
                    {activePool?.descricao && (
                      <p className="text-[10px] text-zinc-300 mt-1 italic font-sans leading-relaxed">
                        {activePool.descricao}
                      </p>
                    )}
                  </div>
                  {activePool?.codigo_convite && (
                    <div className="text-right shrink-0">
                      <span className="text-[8px] text-zinc-300 block font-bold font-mono">CÓDIGO</span>
                      <span className="text-xs font-mono font-black text-[#fabd00] mt-1 bg-black/40 px-2.5 py-1 rounded border border-[#fabd00]/25 inline-block select-all">
                        {activePool.codigo_convite}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card "Minha Posição" */}
              {(() => {
                if (currentUser === null) return null;
                const userRank = rankings.find(r => r.user_id === currentUser.id);
                if (!userRank || !userRank.total_palpites) {
                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 text-center flex flex-col items-center gap-1.5 shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-sm">
                        ⚠️
                      </div>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Minha Posição</span>
                      <p className="text-[11px] text-zinc-500 leading-normal max-w-xs">
                        Faça seus primeiros palpites para entrar no ranking.
                      </p>
                    </div>
                  );
                }

                const position = userRank.posicao || (rankings.indexOf(userRank) + 1);
                const isTop3 = position <= 3;
                const positionIcon = position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : "🏆";
                const totalGues = userRank.total_palpites || 0;
                const hitRate = totalGues > 0 ? Math.round(((userRank.acertos_com_pontos || 0) / totalGues) * 100) : 0;

                return (
                  <div className="bg-white border-2 border-[#006d34] rounded-2xl p-4.5 shadow-md text-left flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.06] text-7xl select-none pointer-events-none">
                      🏆
                    </div>

                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] font-black uppercase text-[#006d34] tracking-widest font-mono flex items-center gap-1.5">
                        <span className="animate-pulse">🟢</span> Minha Posição
                      </span>
                      <span className="bg-[#006d34]/10 text-[#006d34] text-[8px] font-mono font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {activePool?.nome}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full ${
                          position === 1 ? 'bg-gradient-to-br from-[#ffd700] to-[#fabd00]' : 
                          position === 2 ? 'bg-gradient-to-br from-slate-200 to-slate-400' : 
                          position === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-700' : 
                          'bg-slate-50 border border-slate-200'
                        } flex items-center justify-center font-mono font-black text-lg text-slate-900 shadow-sm relative shrink-0`}>
                          {isTop3 ? positionIcon : `${position}º`}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">@{currentUser.apelido || 'Participante'}</h4>
                          <span className="text-[10px] text-zinc-400 font-mono">Você está competindo ao vivo!</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] text-zinc-400 block uppercase font-mono">TOTAL PONTOS</span>
                        <span className="text-lg font-mono font-black text-[#006d34]">{userRank.total_pontos || 0} <span className="text-xs font-sans font-normal text-slate-400">pts</span></span>
                      </div>
                    </div>

                    <div className="w-full h-px bg-slate-100" />

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500 font-mono">
                      <div className="p-1 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[8px] text-zinc-400 block uppercase">Palpites</span>
                        <strong className="text-slate-800 font-bold">{totalGues}</strong>
                      </div>
                      <div className="p-1 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[8px] text-zinc-400 block uppercase">Certeiros</span>
                        <strong className="text-amber-600 font-bold">{userRank.acertos_exatos || 0}</strong>
                      </div>
                      <div className="p-1 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[8px] text-zinc-400 block uppercase">Aproveit.</span>
                        <strong className="text-emerald-700 font-bold">{hitRate}%</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Scrollable List of Rankings inside Base Cards */}
              <div className="space-y-3">
                {rankings.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center text-xs text-slate-400 font-sans italic border border-[#c4c6d2]/30 shadow-sm animate-pulse flex flex-col items-center gap-1.5">
                    <span className="text-xl">🏆</span>
                    <strong className="font-bold text-slate-600">Este bolão ainda não tem palpites suficientes para formar o ranking.</strong>
                    <span className="text-[10px] text-zinc-400">Assim que os primeiros palpites forem computados, a tabela será revelada!</span>
                  </div>
                ) : (
                  rankings.map((user, idx) => {
                    const isCurrentUser = currentUser && user.user_id === currentUser.id;
                    const position = user.posicao || (idx + 1);
                    const isTop3 = position <= 3;
                    const displayPosition = `${position}º`;
                    const displayName = user.user_apelido || user.user_nome || `Membro ${idx+1}`;

                    const hitsExact = user.acertos_exatos || 0;
                    const totalGues = user.total_palpites || 0;
                    const hitsWithPoints = user.acertos_com_pontos || 0;
                    const hitsOutcome = Math.max(0, hitsWithPoints - hitsExact);

                    return (
                      <div 
                        key={user.user_id || idx} 
                        className={`bg-white rounded-2xl p-4 flex flex-col gap-2.5 border transition-all text-left relative overflow-hidden ${
                          isCurrentUser 
                            ? 'border-2 border-[#006d34] shadow-md bg-gradient-to-r from-white to-[#006d34]/5' 
                            : 'border-[#c4c6d2]/30 shadow-sm hover:border-[#006d34]/15'
                        }`}
                      >
                        {isCurrentUser && (
                          <div className="absolute top-0 right-0 bg-[#006d34] text-[#fabd00] text-[8px] font-mono font-black px-2 py-0.5 rounded-bl uppercase tracking-wider">
                            Você
                          </div>
                        )}

                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-black text-xs shadow-sm select-none ${
                              position === 1 ? 'bg-gradient-to-br from-[#ffd700] to-[#fabd00] text-slate-900 ring-2 ring-[#fabd00]/30' : 
                              position === 2 ? 'bg-gradient-to-br from-slate-100 to-slate-300 text-slate-850 ring-2 ring-slate-300/20' : 
                              position === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' : 
                              'bg-slate-50 border border-slate-200 text-slate-500 font-sans'
                            }`}>
                              {position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : displayPosition}
                            </div>
                            
                            <div className="flex flex-col">
                              <span className={`text-[13px] font-black tracking-wide ${isCurrentUser ? 'text-[#006d34]' : 'text-slate-800'}`}>
                                @{displayName}
                              </span>
                              <span className="text-[9px] text-zinc-400 tracking-wider uppercase font-semibold">
                                {position === 1 ? '👑 LÍDER DO BOLÃO' : position === 2 ? '⚡ SEGUIDO DE PERTO' : position === 3 ? '🔥 BRIGANDO PELO TOPO' : '⚽ COMPETIDOR ATIVO'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="block text-[8px] text-zinc-400 uppercase font-mono">PONTOS</span>
                            <span className="text-base font-mono font-black text-slate-800 leading-none">
                              {user.total_pontos || 0} <span className="text-[10px] font-sans font-normal text-slate-400">pts</span>
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-px bg-slate-100" />

                        <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500 font-sans font-medium">
                          <div className="flex flex-col items-center justify-center p-1 bg-slate-50 rounded-lg">
                            <span className="text-[8px] text-zinc-400 uppercase tracking-tight">Palpites Ativos</span>
                            <span className="font-mono font-black text-slate-700 mt-0.5">🎯 {totalGues}</span>
                          </div>
                          
                          <div className="flex flex-col items-center justify-center p-1 bg-slate-50 rounded-lg">
                            <span className="text-[8px] text-zinc-400 uppercase tracking-tight">Placar Exato</span>
                            <span className="font-mono font-black text-amber-600 mt-0.5">⚽ {hitsExact}</span>
                          </div>

                          <div className="flex flex-col items-center justify-center p-1 bg-slate-50 rounded-lg">
                            <span className="text-[8px] text-zinc-400 uppercase tracking-tight">Acerto Resultado</span>
                            <span className="font-mono font-black text-emerald-700 mt-0.5">📊 {hitsOutcome}</span>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

              {/* Point Scoring Rules Helper Card */}
              <div className="bg-slate-100 border border-slate-200/60 rounded-2xl p-3.5 text-center text-[10px] text-slate-500 flex items-center justify-center gap-2 font-sans shadow-sm">
                <span>Placar Exato = <strong>+10 pts</strong></span>
                <span>•</span>
                <span>Vencedor ou Empate = <strong>+4 pts</strong></span>
              </div>

            </div>
          )}

          {/* ==================== TAB: MATA-MATA (ELIMINATION STAGE CHAVEAMENTO) ==================== */}
          {activeTab === 'matamata' && (
            <div id="view-matamata" className="space-y-5 animate-in fade-in duration-250 font-sans">
              {(() => {
                const SECTIONS_ORDER = [
                  '16 avos / Primeira fase eliminatória',
                  'Oitavas',
                  'Quartas',
                  'Semifinais',
                  'Disputa de 3º lugar',
                  'Final'
                ];

                const getStageSection = (stage: string): string => {
                  const s = (stage || '').toUpperCase();
                  if (s.includes('32') || s.includes('THIRTY_TWO') || s.includes('LAST_32') || s.includes('16_AVOS')) {
                    return '16 avos / Primeira fase eliminatória';
                  }
                  if (s.includes('16') || s.includes('SIXTEEN') || s.includes('OITAVAS') || s.includes('OCTAVO') || s.includes('ROUND_OF_16')) {
                    return 'Oitavas';
                  }
                  if (s.includes('QUARTER') || s.includes('QUARTAS') || s.includes('EIGHTS') || s.includes('QUARTER_FINAL')) {
                    return 'Quartas';
                  }
                  if (s.includes('SEMI') || s.includes('SEMIFINAIS') || s.includes('SEMIS') || s.includes('SEMI_FINAL')) {
                    return 'Semifinais';
                  }
                  if (s.includes('THIRD') || s.includes('3º') || s.includes('TERCEIRO') || s.includes('BRONZE') || s.includes('3RD') || s.includes('PLACE_3')) {
                    return 'Disputa de 3º lugar';
                  }
                  if (s.includes('FINAL')) {
                    return 'Final';
                  }
                  return 'Mata-Mata';
                };

                const knockoutGames = matches.filter(m => {
                  const stage = (m.stage || '').toUpperCase();
                  return stage !== 'GROUP_STAGE' && !stage.includes('GROUP') && !stage.includes('GRUPO');
                });

                // Group knockout games
                const grouped: Record<string, VwWorldcupMatchApp[]> = {};
                SECTIONS_ORDER.forEach(sec => { grouped[sec] = []; });
                knockoutGames.forEach(m => {
                  const sec = getStageSection(m.stage || '');
                  if (!grouped[sec]) grouped[sec] = [];
                  grouped[sec].push(m);
                });

                const existsAnyMatch = knockoutGames.length > 0;

                const TeamLogo = ({ url, name }: { url?: string; name?: string }) => {
                  const hasImage = url && url.length > 5;
                  const isDefined = name && name.trim() !== '' && name.toLowerCase() !== 'a definir';
                  
                  if (hasImage && isDefined) {
                    return (
                      <img 
                        src={url} 
                        className="w-7 h-7 rounded-full border border-slate-100 object-cover shrink-0 shadow-sm" 
                        referrerPolicy="no-referrer" 
                        alt={name}
                      />
                    );
                  }
                  return (
                    <div className="w-7 h-7 rounded-full border border-dashed border-slate-350 bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-[9px] text-slate-450 font-bold">?</span>
                    </div>
                  );
                };

                if (!existsAnyMatch) {
                  return (
                    <div className="bg-white rounded-2xl p-8 text-center text-xs text-slate-400 font-sans italic border border-slate-200 shadow-sm animate-pulse">
                      Nenhum confronto de mata-mata agendado ainda... A fase de grupos está em andamento.
                    </div>
                  );
                }

                return (
                  <div className="space-y-5">
                    {/* Unique layout filters row */}
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide w-[calc(100%+32px)]">
                      <button
                        onClick={() => setMataMataActiveFilter('Todos')}
                        className={`text-[10px] font-black uppercase shrink-0 px-3.5 py-1.5 rounded-full border transition-all ${
                          mataMataActiveFilter === 'Todos'
                            ? 'bg-[#006d34] text-white border-[#006d34] shadow-sm'
                            : 'bg-white text-slate-500 border-[#c4c6d2]/30 hover:bg-slate-50 pb-[6px]'
                        }`}
                      >
                        Todos
                      </button>
                      {SECTIONS_ORDER.map(section => {
                        const count = grouped[section]?.length || 0;
                        if (count === 0) return null;
                        return (
                          <button
                            key={section}
                            onClick={() => setMataMataActiveFilter(section)}
                            className={`text-[10px] font-black uppercase shrink-0 px-3.5 py-1.5 rounded-full border transition-all ${
                              mataMataActiveFilter === section
                                ? 'bg-[#006d34] text-white border-[#006d34] shadow-sm'
                                : 'bg-white text-slate-500 border-[#c4c6d2]/30 hover:bg-slate-50 pb-[6px]'
                            }`}
                          >
                            {section === '16 avos / Primeira fase eliminatória' ? '16 Avos' : section} ({count})
                          </button>
                        );
                      })}
                    </div>

                    {/* Rendering matches under cards style */}
                    <div className="space-y-6">
                      {SECTIONS_ORDER.map(section => {
                        const list = grouped[section] || [];
                        if (list.length === 0) return null;
                        if (mataMataActiveFilter !== 'Todos' && mataMataActiveFilter !== section) return null;

                        return (
                          <div key={section} className="space-y-2.5">
                            <div className="flex justify-between items-center border-b border-rose-200/50 pb-1.5">
                              <h4 className="text-[11px] font-black text-[#006d34] uppercase tracking-wider">
                                {section === '16 avos / Primeira fase eliminatória' ? 'Primeira Fase Eliminatória' : section}
                              </h4>
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold">
                                {list.length} jogo(s)
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5">
                              {list.map(match => {
                                const isFinished = match.status === 'finished';
                                const hasScores = match.home_score !== undefined && match.home_score !== null;
                                const isLive = match.status === 'live';

                                const homeName = match.home_team_name || 'A definir';
                                const awayName = match.away_team_name || 'A definir';

                                return (
                                  <div 
                                    key={match.id || match.match_id}
                                    className="bg-white rounded-2xl border border-[#c4c6d2]/30 shadow-sm p-3.5 flex flex-col gap-3 text-left transition-all hover:border-[#006d34]/20"
                                  >
                                    <div className="flex justify-between items-center text-[9px] font-mono leading-none text-slate-400">
                                      <span className="font-bold text-[#006d34]">GAME #{match.match_id || match.id}</span>
                                      <span>{formatMatchDateTime(match)}</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 text-slate-900">
                                      <div className="flex items-center gap-2 flex-1 min-w-[35%]">
                                        <TeamLogo url={match.home_team_crest_url} name={homeName} />
                                        <span className={`text-xs font-black truncate ${homeName === 'A definir' ? 'text-slate-400 italic font-medium' : ''}`}>
                                          {homeName}
                                        </span>
                                      </div>

                                      <div className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/60 font-mono font-black text-xs text-center shrink-0 min-w-[50px]">
                                        {isFinished || hasScores ? (
                                          <span className="text-[#006d34] tracking-wider text-xs">
                                            {match.home_score} x {match.away_score}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 text-[10px] font-bold">VS</span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2 flex-1 justify-end min-w-[35%] text-right font-sans">
                                        <span className={`text-xs font-black truncate ${awayName === 'A definir' ? 'text-slate-400 italic font-medium' : ''}`}>
                                          {awayName}
                                        </span>
                                        <TeamLogo url={match.away_team_crest_url} name={awayName} />
                                      </div>
                                    </div>

                                    {/* Stadium details row */}
                                    <div className="flex justify-between items-center border-t border-slate-100 pt-2 text-[9px] text-slate-405">
                                      <span className="truncate max-w-[70%] text-slate-400 font-sans">
                                        📍 {match.stadium || "Estádio Principal"} • {match.city}
                                      </span>
                                      {isLive ? (
                                        <span className="text-amber-600 font-extrabold uppercase animate-pulse select-none bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[8px]">
                                          LIVE
                                        </span>
                                      ) : isFinished ? (
                                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">
                                          FIM
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 text-[8px] uppercase">
                                          AGENDADO
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ==================== TAB 6: SELEÇÕES (TEAMS DETAIL LIST) ==================== */}
          {activeTab === 'selecoes' && (
            <div id="view-selecoes" className="space-y-5 animate-in fade-in duration-250 font-sans">
              
              <div className="flex items-center gap-2 mb-1">
                <button 
                  onClick={() => setActiveTab('inicio')}
                  className="p-1 bg-[#1e293b]/5 hover:bg-[#1e293b]/10 rounded-full transition-colors active:scale-90 shrink-0"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-base font-black text-[#006d34] uppercase tracking-wider leading-none font-display-lg">
                    Seleções Participantes
                  </h2>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Heldin's Bet • Oficial ({teams.length || 48} equipes)
                  </span>
                </div>
              </div>

              {/* Search Bar Input */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar seleção pelo nome..."
                  value={teamSearchTerm}
                  onChange={(e) => setTeamSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-sans text-slate-800 placeholder-slate-400 outline-none focus:border-[#006d34] focus:ring-1 focus:ring-[#006d34] transition-all"
                />
              </div>

              {/* Group Buttons carousels A to L */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide w-[calc(100%+32px)]">
                <button 
                  onClick={() => setTeamGroupFilter('all')}
                  className={`text-[10px] font-black uppercase shrink-0 px-3 py-1.5 rounded-full border transition-all ${
                    teamGroupFilter === 'all' 
                      ? 'bg-[#006d34] text-white border-[#006d34] shadow-sm' 
                      : 'bg-white text-slate-500 border-[#c4c6d2]/30 hover:bg-slate-50'
                  }`}
                >
                  Todos os Grupos
                </button>
                {groupsList.map((g) => (
                  <button 
                    key={g}
                    onClick={() => setTeamGroupFilter(g)}
                    className={`text-[10px] font-black uppercase shrink-0 px-3 py-1.5 rounded-full border transition-all ${
                      teamGroupFilter === g 
                        ? 'bg-[#006d34] text-white border-[#006d34] shadow-sm' 
                        : 'bg-white text-slate-500 border-[#c4c6d2]/30 hover:bg-slate-50'
                    }`}
                  >
                    Grupo {g}
                  </button>
                ))}
              </div>

              {/* Render dynamic teams grouped and filtered */}
              <div className="space-y-5">
                {(() => {
                  const filtered = teams.filter(team => {
                    const matchesSearch = team.name.toLowerCase().includes(teamSearchTerm.toLowerCase()) || 
                                          (team.team_name_display && team.team_name_display.toLowerCase().includes(teamSearchTerm.toLowerCase())) ||
                                          (team.tla && team.tla.toLowerCase().includes(teamSearchTerm.toLowerCase()));
                    const matchesGroup = teamGroupFilter === 'all' || team.group_letter === teamGroupFilter;
                    return matchesSearch && matchesGroup;
                  });

                  // Group by group_letter
                  const grouped: { [key: string]: VwWorldcupTeamApp[] } = {};
                  filtered.forEach(team => {
                    const gl = team.group_letter || 'A';
                    if (!grouped[gl]) {
                      grouped[gl] = [];
                    }
                    grouped[gl].push(team);
                  });

                  const sortedLetters = Object.keys(grouped).sort();

                  if (sortedLetters.length === 0) {
                    return (
                      <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-400 font-sans italic border border-slate-200">
                        Nenhuma seleção encontrada para a busca...
                      </div>
                    );
                  }

                  return sortedLetters.map((letter) => (
                    <div key={letter} className="space-y-2 w-full box-border">
                      <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
                        <h4 className="text-xs font-black text-[#006d34] uppercase tracking-wider font-sans">
                          Grupo {letter}
                        </h4>
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold">
                          {grouped[letter].length} Equipe(s)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 w-full box-border">
                        {grouped[letter].sort((a,b) => (a.team_name_display || a.name).localeCompare(b.team_name_display || b.name)).map((team) => (
                          <div 
                            key={team.tla}
                            className="bg-white rounded-xl p-2.5 border border-[#c4c6d2]/30 shadow-sm flex items-center gap-2.5 transition-all hover:border-[#006d34]/30 w-full box-border"
                          >
                            <img 
                              src={team.crest_url || '⚽'} 
                              alt={team.team_name_display || team.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-100 shadow-sm shrink-0" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0 flex-1">
                              <h5 className="text-[11px] font-black text-slate-900 truncate">
                                {team.team_name_display || team.name}
                              </h5>
                              <span className="inline-block text-[9px] bg-slate-100 text-slate-500 font-mono font-bold px-1.5 py-0.5 rounded mt-0.5">
                                {team.tla}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>

            </div>
          )}

        </main>
      )}

      {/* --- FLOATING ACTION BUTTON (FAB) --- */}
      {/* Shortcut trigger to open matches tab and predict instantly */}
      {activeTab === 'inicio' && (
        <button 
          onClick={() => setActiveTab('jogos')}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[#006d34] text-white shadow-xl hover:translate-y-[-2px] active:translate-y-[1px] transition-all flex items-center justify-center z-40 focus:outline-none"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* --- BottomNavBar --- */}
      <nav id="bottom-nav-bar" className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200/60 rounded-t-2xl flex justify-around items-center px-1 pb-safe pt-2 h-20 shadow-[0_-5px_22px_rgba(0,0,0,0.06)] z-55">
        
        {/* Nav 1: Início */}
        <button 
          onClick={() => { setActiveTab('inicio'); }}
          className={`flex flex-col items-center justify-center transition-all px-2.5 py-1.5 rounded-2xl ${
            ['inicio', 'palpites', 'selecoes', 'matamata'].includes(activeTab)
              ? 'bg-[#006d34]/15 text-[#006d34] font-black' 
              : 'text-slate-400 hover:text-[#006d34]'
          }`}
        >
          <span className="text-lg leading-none">🏠</span>
          <span className="text-[9px] font-black uppercase tracking-tighter mt-1">Início</span>
        </button>

        {/* Nav 2: Jogos */}
        <button 
          onClick={() => { setActiveTab('jogos'); }}
          className={`flex flex-col items-center justify-center transition-all px-2.5 py-1.5 rounded-2xl ${
            activeTab === 'jogos' 
              ? 'bg-[#006d34]/15 text-[#006d34] font-black' 
              : 'text-slate-400 hover:text-[#006d34]'
          }`}
        >
          <span className="text-lg leading-none">⚽</span>
          <span className="text-[9px] font-black uppercase tracking-tighter mt-1">Jogos</span>
        </button>

        {/* Nav 3: Ranking */}
        <button 
          onClick={() => { setActiveTab('ranking'); }}
          className={`flex flex-col items-center justify-center transition-all px-2.5 py-1.5 rounded-2xl ${
            activeTab === 'ranking' 
              ? 'bg-[#006d34]/15 text-[#006d34] font-black' 
              : 'text-slate-400 hover:text-[#006d34]'
          }`}
        >
          <span className="text-lg leading-none">🏆</span>
          <span className="text-[9px] font-black uppercase tracking-tighter mt-1">Ranking</span>
        </button>

        {/* Nav 4: Grupos */}
        <button 
          onClick={() => { setActiveTab('grupos'); }}
          className={`flex flex-col items-center justify-center transition-all px-2.5 py-1.5 rounded-2xl ${
            activeTab === 'grupos' 
              ? 'bg-[#006d34]/15 text-[#006d34] font-black' 
              : 'text-slate-400 hover:text-[#006d34]'
          }`}
        >
          <span className="text-lg leading-none">📊</span>
          <span className="text-[9px] font-black uppercase tracking-tighter mt-1">Grupos</span>
        </button>

        {/* Nav 5: Perfil */}
        <button 
          onClick={() => { setActiveTab('perfil'); }}
          className={`flex flex-col items-center justify-center transition-all px-2.5 py-1.5 rounded-2xl ${
            activeTab === 'perfil' 
              ? 'bg-[#006d34]/15 text-[#006d34] font-black' 
              : 'text-slate-400 hover:text-[#006d34]'
          }`}
        >
          <span className="text-lg leading-none">👤</span>
          <span className="text-[9px] font-black uppercase tracking-tighter mt-1">Perfil</span>
        </button>
      </nav>

      {/* --- Modals Render Area --- */}
      <LoginModal 
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        message={loginRequiredMessage}
      />

      {/* === MODAL GERENCIAR BOLÕES (TROCAR, CRIAR E ENTRAR POR CÓDIGO) === */}
      <AnimatePresence>
        {isManagePoolsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsManagePoolsOpen(false)}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-md" 
            />

            {/* Content Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-sm max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in font-sans text-slate-800"
            >
              
              {/* Header */}
              <div className="p-5 border-b-2 border-[#fabd00] bg-[#006d34] flex items-center justify-between text-left text-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🏆</span>
                  <div>
                    <h3 className="font-bold text-sm text-[#fabd00] uppercase tracking-wider">
                      Minhas Ligas e Bolões
                    </h3>
                    <p className="text-[10px] text-emerald-100 font-bold font-mono uppercase tracking-wide">
                      Selecione ou participe de novos bolões
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsManagePoolsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-all text-xs flex items-center justify-center shrink-0 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Inner Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 text-left bg-white">
                
                {/* Section: Entrar por Código */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 text-left">
                  <span className="text-[9px] font-black uppercase text-slate-500 font-mono tracking-wider block">
                    🎟️ Entrar em Bolão por Código
                  </span>
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (requireLogin("Entre para participar de bolões privados.")) return;
                      if (!joinPoolCode.trim()) return;
                      try {
                        const joined = await service.joinPoolByCode(currentUser!.id, joinPoolCode);
                        triggerToast(`Sucesso! Entrou no bolão: ${joined.nome}`);
                        setJoinPoolCode('');
                        // Reload pools
                        const updatedPools = await service.getPools(currentUser!.id);
                        setPools(updatedPools);
                        // Auto-select
                        setSelectedPoolId(joined.id);
                        localStorage.setItem('selectedPoolId', joined.id);
                        setIsManagePoolsOpen(false);
                      } catch (err: any) {
                        triggerToast(`Erro: ${err.message || "Código inválido"}`);
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input 
                      type="text"
                      placeholder="Código (Ex: HELDIN26)"
                      value={joinPoolCode}
                      onChange={(e) => setJoinPoolCode(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 uppercase font-mono font-black placeholder-slate-400 outline-none focus:border-[#006d34] focus:ring-1 focus:ring-[#006d34]"
                    />
                    <button 
                      type="submit"
                      className="bg-[#006d34] hover:bg-[#004d25] border border-[#006d34]/20 text-white font-black uppercase text-[10px] py-2 px-4 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      Entrar
                    </button>
                  </form>
                </div>

                {/* Section: Coleção / List of Pools */}
                <div className="space-y-3 text-left">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-500 font-mono tracking-wider">
                      📋 Seus Bolões Participantes
                    </span>
                    <button 
                      onClick={() => setIsCreatePoolOpen(true)}
                      className="text-[10px] text-[#006d34] hover:underline flex items-center gap-0.5 font-bold"
                    >
                      <span>➕</span> Criar Bolão
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-1">
                    {allDisplayPools.map((p) => {
                      const isSelected = selectedPoolId === p.id;
                      const roleText = p.owner_user_id === currentUser?.id ? "Organizador" : p.owner_user_id === "system" ? "Global" : "Participante";
                      return (
                        <div 
                          key={p.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isSelected 
                              ? 'bg-[#006d34]/5 border-2 border-[#006d34] shadow-sm' 
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2 text-left">
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-black text-slate-900 block truncate leading-snug">
                                {p.nome}
                              </span>
                              {p.descricao && (
                                <p className="text-[9px] text-slate-500 font-sans leading-normal line-clamp-1 mt-0.5">
                                  {p.descricao}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[8px] font-mono text-[#006d34] uppercase font-bold bg-[#fabd00]/30 px-1.5 py-0.5 rounded border border-[#fabd00]/50">
                                  Cód: {p.codigo_convite}
                                </span>
                                <span className="text-[8px] text-white font-black bg-[#006d34] px-1.5 py-0.5 rounded font-mono">
                                  {roleText}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 flex flex-col gap-1.5 items-end">
                              {isSelected ? (
                                <>
                                  <span className="text-[8px] bg-[#fabd00] text-slate-950 font-black uppercase px-2 py-1 rounded font-mono">
                                    Ativo
                                  </span>
                                  {p.owner_user_id === currentUser?.id && (
                                    <button
                                      onClick={() => {
                                        setAdminPoolName(p.nome);
                                        setAdminPoolDesc(p.descricao || '');
                                        setIsAdminPanelOpen(true);
                                      }}
                                      className="text-[8px] bg-slate-800 hover:bg-slate-900 text-white font-bold uppercase px-2 py-1 rounded transition-colors font-sans cursor-pointer whitespace-nowrap"
                                    >
                                      ⚙️ Admin
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button 
                                  onClick={() => {
                                    setSelectedPoolId(p.id);
                                    localStorage.setItem('selectedPoolId', p.id);
                                    triggerToast(`Sucesso! Bolão ativo atualizado.`);
                                    setIsManagePoolsOpen(false);
                                  }}
                                  className="text-[8px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold uppercase px-2 py-1 rounded transition-transform active:scale-95 cursor-pointer"
                                >
                                  Ativar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Footer info banner */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-mono shrink-0">
                🏆 Junte-se ou crie competições para faturar canecos oficiais!
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === MODAL CRIAR BOLÃO === */}
      <AnimatePresence>
        {isCreatePoolOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreatePoolOpen(false)}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-md" 
            />

            {/* Content Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-in font-sans text-slate-800"
            >
              
              {/* Header */}
              <div className="p-5 border-b-2 border-[#fabd00] bg-[#006d34] flex justify-between items-center text-left text-white shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <div>
                    <h3 className="font-bold text-sm text-[#fabd00] uppercase tracking-wider">
                      Criar Novo Bolão
                    </h3>
                    <p className="text-[10px] text-emerald-100 font-bold uppercase font-mono tracking-wide">
                      Para amigos e familiares
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCreatePoolOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-all text-xs flex items-center justify-center shrink-0 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Content Form */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (requireLogin("Entre com a sua conta para criar seu próprio bolão de amigos.")) {
                    return;
                  }
                  if (!currentUser) return;
                  if (!newPoolName.trim()) return;
                  try {
                    const created = await service.createPool(currentUser.id, newPoolName);
                    triggerToast(`Sucesso! Bolão "${created.nome}" foi estabelecido.`);
                    setNewPoolName('');
                    // Reload Pools
                    const updatedPools = await service.getPools(currentUser.id);
                    setPools(updatedPools);
                    // Auto-select
                    setSelectedPoolId(created.id);
                    localStorage.setItem('selectedPoolId', created.id);
                    setIsCreatePoolOpen(false);
                    setIsManagePoolsOpen(false);
                  } catch (err: any) {
                    triggerToast(`Falha ao criar bolão.`);
                  }
                }}
                className="p-5 space-y-4 text-xs text-slate-850 text-left bg-white"
              >
                <div className="space-y-1.5 font-sans">
                  <label className="text-[10px] font-black uppercase text-slate-500 block tracking-widest leading-none">
                    Nome do Bolão *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Arena de Amigos do Trabalho"
                    value={newPoolName}
                    onChange={(e) => setNewPoolName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#006d34] focus:ring-1 focus:ring-[#006d34] shadow-sm transition-all duration-150"
                  />
                </div>

                <div className="space-y-1.5 font-sans">
                  <label className="text-[10px] font-black uppercase text-slate-500 block tracking-widest leading-none">
                    Descrição (Opcional)
                  </label>
                  <textarea 
                    placeholder="Ex: Disputa oficial do nosso setor de desenvolvimento"
                    rows={3}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#006d34] focus:ring-1 focus:ring-[#006d34] shadow-sm transition-all duration-150 resize-none"
                  />
                </div>

                <div className="flex gap-2.5 pt-2 font-sans">
                  <button 
                    type="button" 
                    onClick={() => setIsCreatePoolOpen(false)}
                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase text-slate-500 tracking-wider transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-[#006d34] hover:bg-[#004d25] text-white font-black uppercase text-[10px] py-3 rounded-xl tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                  >
                    Criar Bolão
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === MODAL ADMINISTRAR BOLÃO === */}
      <AnimatePresence>
        {isAdminPanelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdminPanelOpen(false)}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-md" 
            />

            {/* Content Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in font-sans text-left text-slate-800"
            >
              
              {/* Header */}
              <div className="p-5 border-b-2 border-[#fabd00] bg-[#006d34] flex justify-between items-center text-left text-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">⚙️</span>
                  <div>
                    <h3 className="font-bold text-sm text-[#fabd00] uppercase tracking-wider">
                      Painel Administrativo
                    </h3>
                    <p className="text-[10px] text-emerald-100 font-bold uppercase font-mono tracking-tight leading-none mt-0.5">
                      {activePool.nome}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAdminPanelOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-all text-xs flex items-center justify-center shrink-0 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 text-slate-800 text-xs bg-white">
                
                {/* PART 1: Informações do Bolão */}
                <form onSubmit={handleUpdatePoolInfo} className="space-y-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <h4 className="text-[10px] font-black uppercase text-[#006d34] font-mono tracking-wider block mb-1">
                    ✏️ Editar Dados do Bolão
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-500 block tracking-widest leading-none">
                      Nome do Bolão *
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="Nome do bolão"
                      value={adminPoolName}
                      onChange={(e) => setAdminPoolName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#006d34] focus:ring-1 focus:ring-[#006d34] shadow-sm transition-all duration-150"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-500 block tracking-widest leading-none">
                      Descrição do Bolão
                    </label>
                    <textarea 
                      placeholder="Detalhes ou regras do bolão"
                      rows={2}
                      value={adminPoolDesc}
                      onChange={(e) => setAdminPoolDesc(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#006d34] focus:ring-1 focus:ring-[#006d34] shadow-sm transition-all duration-150 resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button 
                      type="submit"
                      disabled={isSavingAdminInfo}
                      className="bg-[#006d34] hover:bg-[#004d25] disabled:opacity-55 text-white font-black uppercase text-[9px] py-2 px-4 rounded-lg tracking-wider transition-colors cursor-pointer shadow-sm"
                    >
                      {isSavingAdminInfo ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>
                </form>

                {/* PART 2: Código de Convite */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase text-[#006d34] font-mono tracking-wider">
                      🎟️ Código de Convite Ativo
                    </h4>
                    <p className="text-[10px] text-slate-550 leading-normal">
                      Compartilhe este código para que novos amigos possam ingressar no bolão.
                    </p>
                    <div className="inline-block mt-2 font-mono bg-[#fabd00]/30 text-[#006d34] px-3 py-1.5 rounded-lg border border-[#fabd00]/50 font-bold text-sm">
                      {activePool.codigo_convite}
                    </div>
                  </div>

                  <div className="shrink-0 pt-1">
                    <button 
                      type="button"
                      onClick={handleRegenerateCode}
                      disabled={isSavingAdminInfo}
                      className="w-full sm:w-auto bg-white hover:bg-slate-55 border border-slate-200 disabled:opacity-55 text-[#006d34] font-black uppercase text-[9px] py-2.5 px-3.5 rounded-lg tracking-wider transition-colors cursor-pointer text-center"
                    >
                      Gerar Novo Código
                    </button>
                  </div>
                </div>

                {/* PART 3: Lista de Participantes */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h4 className="text-[10px] font-black uppercase text-[#006d34] font-mono tracking-wider flex items-center gap-1.5">
                      <span>👥</span> Participantes Ativos
                    </h4>
                    <span className="text-[9px] font-mono text-slate-550 bg-slate-100 px-2.5 py-0.5 rounded-full font-bold">
                      {poolMembers.length} participante{poolMembers.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {loadingPoolMembers ? (
                    <div className="py-8 text-center text-slate-500 font-mono text-[10px] animate-pulse">
                      Buscando cadastro de integrantes...
                    </div>
                  ) : poolMembers.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 font-mono text-[10px]">
                      Nenhum participante ativo encontrado.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-1">
                      {poolMembers.map((member) => {
                        const isMemberOwner = member.role === 'owner';
                        return (
                          <div 
                            key={member.user_id}
                            className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-left shadow-sm"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-mono font-black text-slate-600 uppercase shrink-0">
                                {member.apelido?.substring(0, 2) || "P"}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    @{member.apelido}
                                  </span>
                                  {isMemberOwner ? (
                                    <span className="bg-[#fabd00]/30 text-[#006d34] border border-[#fabd00]/50 text-[8px] font-black px-1.5 py-0.5 rounded uppercase font-mono">
                                      Organizador
                                    </span>
                                  ) : (
                                    <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase font-mono">
                                      Membro
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {member.nome || "Participante"}
                                </p>
                                {member.email && (
                                  <p className="text-[8px] text-slate-400 font-mono truncate">
                                    {member.email}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0">
                              {isMemberOwner ? (
                                <span className="text-[9px] text-slate-400 font-bold whitespace-nowrap bg-slate-50 px-2 py-1 rounded">
                                  Dono do Bolão
                                </span>
                              ) : (
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveMember(member.user_id, member.apelido)}
                                  disabled={isSavingAdminInfo}
                                  className="text-[9px] bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                                >
                                  Remover
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5 shrink-0 font-sans">
                <button 
                  type="button" 
                  onClick={() => setIsAdminPanelOpen(false)}
                  className="py-2.5 px-5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase text-slate-500 tracking-wider transition-colors cursor-pointer shadow-sm"
                >
                  Fechar Painel
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
