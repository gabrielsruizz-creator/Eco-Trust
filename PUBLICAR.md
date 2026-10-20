# Como publicar o EcoTrust na App Store e no Google Play

Passo a passo para levar o app às lojas com o EAS (o serviço de build da Expo, sem precisar de Xcode ou
Android Studio). Os comandos rodam no PowerShell, na pasta do projeto.

## 1. Antes de tudo: decisões que só você pode tomar

| O quê | Situação hoje | O que fazer |
| --- | --- | --- |
| Identificador no iOS | `"bundleIdentifier": "EcoTrust"` | Trocar por um no formato `com.seunome.ecotrust` em `app.json` → `expo.ios`. Depois de publicado, não muda mais. |
| Identificador no Android | não existe | Adicionar `"package": "com.seunome.ecotrust"` em `app.json` → `expo.android` (o mesmo do iOS, de preferência). |
| Contas de desenvolvedor | — | Apple Developer Program (US$ 99/ano) e Google Play Console (US$ 25, uma vez). |
| Política de privacidade | não existe | As duas lojas exigem um link. O app guarda dados financeiros só no aparelho; a câmera lê o QR Code das notas; o chat envia um resumo dos totais para a IA. Isso precisa estar escrito na política. |
| Revisão das tabelas | estimativas | Ver o documento "EcoTrust — Tabelas tributárias para revisão" com um contador. |

## 2. Chat com IA em produção

O chat chama a rota `src/app/api/chat+api.ts`. No desenvolvimento ela roda no próprio `npx expo start`;
no app publicado ela precisa de um servidor:

1. Publique a rota no EAS Hosting: `npx expo export --platform web` e depois `npx eas-cli@latest deploy --prod`.
2. Cadastre a chave da Anthropic como variável do projeto no EAS (nunca no código):
   `npx eas-cli@latest env:create --name ANTHROPIC_API_KEY --environment production --visibility secret`.
3. Coloque o endereço que o deploy mostrar (ex.: `https://ecotrust.expo.app`) no plugin do Expo Router, em `app.json`:
   `["expo-router", { "origin": "https://ecotrust.expo.app" }]`.

Sem esses passos o app funciona normalmente, mas o chat e a análise por IA mostram erro.

## 3. Testar uma versão de verdade antes das lojas

```powershell
npm run verificar                                              # typecheck, lint e testes
npx eas-cli@latest build --profile preview --platform android  # gera um APK para instalar direto
npx eas-cli@latest build --profile preview --platform ios      # iPhone: exige conta Apple e aparelho cadastrado
```

O EAS mostra um link/QR Code para instalar. Teste principalmente: leitura de QR Code de notas, backup e
restauração, e o Impostômetro com dados reais.

## 4. Gerar e enviar para as lojas

```powershell
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --profile production --platform ios      # vai para o TestFlight / App Store Connect
npx eas-cli@latest submit --profile production --platform android  # vai para o Google Play Console
```

O número de versão sobe sozinho a cada build (`autoIncrement` em `eas.json`). Nas lojas, preencha a
descrição, as capturas de tela, a classificação etária e o formulário de privacidade/segurança de dados.

## 5. Atualizações depois de publicado

Mudanças só de código (telas, cálculos, tabelas) podem chegar aos celulares sem passar pela revisão
das lojas, com o EAS Update. Ele ainda não está no projeto: antes do primeiro build de produção, rode
`npx expo install expo-updates` e `npx eas-cli@latest update:configure`. Depois disso, cada atualização é
`npx eas-cli@latest update --channel production --message "o que mudou"`.
Bibliotecas novas com código nativo exigem um build novo (passo 4).
