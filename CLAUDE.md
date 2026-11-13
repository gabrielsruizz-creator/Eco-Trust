# CLAUDE.md — EcoTrust (repositório EcoTrust-UE-Model)

@AGENTS.md

Contexto completo do projeto, histórico de decisões e pendências: **`MIGRATION_CONTEXT.md`** (leia antes de
mudar arquitetura, banco, design ou navegação). Guia de publicação nas lojas: `PUBLICAR.md`.

## Projeto

App Expo/React Native (Android e iOS) de finanças pessoais **offline-first** com **Impostômetro pessoal**
(quanto do dinheiro gasto vira imposto). Expo SDK **58** — confira sempre a versão em `package.json` e a
documentação versionada antes de usar qualquer API do Expo (ver `AGENTS.md`).

## Idioma

- App, código (funções, variáveis, arquivos), comentários, commits e PRs em **português do Brasil**.
- Fale com o usuário em português simples; ele usa Windows + PowerShell — dê comandos que funcionem lá.

## Comandos

- Gerenciador: **npm** (há `package-lock.json`, não há `bun.lock`).
- Antes de dar uma tarefa por concluída: **`npm run verificar`** (tsc + expo lint + jest). Tudo deve passar.
- Dependências: sempre `npx expo install <pacote>`. Nunca `npm audit fix --force`; use `npx expo install --fix`.

## Arquitetura (obrigatória)

- Camadas: `src/app` + `src/components` (UI) → `src/hooks` → `src/services` → `src/repositories` → `src/data` (SQLite).
- Telas não acessam repositórios; só repositórios usam `getBanco()` de `src/data/database.ts`.
- Toda escrita no banco chama `notificarMudanca()` (é o que atualiza as telas via `use-dados.ts`).
- Services: lógica pura em `calcularX`/`gerarX` (testável) e leitura do banco em `obterX`.
- Erros para o usuário: `throw new ErroValidacao('mensagem em PT-BR')`.
- Dinheiro sempre em **centavos inteiros**; datas `AAAA-MM-DD` / meses `AAAA-MM` no fuso local (`src/utils/datas.ts`).
- Alias de import `@/` → `src/`.

## Banco de dados

- Migrações em `src/data/migracoes.ts`. **Nunca edite uma migração existente**; adicione a próxima (v16, v17…)
  no fim da lista. Só adicionar tabelas/colunas; preservar dados do usuário.
- Tabela nova entra automaticamente no backup; configurações que são do aparelho vão em
  `CONFIGURACOES_DO_APARELHO` (`src/repositories/backup-repository.ts`).

## Navegação

- Expo Router. Toda tela nova deve ser registrada em `src/app/_layout.tsx` no `Stack.Protected` correto.
- Abas (`src/components/app-tabs.tsx`): Início · Transações · Adicionar (+) · Metas · Perfil.
  **Máximo de 5 abas** (limite do Android); outras áreas (Impostômetro, Academy) são telas empilhadas.

## Impostos e dados fiscais

- Tabelas e premissas ficam só em `src/data/` (`carga-tributaria.ts`, `tributos-renda.ts`,
  `reforma-tributaria.ts`, `programas-estaduais.ts`), com a fonte no comentário. Ao mudar valores, atualize
  os testes em `src/testes/`.
- Ordem do imposto de uma despesa: tributos da nota → estimativa por item da nota → estimativa pela categoria.
  Tributos R$ 0,00 contam como "não informados".
- Os percentuais são **estimativas** (aguardando revisão de contador); a interface deve deixar isso claro.
- Programas estaduais: só incluir os **confirmados**, sempre mandando conferir no site oficial.

## Segurança e privacidade

- Nada de credenciais no código ou em docs. `ANTHROPIC_API_KEY` só em `.env.local` (dev) ou segredo do EAS (produção).
- A chave da API fica só no servidor (`src/app/api/chat+api.ts`); o app envia à IA **apenas totais**, nunca a
  lista de lançamentos.
- Leitura de nota fiscal: buscar/abrir **somente** endereços `.gov.br`.
- Senha nunca é guardada: só sal + hash no `expo-secure-store`. Backup não leva senha nem plano.

## IA (chat)

- Papel educativo e regras da CVM: não recomendar ativos/produtos específicos, não prometer rentabilidade.
- Respostas curtas e **sem Markdown** (o app mostra texto puro). Não incentivar compras sem nota.

## Design

- Paleta atual "Aconchego" em `src/constants/theme.ts` (aprovada pelo usuário); tema segue o sistema;
  Liquid Glass opcional e desligado por padrão. Use sempre as cores do tema, nunca cores soltas.
- Acessibilidade obrigatória: contraste WCAG AA (≥ 4,5:1) nos dois temas, toque ≥ 44 pt, `accessibilityLabel`
  completos, status com ícone + texto, no máximo 8 cores de série (agrupar em "Outras").
- Mudanças grandes de visual: mostre opções ao usuário antes de aplicar.

## Git

- Commits pequenos em português: título curto + corpo com lista "- " do que mudou e por quê.
- Não criar PR sem o usuário pedir.
