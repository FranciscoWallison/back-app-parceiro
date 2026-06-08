# App Corretor — Backend

API REST do app de corretores de adesão (PF + PME), com fluxo completo de proposta:
cotação → documentos → assinatura → pagamento → transmissão → análise da operadora.

## Stack

- **NestJS 11** + TypeScript strict
- **PostgreSQL 16** (Prisma ORM)
- **Redis 7** (rate limit, cache)
- **MinIO** (S3 self-hosted — docs e PDFs assinados)
- **RabbitMQ** (fila de eventos)
- **MailHog** em dev (SMTP fake com GUI)
- **Firebase Admin SDK** (push FCM)
- **pdf-lib** (PDF assinado com glass signature)
- **@nestjs/schedule** (cron dos simuladores)

## Features

- Auth JWT (access + refresh com rotação) + biometria (FaceID/TouchID via Capacitor)
- FSM de proposta: `RASCUNHO → SIMULADA → AGUARDANDO_DOCS → AGUARDANDO_ASSINATURA → AGUARDANDO_PAGAMENTO → TRANSMITIDA → APROVADA | RECUSADA`
- Upload de documento em MinIO com OCR mock determinístico
- Glass signature → PDF gerado com pdf-lib + hash SHA-256
- Pagamento PIX/Boleto simulado (cron auto-confirma após 30s/45s)
- Operadora simulada (cron aprova 90% / recusa 10% propostas TRANSMITIDA após 60s)
- Push notification em mudança de status (Firebase FCM)
- Validação CPF + antifraude mock determinístico
- Email de reset de senha (MailHog em dev, SMTP real em prod)
- 6 simuladores ligáveis/desligáveis por env var

## Quickstart

### 1. Pré-requisitos
- Docker Desktop
- Node 22+ (opcional, apenas para rodar Prisma CLI local)

### 2. Configurar `.env`
```bash
cp .env.example .env
```
Edite `.env` com seus secrets — principalmente:
- `JWT_*_SECRET` — obrigatório
- `TZ=America/Sao_Paulo` — Node respeita; também é repassado ao Gemini para interpretar "amanhã", "próxima segunda" no fuso correto
- `GEMINI_API_KEY` — opcional (sem isso, o chat IA roda em modo STUB)
- `FIREBASE_SERVICE_ACCOUNT` — opcional (para push notifications)

### 3. Subir stack
```bash
docker compose up -d --build
```

Sobe: backend + postgres + redis + minio + rabbitmq + mailhog.

### 4. Endpoints

| Serviço | URL |
|---|---|
| API REST | http://localhost:13000/api |
| Swagger | http://localhost:13000/api/docs |
| MinIO Console | http://localhost:9001 (`minioadmin`/`minioadmin`) |
| MailHog Web | http://localhost:8025 |
| RabbitMQ Mgmt | http://localhost:15672 (`rabbit`/`rabbit_dev`) |

### 5. Usuários de teste (seedados)

| CPF | Senha | Corretora |
|---|---|---|
| `12345678909` | `senha123` | ACME (APROVADA) |
| `11144477735` | `senha123` | Beta (APROVADA) |

## Comandos úteis

```bash
# Logs em tempo real
docker compose logs -f backend

# Apenas o Postgres (para usar Prisma local)
docker compose up -d postgres

# Reset total (apaga volumes)
docker compose down -v

# Prisma CLI local (usa DATABASE_URL do .env)
npx prisma migrate dev --name <nome>
npx prisma studio   # GUI no http://localhost:5555

# Verificar tokens push registrados
docker exec app-corretor-postgres psql -U corretor -d corretor -c \
  "SELECT u.cpf, dt.\"deviceName\", dt.ativo FROM device_tokens dt JOIN users u ON dt.\"userId\"=u.id;"
```

## Simuladores (`*_SIMULADOR=true|false`)

| Env | O que faz | Default |
|---|---|---|
| `PAGAMENTO_SIMULADOR` | Cron 10s confirma pagamentos PIX (30s) e BOLETO (45s) | `true` |
| `OPERADORA_SIMULADOR` | Cron 30s aprova/recusa propostas TRANSMITIDA há +60s (90/10%) | `true` |
| `CPF_SIMULADOR` | Valida CPF + antifraude (mock determinístico) na criação | `true` |
| `OCR_SIMULADOR` | Extrai dados fictícios de docs no upload | `true` |
| `LEMBRETES_SIMULADOR` | Crons diários: carrinho abandonado + renovação | `true` |

Setar `false` desabilita o respectivo cron/serviço (fica fácil ligar integração real depois sem mexer no código).

## Chat com IA (Gemini Function Calling)

O backend hospeda um proxy `POST /ai/chat` (JWT-auth) que recebe mensagens do
corretor e usa o Gemini API com **function calling** para criar/consultar/simular
propostas em linguagem natural.

### Como ligar

1. Obtenha uma chave gratuita em https://aistudio.google.com/apikey
2. Cole em `GEMINI_API_KEY=...` no `.env`
3. `docker compose up -d --build backend`
4. Log deve mostrar `🤖 AiChat ativo: model=gemini-2.5-flash, maxHops=8`

Sem essa env, o `AiChatService` roda em **modo STUB** (responde "configure
GEMINI_API_KEY"). Útil para devs que não querem subir Gemini local.

### Tools expostas (whitelist)

20 funções tipadas que o LLM pode chamar (em sequência). Divididas em **tools
de backend** (mudam estado / consultam dados) e **tools de UI / handoff** (o
backend só retorna um descritor `{ handoff: { kind, ... } }` e o frontend
executa via `ChatHandoffResolver`).

**Backend (10):**

| Tool | O que faz |
|---|---|
| `listarPlanos` | Catálogo (id, nome, valores) |
| `validarCpf` | CPF mock + antifraude |
| `consultarCep` | ViaCEP |
| `criarPropostaPF` / `criarPropostaPME` | Reutiliza `PropostasService.criar` |
| `simularProposta` | Avança RASCUNHO → SIMULADA |
| `listarPropostas` / `detalheProposta` | Consulta |
| `gerarPagamento` | PIX ou BOLETO |
| `instruirAnexarDocumento` | Handoff `OPEN_CAMERA` (frontend abre câmera + faz upload) |
| `instruirAssinar` | Handoff `OPEN_SIGNATURE_MODAL` (modal de assinatura) |

**UI / handoff (9):**

| Tool | Handoff retornado | Ação do frontend |
|---|---|---|
| `abrirPropostaPorId` | `OPEN_PROPOSTA_DETALHE` | Router para `/propostas/:id` |
| `abrirPropostaPorNumero` | `OPEN_PROPOSTA_DETALHE` | Resolve id por número, depois navega |
| `abrirNovaPropostaPF` | `OPEN_WIZARD_PF` | Router para `/propostas/nova-pf` |
| `abrirNovaPropostaPME` | `OPEN_WIZARD_PME` | Router para `/propostas/nova-pme` |
| `abrirListaPropostas` | `OPEN_LISTA_PROPOSTAS` | Router para `/propostas` com queryParams |
| `abrirPainelAdmin` | `OPEN_ADMIN` | Router para `/admin/propostas` |
| `abrirPerfil` | `OPEN_PERFIL` | Router para `/perfil` + fragment opcional |
| `exibirToast` | `SHOW_TOAST` | `ToastController` 3s |
| `realizarLogout` | `DO_LOGOUT` | Confirmação + `AuthService.logout()` |

Detalhes completos do protocolo de handoff em [doc/HANDOFFS.md](../doc/HANDOFFS.md).

**Ações destrutivas (aprovar/recusar/cancelar) NÃO estão na whitelist** — o
LLM é instruído a recusar e redirecionar para a tela admin.

**Ações que mexem em hardware (câmera, modal de assinatura) ou destrutivas
(logout)** pedem confirmação dupla: o LLM confirma em texto + o frontend
mostra um `AlertController` antes de executar.

### Segurança

- JWT obrigatório (reusa `JwtAuthGuard`).
- Throttler: 10 req/min por usuário em `POST /ai/chat`.
- Anonymizer no free tier: `GEMINI_TIER=free` mascara CPF/CNPJ/email/telefone
  antes de enviar texto para o Gemini (Google pode usar prompts free para
  treino). Em `paid`, passa literal.
- Retry com backoff 1s/2s/4s para 429/503.
- Limite de 8 hops por conversa.

### Custos (Gemini 2.5 Flash)

- Free: 1.500 req/dia, 1M tokens/min — cobre demo + dev.
- Pago: ~US$5-23/mês para 10 usuários × 5 conversas/dia (estimativa do case
  agendaAI). Ver [F:\projetos\Estudos--mobile\dicas\case-agendaai-ia-pediatria.md](F:\projetos\Estudos--mobile\dicas\case-agendaai-ia-pediatria.md).

## Configurar Firebase Cloud Messaging (push)

1. https://console.firebase.google.com → seu projeto → ⚙ Settings → Service Accounts → **Generate new private key**
2. Converta o JSON para base64:
   ```bash
   python -c "import base64; print(base64.b64encode(open('sa.json','rb').read()).decode())" | tr -d '\n'
   ```
3. Cole o output em `FIREBASE_SERVICE_ACCOUNT=...` no `.env`
4. `docker compose up -d --build backend`
5. Log deve mostrar `🔔 PushService ativo (projeto: ...)` em vez de modo STUB

Sem essa env, o backend roda em **modo STUB** (loga `[STUB push]` em vez de enviar).

## Frontend (app mobile)

Repositório separado em https://github.com/FranciscoWallison/front-app-parceiro

O frontend (Ionic + Capacitor + Angular) chama este backend via:
- `http://localhost:13000/api` (em ionic serve no PC)
- `http://<IP_LAN>:13000/api` (em APK no device físico, mesma WiFi)

## Documentação detalhada do push

Mais detalhes em [doc/SETUP-PUSH-NOTIFICATIONS.md](../doc/SETUP-PUSH-NOTIFICATIONS.md) (no monorepo original) — cobre setup do Firebase Console, channel Android, troubleshooting de 6 bugs típicos.

## Estrutura de pastas

```
src/
├── auth/              # Login, refresh, biometria, password reset
├── corretoras/        # Cadastro de corretoras (CRUD)
├── cpf-mock/          # CPF + antifraude + OCR (simuladores determinísticos)
├── dashboard/         # Contadores e últimas propostas
├── faq/, contato/, materiais/  # Telas secundárias
├── mail/              # Wrapper nodemailer → MailHog/SMTP
├── pdf/               # Gerador PDF com pdf-lib
├── planos/            # Catálogo de planos cotáveis
├── prisma/            # PrismaService + SeedService
├── propostas/         # Core: criação, FSM, docs, assinatura, pagamento
├── push/              # Firebase Admin SDK + endpoints register-token
├── scheduler/         # Crons (pagamento simulator, cleanup tokens)
├── simuladores/       # Operadora + lembretes contextuais
├── storage/           # @aws-sdk/client-s3 → MinIO
├── users/             # Profile management
└── main.ts
```

## License

Proprietary — App Corretor MVP.
