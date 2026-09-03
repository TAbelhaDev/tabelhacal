<div align="center">

# TabelaCal

**A calendar you organise by conversation: natural language + AI translate your messages into Google Calendar commands.**

**English** · [Português](README.pt-BR.md)

[![SvelteKit](https://img.shields.io/badge/SvelteKit-Svelte-ff3e00?style=flat-square&logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square)](LICENSE)
[![Built with tabelawebui](https://img.shields.io/badge/theme-tabelawebui-d6b4f7?style=flat-square)](https://github.com/TAbelhaDev/tabelawebui)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/ianptkcs)

</div>

---

## What it is

The idea of this app is to make organising your calendar faster and easier, using
natural language and AI to interpret your messages and translate them into calls
to the Google Calendar API.

The interface is in Portuguese, since that is who the app is for; the code is in
English. See [CONTRIBUTING.md](CONTRIBUTING.md#language) for the convention.

## How it works

1. You write what you want to do, in natural language, on the chat screen.
2. The AI turns it into a command — list, modify, create or delete events on your
   Google Calendar — and structures the data the way the API expects.
3. Before any change, a confirmation card appears showing what is about to happen
   (for example: create an event with a title, date/time, location and
   description). You can confirm it, edit a field by hand, ask the AI for one
   specific adjustment, or cancel.
4. Once confirmed, the command runs against your Google Calendar and is recorded
   temporarily in TabelaCal's database, so you can see a history of what was
   done.

It works as a PWA too: you can install it on a phone or desktop and use it like a
native app, with automatic updates (a notice appears when a new version ships).

## Bring your own credentials

Two things separate TabelaCal from an ordinary SaaS, both deliberate design
decisions:

- **The AI key is yours.** During onboarding you paste your own API key and pick
  the provider and model you want. Instead of charging a fixed monthly or yearly
  fee, TabelaCal lets you dictate your own cost: by choosing a cheaper or more
  expensive model, you decide what you pay. Since the payment goes straight to
  the provider, there is no TabelaCal operating fee on top.

  Providers supported today, and where to generate a key:

  - **DeepSeek**: create one at
    [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) (the
    cheapest option).
  - **Anthropic (Claude)**: create one at
    [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
    (needs an account with credits/billing configured).
  - **OpenAI (ChatGPT)**: create one at
    [platform.openai.com/api-keys](https://platform.openai.com/api-keys) (same —
    billing has to be configured on the account).

- **The Google Calendar access is yours too.** If TabelaCal had a single "Google
  app" shared by everyone, sooner or later it would pass the test-user limit and
  need Google's review/verification for sensitive scopes like Calendar's — a
  process that can involve a paid security audit, and that cost would land on
  someone: either on whoever hosts TabelaCal, or on its users. To avoid it, each
  user creates their own project in the Google Cloud Console, enables the
  Calendar API on it and pastes the generated Client ID/Secret into TabelaCal.
  Being an individual project, it never comes close to the limit that would
  require verification, so it stays free and costs nobody any infrastructure.
  Because that is fiddly for anyone not used to this kind of thing, the app walks
  you through the whole process in an onboarding wizard. It is a one-time setup.

In short: TabelaCal handles the hosting, the UI and the orchestration, but you
are the one paying the AI bill and owning your own Google access.

## Features

- **Guided onboarding** in two steps: configure the AI (key + model) and connect
  Google Calendar (a wizard explaining how to create the GCP project).
- **Natural-language chat** to list, create, modify, delete or respond to
  invitations for events on any of your connected calendars (not just
  `primary`) — including events that existed before TabelaCal — with a
  confirmation card before any real change. Recurring events are supported too
  ("every Monday at 9am until the end of the month"), with the option of editing
  a single occurrence or the whole series.
- **Proactive reminders**: a push notification ~30 minutes before an event
  starts (opt-in on the history screen).
- **History**: a dedicated screen with everything the app has done (independent
  of the chat), from which you can also delete directly.
- **Login via Google**, with no separate email/password signup — your Google
  account is already your identity in the app.
- **Installable PWA**, with an update prompt when new versions ship.
- Time zone detected automatically from your browser during onboarding.

### Not there yet, but on the radar

- Voice and image input.
- Calendars other than Google (Apple, Outlook).
- Creating events over WhatsApp/Telegram.

See `ESCOPO.md` for the product decisions in more detail.

## Running locally

Stack: SvelteKit + Cloudflare Workers (D1 + KV), Bun as the package manager.

```sh
bun install

# apply the migrations to the local D1
bunx wrangler d1 migrations apply ndrc-db --local

bun run dev
```

Other useful commands:

```sh
bun run check   # typecheck
bun run lint    # prettier + eslint
bun run test    # unit tests
bun run build   # production build (worker + PWA assets)
```

Copy `.env.example` to `.dev.vars` and fill in the variables before running:
`MASTER_KEY` encrypts the users' stored credentials, and `VAPID_PRIVATE_KEY` is
for the proactive push reminders (`.env.example` has the command to generate a
fresh key pair).

## Development

Stack and commands: see _Running locally_ above. Tests:

```sh
bun run test    # unit tests
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the version history.

## Support the project

- **Global**: [ko-fi.com/ianptkcs](https://ko-fi.com/ianptkcs)
- **Brazil (Pix)**: scan the QR below or copy the code

  <img src="pix-qr.png" alt="Pix QR" width="200" />

  <details><summary>Pix code (copy)</summary>

  ```
  00020126580014BR.GOV.BCB.PIX01365ad933b0-dcdc-4525-a736-0759902aeec65204000053039865802BR5925Ian Patrick da Costa Soar6009SAO PAULO62140510tQA85x6Dov63041FB6
  ```

  </details>

## License

[AGPL-3.0](LICENSE) — strong copyleft: you may use, modify and even host
TabelaCal commercially, but any modified version, including one running as a
network service (SaaS), has to stay open source under the same license.

Want to contribute? Have a look at `CONTRIBUTING.md`.
