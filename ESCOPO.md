# Gosplan — Documento de Escopo (rascunho v0.1)

> Nome em referência ao **Gosplan** soviético (Comitê Estatal de Planejamento) —
> o app é literalmente "o órgão que planeja tudo" da sua agenda.

> Agenda com IA inspirada no [Toki](https://toki.com): você fala em linguagem
> natural ("dentista quinta às 15h") e o app cria o evento. Serviço **hospedado**
> (não self-hosted), open source, com o usuário trazendo suas próprias
> credenciais de IA e de calendário.

## 1. Problema

Preencher formulário de evento em calendário é fricção desnecessária. O Toki
resolve isso deixando o usuário falar/digitar em linguagem natural e a IA
estrutura o evento. O Gosplan é uma versão open source e hospedada dessa ideia.

## 2. Modelo de negócio/hospedagem — decisões-chave

### 2.1 Hospedado, não self-hosted

**Decisão (2026-07-21):** o Gosplan roda como **serviço hospedado** — um
Cloudflare Worker central que serve UI, API e dados para todos os usuários.
Descartada a opção de "baixe e rode você mesmo": cria fricção demais pro
usuário comum (precisa saber configurar servidor, etc.).

### 2.2 BYOK para a IA

Cada usuário cola sua **própria API key de LLM** (ex: Anthropic, OpenAI) e
escolhe o **modelo** que quer usar. O Gosplan usa essa chave só para traduzir
o prompt do usuário → JSON estruturado do evento (tool use / structured
output). O usuário paga sua própria inferência; o Gosplan nunca compartilha
custo de IA entre usuários.

### 2.3 Calendário: BYO Google OAuth Client (padrão inspirado no DankCalendar)

**Decisão (2026-07-21) — a parte mais importante do design.** Em vez de o
Gosplan ter um único OAuth Client do Google (o que exigiria passar pela
**revisão/verificação do Google** assim que o app passasse de ~100 usuários
de teste, processo lento e chato), **cada usuário cria e traz seu próprio
OAuth Client**:

1. Usuário cria um projeto novo no [Google Cloud Console](https://console.cloud.google.com/).
2. Ativa a **Google Calendar API** nesse projeto.
3. Configura a **tela de consentimento OAuth** em modo **Testing** (não
   "In production"), e se adiciona como **test user**.
   - Por ser modo Testing com ele mesmo como único test user, **não precisa de
     verificação do Google** — o limite de 100 test users nunca chega perto de
     ser um problema porque é 1 projeto por 1 usuário.
4. Cria uma credencial **OAuth Client ID** (tipo **Web application**), com
   **Authorized redirect URI** apontando pro callback fixo do Gosplan
   (ex: `https://gosplan.<domínio>/auth/google/callback`).
5. Copia o **Client ID** e o **Client Secret** gerados e cola nas configurações
   do Gosplan.
6. O Gosplan usa essas credenciais (armazenadas criptografadas) pra rodar o
   fluxo OAuth **daquele usuário especificamente** contra a conta Google dele
   e obter o refresh token.

Isso elimina completamente o problema de verificação do Google em escala — o
"appliance" de auth é sempre de 1 usuário, o Gosplan só orquestra o fluxo.

**Trade-off aceito:** onboarding tem mais um passo manual (criar o projeto no
GCP) comparado a um simples "Login with Google". O app precisa de um
**wizard guiado** (com prints/instruções passo a passo, como o DankCalendar faz)
pra não perder o usuário nesse passo.

### 2.4 Resumo do cadastro do usuário

Antes de usar o app, o usuário completa 2 cadastros independentes:

- **IA**: chave de API + modelo escolhido (ex: Anthropic `claude-sonnet-5`).
- **Calendário**: Client ID + Client Secret do próprio GCP dele → conecta a
  conta Google via OAuth.

A partir daí, o Gosplan cuida de tudo: UI, deploy, hosting dos dados.

## 3. Fluxos / UX

1. **Onboarding**: wizard com 2 etapas — configurar IA (colar key + escolher
   modelo) e configurar calendário (wizard guiado de criação do projeto GCP +
   colar Client ID/Secret + botão "Conectar com Google" que dispara o OAuth
   usando essas credenciais).
2. **Chat principal**: usuário digita/fala um pedido de evento em linguagem
   natural.
3. **Card de confirmação**: a IA propõe o evento (título, data/hora, local,
   descrição) num card; usuário revisa e clica **Confirmar** antes de criar de
   fato (proteção contra erro de parse — a IA nunca escreve direto no
   calendário).
4. **Lembretes proativos** (v2, inspirado no Toki): notificação antes do
   evento fazer sentido, não só na hora exata. "Call Me" (ligação automática)
   fica fora do MVP — dependeria de telefonia, custo extra por usuário.

## 4. Escopo

### MVP (v1)

- Onboarding: cadastro de chave de IA + modelo.
- Onboarding: wizard de conexão do Google Calendar via BYO OAuth Client
  (seção 2.3).
- Chat: parse de linguagem natural → JSON de evento estruturado.
- Card de confirmação → criação do evento via Google Calendar API.
- Listagem/edição básica dos eventos criados pelo app.
- PWA instalável (SvelteKit + `@vite-pwa/sveltekit`).

### v2

- Lembretes proativos.
- Input por voz e por imagem.
- Múltiplos calendários (Apple/Outlook), além do Google.
- Canais alternativos (WhatsApp/Telegram) — "texting your calendar".

### Fora de escopo (por enquanto)

- "Call Me" (ligação automática antes de eventos importantes).
- OAuth Client único e centralizado do Gosplan (decisão da seção 2.3 evita
  isso deliberadamente).
- Multi-tenant self-hosted (rodar sua própria instância) — pode virar um modo
  suportado no futuro, mas não é o produto principal.

## 5. Modelo de dados (Drizzle + D1) — proposta

```
users              (id, email, timezone, created_at)

ai_credentials      -- BYOK de IA (seção 2.2)
  user_id, provider, model, key_encrypted, nonce

google_oauth_clients -- Client ID/Secret DO PRÓPRIO usuário (seção 2.3)
  -- nonce separado por segredo (client_id e client_secret): AES-GCM não pode
  -- reusar nonce com a mesma chave pra cifrar dois textos diferentes.
  user_id, client_id_encrypted, client_id_nonce, client_secret_encrypted,
  client_secret_nonce, created_at

google_tokens       -- refresh token obtido via OAuth usando o client acima
  user_id, refresh_token_encrypted, nonce, scope, expiry

events              -- eventos criados pelo app (cache/histórico local)
  id, user_id, google_event_id, title, start_at, end_at, location,
  description, created_at
```

- **KV:** sessões (cookie → user_id).
- **Worker secret `MASTER_KEY`:** AES-GCM (WebCrypto) para envelope encryption
  de `ai_credentials`, `google_oauth_clients` e `google_tokens`. Nunca logar
  chaves/segredos/tokens.

## 6. Decisões

1. ✅ **Hospedagem**: serviço hospedado central (Cloudflare Workers), não
   self-hosted.
2. ✅ **IA**: BYOK — chave própria do usuário + escolha de modelo.
3. ✅ **Calendário**: BYO Google OAuth Client por usuário (não um client único
   do Gosplan) — evita verificação do Google em escala.
4. ✅ **UX de criação de evento**: card de confirmação, nunca escrita direta.
5. ✅ **Licença**: AGPL-3.0 (ver seção 7).
6. ⬜ Formato exato do wizard de onboarding do GCP (quantas telas, que nível de
   hand-holding visual) — a definir na Fase de UI.

## 7. Licença e modelo open source

- **AGPL-3.0.** Copyleft de rede: se alguém pegar o código do Gosplan e rodar
  uma versão modificada como serviço hospedado (SaaS concorrente), é obrigado
  a publicar as mudanças. Coerente com o produto ser um serviço hospedado (não
  uma lib redistribuída) e com a inspiração declarada do projeto.
- **Releases**: GitHub Releases via tag (`vX.Y.Z`), changelog em
  `CHANGELOG.md` (formato [Keep a Changelog](https://keepachangelog.com/)).
- **Issues**: templates de bug report e feature request em
  `.github/ISSUE_TEMPLATE/`.
- **Contribuição**: ver `CONTRIBUTING.md`.

Ver `STACK.md` pra arquitetura técnica.
