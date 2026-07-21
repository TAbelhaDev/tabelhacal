<div align="center">

# Gosplan

**Agenda com IA em linguagem natural — hospedada, open source, com BYOK.**

Inspirado no [Toki](https://toki.com). Nome em referência ao Gosplan
soviético — o comitê que planejava tudo.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

</div>

## O que é

Você digita ou fala em linguagem natural — "dentista quinta às 15h" — e o
Gosplan estrutura isso num evento, mostra um card de confirmação e, quando
você confirma, cria no seu Google Calendar.

- **Hospedado**: você não precisa rodar servidor nenhum, usa a instância
  pública do Gosplan (ou sobe a sua, é open source).
- **BYOK de IA**: você usa sua própria chave de API de LLM (ex: Anthropic) e
  escolhe o modelo. O Gosplan nunca paga sua inferência nem vê sua chave em
  texto puro.
- **Calendário via seu próprio OAuth Client do Google**: em vez de um login
  Google genérico, você cria seu próprio projeto no Google Cloud (guiado por
  um wizard no app) e conecta a partir dele. Isso evita que o Gosplan precise
  de verificação do Google em escala — ver `ESCOPO.md` seção 2.3.
- **PWA**: instala na tela inicial, funciona como um app nativo.

Veja `ESCOPO.md` para o documento de escopo completo e `STACK.md` para a
arquitetura técnica.

## Status

🚧 Em design — ainda não há código de aplicação neste repositório.

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

[AGPL-3.0](LICENSE) — se você rodar uma versão modificada do Gosplan como
serviço hospedado, também precisa disponibilizar o código dessa versão.
