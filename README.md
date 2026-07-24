# Gosplan

A ideia desse app é facilitar e agilizar a organização da sua agenda, usando linguagem natural e IA para interpretar as suas mensagens e traduzir para a API.

## Como funciona, na prática

1. **Você escreve o que quer marcar**, em linguagem natural, na tela de chat.
2. **A IA estrutura isso num evento** (título, data/hora, local, descrição) e mostra um **card de confirmação** — nada é criado direto no seu calendário sem você bater o olho e confirmar antes.
3. Você clica em **Confirmar** e o evento é criado no seu Google Calendar de verdade (e fica listado dentro do próprio Gosplan também).
4. Quer apagar depois? Tem uma tela de **eventos** com tudo que você criou por lá, com botão de exclusão que cancela dos dois lados (Google Calendar e no banco do Gosplan).

Funciona instalado como **PWA** — dá pra "instalar" no celular ou no desktop e usar como um app nativo, com atualização automática (aparece um aviso quando sai versão nova).

## O jeito "traga suas próprias credenciais" (e por quê)

Duas coisas que diferenciam o Gosplan de um SaaS comum, ambas decisões de design bem deliberadas:

- **A chave de IA é sua.** No onboarding, você cola a sua própria API key e escolhe o provedor e o modelo que quiser usar. Em vez de cobrar uma mensalidade ou anuidade fixa, o Gosplan deixa você ditar seu próprio custo: escolhendo um modelo mais barato ou mais caro, você decide quanto paga — e paga direto pro provedor, sem markup do Gosplan em cima.

  Provedores suportados hoje e onde gerar a chave:
  - **Anthropic (Claude)**: crie uma em [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) (precisa de uma conta com créditos/billing configurado).
  - **OpenAI (ChatGPT)**: crie uma em [platform.openai.com/api-keys](https://platform.openai.com/api-keys) (idem, precisa de billing configurado na conta).

- **O acesso ao Google Calendar também é seu.** Em vez do Gosplan ter um único "app do Google" compartilhado por todo mundo (o que exigiria passar pelo processo chato de revisão do Google assim que o serviço crescesse), **cada usuário cria seu próprio projeto no Google Cloud Console**, ativa a API do Calendar nele, e cola o Client ID/Secret gerados no Gosplan. O app te guia passo a passo nesse processo durante o onboarding — dá um trabalho extra na hora de começar, mas em troca ninguém depende de aprovação do Google pra usar o serviço.

Ou seja: o Gosplan cuida do hosting, da UI e de orquestrar tudo, mas quem "paga a conta" da IA e é dono do próprio acesso ao Google é você.

## Funcionalidades

- **Onboarding guiado** em duas etapas: configurar a IA (chave + modelo) e conectar o Google Calendar (wizard explicando como criar o projeto no GCP).
- **Chat em linguagem natural** pra criar eventos, com card de confirmação antes de qualquer escrita real no calendário.
- **Listagem e exclusão** dos eventos criados pelo app.
- **Login via Google** — não tem cadastro separado de e-mail/senha, sua conta Google já é sua identidade no app.
- **PWA instalável**, com prompt de atualização quando sai versão nova.
- Fuso horário detectado automaticamente do seu navegador no onboarding.

### O que ainda não tem (mas tá no radar)

- Leitura dos calendários conectados (hoje o Gosplan só escreve — cria/edita/apaga — no calendário `primary`; não lê o que já existe nele). Isso abriria uma visualização alternativa ao Google Calendar dentro do próprio Gosplan, com um diferencial real: reagendar ou editar qualquer evento — inclusive os que já existiam antes do Gosplan — só digitando em linguagem natural, sem precisar abrir o formulário de edição do Google.
- Lembretes proativos (avisar antes do evento fazer sentido, não só na hora exata).
- Input por voz e por imagem.
- Outros calendários além do Google (Apple, Outlook).
- Criar evento por WhatsApp/Telegram.

Ver `ESCOPO.md` pra decisões de produto com mais detalhe, e `STACK.md` pra arquitetura técnica.

## Rodando localmente

Stack: SvelteKit + Cloudflare Workers (D1 + KV), Bun como package manager.

```sh
bun install

# aplica as migrations no D1 local (só precisa rodar 1x)
bunx wrangler d1 migrations apply gosplan-db --local

bun run dev
```

Outros comandos úteis:

```sh
bun run check   # typecheck
bun run lint    # prettier + eslint
bun run test    # testes unitários
bun run build   # build de produção (worker + PWA assets)
```

Copie `.env.example` pra `.dev.vars` e preencha as variáveis antes de rodar (precisa de um `MASTER_KEY` pra criptografia das credenciais dos usuários).

## Licença

AGPL-3.0 — se alguém pegar esse código e rodar uma versão modificada como serviço hospedado, é obrigado a publicar as mudanças. Ver `LICENSE`.

Quer contribuir? Dá uma olhada em `CONTRIBUTING.md`.
