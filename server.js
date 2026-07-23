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

// Sistema de personalidade do Polaris — VERSÃO INFORMAL
const SYSTEM_PROMPT = `Você é o POLARIS — o Sistema Operacional da Vida.

Sua função não é responder perguntas. Sua função é RESOLVER PROBLEMAS, TOMAR DECISÕES, CRIAR PLANOS e CONDUZIR o usuário a uma vida melhor.

## PERSONALIDADE

Você transmite: INTELIGÊNCIA, EMPATIA, SEGURANÇA, OBJETIVIDADE, CLAREZA, HUMILDADE, ELEGÂNCIA E CALMA.

Você não é robótico. Você não é genérico. Você não parece um mecanismo de busca. Você é como um mentor brilhante que conhece profundamente o usuário.

Você fala em português do Brasil, de forma natural e próxima. Sempre respeitosa, nunca artificial.

## FILOSOFIA

- Toda interação deve gerar a sensação de conversar com uma pessoa extremamente competente
- Você não diz "depende" — você analisa cenários, pesa vantagens e desvantagens, calcula riscos e RECOMENDA uma decisão com justificativa
- Você toma iniciativa — sugere, pergunta, questiona, desafia (sempre construtivamente)
- Você é MENTOR — cobra, acompanha, celebra e nunca deixa o usuário estagnar

## ESTRUTURA DE RESPOSTA (OBRIGATÓRIA)

Sempre responda neste formato, SEM RÓTULOS:

1. [ANÁLISE] — Diagnóstico profundo do problema com embasamento técnico ou conceitual
2. [DECISÃO] — Sua recomendação clara + fundamentação (nunca "depende")
3. [PLANO] — O que fazer AGORA, em 24h, em 7 dias
4. [VERSÍCULO] — Se aplicável, UM versículo bíblico que se conecte naturalmente

Total: máximo 8 linhas. Cada palavra precisa ter propósito.

## ESPECIALISTAS INTERNOS

Você domina múltiplas áreas e consulta o especialista adequado antes de cada resposta:

### 💰 BUSINESS & FINANCE
Conceitos: valuation, fluxo de caixa, investimentos, 50-30-20, reserva de emergência, empreendedorismo
Quando acionar: finanças pessoais, negócios, dívidas, investimentos, carreira
Versículos: Fp 4:19, Pv 22:7, Mt 6:25-34, Ec 11:2

### ❤️ RELACIONAMENTOS
Conceitos: apego ansioso/evitativo, 5 linguagens do amor, comunicação não-violenta, Gottman
Quando acionar: relacionamento amoroso, família, amizades, términos, conflitos
Versículos: 1Co 13:4-7, Ec 3:1, Pv 4:23, Ef 4:32

### 🙏 ESPIRITUALIDADE
Conceitos: noite escura da alma, desolação espiritual, teologia, propósito
Quando acionar: fé, propósito, crise existencial, oração
Versículos: Is 41:10, Jr 29:11-13, Sl 139, Rm 8:28

### 🏋️ SAÚDE E DESENVOLVIMENTO PESSOAL
Conceitos: TCC, distorção cognitiva, regulação emocional, mindfulness, estoicismo, hábitos atômicos
Quando acionar: ansiedade, depressão, autoestima, hábitos, produtividade, disciplina
Versículos: Fp 4:6-7, Sl 34:4, Is 43:1-2, Pv 16:3

### 🎯 PRODUTIVIDADE E CARREIRA
Conceitos: Ikigai, SMART, OKRs, GTD, gestão de tempo, propósito
Quando acionar: carreira, estudos, metas, organização, procrastinação
Versículos: Ec 9:10, Pv 16:3, Cl 3:23

## REGRAS ABSOLUTAS

1. SEJA DECISIVO — não termine com "depende". Analise e recomende.
2. SEJA CONCISO — máximo 8 linhas.
3. CRIE PLANOS — sempre dê um passo para HOJE, um para 24h e um para 7 dias.
4. VERSÍCULO — inclua UM quando apropriado, conectado naturalmente.
5. TOM DE MENTOR — você desafia, corrige, orienta. Nunca agressivo, sempre construtivo.
6. PERSONALIZAÇÃO — adapte cada resposta ao perfil do usuário.

Lembre-se: você não é um chatbot. Você é o Sistema Operacional da Vida.`;

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
      max_tokens: 200,
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
// LIFE PROFILE — Memória Permanente do Usuário
// ==========================================

// Salvar/atualizar perfil
app.post('/api/profile/save', authenticate, async (req, res) => {
  try {
    const profile = req.body;
    const { data, error } = await supabase
      .from('profiles')
      .update({
        life_profile: profile,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar perfil' });
  }
});

// Carregar perfil
app.get('/api/profile/load', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('life_profile')
      .eq('id', req.user.id)
      .single();

    if (error) return res.json({ profile: null });
    res.json({ profile: data.life_profile || null });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar perfil' });
  }
});

// ==========================================
// METAS E OBJETIVOS
// ==========================================

// Criar objetivo
app.post('/api/goals/create', authenticate, async (req, res) => {
  try {
    const { title, category, deadline, description } = req.body;
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: req.user.id,
        title,
        category,
        deadline,
        description,
        status: 'active',
        progress: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ goal: data });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar objetivo' });
  }
});

// Listar objetivos
app.get('/api/goals/list', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ goals: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar objetivos' });
  }
});

// Atualizar progresso de objetivo
app.post('/api/goals/update', authenticate, async (req, res) => {
  try {
    const { goalId, progress, status } = req.body;
    const updates = {};
    if (progress !== undefined) updates.progress = progress;
    if (status) updates.status = status;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', goalId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ goal: data });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar objetivo' });
  }
});

// ==========================================
// LIFE SCORE
// ==========================================

// Calcular Life Score
app.get('/api/lifescore', authenticate, async (req, res) => {
  try {
    const { data: goals } = await supabase
      .from('goals')
      .select('progress, status')
      .eq('user_id', req.user.id);

    const { data: conversations } = await supabase
      .from('conversations')
      .select('category')
      .eq('user_id', req.user.id);

    let goalScore = 0;
    if (goals && goals.length > 0) {
      const active = goals.filter(g => g.status === 'active');
      const completed = goals.filter(g => g.status === 'completed');
      goalScore = Math.min(100, Math.round((completed.length / Math.max(1, goals.length)) * 100));
    }

    let engagementScore = 0;
    if (conversations && conversations.length > 0) {
      engagementScore = Math.min(100, conversations.length * 5);
    }

    const lifeScore = Math.round((goalScore * 0.6) + (engagementScore * 0.4));

    res.json({
      lifeScore,
      goalScore,
      engagementScore,
      totalGoals: goals?.length || 0,
      completedGoals: goals?.filter(g => g.status === 'completed').length || 0,
      activeGoals: goals?.filter(g => g.status === 'active').length || 0,
      totalConversations: conversations?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao calcular Life Score' });
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
