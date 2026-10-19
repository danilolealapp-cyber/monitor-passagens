# ✈️ Radar de Passagens

Varre preços de passagens 3x por dia (07h, 13h, 20h), guarda o histórico no Firebase
e avisa no Telegram quando um preço fica 30% ou mais abaixo do usual.

## Status das fases
- [x] **Fase 1–2:** robô de varredura + alerta + relatório no Telegram (pasta `scanner/`)
- [x] **Fase 3:** dashboard web (pasta `web/`, publicado no GitHub Pages)
- [x] **Fase 4:** bot do Telegram com comandos e IA (pasta `bot/`, publicado no Cloudflare Workers)
- [ ] **Fase 5:** milhas Smiles

---

## Configuração da Fase 1 (passo a passo)

### Passo 1: criar o bot no Telegram (2 min)
1. No Telegram, procure **@BotFather** e abra a conversa.
2. Envie `/newbot`.
3. Escolha um nome (ex.: `Minhas Passagens`) e um usuário terminado em `bot` (ex.: `passagens_douglas_bot`).
4. O BotFather responde com um **token** parecido com `123456789:AAH...`. Guarde-o.
5. Abra o seu bot novo e mande um **"oi"** (isso é necessário para ele poder te responder).

### Passo 2: cadastro no Travelpayouts (5 min)
1. Crie uma conta em https://www.travelpayouts.com (é gratuito).
2. No painel, vá em **Perfil → API token** (ou "Developers / API") e copie o **token**.

### Passo 3: Firebase (10 min)
1. Acesse https://console.firebase.google.com e clique em **Criar projeto** (pode desativar o Google Analytics).
2. No menu lateral: **Criação → Firestore Database → Criar banco de dados**.
   - Local: **southamerica-east1 (São Paulo)**
   - Modo: **produção**
3. Clique na engrenagem ⚙️ → **Configurações do projeto → Contas de serviço → Gerar nova chave privada**.
4. Um arquivo `.json` será baixado. Renomeie para **`service-account.json`** e coloque dentro da pasta `scanner/`.

> ⚠️ Esse arquivo é uma senha. Ele já está protegido para não ir para o GitHub.

### Passo 4: preencher as chaves no seu computador
1. Na pasta `scanner/`, copie o arquivo `.env.example` e renomeie a cópia para `.env`.
2. Cole os tokens do Telegram e do Travelpayouts.
3. Para descobrir o `TELEGRAM_CHAT_ID`, no terminal dentro da pasta `scanner/` rode:
   ```
   npm run telegram-id
   ```
   e cole o número que aparecer no `.env`.

### Passo 5: cadastrar uma rota e testar
```
npm run add-route -- LIS 2027-03-01 2027-05-31 7 12
npm run scan
```
(Exemplo: Lisboa, ida entre 1º de março e 31 de maio, ficando de 7 a 12 noites.)
Se tudo der certo, chega um relatório no seu Telegram. 🎉

### Passo 6: colocar no GitHub (roda sozinho 3x por dia)
Faremos juntos: criar o repositório público, enviar o código e cadastrar as chaves
em **Settings → Secrets and variables → Actions**:
`FIREBASE_SERVICE_ACCOUNT` (conteúdo inteiro do service-account.json),
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TRAVELPAYOUTS_TOKEN`.

---

## Como funciona o alerta
- **Preço usual** = mediana dos menores preços dos últimos 30 dias daquela rota.
- Os alertas só começam depois de **2 dias** de histórico (6 varreduras).
- Para não repetir alerta: só avisa de novo depois de 24h ou se cair mais 5%.

## De onde vêm os preços
- **Principal: Google Flights** ([scanner/src/googleflights.js](scanner/src/googleflights.js)). Gratuito e sem chave,
  mas não é uma API oficial: se o Google mudar a página, o arquivo precisa de ajuste.
  Cada busca cobre um par de datas, então cada varredura testa ~12 combinações por rota,
  variando as datas entre as varreduras (manhã, tarde, noite) para cobrir toda a janela ao longo do dia.
- **Reserva: Travelpayouts**, usado automaticamente se o Google falhar. Tem poucos dados
  saindo de Brasília (cache de buscas de outros usuários).
- Sempre **confira o preço no link antes de comprar**.
