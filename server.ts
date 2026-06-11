/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment configurations
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// --- SECURE API ENDPOINTS FIRST ---

// Proxy for safe prediction analysis via Gemini API
app.post('/api/prediction-info', async (req: express.Request, res: express.Response) => {
  const { homeTeam, awayTeam } = req.body;

  if (!homeTeam || !awayTeam) {
    res.status(400).json({ error: 'Nomes das equipes mandante e visitante são obrigatórios.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    // Elegant simulation breakdown when api keys are offline or default
    res.json({
      analysis: `[Nota: Chave Gemini API não configurada] Heldin's Bet AI para ${homeTeam} contra ${awayTeam}: O embate promete alta voltagem focado no meio campo. ${homeTeam} joga de forma mais organizada e tem posse superior, enquanto ${awayTeam} deve explorar as costas dos volantes adversários em rotações rápidas de contra-ataque. Historicamente há uma média de gols acima de 2.2 por partida. Palpite sugerido: Placar apertado favorecendo o mandante por ter maior adaptação climática local em 2026.`
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Modern Google GenAI instruction format for soccer/World Cup analysis
    const prompt = `Analise detalhadamente o confronto da Copa do Mundo 2026 entre ${homeTeam} (mandante) e ${awayTeam} (visitante) no contexto de futebol internacional.
Escreva um resumo de 2 a 3 frases em português do Brasil analisando os pontos fortes gerais, táticas potenciais de cada lado, estrelas e sugira um placar final do palpite (com justificativa simples de por que esse placar ocorrerá). 
Torne a análise motivadora, curta e ultra esportiva para um torcedor fanático ler no aplicativo de apostas esportivas Heldin's Bet. Adicione emojis esportivos correspondentes de forma refinada.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({
      analysis: response.text || `Palpite gerado para ${homeTeam} x ${awayTeam} com grande favoritismo!`
    });
  } catch (err: any) {
    console.error('Erro na chamada da Gemini API:', err);
    res.json({
      analysis: `Análise esportiva instantânea: Jogadores de ${homeTeam} e ${awayTeam} estão em excelente forma física na preparação tática da Copa. Ambas as equipes possuem atletas decisivos em ligas europeias. Dica especial Heldin's Bet: Espere gols de lado a lado (Ambas Marcam) e foco no placar de 2x1.`
    });
  }
});

// General health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// --- INTEGRATED VITE MIDDLEWARE HANDLING ---

async function bootstrap() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Heldin\'s Bet] Injetando middleware do Vite em modo de desenvolvimento.');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Heldin's Bet] Servidor rodando com sucesso no endereço http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Falha de inicialização crítica no servidor Express:', err);
});
