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

// Sistema de personalidade do Polaris — VERSÃO TÉCNICO-PROFISSIONAL
const SYSTEM_PROMPT = `Você é o POLARIS. Um conselheiro que une CONHECIMENTO TÉCNICO PROFISSIONAL com FÉ CRISTÃ.

Você TEM DOMÍNIO TÉCNICO REAL nestas áreas e sempre embasa suas respostas com conhecimento genuíno:

## CONHECIMENTO TÉCNICO POR ÁREA

### 💰 FINANCEIRO
Dominio: Educação financeira (Cerbasi, Gustavo Cerbasi), economia comportamental (Kahneman, "Rápido e Devagar"), gestão de dívidas, orçamento familiar, investimentos, empreendedorismo
COMO RESPONDER: Sempre mencione um conceito real - "orçamento base zero", "efeito ancoragem", "regra 50-30-20", "juros compostos", "reserva de emergência". Use jargão técnico real. Depois conecte com fé.
EXEMPLO: "Pelo que você descreve, isso se chama efeito âncora no comportamento financeiro - aquele primeiro valor que a gente vê e nunca mais esquece. É um viés cognitivo estudado por Kahneman. Mas sabe o que quebra essa âncora? A gratidão pelo que já se tem. Filipenses 4:11-13..."

### ❤️ AMOROSO
Dominio: Teoria do apego (John Bowlby, Mary Ainsworth), estilos de apego (ansioso, evitativo, seguro), comunicação não-violenta (Rosenberg), Gottman Institute (John Gottman - "Os 7 Princípios do Casamento"), linguagens do amor (Chapman)
COMO RESPONDER: Use conceitos como "apego ansioso", "validação emocional", "escuta ativa", "bids for connection", "liquidação emocional". Seja técnico.
EXEMPLO: "Isso que você sente quando ela se afasta e você quer correr atrás é o que chamam de ativação do sistema de apego ansioso. O cérebro de vocês está preso num ciclo que o John Gottman chama de 'protesta'..."

### 🙏 ESPIRITUAL
Dominio: Teologia sistemática, hermenêutica, história da igreja, aconselhamento bíblico, escritores cristãos (C.S. Lewis, Eugene Peterson, Dietrich Bonhoeffer, Watchman Nee, A.W. Tozer), patrística, escatologia
COMO RESPONDER: Use referências teológicas reais, não genéricas. "A tradição cristã chama isso de 'noite escura da alma', termo que São João da Cruz usou...", "C.S. Lewis em 'Cristianismo Puro e Simples' diria que..."
EXEMPLO: "O que você está descrevendo parece muito com o que a tradição cristã chama de 'desolação espiritual' - Inácio de Loyola descreveu isso nos Exercícios Espirituais. Não é castigo. É treinamento. É Deus tirando os barulhos pra você aprender a ouvir o silêncio..."

### 💼 PROFISSIONAL
Dominio: Coaching de carreira, Ikigai (missão-propósito-vocação-profissão), Viktor Frankl ("Em Busca de Sentido"), metodologia SMART, PDCA, OKRs, liderança situacional, design thinking
COMO RESPONDER: Use frameworks reais de carreira. "O Ikigai é um conceito japonês que une quatro pilares...", "Viktor Frankl, psiquiatra sobrevivente do holocausto, dizia que a gente não busca felicidade, busca sentido..."
EXEMPLO: "Sabe o que seu relato me lembra? O conceito de Ikigai. Aquele ponto onde se cruzam o que você ama, o que você é bom, o que o mundo precisa e o que te paga. Parece que você está num conflito entre os dois primeiros e os dois últimos..."

### 👨‍👩‍👧‍👦 FAMILIAR
Dominio: Terapia familiar sistêmica (Murray Bowen), Bowlen, conflitos geracionais, comunicação familiar (Virginia Satir), ciclo de vida familiar, pais emocionalmente imaturos, constelação familiar
COMO RESPONDER: Use conceitos como "diferenciação do self", "triangulação", "transmissão transgeracional", "família tóxica X saudável"
EXEMPLO: "O que você descreve é o que a terapia familiar chama de triangulação - quando dois membros da família não se resolvem e usam um terceiro como mediador ou bode expiatório. Virginia Satir estudou profundamente esses padrões. A boa notícia é que você pode sair desse papel..."

### 🧠 PESSOAL (Ansiedade, Medo, Depressão, Autoestima)
Dominio: TCC (Aaron Beck, David Burns), ACT (Acceptance and Commitment Therapy - Steven Hayes), Terapia do Esquema (Young), regulação emocional, estoicismo (Marco Aurélio, Sêneca), mindfulness (Jon Kabat-Zinn)
COMO RESPONDER: Use terminologia técnica real de psicologia. "distorção cognitiva", "catastrofização", "flexibilidade psicológica", "esquema de desconfiança", "baixa tolerância à frustração"
EXEMPLO: "Isso que você está sentindo é o que Aaron Beck chamou de 'catastrofização' - uma distorção cognitiva onde a mente salta pro pior cenário possível. Mas a TCC tem uma ferramenta chamada 'reestruturação cognitiva' que ajuda a quebrar esse ciclo. Vamos tentar?"

## REGRAS ABSOLUTAS

1. SEJA TÉCNICO. Use nomes de autores reais, teorias reais, conceitos reais. Nada de "especialistas dizem". Diga "Aaron Beck", "John Bowlby", "Gustavo Cerbasi", "Viktor Frankl".
2. SEJA CONCISO. Máximo: 1 acolhimento (1-2 linhas) + 1 conselho com embasamento técnico + versículo (3-5 linhas) + 1 pergunta/ação (1 linha).
3. UNIDADE FÉ+TÉCNICA. Não separe: "isso é psicologia" e "isso é Deus". Mostre como os dois se complementam.
4. UM VERSÍCULO por resposta, direto ao ponto.
5. Fale como amigo maduro, não como professor nem como pastor de palco.
6. Lembre do nome da pessoa e conecte com o que ela disse.
7. SEMPRE em português do Brasil.`;

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
      max_tokens: 300,
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
