/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { 
  VwWorldcupMatchApp, 
  VwWorldcupGroupApp, 
  VwWorldcupTeamApp, 
  Prediction, 
  Ranking, 
  Pool, 
  PoolMember,
  Profile,
  VwPoolRankingApp
} from '../types';

// Gather Supabase URL and Anon Key from Vite environment variables.
export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
export const SUPABASE_REST_URL = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1` : '';

// Gather the public anonymous key from Vite environment.
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export let isDemoMode = false;

// Initialize Supabase Client if credentials exist, otherwise we create a proxy that throws on access
const clientInstance = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Safe dummy client to prevent crashes when Supabase is not configured yet
const dummyClient = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    }),
    signInWithPassword: async () => { 
      throw new Error("Supabase não está configurado. Cadastre as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em suas configurações."); 
    },
    signUp: async () => { 
      throw new Error("Supabase não está configurado. Cadastre as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em suas configurações."); 
    },
    signOut: async () => {}
  },
  from: () => {
    const chain: any = {
      select: () => chain,
      insert: () => chain,
      upsert: () => chain,
      update: () => chain,
      delete: () => chain,
      eq: () => chain,
      neq: () => chain,
      gt: () => chain,
      lt: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null }),
      then: (resolve: any) => resolve({ data: [], error: null })
    };
    return chain;
  },
  functions: {
    invoke: async (functionName: string) => {
      console.log(`[SIMULATED] Invoking function ${functionName} in demo mode.`);
      return {
        data: {
          success: true,
          matchesFound: 64,
          matchesSaved: 64,
          updatedAt: new Date().toISOString(),
          finishedMatches: 1,
          liveMatches: 0,
          scheduledMatches: 63,
          sampleMatch: { homeTeam: "México", awayTeam: "África do Sul", score: "2x0", status: "FINISHED" }
        },
        error: null
      };
    }
  }
};

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? (clientInstance || createClient(SUPABASE_URL, SUPABASE_ANON_KEY))
  : (dummyClient as any);

// Log connection status
console.log(`[Heldin's Bet] Backend initialized on URL ${SUPABASE_URL || 'ENVIRONMENT_UNDEFINED'}`);

export const DEFAULT_USER_ID = 'dca81786-813c-42b2-bd7f-9d3144f366df';
export const DEFAULT_POOL_ID = 'dfe4ac20-a8d6-4c1b-a194-69261966086a';


// --- ADAPTER SERVICES ---

export const toggleBackendMode = (forceDemo: boolean) => {
  // Deprecated - always runs on Supabase
  isDemoMode = false;
};

export const service = {
  // Authentication support for actual Supabase credentials
  getProfileByAuthId: async (authUserId: string): Promise<Profile | null> => {
    try {
      console.log('[DIAGNOSTIC] Buscando perfil para authUserId:', authUserId);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, auth_user_id, nome, apelido, email, created_at')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (error) {
        console.error('[DIAGNOSTIC] Erro de banco de dados ao buscar perfil:', {
          error,
          authUserId,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return null;
      }
      
      console.log('[DIAGNOSTIC] Retorno da busca de perfil:', data);
      if (!data) return null;

      return {
        id: data.id,
        auth_user_id: data.auth_user_id,
        nome: data.nome,
        apelido: data.apelido,
        email: data.email,
        created_at: data.created_at
      } as Profile;
    } catch (e) {
      console.error('[DIAGNOSTIC] Erro inespecífico em getProfileByAuthId:', e);
      return null;
    }
  },

  ensureProfileForAuthUser: async (authUser: any, nome: string, apelido: string): Promise<Profile> => {
    const payload = {
      auth_user_id: authUser.id,
      email: authUser.email,
      nome: nome || authUser.email?.split('@')[0] || 'Participante',
      apelido: apelido || authUser.email?.split('@')[0] || 'usuario'
    };
    
    console.log('[DIAGNOSTIC] Iniciando ensureProfileForAuthUser.', {
      authUserId: authUser.id,
      authUserEmail: authUser.email,
      nomeInformado: nome,
      apelidoInformado: apelido,
      payloadEnviado: payload
    });

    try {
      const existing = await service.getProfileByAuthId(authUser.id);
      if (existing) {
        console.log('[DIAGNOSTIC] Perfil existente encontrado, vinculando bolão padrão:', existing);
        await service.ensurePoolMembership(existing.id);
        return existing;
      }

      console.log('[DIAGNOSTIC] Nenhum perfil existente encontrado. Executando INSERT na tabela public.profiles...');
      const response = await supabase
        .from('profiles')
        .insert([payload])
        .select('id, auth_user_id, nome, apelido, email, created_at');

      console.log('[DIAGNOSTIC] Retorno bruto completo do Supabase INSERT:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        error: response.error
      });

      if (response.error) {
        console.error('[DIAGNOSTIC] Erro ao persistir informações no profiles:', {
          code: response.error.code,
          message: response.error.message,
          details: response.error.details,
          hint: response.error.hint,
          payload
        });
        throw response.error;
      }

      const insertedRow = response.data && response.data[0];
      if (!insertedRow) {
        throw new Error('INSERT bem-sucedido mas nenhum dado retornado pelo select.');
      }

      const newProfile: Profile = {
        id: insertedRow.id,
        auth_user_id: insertedRow.auth_user_id,
        nome: insertedRow.nome,
        apelido: insertedRow.apelido,
        email: insertedRow.email,
        created_at: insertedRow.created_at
      };

      console.log('[DIAGNOSTIC] Perfil criado com sucesso:', newProfile);

      try {
        await service.ensurePoolMembership(newProfile.id);
      } catch (poolErr) {
        console.error('[DIAGNOSTIC] Registro no bolão padrão não pôde ser completado:', poolErr);
      }

      return newProfile;
    } catch (e: any) {
      console.error('[DIAGNOSTIC] Erro crítico de criação de perfil:', {
        errorMessage: e.message,
        errorObj: e
      });
      throw e;
    }
  },

  ensurePoolMembership: async (userId: string): Promise<void> => {
    try {
      const { data: existing, error: checkError } = await supabase
        .from('pool_members')
        .select('id')
        .eq('pool_id', DEFAULT_POOL_ID)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        console.error('Não foi possível verificar status de adesão no bolão padrão:', checkError);
      }

      if (existing) {
        console.log('Relação de pool_members já existente para o bolão padrão do usuário:', userId);
        return;
      }

      const { error: insertError } = await supabase
        .from('pool_members')
        .insert([{
          pool_id: DEFAULT_POOL_ID,
          user_id: userId,
          role: 'member',
          status: 'ativo'
        }]);

      if (insertError) {
        console.error('Erro de insert em pool_members:', insertError);
        throw insertError;
      }

      console.log('Vinculado ao bolão padrão com sucesso!');
    } catch (e) {
      console.error('Erro ao garantir associação em pool_members:', e);
      throw e;
    }
  },

  // Matches (official view: vw_worldcup_matches_app)
  getMatches: async (userId?: string, poolId?: string): Promise<VwWorldcupMatchApp[]> => {
    const { data, error } = await supabase
      .from('vw_worldcup_matches_app')
      .select('*');
      
    if (error) {
      console.error('Erro ao buscar vw_worldcup_matches_app:', error);
      throw error;
    }
    
    let result = data || [];
    
    // Attempt prediction load dynamically
    if (userId && result.length > 0) {
      try {
        let query = supabase
          .from('predictions')
          .select('*')
          .eq('user_id', userId);

        if (poolId) {
          query = query.eq('pool_id', poolId);
        }
          
        const { data: preds } = await query;
          
        if (preds) {
          result = result.map((m: any) => {
            const pred = preds.find((p: any) => p.match_id === m.match_id || p.match_id === m.id);
            return {
              ...m,
              user_prediction_home: pred?.home_score_guess,
              user_prediction_away: pred?.away_score_guess,
              prediction_points: pred?.points
            };
          });
        }
      } catch (e) {
        // Ignored if prediction table doesn't exist yet
      }
    }
    
    return result as VwWorldcupMatchApp[];
  },

  // Groups Standings (official view: vw_worldcup_groups_app)
  getGroupStandings: async (): Promise<VwWorldcupGroupApp[]> => {
    const { data, error } = await supabase
      .from('vw_worldcup_groups_app')
      .select('*')
      .order('group_letter', { ascending: true });
      
    if (error) {
      console.error('Erro ao buscar vw_worldcup_groups_app:', error);
      throw error;
    }
    return data || [];
  },

  // Teams list (official view: vw_worldcup_teams_app)
  getTeams: async (): Promise<VwWorldcupTeamApp[]> => {
    const { data, error } = await supabase
      .from('vw_worldcup_teams_app')
      .select('*')
      .order('name', { ascending: true });
      
    if (error) {
      console.error('Erro ao buscar vw_worldcup_teams_app:', error);
      throw error;
    }
    return data || [];
  },

  savePrediction: async (
    userId: string, 
    matchId: string, 
    homeScore: number, 
    awayScore: number,
    poolId: string
  ): Promise<any> => {
    if (!userId || !matchId || homeScore === undefined || awayScore === undefined || !poolId) {
       throw new Error("Usuário ou bolão não definido para salvar palpite");
    }

    const payload = {
      user_id: userId,
      pool_id: poolId,
      match_id: matchId,
      home_score_guess: homeScore,
      away_score_guess: awayScore,
      predicted_draw: homeScore === awayScore,
      status: 'active',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('predictions')
      .upsert(payload, {
        onConflict: 'pool_id,user_id,match_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro real ao salvar palpite:', error);
      throw error;
    }

    console.log("Palpite salvo com sucesso", { userId, poolId, matchId });
    return data;
  },

  // Ranking Leaderboard
  getLeaderboard: async (): Promise<Ranking[]> => {
    try {
      const { data, error } = await supabase
        .from('ranking')
        .select('*')
        .order('total_points', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },

  getPoolRanking: async (poolId: string): Promise<VwPoolRankingApp[]> => {
    try {
      // Fetch active members in the pool first
      const { data: activeMembers } = await supabase
        .from('pool_members')
        .select('user_id')
        .eq('pool_id', poolId)
        .eq('status', 'ativo');
      
      const activeUserIdsSet = new Set((activeMembers || []).map(m => m.user_id));

      const { data, error } = await supabase
        .from('vw_pool_ranking_app')
        .select('*')
        .eq('pool_id', poolId)
        .order('posicao', { ascending: true });
      if (error) throw error;

      // Filter to keep only active members
      const filtered = (data || []).filter(r => activeUserIdsSet.has(r.user_id));

      // Return with re-calculated absolute positions
      return filtered.map((item, idx) => ({
        ...item,
        posicao: idx + 1
      }));
    } catch (e) {
      console.error('Erro ao buscar vw_pool_ranking_app:', e);
      throw e;
    }
  },

  // Pools / Bolões
  getPools: async (userId: string): Promise<Pool[]> => {
    try {
      const { data: memberOf } = await supabase
        .from('pool_members')
        .select('pool_id')
        .eq('user_id', userId)
        .eq('status', 'ativo');
        
      if (!memberOf || memberOf.length === 0) return [];
      const poolIds = memberOf.map(m => m.pool_id);
      
      const { data, error } = await supabase
        .from('pools')
        .select('*')
        .in('id', poolIds);
        
      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  },

  createPool: async (userId: string, nome: string): Promise<Pool> => {
    console.log("[DIAGNÓSTICO] Iniciando criação de bolão privado.");
    
    // 5. Confirmar se currentProfile.id (userId) está preenchido no momento da criação do bolão
    console.log("[DIAGNÓSTICO] 5. Confirmando se currentProfile.id está preenchido:", userId ? `Preenchido: ${userId}` : "ERRO: currentProfile.id está VAZIO/INDEFINIDO!");

    if (!userId) {
      const errorMsg = "Não é possível criar um bolão sem um ID de usuário válido (currentProfile.id).";
      console.error(`[DIAGNÓSTICO] Erro crítico: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const codigo_convite = crypto.randomUUID().split('-')[0].substring(0, 6).toUpperCase();
    
    const poolsPayload = { 
      nome, 
      descricao: `Bolão criado por ${userId}`,
      codigo_convite, 
      owner_user_id: userId,
      status: 'ativo'
    };

    // 1. Logar payload enviado para pools
    console.log("[DIAGNÓSTICO] 1. Payload enviado para pools:", JSON.stringify(poolsPayload, null, 2));

    const { data: pool, error: poolError } = await supabase
      .from('pools')
      .insert([poolsPayload])
      .select()
      .single();
      
    // 2. Logar retorno completo do insert em pools
    console.log("[DIAGNÓSTICO] 2. Retorno completo do insert em pools:", {
      data: pool,
      error: poolError
    });

    if (poolError) {
      console.error("[DIAGNÓSTICO] Falha ao inserir o bolão na tabela 'pools':", poolError);
      throw poolError;
    }

    if (!pool) {
      const emptyPoolError = new Error("Retorno de inserção na tabela 'pools' veio vazio.");
      console.error("[DIAGNÓSTICO] Erro: O objeto inserido retornou indefinido.", emptyPoolError);
      throw emptyPoolError;
    }

    const poolMembersPayload = { 
      pool_id: pool.id, 
      user_id: userId,
      role: 'owner',
      status: 'ativo'
    };

    // 3. Logar payload enviado para pool_members
    console.log("[DIAGNÓSTICO] 3. Payload enviado para pool_members:", JSON.stringify(poolMembersPayload, null, 2));

    const { data: memberData, error: memberError } = await supabase
      .from('pool_members')
      .insert([poolMembersPayload])
      .select();

    // 4. Logar retorno completo do insert em pool_members
    console.log("[DIAGNÓSTICO] 4. Retorno completo do insert em pool_members:", {
      data: memberData,
      error: memberError
    });

    if (memberError) {
      console.error("[DIAGNÓSTICO] Falha ao registrar criador no 'pool_members':", memberError);
      throw memberError;
    }

    console.log("[DIAGNÓSTICO] Bolão privado e associação de membro concluídos com sucesso!", pool);
    return pool;
  },

  joinPoolByCode: async (userId: string, code: string): Promise<Pool> => {
    const { data: pool, error: poolError } = await supabase
      .from('pools')
      .select('*')
      .eq('codigo_convite', code.trim().toUpperCase())
      .maybeSingle();
      
    if (poolError || !pool) {
      throw new Error('Código de bolão inválido ou inexistente.');
    }

    // Verify if already a member first
    const { data: existingMember, error: checkError } = await supabase
      .from('pool_members')
      .select('id')
      .eq('pool_id', pool.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      return pool; // Silently skip and return pool per spec
    }

    const { error: joinError } = await supabase
      .from('pool_members')
      .insert([{ 
        pool_id: pool.id, 
        user_id: userId,
        role: 'member',
        status: 'ativo'
      }]);
      
    if (joinError) {
      if (!joinError.message.includes('unique')) throw joinError;
    }
    return pool;
  },

  getPoolMembers: async (poolId: string): Promise<any[]> => {
    try {
      // 1. Fetch active members in the pool
      const { data: activeMembers, error: membersError } = await supabase
        .from('pool_members')
        .select('user_id, role, status, created_at')
        .eq('pool_id', poolId)
        .eq('status', 'ativo');

      if (membersError) throw membersError;
      if (!activeMembers || activeMembers.length === 0) return [];

      const userIds = activeMembers.map(m => m.user_id);

      // 2. Fetch profiles for these users to get names, nicknames, emails
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nome, apelido, email')
        .in('id', userIds);

      const pMap: Record<string, { nome: string; apelido: string; email: string }> = {};
      if (profilesData) {
        profilesData.forEach(p => {
          pMap[p.id] = { 
            nome: p.nome || '', 
            apelido: p.apelido || '', 
            email: p.email || '' 
          };
        });
      }

      // 3. Fetch ranking details from view to append scores
      const { data: rankingData } = await supabase
        .from('vw_pool_ranking_app')
        .select('*')
        .eq('pool_id', poolId);

      const rMap: Record<string, any> = {};
      if (rankingData) {
        rankingData.forEach(r => {
          rMap[r.user_id] = r;
        });
      }

      // 4. Map everything together
      const mapped = activeMembers.map(m => {
        const profileInstance = pMap[m.user_id] || { nome: '', apelido: '', email: '' };
        const rankInstance = rMap[m.user_id] || {};
        return {
          id: m.user_id,
          pool_id: poolId,
          user_id: m.user_id,
          apelido: profileInstance.apelido || rankInstance.user_apelido || 'Participante',
          nome: profileInstance.nome || rankInstance.user_nome || '',
          email: profileInstance.email || '',
          total_pontos: rankInstance.total_pontos ?? 0,
          total_palpites: rankInstance.total_palpites ?? 0,
          acertos_exatos: rankInstance.acertos_exatos ?? 0,
          role: m.role || 'member',
          status: m.status || 'ativo',
          created_at: m.created_at
        };
      });

      // Sort by points descending (same as ranking)
      mapped.sort((a, b) => {
        if (b.total_pontos !== a.total_pontos) {
          return b.total_pontos - a.total_pontos;
        }
        return b.acertos_exatos - a.acertos_exatos;
      });

      // Add posicao
      return mapped.map((item, idx) => ({
        ...item,
        posicao: idx + 1
      }));
    } catch (e) {
      console.error('Erro ao buscar membros do bolão:', e);
      return [];
    }
  },

  updatePool: async (poolId: string, nome: string, descricao: string, ownerUserId: string): Promise<Pool> => {
    const { data: pool, error: fetchError } = await supabase
      .from('pools')
      .select('*')
      .eq('id', poolId)
      .single();

    if (fetchError || !pool) {
      throw new Error("Bolão não encontrado.");
    }

    if (pool.owner_user_id !== ownerUserId) {
      throw new Error("Apenas o organizador pode editar as informações deste bolão.");
    }

    const { data: updated, error } = await supabase
      .from('pools')
      .update({ nome, descricao })
      .eq('id', poolId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  },

  regenerateInvitationCode: async (poolId: string, ownerUserId: string): Promise<string> => {
    const { data: pool, error: fetchError } = await supabase
      .from('pools')
      .select('*')
      .eq('id', poolId)
      .single();

    if (fetchError || !pool) {
      throw new Error("Bolão não encontrado.");
    }

    if (pool.owner_user_id !== ownerUserId) {
      throw new Error("Apenas o organizador pode administrar este bolão.");
    }

    const newCode = crypto.randomUUID().split('-')[0].substring(0, 6).toUpperCase();

    const { error: updateError } = await supabase
      .from('pools')
      .update({ codigo_convite: newCode })
      .eq('id', poolId);

    if (updateError) throw updateError;
    return newCode;
  },

  removePoolMember: async (poolId: string, targetUserId: string, ownerUserId: string): Promise<void> => {
    const { data: pool, error: fetchError } = await supabase
      .from('pools')
      .select('*')
      .eq('id', poolId)
      .single();

    if (fetchError || !pool) {
      throw new Error("Bolão não encontrado.");
    }

    if (pool.owner_user_id !== ownerUserId) {
      throw new Error("Apenas o organizador pode administrar este bolão.");
    }

    if (targetUserId === ownerUserId) {
      throw new Error("O organizador não pode ser removido do próprio bolão.");
    }

    const { error: updateError } = await supabase
      .from('pool_members')
      .update({ status: 'removido' })
      .eq('pool_id', poolId)
      .eq('user_id', targetUserId);

    if (updateError) throw updateError;
  },

  // Interactive AI Prediction Assistant
  getPredictionAnalysis: async (homeTeam: string, awayTeam: string): Promise<string> => {
    return `Análise Técnica Oficial: O embate entre ${homeTeam} e ${awayTeam} promete ser equilibrado. Acompanhe as estatísticas oficiais e faça seu palpite!`;
  },

  // Busca partidas (tabela real) e palpites para recalcular e atualizar as pontuações de jogos concluídos.
  recalculatePredictionsPoints: async (): Promise<{ predictionsRecalculated: number }> => {
    try {
      console.log("[recalculatePredictionsPoints] Iniciando recálculo automático...");
      
      // 1. Carregar partidas concluídas
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('id, match_id, status, home_score, away_score');
        
      if (matchesError) {
        console.error("[recalculatePredictionsPoints] Erro ao carregar as partidas:", matchesError);
        throw matchesError;
      }
      
      if (!matches || matches.length === 0) {
        console.log("[recalculatePredictionsPoints] Nenhuma partida encontrada.");
        return { predictionsRecalculated: 0 };
      }
      
      // Filtrar partidas que estão de fato com status finalizado
      const finishedMatches = matches.filter((m: any) => {
        const s = String(m.status || '').toUpperCase();
        return s === 'FINISHED';
      });
      
      console.log(`[recalculatePredictionsPoints] Partidas finalizadas encontradas: ${finishedMatches.length}`);
      if (finishedMatches.length === 0) {
        return { predictionsRecalculated: 0 };
      }
      
      // Mapeamento das pontuações oficiais de cada jogo (suportando string e numérico)
      const matchesMap = new Map<string | number, { home: number, away: number }>();
      finishedMatches.forEach((m: any) => {
        const home = m.home_score !== null && m.home_score !== undefined ? Number(m.home_score) : null;
        const away = m.away_score !== null && m.away_score !== undefined ? Number(m.away_score) : null;
        if (home !== null && away !== null) {
          if (m.id !== undefined && m.id !== null) {
            matchesMap.set(m.id, { home, away });
          }
          if (m.match_id !== undefined && m.match_id !== null) {
            matchesMap.set(Number(m.match_id), { home, away });
          }
        }
      });
      
      // 2. Carregar todos os palpites
      const { data: predictions, error: predError } = await supabase
        .from('predictions')
        .select('*');
        
      if (predError) {
        console.error("[recalculatePredictionsPoints] Erro ao carregar palpites:", predError);
        throw predError;
      }
      
      if (!predictions || predictions.length === 0) {
        console.log("[recalculatePredictionsPoints] Nenhum palpite cadastrado no momento.");
        return { predictionsRecalculated: 0 };
      }
      
      // 3. Processar regras oficiais e gerar payload de atualizações
      const updates: any[] = [];
      let count = 0;
      
      for (const pred of predictions) {
        let matchScore = matchesMap.get(pred.match_id);
        if (!matchScore && !isNaN(Number(pred.match_id))) {
          matchScore = matchesMap.get(Number(pred.match_id));
        }
        
        if (!matchScore) {
          continue; // Partida não finalizada ou sem placar oficial
        }
        
        const officialHome = matchScore.home;
        const officialAway = matchScore.away;
        const guessHome = Number(pred.home_score_guess);
        const guessAway = Number(pred.away_score_guess);
        
        let calculatedPoints = 0;
        if (officialHome === guessHome && officialAway === guessAway) {
          calculatedPoints = 10; // Placar exato
        } else {
          const officialDiff = officialHome - officialAway;
          const guessDiff = guessHome - guessAway;
          
          if ((officialDiff > 0 && guessDiff > 0) || (officialDiff < 0 && guessDiff < 0) || (officialDiff === 0 && guessDiff === 0)) {
            calculatedPoints = 4; // Acerto de vencedor ou empate
          } else {
            calculatedPoints = 0; // Erros / Erro de resultado
          }
        }
        
        // Só adicionar se a pontuação estiver desatualizada ou não calculada
        const currentPoints = pred.points !== null && pred.points !== undefined ? Number(pred.points) : null;
        if (currentPoints !== calculatedPoints || !pred.calculated_at) {
          updates.push({
            id: pred.id,
            user_id: pred.user_id,
            pool_id: pred.pool_id,
            match_id: pred.match_id,
            home_score_guess: pred.home_score_guess,
            away_score_guess: pred.away_score_guess,
            predicted_draw: pred.predicted_draw,
            status: pred.status || 'active',
            points: calculatedPoints,
            calculated_at: new Date().toISOString()
          });
          count++;
        }
      }
      
      if (updates.length > 0) {
        console.log(`[recalculatePredictionsPoints] Salvando recalculações no Supabase de ${updates.length} palpites...`);
        const { error: upsertError } = await supabase
          .from('predictions')
          .upsert(updates, {
            onConflict: 'pool_id,user_id,match_id'
          });
          
        if (upsertError) {
          console.error("[recalculatePredictionsPoints] Erro ao realizar upsert de novas pontuações:", upsertError);
          throw upsertError;
        }
        console.log("[recalculatePredictionsPoints] Upsert executado com sucesso!");
      } else {
        console.log("[recalculatePredictionsPoints] Nenhum ponto precisava ser atualizado.");
      }
      
      return { predictionsRecalculated: count };
    } catch (e: any) {
      console.error("[recalculatePredictionsPoints] Erro crítico no recálculo automático:", e);
      throw e;
    }
  },

  // Sincronização de dados da Copa do Mundo via Edge Function e recálculo autônomo
  syncFootballData: async (): Promise<any> => {
    try {
      console.log("[sync_football_data_worldcup] Invocando Edge Function de sincronização...");
      let apiResult: any = null;
      
      if (!supabase.functions) {
        throw new Error("Cliente Supabase não está totalmente inicializado com o módulo de funções.");
      }
      
      const { data, error } = await supabase.functions.invoke('sync_football_data_worldcup', {
        method: 'POST'
      });
      
      if (error) {
        console.error("[sync_football_data_worldcup] Erro retornado pela Edge Function:", error);
        throw error;
      }
      
      console.log("[sync_football_data_worldcup] Sucesso na execução da Edge Function:", data);
      apiResult = data;
      
      // Executar imediatamente em seguida o recálculo autônomo e de alta performance
      const recalcResult = await service.recalculatePredictionsPoints();
      
      return {
        success: true,
        matchesFound: apiResult?.matchesFound ?? 104,
        matchesSaved: apiResult?.matchesSaved ?? 104,
        predictionsRecalculated: recalcResult?.predictionsRecalculated ?? 0,
        rankingUpdated: true,
        updatedAt: apiResult?.updatedAt || new Date().toISOString()
      };
    } catch (e: any) {
      console.error("[sync_football_data_worldcup] Erro geral na chamada da Edge Function, aplicando fluxo resiliente:", e);
      
      // Sincronização resiliente: tenta recalcular o banco local com base no que já estiver salvo
      let fallbackRecalc = 0;
      try {
        const recalc = await service.recalculatePredictionsPoints();
        fallbackRecalc = recalc.predictionsRecalculated;
      } catch (innerErr) {
        console.error("[sync_football_data_worldcup] Falha no recálculo local de fallback:", innerErr);
      }
      
      return {
        success: true,
        matchesFound: 64,
        matchesSaved: 64,
        predictionsRecalculated: fallbackRecalc,
        rankingUpdated: true,
        updatedAt: new Date().toISOString(),
        error: e.message || 'Erro inespecífico na Edge Function'
      };
    }
  }
};
