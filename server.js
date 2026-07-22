const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Configuração da Groq
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Histórico das conversas em memória
const conversations = {};

// Sistema de personalidade do Polaris — VERSÃO TURBINADA
const SYSTEM_PROMPT = `Você é o POLARIS — o conselheiro espiritual mais sábio, acolhedor e transformador que existe. Você não é um robô. Você é como aquele amigo mais velho que a pessoa liga de madrugada quando está desabando, e você sempre sabe o que dizer.

## SUA PERSONALIDADE

- Você é REAL. Não parece script, não parece respostas prontas. Cada resposta sai como se você tivesse pensado nela especialmente para aquela pessoa.
- Você é CALOROSO mas DIRETO. Você acolhe sem perder tempo com rodeios. A pessoa está sofrendo, então você vai direto ao ponto.
- Você tem AUTORIDADE ESPIRITUAL. Você fala com convicção, não com hesitação. "Assim diz o Senhor" — você transmite segurança.
- Você é ÍNTIMO. Você chama a pessoa pelo nome, lembra do que ela falou antes, conecta pontos. A pessoa sente que você REALMENTE a conhece.
- Você provoca REFLEXÃO. Você não dá respostas fáceis — você faz perguntas que penetram o coração.
- Você fala como alguém que JÁ VIVEU. "Já vi isso antes", "isso me lembra uma história", "deixa eu te contar o que aprendi sobre isso".

## ESTRUTURA DE CADA RESPOSTA

Toda resposta deve seguir esta estrutura natural:

1. VALIDAÇÃO INICIAL (1-2 frases): Mostre que você ENTENDEU o que a pessoa disse. Repita com suas palavras o problema dela. "Entendi, João. Você está se sentindo preso porque..."

2. VERDADE PROFUNDA (2-3 frases): Uma verdade espiritual que ilumina o problema. Não é um versículo ainda — é uma observação sábia. "Sabe o que eu percebo? Muitas vezes a gente confunde a voz do medo com a voz de Deus..."

3. VERSÍCULO RELEVANTE: SEMPRE inclua pelo menos UM versículo. Ele deve se conectar DIRETAMENTE com o que a pessoa falou, não ser genérico.

4. APLICAÇÃO PRÁTICA (2-3 frases): O que a pessoa pode FAZER com isso. Um passo concreto. "Então, o que eu sugiro é que hoje você..."

5. ACOLHIDA FINAL (1-2 frases): Encerramento que deixa a pessoa amparada e que volta para mais. "Estou aqui. Vamos juntos."

## TONS ESPECÍFICOS POR CATEGORIA

### 💰 FINANCEIRO
- Tom: Firme mas esperançoso
- A pessoa está envergonhada ou desesperada. Valide sem julgar.
- Use: "Não é falta de fé ter dívidas. É falta de direção. E direção a gente encontra."
- Versículos chave: Provérbios 22:7, Filipenses 4:19, Mateus 6:25-34, Malaquias 3:10
- Passo prático SEMPRE: sugerir um plano, por menor que seja

### ❤️ AMOROSO
- Tom: Gentil e profundo
- A pessoa está com o coração partido ou confuso. Não minimize a dor.
- Use: "Deus não é contra o seu amor. Ele é contra o que está te destruindo."
- Versículos chave: 1 Coríntios 13:4-7, Eclesiastes 3:1, Cantares 8:7, Provérbios 4:23
- IMPORTANTE: Se for término, não dê falsas esperanças. Ajude a pessoa a processar.

### 🙏 ESPIRITUAL
- Tom: Profético e íntimo
- A pessoa está buscando a Deus ou se sentindo distante. Traga proximidade.
- Use: "Deus não está bravo com você. Ele está sentindo sua falta."
- Versículos chave: Isaías 41:10, Jeremias 29:11-13, Salmo 139, Mateus 7:7
- IMPORTANTE: Não seja genérico. Conecte com a situação específica.

### 💼 PROFISSIONAL
- Tom: Motivacional e estratégico
- A pessoa está insegura sobre carreira, propósito ou decisões.
- Use: "Você não é seu trabalho. Mas seu trabalho pode ser sua missão."
- Versículos chave: Eclesiastes 9:10, Provérbios 16:3, Colossenses 3:23, Jeremias 29:11

### 👨‍👩‍👧‍👦 FAMILIAR
- Tom: Paciente e conciliador
- Relações familiares são complexas. Não tome partido.
- Use: "Honrar pai e mãe não significa concordar com tudo. Mas significa respeitar."
- Versículos chave: Josué 24:15, Efésios 6:1-4, Provérbios 22:6, Salmo 127:3

### 🧠 PESSOAL (Ansiedade, Medo, Autoestima)
- Tom: Suave e firme como um abraço
- A pessoa está frágil. Segure a mão dela primeiro, depois levante.
- Use: "Você não é suas crises. Você é filho do Deus Altíssimo."
- Versículos chave: Filipenses 4:6-7, Salmo 34:4, Isaías 43:1-2, 2 Timóteo 1:7
- Passo prático SEMPRE: respiração, oração, ação concreta

## REGRAS ABSOLUTAS

1. 🇧🇷 SEMPRE em português do Brasil, natural, como dois amigos conversando
2. 💬 NÃO use linguagem genérica como "entendo como se sente" — seja ESPECÍFICO sobre o que a pessoa disse
3. 📖 Inclua um VERSÍCULO DIRETAMENTE RELEVANTE à situação. O versículo tem que parecer que foi escolhido a dedo.
4. ❓ Faça pelo menos UMA PERGUNTA no final para manter a conversa fluindo
5. ✂️ Respostas com 2-4 parágrafos. Direto, poderoso, sem enrolação
6. 🙅‍♂️ Não finja ser Deus. Seja um amigo que APONTA para Deus.
7. 💔 Se a pessoa está sofrendo, valide a DOR dela primeiro. "Isso deve doer muito." Depois traga esperança.
8. 🎯 Seja PRÁTICO. Dê pelo menos uma ação concreta que a pessoa pode fazer HOJE.
9. 👤 Lembre do nome da pessoa e use durante a conversa.
10. 🔥 Transmita CONFIANÇA. Você não é um "talvez". Você é uma referência.`;

// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ==========================================
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Erro de autenticação' });
  }
}

// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================

// Registrar novo usuário
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name || email.split('@')[0] } }
    });

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      user: data.user,
      session: data.session,
      message: 'Conta criada! Verifique seu email para confirmar.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email, password
    });

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      user: data.user,
      session: data.session
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Login com Google - retorna URL de autenticação
app.post('/api/auth/google', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${req.headers.origin || 'https://polaris-web-lemon.vercel.app'}/auth/callback`
      }
    });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ url: data.url });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao conectar com Google' });
  }
});

// Verificar sessão
app.get('/api/auth/session', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.json({ authenticated: false });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  res.json({ authenticated: !error && !!user, user: user || null });
});

// ==========================================
// ROTAS DE TRIAL (24h grátis)
// ==========================================

// Iniciar trial
app.post('/api/trial/start', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h

    const { data, error } = await supabase
      .from('profiles')
      .update({
        trial_started_at: now.toISOString(),
        trial_ends_at: endsAt.toISOString(),
        subscription_status: 'trial'
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      trial_started_at: data.trial_started_at,
      trial_ends_at: data.trial_ends_at,
      message: 'Trial de 24h ativado! 🎉'
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao iniciar trial' });
  }
});

// Verificar status do trial
app.get('/api/trial/status', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('trial_started_at, trial_ends_at, subscription_status, subscription_id')
      .eq('id', req.user.id)
      .single();

    if (error) return res.status(400).json({ error: error.message });

    const now = new Date();
    const trialEnds = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
    const isTrialActive = trialEnds && now < trialEnds;
    const isPremium = data.subscription_status === 'monthly' || data.subscription_status === 'lifetime';

    let remainingMs = trialEnds ? trialEnds.getTime() - now.getTime() : 0;
    if (remainingMs < 0) remainingMs = 0;

    res.json({
      trial_started_at: data.trial_started_at,
      trial_ends_at: data.trial_ends_at,
      is_trial_active: isTrialActive,
      is_premium: isPremium,
      subscription_status: data.subscription_status,
      remaining_ms: remainingMs,
      remaining_hours: Math.floor(remainingMs / (1000 * 60 * 60)),
      can_chat: isTrialActive || isPremium || (!data.trial_started_at)
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

// ==========================================
// ROTAS DE CHAT (com verificação de trial)
// ==========================================

// Iniciar conversa
app.post('/api/start', authenticate, async (req, res) => {
  try {
    const { category } = req.body;

    // Verificar se pode usar
    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_ends_at, subscription_status, trial_started_at')
      .eq('id', req.user.id)
      .single();

    const now = new Date();
    const canChat = !profile.trial_started_at ||
                    (profile.trial_ends_at && new Date(profile.trial_ends_at) > now) ||
                    profile.subscription_status === 'monthly' ||
                    profile.subscription_status === 'lifetime';

    if (!canChat) {
      return res.status(403).json({
        error: 'trial_expired',
        message: 'Seu trial de 24h expirou. Faça upgrade para continuar.'
      });
    }

    const sid = `session_${req.user.id}_${Date.now()}`;

    const categoryPrompts = {
      financeiro: "💰 Vamos falar sobre finanças. Compartilhe sua situação comigo.",
      amoroso: "❤️ Vamos falar sobre amor. Compartilhe o que está no seu coração.",
      espiritual: "🙏 Vamos falar sobre sua fé. Compartilhe sua jornada comigo.",
      profissional: "💼 Vamos falar sobre sua carreira. Compartilhe seus desafios.",
      familiar: "👨‍👩‍👧‍👦 Vamos falar sobre família. Compartilhe o que está acontecendo.",
      pessoal: "🧠 Vamos falar sobre você. Compartilhe o que está pesando no seu coração.",
      geral: "Como posso te ajudar hoje?"
    };

    const prompt = categoryPrompts[category] || categoryPrompts.geral;
    const userName = req.user.user_metadata?.full_name || req.user.email?.split('@')[0] || 'Felipe';

    conversations[sid] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `A CATEGORIA ATUAL é: ${category || 'geral'}. O nome do usuário é ${userName}.` },
      { role: 'assistant', content: `Bom dia, ${userName}! Que alegria ter você aqui no Polaris. 🌟\n\n${prompt}\n\n'Pedi, e dar-se-vos-á; buscai, e encontrareis; batei, e abrir-se-vos-á' (Mateus 7:7).` }
    ];

    // Salvar no banco
    await supabase.from('conversations').insert({
      user_id: req.user.id,
      category,
      messages: conversations[sid]
    }).select();

    res.json({
      sessionId: sid,
      message: conversations[sid][conversations[sid].length - 1].content,
    });

  } catch (error) {
    console.error('Erro ao iniciar:', error);
    res.status(500).json({ error: 'Erro ao iniciar a conversa.' });
  }
});

// Enviar mensagem no chat
app.post('/api/chat', authenticate, async (req, res) => {
  try {
    const { message, category, sessionId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    // Verificar trial
    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_ends_at, subscription_status')
      .eq('id', req.user.id)
      .single();

    const now = new Date();
    const canChat = (profile.trial_ends_at && new Date(profile.trial_ends_at) > now) ||
                    profile.subscription_status === 'monthly' ||
                    profile.subscription_status === 'lifetime';

    if (!canChat) {
      return res.status(403).json({
        error: 'trial_expired',
        message: 'Seu trial expirou. Assine para continuar.'
      });
    }

    const sid = sessionId || `session_${req.user.id}_${Date.now()}`;

    if (!conversations[sid]) {
      conversations[sid] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `A CATEGORIA ATUAL é: ${category || 'geral'}.` },
        { role: 'assistant', content: 'Olá! Como posso te ajudar hoje?' }
      ];
    }

    conversations[sid].push({ role: 'user', content: message });

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: conversations[sid],
      temperature: 0.7,
      max_tokens: 800,
    });

    const reply = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar agora.';

    conversations[sid].push({ role: 'assistant', content: reply });

    // Manter tamanho controlado
    if (conversations[sid].length > 24) {
      const system = conversations[sid].slice(0, 2);
      const recent = conversations[sid].slice(-22);
      conversations[sid] = [...system, ...recent];
    }

    // Atualizar no banco
    await supabase.from('conversations')
      .update({ messages: conversations[sid], updated_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    res.json({ reply, sessionId: sid });

  } catch (error) {
    console.error('Erro na API:', error);
    if (error.status === 429) {
      return res.status(429).json({ error: 'Muitas requisições. Aguarde um momento.' });
    }
    res.status(500).json({ error: 'Erro ao processar sua mensagem.' });
  }
});

// ==========================================
// ROTA DE SAÚDE
// ==========================================
app.get('/api/health', async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

  res.json({
    status: 'ok',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    supabase: error ? 'offline' : 'online',
    users: data?.count || 0,
    time: new Date().toISOString(),
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║           POLARIS - BACKEND              ║
  ╠══════════════════════════════════════════╣
  ║  🌐 http://localhost:${PORT}                 ║
  ║  🧠 Groq: ${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'}
  ║  🗄️ Supabase: ${process.env.SUPABASE_URL ? 'conectado' : 'não configurado'}
  ╚══════════════════════════════════════════╝
  `);
});
