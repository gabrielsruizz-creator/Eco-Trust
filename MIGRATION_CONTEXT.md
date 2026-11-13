# MIGRATION_CONTEXT — EcoTrust → EcoTrust-UE-Model

Este documento traz tudo o que um novo Claude Code (ou pessoa desenvolvedora) precisa saber para continuar o
EcoTrust **exatamente de onde parou**, no repositório novo **EcoTrust-UE-Model**.

- Auditoria feita em: **2026-11-13**
- Repositório de origem: `gabrielsruizz-creator/Eco-Trust`
- Ponto de partida do código: commit **`83e0287`** ("Aba + para adicionar rápido e saldo em destaque no Início"),
  que era o topo da branch `claude/upbeat-cray-9atuun`. Esse commit **ainda não estava na `main`** (a `main`
  parou em `f550587`, o merge do PR #1). A branch desta auditoria (`claude/vibrant-keller-3zgvut`) contém
  esse código + este documento + o `CLAUDE.md`.
- Estado verificado: `npm run verificar` (tsc + expo lint + jest) **passando — 7 suítes, 84 testes**.
- Nenhuma credencial, token ou senha está neste documento.

> Regra de ouro herdada: **não descartar decisões anteriores**. Antes de mudar algo listado em
> "Decisões" abaixo, confirmar com o usuário.

---

## 1. Como migrar (passo a passo)

O Claude desta sessão não tem permissão para criar repositórios fora do escopo atual; a criação é feita
pelo usuário. Depois de criar o repositório vazio **EcoTrust-UE-Model** no GitHub (sem README, sem
.gitignore, sem licença, para não gerar conflito):

```bash
git clone https://github.com/gabrielsruizz-creator/Eco-Trust.git EcoTrust-UE-Model
```

```bash
cd EcoTrust-UE-Model
```

```bash
git checkout -B main origin/claude/vibrant-keller-3zgvut
```

(a `main` local passa a ser o código atual + estes documentos)

```bash
git remote set-url origin https://github.com/gabrielsruizz-creator/EcoTrust-UE-Model.git
```

```bash
git push -u origin main
```

Isso preserva **todo o histórico de commits** (as mensagens dos commits são parte da documentação das decisões).

Depois de migrar:

1. Dar acesso do app Claude GitHub ao repositório novo (claude.ai → Settings → Connectors / GitHub App).
2. Ajustar o que depende do nome do repositório (nada no código depende dele hoje).
3. Decidir se o `slug` (`app-financas`) e o `projectId` do EAS em `app.json` continuam os mesmos — **mudar
   o projectId cria outro projeto no EAS**; manter se a intenção é continuar o mesmo app.
4. Rodar `npm install` e `npm run verificar`.
5. Opcional: mesclar `claude/upbeat-cray-9atuun` na `main` do repo antigo (ou arquivar o repo antigo).

---

## 2. Auditoria da configuração do Claude Code

| Item | Onde | Situação |
| --- | --- | --- |
| `CLAUDE.md` | raiz | **Não existia.** Criado nesta auditoria (importa o `AGENTS.md`). |
| `CLAUDE.local.md` | raiz | Não existe. |
| `AGENTS.md` | raiz | Existe: regras de Expo/EAS/Expo Router (gerado pelo template do Expo). Mantido sem alterações. |
| `.claude/settings.json` | `.claude/` | Só habilita o plugin **`expo@claude-plugins-official`**. |
| Agentes personalizados (`.claude/agents`) | — | Nenhum. |
| Skills do projeto (`.claude/skills`) | — | Nenhuma. |
| Comandos (`.claude/commands`) | — | Nenhum. |
| Hooks do projeto | — | Nenhum. (Os hooks `SessionStart`/`Stop` vistos nas sessões são do ambiente de nuvem do Claude Code, não do projeto; o `Stop` cobra commit+push de arquivos pendentes.) |
| MCP do projeto (`.mcp.json`) | — | Nenhum. Nas sessões foram usados os conectores da conta: **GitHub** (PRs) e **Claude Docs** (documento para o contador). Figma está conectado, mas não foi usado. |
| VS Code | `.vscode/` | Recomenda `expo.vscode-expo-tools`; ao salvar: fixAll, organizeImports, sortMembers. |
| Memória de sessões | — | Não há arquivos de memória. O histórico foi recuperado do transcript da sessão anterior e das mensagens de commit/PR. |

Para o repositório novo, **copiar** `.claude/settings.json`, `.vscode/`, `AGENTS.md` e `CLAUDE.md` (já vêm no clone).

---

## 3. O produto

**EcoTrust** é um app mobile (Android e iOS) brasileiro de finanças pessoais, **offline-first**, que virou
um **"impostômetro pessoal"**: além de controlar gastos, mostra quanto do dinheiro da pessoa vai para impostos.

Idioma do app, do código (nomes de funções, variáveis, arquivos) e dos commits: **português do Brasil**.

### Funcionalidades implementadas

**Base (MVP, etapas 1 a 17 — commit `4eb2f5b`)**
- Lançamentos (receita/despesa), histórico por dia com filtros, categorias padrão + personalizadas.
- Orçamentos mensais (geral e por categoria) com gráfico de rosca; aviso a partir de 80%.
- Metas com movimentos (inicial/depósito/retirada), ritmo e previsão.
- Saúde financeira 0–100 (6 fatores, metodologia em `saude-service.ts`) com evolução mensal.
- EcoTrust IA: análise por **regras** (`analise-service.ts`, sem modelo) + chat com Claude (`/api/chat`).
- EcoTrust Plus **simulado** (paywall sem cobrança real).
- Conta local com senha (hash SHA-256 iterado 2000×, com sal) e biometria; sessão só em memória;
  bloqueio após 5 min em segundo plano.
- Cadastro guiado por chatbot (máquina de estados pura em `onboarding-chat-service.ts`).
- Gamificação: XP, níveis, sequência, conquistas, mascote "Eco" (tipo Tamagotchi).
- Trust Academy (cursos, aulas com quiz, glossário) e Fórum (**protótipo local** com tópicos de exemplo).
- Calendário próprio para escolher datas.

**Impostômetro (PR #1, mergeado em 2026-10-21)**
- Imposto de cada despesa, nesta ordem de prioridade:
  1. valor dos tributos da nota fiscal (Lei 12.741/2012), quando informado;
  2. estimativa **produto a produto** pelos itens da nota (`TIPOS_PRODUTO` em `carga-tributaria.ts`);
  3. estimativa pelo **tipo de consumo da categoria** (`PERFIS_TRIBUTARIOS`).
  - Nota com **R$ 0,00** de tributos conta como "não informada" (é estimada).
  - Cálculo em centavos fracionados, arredondando só no fim.
- Carga total = consumo + renda (INSS/IRRF 2026 pelo salário bruto, com a redução da Lei 15.270/2025) +
  patrimônio (IPVA/IPTU anuais ÷ 12) + outros mensais (ex.: DAS do MEI).
- Dias trabalhados para o governo, divisão União/Estado/Município, por tributo, por categoria, acumulado do
  ano, **Dia da Liberdade de Impostos** pessoal.
- **Leitura do QR Code da NFC-e** (`expo-camera`): valida chave de acesso (DV, UF, mês, modelo), lê valor do
  QR em contingência/v1, busca a página da SEFAZ (**só `.gov.br`**, tenta https antes de http) e extrai
  valor, data, loja, tributos, **itens** e se saiu **com CPF**. Impede nota duplicada (chave na transação).
  Notas antigas podem "Importar itens".
- Classificação de produtos que **aprende** com o usuário (`classificacao_produtos`).
- Tela **Imposto de Renda**: despesas dedutíveis (saúde sem limite; educação até R$ 3.561,50/pessoa),
  completa × simplificada (20%, até R$ 16.754,34).
- **Simulador da reforma tributária** (IBS+CBS 27,91% — Resolução CGIBS 14/2026; cesta básica zero;
  reduções 60%/40%; Imposto Seletivo = IPI atual; combustível com carga de hoje). Premissas em
  `src/data/reforma-tributaria.ts`.
- Programas estaduais de CPF na nota (SP, PR, RS, DF, BA, MG, GO — **só os confirmados**).
- **Inflação pessoal** e loja mais barata por produto (EAN ou nome, últimos 12 meses).
- Cartão do Impostômetro para **compartilhar** como imagem (`react-native-view-shot`), com opção só de %.
- Impostos no gráfico de categorias/orçamento (anel interno), na lista de Transações e num insight do Início.
- **Backup** em arquivo .json (exportar/restaurar em transação; plano, senha e data do último backup
  não vão no arquivo).
- Testes Jest (84) dos cálculos e da leitura da NFC-e.
- `PUBLICAR.md`: guia de publicação nas lojas.

**Depois do PR #1 (branch `claude/upbeat-cray-9atuun`, 2026-11-12/13 — ainda não estava na `main`)**
- `04ce8c3` Visual "papel e tinta" + opção **Liquid Glass** (Preferências > Aparência > "Efeito vidro").
- `8e12699` **Upgrade para Expo SDK 58** (expo ~58.0.25, React Native 0.88.1, React 19.3). Ajustes de tipos
  do RN 0.88: refs com `ScrollViewInstance` / `HostInstance`; `useColorScheme` sem `'unspecified'`;
  `AndroidImportance` importado direto de `expo-notifications`.
- `2660940` Novo mascote: **saquinho de dinheiro em silhueta** (cor do texto, olhos vazados, expressões por
  humor; só o humor "radiante" ganha cor verde).
- `615c88c` Visual branco e rosa; tema segue o celular por padrão; vidro desligado por padrão.
- `8e7ab39` **Visual "Aconchego"** (atual): creme quente, tinta marrom-escura e rosa; escuro marrom quase
  preto com texto creme; cartões brancos bem arredondados com sombra difusa; botões/seletores em pílula.
  Componentes novos: `Selo`, `Valor` (centavos apagados), `Minigrafico`.
- `83e0287` Aba **"Adicionar" (+)** no lugar da aba Impostos; Impostômetro virou tela empilhada (`/impostos`,
  com "‹ Voltar"); Início com **saldo em destaque** e a faixa do Impostômetro dentro do cartão do saldo.

---

## 4. Stack e comandos

| | Versão |
| --- | --- |
| Expo SDK | **58** (`expo ~58.0.25`) — sempre conferir `package.json` |
| React Native | 0.88.1 |
| React | 19.3.0 |
| Expo Router | ~58.0.31 (rotas tipadas, React Compiler ligado em `app.json > experiments`) |
| TypeScript | ~6.0.3, `strict` |
| Testes | Jest 29 + `jest-expo ~58` |
| Banco | `expo-sqlite` (SQLite síncrono) + `expo-sqlite/kv-store` (legado) |
| Conta | `expo-secure-store`, `expo-crypto`, `expo-local-authentication` |
| IA | `@anthropic-ai/sdk` na rota de servidor `src/app/api/chat+api.ts` |
| Gerenciador | **npm** (`package-lock.json`; não há `bun.lock`) |

```bash
npm install
```

```bash
npm run verificar   # tsc --noEmit && expo lint && jest — rodar antes de dar qualquer tarefa por concluída
```

```bash
npx expo start      # dev server (o chat precisa de ANTHROPIC_API_KEY em .env.local)
```

```bash
npx expo install <pacote>   # SEMPRE usar para adicionar dependências (versões do SDK)
```

O app usa módulos nativos fora do Expo Go (`expo-dev-client` está nas dependências): para testar câmera,
biometria etc. é preciso **development build** (`npx eas-cli@latest build --profile development`).

---

## 5. Arquitetura

```
UI (src/app, src/components) → Hooks (src/hooks) → Services (src/services) → Repositories (src/repositories) → SQLite (src/data)
```

- **Telas nunca chamam repositórios** diretamente; chamam services (ou hooks de leitura).
- **Só os repositórios** usam `src/data/database.ts` (`getBanco()`).
- Cada escrita no banco chama `notificarMudanca()`; `src/hooks/use-dados.ts` usa a "versão dos dados" para
  recalcular as consultas → as telas se atualizam sozinhas.
- Services seguem o padrão **`calcularX` (puro, testável) + `obterX` (busca no banco)**.
- Erros de validação para o usuário: `ErroValidacao` (`src/services/erros.ts`), com mensagem pronta em PT-BR.
- Dinheiro sempre em **centavos inteiros** (`*_centavos` no banco, `*Centavos` no código).
  Datas `AAAA-MM-DD` e meses `AAAA-MM` no fuso do celular (`src/utils/datas.ts`).
- Tabelas fiscais e premissas ficam em `src/data/*.ts` (carga-tributaria, tributos-renda,
  reforma-tributaria, programas-estaduais), com fontes no comentário do topo. **Para atualizar valores,
  edite só esses arquivos** e rode os testes.
- Conteúdo da Academy em `src/data/academy-conteudo.ts` (regra editorial: educativo, sem citar produtos,
  instituições ou ativos).
- Alias `@/*` → `src/*` (tsconfig e Jest).

### Navegação (Expo Router)

- `src/app/_layout.tsx`: `Stack` com `Stack.Protected` —
  sem conta → `cadastro` · com conta e não logado → `entrar` · logado sem perfil → `onboarding` · pronto → app.
  **Toda tela nova precisa ser registrada aqui** dentro do guard `logado && temPerfil`.
- Abas (`src/components/app-tabs.tsx`, `NativeTabs` de `expo-router/unstable-native-tabs`):
  **Início · Transações · Adicionar (+) · Metas · Perfil**.
  O Android aceita no **máximo 5 abas**; por isso Academy e Impostômetro são telas empilhadas abertas pelo Início/Perfil.
- Ícones: `src/components/icone.tsx` (`ICONES`: SF Symbol no iOS + Material no Android).
- Estrutura de tela: `Tela` (abas, aceita `voltar`) e `TelaSecundaria`, em `src/components/tela.tsx` /
  `tela-secundaria.tsx`; componentes `Cartao`, `Botao`, `Segmentado` etc. em `tela.tsx`.

### Banco de dados (migrações)

`src/data/migracoes.ts` — versão em `PRAGMA user_version`; cada migração roda uma vez, numa transação.
**Regra: nunca editar uma migração publicada; sempre ADICIONAR uma nova no fim da lista.**

| Versão | Conteúdo |
| --- | --- |
| v1 | categorias, transacoes, perfil_investidor + categorias padrão |
| v2 | importa dados da 1ª versão (kv-store `lancamentos`/`perfil`) |
| v3 | perfil_financeiro |
| v4 | orcamentos (categoria_id NULL = geral) |
| v5 | metas, metas_movimentos |
| v6 | configuracoes (chave/valor) |
| v7 | perfil_situacao |
| v8 | perfil_pessoal, conquistas, saude_historico |
| v9 | saude_historico.fatores/estimado |
| v10 | academy_*, forum_* (+ tópicos de exemplo) |
| v11 | perfil_pessoal.data_nascimento |
| v12 | categorias.perfil_tributario, transacoes.tributos_centavos, novas categorias padrão |
| v13 | impostos_fixos, transacoes.chave_nota |
| v14 | notas_fiscais, itens_nota (CASCADE com a transação) |
| v15 | transacoes.dedutivel_ir, notas_fiscais.cpf_na_nota, classificacao_produtos |

Próxima migração: **v16**. Ao criar tabela nova, conferir o backup (`backup-repository.ts` copia todas as
tabelas existentes automaticamente; configs do aparelho ficam em `CONFIGURACOES_DO_APARELHO`).

### IA (chat)

- `src/app/api/chat+api.ts` (rota de servidor; `web.output: "server"` em `app.json`). A chave
  **`ANTHROPIC_API_KEY` nunca vai para o celular**: em dev fica em `.env.local` (ignorado pelo git); em produção
  como variável secreta do EAS (ver `PUBLICAR.md`).
- Modelo `claude-opus-5-5`, `effort: medium`, beta `server-side-fallback-2026-07-01` com `fallbacks: 'default'`;
  tratamento de `refusal`, 401, 429.
- O app envia **só totais** (`contexto-ia-service.ts`), nunca a lista de lançamentos.
- System prompt: educativo, regras da **CVM** (não recomendar ativos específicos, não prometer rentabilidade),
  respostas curtas, **sem Markdown** (o app mostra texto puro), PT-BR.
- Também usado por `evolucao-service.ts` (comentário da evolução da saúde, com cache).

---

## 6. Design (estado atual e preferências do usuário)

- Paleta atual: **"Aconchego"** (`src/constants/theme.ts`) — claro: fundo creme `#FBF6F1`, texto tinta
  `#2B1E1A`, destaque rosa `#C23F6E`; escuro: fundo `#16110F`, texto creme `#FBF3EE`, destaque `#FF7BA6`.
- Tema padrão: **segue o sistema** (`preferencias.tema = 'sistema'`); vidro (Liquid Glass) **desligado por
  padrão** (`preferencias.vidro = false`); vidro nativo só no iOS 26+ (`use-aparencia.ts`), senão simulado.
- Acessibilidade é requisito: contraste **WCAG AA ≥ 4,5:1** para text/textSecondary/accentText/onAccent nos
  dois temas; áreas de toque ≥ 44 pt; cores de status sempre com ícone + texto; `SeriesColors` com ordem
  validada para daltonismo (nunca gerar uma 9ª cor, agrupar em "Outras"); `accessibilityLabel` completos.
- Vibração com `expo-haptics` (`src/utils/vibracao.ts`).

Preferências que o usuário expressou nas sessões (em ordem cronológica):
1. Quis visual na linha **Liquid Glass da Apple**, claro e escuro, **com e sem vidro** para comparar.
2. Não gostou do primeiro resultado: pediu para seguir **o layout das telas de referência** (não só a cor de fundo).
3. Pediu opções de paleta (vinho, azul e amarelo…); escolheu testar **branco e rosa** + modo escuro.
4. Achou o **modo escuro difícil de enxergar** → mais contraste.
5. Achou os **botões grandes demais** (Ler nota, Despesa, Receita, Compartilhar) e pediu algo **mais aconchegante**.
6. **Aprovou** a versão aconchegante "com barras únicas e destaque no botão".
7. Pediu para trocar o Tamagotchi por um mascote que **combine com o design** → saquinho de dinheiro.
8. Pediu: tirar o botão Impostos do meio da barra e pôr um **"+"** para adicionar rápido; no Início,
   **destacar o saldo** (com entradas/saídas) e mostrar o Impostômetro **junto, mas com menos destaque**.

As imagens/vídeos de referência que o usuário enviou **não estão no repositório**; se for refazer o design,
pedir de novo ao usuário.

---

## 7. Pendências e próximos passos

Do `PUBLICAR.md` e dos comentários do código:

- [ ] **Identificadores das lojas**: `ios.bundleIdentifier` hoje é `"EcoTrust"` (trocar para `com.<nome>.ecotrust`);
      falta `android.package`. Depois de publicado, não muda mais. **Decisão do usuário.**
- [ ] Contas Apple Developer e Google Play Console.
- [ ] **Política de privacidade** (dados só no aparelho; câmera para QR Code; chat envia resumo de totais à IA).
- [ ] **Revisão das tabelas por um contador** — existe um documento no Claude Docs da conta:
      "EcoTrust — Tabelas tributárias para revisão" (carga por categoria/produto, INSS/IRRF 2026, deduções do IR,
      premissas da reforma, programas estaduais). Os percentuais são **estimativas**.
- [ ] Hospedar a rota do chat (EAS Hosting) + `ANTHROPIC_API_KEY` como segredo do EAS + `origin` no plugin
      `expo-router` em `app.json`. Sem isso, chat e análise por IA mostram erro no app publicado.
- [ ] Instalar e configurar **EAS Update** (`expo-updates`) antes do primeiro build de produção.
- [ ] Assinatura real (App Store / Google Play) e **checagem do plano no servidor** para proteger `/api/chat`
      (hoje o Plus é simulado e a rota não verifica plano).
- [ ] Fórum online (hoje é protótipo local; as regras de validação/privacidade já existem em `forum-service.ts`).
- [ ] Testar a leitura da SEFAZ em mais estados (é "melhor esforço"; não foi testada em todos).
- [ ] Atualizar tabelas quando a CBS substituir PIS/Cofins (2027) e o IBS substituir ICMS/ISS (até 2033).
- [ ] Levar a branch `claude/upbeat-cray-9atuun` para a `main` (no repo antigo) — no repo novo já vem junto.

### Problemas conhecidos / dívidas pequenas

- `README.md` ainda é o do template do Expo (fala em `npm run reset-project`, que não existe).
- Comentário do topo de `src/constants/theme.ts` diz "tema escuro padrão", mas o padrão hoje é seguir o sistema.
- Cor de fundo do splash/ícone adaptativo em `app.json` é `#0F0F0D` (da fase "papel e tinta"), não a do
  tema "Aconchego" (`#16110F`). Confirmar com o usuário antes de trocar.
- `assets/images` ainda tem imagens do template (react-logo, expo-logo, expo-badge, tutorial-web, logo-glow,
  tabIcons) que não são referenciadas em `src/` nem em `app.json`.
- Ícone e splash são **provisórios** (desde o MVP).
- `npm install` no computador do usuário já falhou com `ECONNRESET` (rede); repetir costuma resolver.
- Expo Go: o usuário viu "signed in to Expo Go but not to Expo CLI" → `npx expo login` no terminal
  (ele prefere login pelo console, não pelo navegador).

---

## 8. Ambiente e preferências de trabalho do usuário

- Usa **Windows + PowerShell**; os comandos no `PUBLICAR.md` são para PowerShell. Testa no celular com Expo
  (Expo Go / dev build) e já pediu "tutorial para puxar o app e testar no PC" — instruções passo a passo,
  simples, em português.
- Usa o app desktop do Claude e sessões na nuvem; o hook de `Stop` do ambiente exige **commit + push** de
  tudo antes de terminar.
- Gosta de ver opções de design antes de decidir e de iterar visualmente.
- Comunicação em **português do Brasil**, linguagem simples (o usuário não é necessariamente técnico).
- Commits em português, título curto no imperativo/descritivo e corpo com lista de "- " explicando o quê e por quê
  (ver `git log`). PRs com descrição organizada por seções.
- Perguntou sobre importar o projeto no **Vercel** (v0, ideia de "HUD" de UI design) só para experimentar,
  preocupado em não modificar o projeto no GitHub — tratar experimentos externos em branch/fork separado.
- Já perguntou sobre vulnerabilidades do `npm audit`: explicar a causa antes de corrigir; nunca usar
  `npm audit fix --force` (quebra as versões do SDK) — usar `npx expo install --fix`.
