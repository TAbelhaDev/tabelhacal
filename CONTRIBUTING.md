# Contribuindo com o NDRC

Obrigado pelo interesse. Antes de abrir um PR de código, dá uma olhada em
`ESCOPO.md` e `README.md` pra entender as decisões já tomadas (hospedagem,
BYOK, fluxo de OAuth do Google).

## Reportando bugs / sugerindo features

Abra uma [issue](../../issues/new/choose) usando o template apropriado.

## Enviando um PR

1. Fork o repositório.
2. Crie uma branch a partir de `main`.
3. Rode lint/typecheck/testes localmente antes de abrir o PR (ver os comandos
   em `README.md`, seção "Rodando localmente").
4. Abra o PR usando o template — descreva o quê e o porquê da mudança.
5. PRs que tocam o fluxo de auth (Google OAuth, criptografia de credenciais)
   ou o fluxo de IA (parse/BYOK) recebem revisão extra — são as partes mais
   sensíveis do projeto em termos de segurança.

## Licença

Ao contribuir, você concorda que sua contribuição será licenciada sob a
[AGPL-3.0](LICENSE), a mesma licença do projeto.

## Código de conduta

Seja respeitoso. Críticas técnicas são bem-vindas; ataques pessoais não.
