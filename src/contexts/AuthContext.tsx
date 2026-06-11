/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, service } from '../lib/supabase';
import { Profile } from '../types';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string, apelido: string) => Promise<{ confirmationRequired: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync profile details on authentication state updates
  const syncProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    try {
      // Retrieve the profile using auth_user_id
      let currentProfile = await service.getProfileByAuthId(currentUser.id);
      
      // Self-healing: if the auth user exists but miraculously does not have a profile yet, create one
      if (!currentProfile) {
        console.log('Perfil não encontrado para o usuário logado. Corrigindo auto-healing...');
        const userMetadataName = currentUser.user_metadata?.nome || 'Participante';
        const userMetadataApelido = currentUser.user_metadata?.apelido || currentUser.email?.split('@')[0] || 'usuario';
        
        currentProfile = await service.ensureProfileForAuthUser(
          currentUser,
          userMetadataName,
          userMetadataApelido
        );
      } else {
        // Just verify and enforce default pool membership
        try {
          await service.ensurePoolMembership(currentProfile.id);
        } catch (poolErr) {
          console.warn('Alerta não bloqueante ao associar bolão padrão:', poolErr);
        }
      }

      setProfile(currentProfile);
    } catch (e) {
      console.error('Falha ao sincronizar perfil do participante:', e);
    }
  };

  useEffect(() => {
    // 1. Retrieve initial session state on boot
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await syncProfile(session.user);
        }
      } catch (e) {
        console.error('Erro na inicialização da sessão do Supabase:', e);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // 2. Set up listener for subsequent session and credentials updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const activeUser = session?.user || null;
      setUser(activeUser);
      await syncProfile(activeUser);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, nome: string, apelido: string): Promise<{ confirmationRequired: boolean }> => {
    // Standard registration utilizing custom app metadata containing initial credentials
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
          apelido
        }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error("Cadastro falhou: Nenhum usuário retornado.");

    // Create the associated profile table entry mapping
    try {
      await service.ensureProfileForAuthUser(data.user, nome, apelido);
    } catch (profileErr) {
      console.warn("Erro não impeditivo ao registrar perfil no signUp:", profileErr);
    }

    const confirmationRequired = !data.session;
    return { confirmationRequired };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
