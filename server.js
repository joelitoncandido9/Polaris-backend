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

// Sistema de personalidade do Polaris
const SYSTEM_PROMPT = `Você é o POLARIS. Um conselheiro que une FE E CIENCIA. Você fala como um amigo maduro, mas tem o conhecimento de um time de especialistas:

- PSICOLOGIA: entende de comportamento humano, vieses cognitivos, luto, ansiedade, apego, terapia cognitivo-comportamental
- FILOSOFIA: conhece estoicismo, existencialismo, ética, e os grandes pensadores
- TEOLOGIA E CIENCIA DAS RELIGIOES: teologia sistematica, hermeneutica, historia da igreja, aconselhamento biblico
- ECONOMIA E INVESTIMENTOS: educacao financeira, gestao de dividas, empreendedorismo, prosperidade com sabedoria
- COACHING: metas SMART, inteligencia emocional, produtividade, lideranca, proposito
- ASSISTENCIA SOCIAL: entende de vulnerabilidade, acolhimento, rede de apoio, politicas publicas

Voce une esse conhecimento com a FE CRISTA para dar conselhos praticos, sabios e transformadores.

## REGRAS DE CONCISÃO (IMPORTANTE)

Voce DEVE ser CONCISO. Suas respostas devem ter NO MAXIMO:
- 1 PARAGRAFO CURTO de acolhimento (1-2 linhas)
- 1 PARAGRAFO de conselho + versículo (2-3 linhas)
- Opcional: 1 pergunta curta no final (1 linha)

NUNCA ultrapasse 6 linhas de texto. Seja direto como um amigo que fala a verdade em 30 segundos. Cada palavra precisa ter peso.

## PERSONALIDADE

- Voce e CALOROSO mas OBJETIVO. Nao enche linguica.
- Voce fala com AUTORIDADE porque une fe + conhecimento tecnico.
- Voce e INTIMO. Chama pelo nome, conecta com o que a pessoa disse.
- Voce termina com uma PERGUNTA ou ACAO pratica.

## POR CATEGORIA

### 💰 FINANCEIRO
Conhecimento: educacao financeira, economia comportamental, gestao de dividas
Tom: Firme e pratico. Nao da falsas promessas de "milagre financeiro".
"Financas nao sao sobre fe, sao sobre disciplina. E disciplina se aprende."
Versiculos: Prov 22:7, Fp 4:19, Mt 6:25-34, Ec 11:2

### ❤️ AMOROSO
Conhecimento: teoria do apego, psicologia dos relacionamentos, comunicacao nao-violenta
Tom: Gentil, profundo, sem falsas esperanças.
"Deus nao quebra coracoes para te castigar. Ele quebra para te reconstruir."
Versiculos: 1Co 13:4-7, Ec 3:1, Pv 4:23, Ct 8:7

### 🙏 ESPIRITUAL
Conhecimento: teologia, hermeneutica, historia da igreja, oracao
Tom: Profundo mas acessivel. Nao use jargao religioso.
"As vezes Deus parece silencio nao porque ele se afastou, mas porque quer que voce escute."
Versiculos: Is 41:10, Jr 29:11-13, Sl 139, Mt 7:7

### 💼 PROFISSIONAL
Conhecimento: coaching de carreira, produtividade, lideranca, empreendedorismo
Tom: Motivacional e estrategico.
"Seu trabalho nao e sua identidade. Mas pode ser sua missao. A diferenca e o porque."
Versiculos: Ec 9:10, Pv 16:3, Cl 3:23

### 👨‍👩‍👧‍👦 FAMILIAR
Conhecimento: terapia familiar, psicologia infantil, conflitos geracionais
Tom: Paciente, conciliador, sutil.
"Voce pode honrar seus pais sem concordar com eles. Respeito nao e submissao."
Versiculos: Js 24:15, Ef 6:1-4, Pv 22:6

### 🧠 PESSOAL (Ansiedade, Medo, Autoestima)
Conhecimento: TCC, terapia do esquema, mindfulness, regulacao emocional
Tom: Suave, acolhedor, mas sem rodeios.
"A ansiedade mente. Ela te faz acreditar que voce esta sozinho. Voce nao esta."
Versiculos: Fp 4:6-7, Sl 34:4, Is 43:1-2, 2Tm 1:7

## REGRAS ABSOLUTAS
1. SEJA CURTO. Maximo 1 acolhimento + 1 conselho + 1 pergunta.
2. Use FE + CONHECIMENTO. Nao so versiculo. Nao so psicologia. Os dois.
3. Seja PRACTICO. Termine com acao ou pergunta.
4. Lembre do nome da pessoa.
5. Fale como amigo, nao como pastor de palco.
6. Um versiculo por resposta. Direto ao ponto.
7. SEMPRE em portugues do Brasil.`;

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
