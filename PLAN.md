# AgentNumber — Phone Infrastructure for AI Agents

> "It's not AI for your phone. It's a phone for your AI."

AgentNumber gives AI agents their own phone numbers. One API call to provision a number, make calls, receive calls, and manage conversations — all designed for autonomous agent workflows.

---

## The Problem

Every AI agent company will need voice eventually. Right now, wiring up phone capabilities means stitching together Twilio + Deepgram + ElevenLabs + your own orchestration layer. It's 500+ lines of config for something that should be one API call.

Legacy telephony providers fail for agents because:
- **Complex setup** — SIP trunks, TwiML, webhook routing, audio streaming config
- **No agent-native abstractions** — no concept of "give my agent a phone number"
- **Real-time orchestration is hard** — managing STT → LLM → TTS pipelines with low latency
- **No conversation intelligence** — transcripts, sentiment, structured extraction are all DIY

Vapi and Bland.ai build the AI agent themselves. We don't. **We give YOUR agent a phone number.** Any framework, any LLM, any use case.

---

## Core Thesis

AgentMail proved the model: take a communication channel humans use, rebuild the infrastructure API-first for agents, charge usage-based. We apply the same model to voice — the highest-trust, highest-conversion communication channel.

---

## Resource Hierarchy

```
Organization (top-level account)
  └── Pod (multi-tenant isolation for SaaS builders)
      └── Number (phone number, e.g. +1-555-0123)
          └── Call (individual call session)
              └── Transcript (real-time + final transcription)
              └── Recording (audio file)
          └── SMS (text messages on the same number)
```

Additional resources: Webhooks, WebSockets, Voices, Guardrails, API Keys.

---

## API Design

**Base URL**: `https://api.agentnumber.com/v0`
**Auth**: Bearer token (API key) — no OAuth, no token refresh

### Numbers

```
POST   /numbers              — Provision a new phone number
GET    /numbers              — List all numbers
GET    /numbers/:id          — Get number details
PATCH  /numbers/:id          — Update number config (voice, guardrails, webhook)
DELETE /numbers/:id          — Release a number
```

Options on provisioning:
- Country/area code preference
- Voice selection (ElevenLabs voice ID, or built-in voices)
- Inbound call handling mode: `agent` (auto-answer with AI), `webhook` (you handle it), `voicemail`
- SMS enabled/disabled

### Calls

```
POST   /calls                — Initiate an outbound call
GET    /calls                — List calls (filter by number, date, status, tags)
GET    /calls/:id            — Get call details + transcript + recording
POST   /calls/:id/transfer   — Transfer to human or another number
POST   /calls/:id/hangup     — End an active call
```

Outbound call payload:
```json
{
  "from": "num_abc123",
  "to": "+15551234567",
  "system_prompt": "You are a scheduling assistant for Dr. Smith's office...",
  "voice": "voice_sarah_warm",
  "max_duration": 300,
  "record": true,
  "webhook_url": "https://myserver.com/call-events",
  "metadata": { "patient_id": "12345" }
}
```

### Transcripts

```
GET    /calls/:id/transcript        — Get full transcript
GET    /calls/:id/transcript/live   — WebSocket for real-time transcript
```

Transcript format:
```json
{
  "segments": [
    { "speaker": "agent", "text": "Hi, this is Sarah from Dr. Smith's office.", "start": 0.0, "end": 2.1, "confidence": 0.97 },
    { "speaker": "human", "text": "Oh hi, yes I was expecting your call.", "start": 2.3, "end": 4.5, "confidence": 0.94 }
  ]
}
```

### SMS

```
POST   /numbers/:id/sms       — Send SMS from a number
GET    /numbers/:id/sms       — List SMS messages
GET    /sms/:id               — Get SMS details
```

### Recordings

```
GET    /calls/:id/recording    — Get recording URL (signed, expires in 1hr)
DELETE /calls/:id/recording    — Delete recording
```

### Voices

```
GET    /voices                 — List available voices
POST   /voices                 — Clone a custom voice (upload audio samples)
GET    /voices/:id             — Get voice details
DELETE /voices/:id             — Delete custom voice
```

### Webhooks

```
POST   /webhooks               — Register a webhook URL
GET    /webhooks               — List webhooks
PATCH  /webhooks/:id           — Update webhook
DELETE /webhooks/:id           — Delete webhook
```

### Pods (Multi-Tenant)

```
POST   /pods                   — Create a pod
GET    /pods                   — List pods
GET    /pods/:id               — Get pod details
DELETE /pods/:id               — Delete pod
POST   /pods/:id/numbers       — Provision number within pod
GET    /pods/:id/calls         — List calls within pod
```

### Webhook Events

```
call.incoming        — Someone is calling an agent's number
call.started         — Call connected
call.ended           — Call ended (includes duration, disposition)
call.recording.ready — Recording is available
call.transcript.ready — Final transcript is available
sms.received         — Incoming SMS
sms.delivered        — Outbound SMS delivered
number.provisioned   — New number activated
```

### WebSocket Events (Real-Time)

```
transcript.partial   — Real-time partial transcription
transcript.final     — Finalized transcript segment
call.status          — Call state changes
agent.speaking       — Agent started/stopped speaking
human.speaking       — Human started/stopped speaking
```

---

## AI-Native Features

### 1. Conversation Intelligence
- **Real-time transcription** — streaming transcript via WebSocket as the call happens
- **Sentiment analysis** — per-segment sentiment scoring (positive/negative/neutral)
- **Structured data extraction** — pull structured data from calls (e.g., appointment time, order number, complaint category) via custom schemas
- **Call summarization** — auto-generated summary after every call

### 2. Semantic Search
Search across all call transcripts by meaning:
```
GET /search?q=customer complained about billing&number_id=num_abc123
```

### 3. Auto-Tagging
Automatically tag calls with custom AI prompts:
```json
{
  "rules": [
    { "tag": "appointment-scheduled", "prompt": "Tag if the caller successfully booked an appointment" },
    { "tag": "escalation-needed", "prompt": "Tag if the caller is angry or requests a manager" }
  ]
}
```

### 4. Guardrails
- **Topic boundaries** — agent won't discuss off-topic subjects
- **PII redaction** — auto-redact SSN, credit cards from transcripts
- **Human escalation triggers** — auto-transfer to human on configurable conditions
- **Call duration limits** — prevent runaway calls
- **Outbound rate limits** — prevent agent from spamming calls
- **Human-in-the-loop** — require approval before outbound calls (draft mode, like AgentMail's drafts)

### 5. Call Drafts (Human-in-the-Loop)
```
POST /drafts                — Agent proposes a call (who, why, script outline)
GET  /drafts                — List pending call drafts
POST /drafts/:id/approve    — Human approves, call is initiated
POST /drafts/:id/reject     — Human rejects with feedback
```

---

## Tech Stack

### Infrastructure Layer
| Component | Provider | Why |
|-----------|----------|-----|
| **Number provisioning** | Twilio / Telnyx | Programmatic number buying, porting, SMS |
| **Voice/SIP** | Twilio Voice or LiveKit | Real-time audio streaming, call control |
| **Speech-to-text** | Deepgram | Fastest real-time STT, speaker diarization |
| **Text-to-speech** | ElevenLabs / Cartesia | Low-latency, natural voices, voice cloning |
| **LLM routing** | Our gateway | Route to Claude/GPT/Gemini based on agent config |

### Application Layer
| Component | Tech | Why |
|-----------|------|-----|
| **API server** | Next.js 16 API routes + tRPC or Hono | Type-safe, fast, already scaffolded |
| **Real-time server** | WebSocket server (ws / Socket.io) | Live transcripts, call events |
| **Database** | PostgreSQL (Neon or Supabase) | Calls, transcripts, numbers, orgs |
| **Queue** | BullMQ + Redis or Inngest | Async jobs: transcription, summarization, webhooks |
| **Storage** | S3 / R2 | Call recordings, voice samples |
| **Auth** | API keys (simple) + dashboard auth (Clerk/NextAuth) | Agent auth = API key, human dashboard = SSO |

### SDKs to Build
| SDK | Priority | Notes |
|-----|----------|-------|
| **Python** | P0 | Most AI agent frameworks are Python |
| **TypeScript/Node** | P0 | Vercel AI SDK, Next.js ecosystem |
| **Go** | P1 | Infrastructure/backend teams |
| **CLI** | P1 | Developer experience, debugging |
| **MCP Server** | P0 | Claude Code / Cursor / OpenClaw integration |

---

## Framework Integrations

| Framework | Integration |
|-----------|------------|
| **OpenAI Agents SDK** | `agentnumber-toolkit` with `.get_tools()` |
| **Vercel AI SDK** | `agentnumber-toolkit/ai-sdk` with `.getTools()` |
| **LangChain** | Tool definitions |
| **CrewAI** | Tool definitions |
| **MCP** | `npx -y agentnumber-mcp` |
| **OpenClaw** | Skill package |
| **LiveKit Agents** | Native audio pipeline integration |

---

## Pricing Model

| Plan | Price | Numbers | Minutes/mo | Recordings | SMS |
|------|-------|---------|------------|------------|-----|
| **Free** | $0 | 1 | 100 | 1 GB | 100 |
| **Developer** | $30/mo | 5 | 1,000 | 10 GB | 1,000 |
| **Startup** | $250/mo | 50 | 10,000 | 100 GB | 10,000 |
| **Enterprise** | Custom | Custom | Custom | Custom | Custom |

Plus usage-based overages:
- Additional minutes: $0.05/min (inbound), $0.08/min (outbound)
- Additional numbers: $2/mo each
- Voice cloning: $5/voice/mo
- Recordings storage: $0.10/GB/mo

---

## MVP Scope (Phase 1)

Ship the smallest thing that's useful:

### Week 1-2: Core Infrastructure
- [ ] Number provisioning via Twilio API (US numbers only)
- [ ] Inbound call handling — answer, stream audio to STT, LLM response, TTS back
- [ ] Outbound call initiation via API
- [ ] Real-time transcription (Deepgram)
- [ ] Call recording storage (S3)
- [ ] PostgreSQL schema: orgs, numbers, calls, transcripts

### Week 3: API & Auth
- [ ] REST API (all /numbers and /calls endpoints)
- [ ] API key auth
- [ ] Webhook delivery for call events
- [ ] WebSocket for real-time transcript streaming

### Week 4: SDKs & DX
- [ ] Python SDK
- [ ] TypeScript SDK
- [ ] MCP server
- [ ] Basic docs site
- [ ] Example: appointment scheduling agent

### Phase 2 (Post-MVP)
- SMS support
- Voice cloning
- Semantic search across transcripts
- Auto-tagging
- Structured data extraction
- Call drafts (human-in-the-loop)
- Multi-tenant pods
- Custom domain caller ID
- Dashboard UI
- Call analytics

### Phase 3 (Scale)
- International numbers
- Number porting
- SIP trunking for enterprise
- HIPAA compliance
- SOC 2
- Go SDK
- CLI tool

---

## Competitive Positioning

| | AgentNumber | Vapi | Bland.ai | Twilio |
|---|---|---|---|---|
| **Model** | Infrastructure API | Voice AI platform | Voice AI platform | Raw telephony API |
| **Who builds the agent?** | You do | They do | They do | You do |
| **Framework agnostic?** | Yes | Partially | No | Yes |
| **Setup complexity** | 1 API call | Medium | Low | High |
| **Agent identity** | First-class (persistent numbers) | Secondary | Secondary | DIY |
| **Conversation intelligence** | Built-in | Built-in | Built-in | None |
| **MCP/SDK integrations** | Yes | Limited | No | No |

**Our positioning**: We are NOT a voice AI agent. We are the **infrastructure layer** that gives any AI agent a phone number. Framework agnostic, LLM agnostic, use case agnostic.

---

## Open Questions

- [ ] Telnyx vs Twilio for telephony backbone? (Telnyx is cheaper, Twilio has better DX)
- [ ] Deepgram vs AssemblyAI for STT? (Deepgram faster, AssemblyAI better accuracy)
- [ ] ElevenLabs vs Cartesia for TTS? (ElevenLabs better quality, Cartesia lower latency)
- [ ] Do we need STIR/SHAKEN compliance from day 1?
- [ ] Voicemail transcription — MVP or Phase 2?
- [ ] Should we support conference calls (multi-party) in Phase 2?
- [ ] Domain: agentnumber.com? agentnumber.ai? Something else?
