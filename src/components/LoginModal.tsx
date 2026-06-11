/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, X, Mail, Lock, User, AtSign, AlertCircle, CheckCircle } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export default function LoginModal({ isOpen, onClose, message }: LoginModalProps) {
  const { signIn, signUp } = useAuth();
  
  // Tabs: 'login' | 'signup'
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  
  // Input fields state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanApelido = (val: string) => {
    // Normalizes apelido to lowercase alphanumeric text to act as pristine handle
    return val.toLowerCase().replace(/[^a-z0-9._]/g, '');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setSuccessText(null);
    setLoading(true);

    try {
      if (activeTab === 'login') {
        if (!email.trim() || !password) {
          throw new Error("Por favor, preencha todos os campos.");
        }
        await signIn(email.trim(), password);
        setSuccessText("Bem-vindo de volta ao jogo!");
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        if (!email.trim() || !password || !nome.trim() || !apelido.trim()) {
          throw new Error("Preencha todos os campos para se cadastrar.");
        }
        if (password.length < 6) {
          throw new Error("A senha precisa ter pelo menos 6 caracteres.");
        }
        
        const validatedApelido = cleanApelido(apelido);
        if (validatedApelido.length < 3) {
          throw new Error("Apelido precisa ter pelo menos 3 caracteres válidos.");
        }

        const res = await signUp(email.trim(), password, nome.trim(), validatedApelido);
        
        if (res?.confirmationRequired) {
          setSuccessText("Cadastro criado. Verifique seu e-mail para confirmar a conta antes de entrar.");
        } else {
          setSuccessText("Cadastro realizado com sucesso! Perfil associado ao bolão padrão.");
        }
        
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (err: any) {
      console.error("Erro na autenticação:", err);
      // Simplify internal Supabase errors for humans
      let msg = err.message || "Ocorreu um erro ao processar sua requisição.";
      const msgLower = msg.toLowerCase();
      
      if (msgLower.includes("rate limit") || msgLower.includes("rate_limit") || msgLower.includes("limit exceeded")) {
        msg = "Muitas tentativas de cadastro/login. Aguarde alguns minutos ou use outro e-mail de teste.";
      } else if (msgLower.includes("database error saving") || msgLower.includes("database error")) {
        msg = "Erro no banco ao salvar usuário. O Trigger de criação automática de perfil no Supabase está desatualizado (tentando inserir colunas excluídas de profiles como full_name/username). Contate o administrador.";
      } else if (msgLower.includes("email not confirmed") || msgLower.includes("email_not_confirmed")) {
        msg = "Cadastro criado com sucesso. Confirme seu e-mail antes de entrar ou aguarde a liberação do administrador.";
      } else if (msg.includes("Invalid login credentials") || msgLower.includes("invalid login") || msgLower.includes("invalid credentials")) {
        msg = "E-mail ou senha inválidos. Verifique os dados ou crie uma nova conta.";
      } else if (msgLower.includes("user already registered") || msgLower.includes("already exists")) {
        msg = "Este e-mail já está cadastrado. Que tal fazer login?";
      } else if (msgLower.includes("weak_password") || msgLower.includes("weak password")) {
        msg = "A senha fornecida é muito fraca.";
      }
      setErrorText(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Soft dark backdrop with elegant high-end blur */}
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-[360px] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-800">
        
        {/* Header decoration - Solid Emerald with Gold strip border */}
        <div className="p-5 border-b-2 border-[#fabd00] bg-[#006d34] flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#006d34] to-[#fabd00] p-[1.5px] shrink-0">
              <div className="w-full h-full bg-[#006d34] rounded-[6px] flex items-center justify-center font-display-lg font-black text-xs text-[#fabd00]">
                H
              </div>
            </div>
            <div>
              <h3 className="font-display-lg font-black text-xs text-white uppercase tracking-wider">
                Arena de Acesso
              </h3>
              <p className="text-[9px] text-[#fabd00] font-mono font-bold mt-0.5">
                {activeTab === 'login' ? 'Identifique sua credencial de jogo' : 'Crie seu apelido esportivo'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-all text-xs flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic trigger warning message */}
        {message && (
          <div className="bg-[#fabd00]/10 border-b border-[#fabd00]/25 px-4 py-2.5 flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 text-[#006d34] shrink-0 mt-0.5 animate-pulse" />
            <span className="text-[10px] font-sans font-bold text-[#006d34] leading-tight">
              {message}
            </span>
          </div>
        )}

        {/* Tab Selector buttons */}
        <div className="flex border-b border-slate-200 bg-slate-50 font-sans shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorText(null);
              setSuccessText(null);
            }}
            className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-[#006d34]/5 text-[#006d34] border-b-2 border-[#006d34]'
                : 'text-slate-500 hover:text-slate-850 hover:bg-slate-100/50'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setErrorText(null);
              setSuccessText(null);
            }}
            className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'signup'
                ? 'bg-[#006d34]/5 text-[#006d34] border-b-2 border-[#006d34]'
                : 'text-slate-500 hover:text-slate-850 hover:bg-slate-100/50'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Cadastrar
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleAuthSubmit} className="p-5 space-y-4 text-left bg-white">
          {errorText && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex gap-2 text-xs text-red-700 font-sans">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-tight">{errorText}</span>
            </div>
          )}

          {successText && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex gap-2 text-xs text-emerald-800 font-sans">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-tight">{successText}</span>
            </div>
          )}

          {/* Form details based on tab */}
          {activeTab === 'signup' && (
            <>
              {/* Profile full name input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-wider text-slate-500 uppercase font-mono">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Helder Rosalio"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006d34] focus:ring-1 focus:ring-[#006d34] font-sans"
                  />
                </div>
              </div>

              {/* Profile apelido definition */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-wider text-slate-500 uppercase font-mono flex justify-between">
                  <span>Apelido de Jogo</span>
                  <span className="text-[8px] text-zinc-400 lowercase font-sans">letras e números apenas</span>
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 font-black" />
                  <input
                    type="text"
                    required
                    maxLength={20}
                    placeholder="Ex: helder2026"
                    value={apelido}
                    onChange={(e) => setApelido(cleanApelido(e.target.value))}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006d34] focus:ring-1 focus:ring-[#006d34] font-mono font-bold"
                  />
                </div>
              </div>
            </>
          )}

          {/* E-mail configuration */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black tracking-wider text-slate-500 uppercase font-mono">
              Endereço de E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006d34] focus:ring-1 focus:ring-[#006d34] font-sans"
              />
            </div>
          </div>

          {/* Password configuration */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black tracking-wider text-slate-500 uppercase font-mono">
                Senha de Acesso
              </label>
              {activeTab === 'signup' && (
                <span className="text-[8px] text-zinc-400 font-sans">mín. 6 caracteres</span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                placeholder="Sua senha secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006d34] focus:ring-1 focus:ring-[#006d34] font-sans"
              />
            </div>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#006d34] hover:bg-[#004d25] text-white text-xs font-black uppercase tracking-widest shadow-md border border-[#006d34]/10 transition-all flex items-center justify-center gap-2 disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Aguarde um instante...</span>
              </>
            ) : activeTab === 'login' ? (
              <>
                <LogIn className="w-3.5 h-3.5 text-[#fabd00]" />
                <span>Iniciar Palpites</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5 text-[#fabd00]" />
                <span>Cadastrar E Entrar</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-[8px] text-center text-slate-400 font-mono shrink-0">
          Heldin's Bet utiliza criptografia segura para suas credenciais.
        </div>
      </div>
    </div>
  );
}
