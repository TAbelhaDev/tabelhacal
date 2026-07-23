# Gosplan

> Nome em homenagem (meio de brincadeira) ao **Gosplan** soviético — o comitê
> que planejava tudo na URSS. Aqui é bem menos totalitário: é só o "órgão que
> planeja" a sua agenda.

Gosplan é um app de agenda onde você não preenche formulário nenhum. Você
escreve numa caixa de chat, tipo conversando com alguém: **"dentista quinta
às 15h"**, **"almoço com a Marina sexta que vem, meio-dia, no restaurante
japonês perto do trabalho"**, **"reunião de alinhamento toda segunda às 9h
até o fim do mês"** — e a IA entende, monta o evento certinho (título, data,
horário, local, descrição) e te mostra um cardzinho pra você conferir antes
de qualquer coisa ir parar de verdade no seu Google Calendar.

A ideia é resolver aquela fricção chata de calendário: abrir o app, clicar em
"novo evento", preencher campo por campo, escolher fuso horário, etc. Aqui
você só fala o que quer, do jeito que falaria pra uma pessoa, e o Gosplan
traduz isso pra um evento de verdade.

(Serve de inspiração o [Toki](https://toki.com), que faz algo parecido —
o Gosplan é uma versão livre, open source e auto-hospedável dessa ideia.)

## Como funciona, na prática

1. **Você escreve o que quer marcar**, em linguagem natural, na tela de chat.
2. **A IA estrutura isso num evento** (título, data/hora, local, descrição) e
   mostra um **card de confirmação** — nada é criado direto no seu calendário
   sem você bater o olho e confirmar antes. Isso existe porque IA erra parse
   às vezes, e a última palavra tem que ser sua.
3. Você clica em **Confirmar** e o evento é criado no seu Google Calendar de
   verdade (e fica listado dentro do próprio Gosplan também).
4. Quer apagar depois? Tem uma tela de **eventos** com tudo que você criou
   por lá, com botão de exclusão que cancela dos dois lados (Google Calendar
   e no banco do Gosplan).

Funciona instalado como **PWA** — dá pra "instalar" no celular ou no
desktop e usar como um app nativo, com atualização automática (aparece um
aviso quando sai versão nova).

## O jeito "traga suas próprias credenciais" (e por quê)

Duas coisas que diferenciam o Gosplan de um SaaS comum, ambas decisões de
design bem deliberadas:

- **A chave de IA é sua.** No onboarding, você cola a sua própria API key
  (ex: Anthropic) e escolhe o modelo que quiser usar. O Gosplan usa essa
  chave só pra transformar o que você escreveu em JSON de evento — nunca
  divide custo de IA entre usuários, você paga só pelo que gastar.
- **O acesso ao Google Calendar também é seu.** Em vez do Gosplan ter um
  único "app do Google" compartilhado por todo mundo (o que exigiria passar
  pelo processo chato de revisão do Google assim que o serviço crescesse),
  **cada usuário cria seu próprio projeto no Google Cloud Console**, ativa a
  API do Calendar nele, e cola o Client ID/Secret gerados no Gosplan. O app
  te guia passo a passo nesse processo durante o onboarding — dá um trabalho
  extra na hora de começar, mas em troca ninguém depende de aprovação do
  Google pra usar o serviço.

Ou seja: o Gosplan cuida do hosting, da UI e de orquestrar tudo, mas quem
"paga a conta" da IA e é dono do próprio acesso ao Google é você.

## Funcionalidades

- **Onboarding guiado** em duas etapas: configurar a IA (chave + modelo) e
  conectar o Google Calendar (wizard explicando como criar o projeto no GCP).
- **Chat em linguagem natural** pra criar eventos, com card de confirmação
  antes de qualquer escrita real no calendário.
- **Listagem e exclusão** dos eventos criados pelo app.
- **Login via Google** — não tem cadastro separado de e-mail/senha, sua conta
  Google já é sua identidade no app.
- **PWA instalável**, com prompt de atualização quando sai versão nova.
- Fuso horário detectado automaticamente do seu navegador no onboarding.

### O que ainda não tem (mas tá no radar)

- Lembretes proativos (avisar antes do evento fazer sentido, não só na hora
  exata).
- Input por voz e por imagem.
- Outros calendários além do Google (Apple, Outlook).
- Criar evento por WhatsApp/Telegram.

Ver `ESCOPO.md` pra decisões de produto com mais detalhe, e `STACK.md` pra
arquitetura técnica.

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

Copie `.env.example` pra `.dev.vars` e preencha as variáveis antes de rodar
(precisa de um `MASTER_KEY` pra criptografia das credenciais dos usuários).

## Licença

AGPL-3.0 — se alguém pegar esse código e rodar uma versão modificada como
serviço hospedado, é obrigado a publicar as mudanças. Ver `LICENSE`.

Quer contribuir? Dá uma olhada em `CONTRIBUTING.md`.
