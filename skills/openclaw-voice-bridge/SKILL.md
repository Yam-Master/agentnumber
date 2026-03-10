---
name: openclaw-voice-bridge
description: Run and operate the AgentNumber OpenClaw voice bridge. Use when the user asks how calls/SMS are routed between OpenClaw, Vapi, Twilio, and AgentNumber, or needs setup/troubleshooting.
metadata:
  {
    "clawdbot":
      {
        "emoji": "📞",
        "homepage": "https://agentnumber.dev",
        "requires": { "bins": ["node"] },
      },
  }
---

# OpenClaw Voice Bridge (AgentNumber)

This skill explains and operates the local bridge at:

- `voice-bridge/server.mjs`

The bridge is a local process that connects OpenClaw <-> phone channels.

## What It Does

1. Connects to the local OpenClaw gateway over WebSocket.
2. Exposes HTTP endpoints for voice and SMS.
3. Routes incoming voice turns to your OpenClaw agent and returns OpenAI-compatible responses for Vapi.
4. Optionally polls AgentNumber inbound SMS and sends agent-generated SMS replies.

## Current Architecture

### Voice path (push)

Caller -> Twilio/Vapi -> AgentNumber number config `webhook_url` -> local bridge `POST /` -> OpenClaw gateway -> agent response -> bridge -> Vapi -> caller.

### SMS path (two options)

- Push-to-bridge mode:
  Twilio/AgentNumber -> bridge `POST /sms` -> OpenClaw -> bridge JSON response.
- Polling auto-reply mode:
  Bridge polls `GET /api/v0/sms?direction=inbound&status=received...` every 10s, asks OpenClaw for a reply, sends via `POST /api/v0/sms`.

## Required Config

### In `voice-bridge/server.mjs`

- `GATEWAY_URL`
- `GATEWAY_TOKEN`
- `AGENT_ID`
- `SESSION_KEY`
- `MEMORY_FILE` (optional, but used for voice prompt context)

### In `voice-bridge/.env` (for SMS polling)

- `AN_API_URL` (default exists)
- `AN_API_KEY`
- `AN_NUMBER_ID` (`num_...`)

If `AN_API_KEY` or `AN_NUMBER_ID` are missing, SMS polling is disabled.

## How To Run

```bash
cd voice-bridge
node server.mjs
```

Expected startup logs:

- `Voice bridge running on http://localhost:3002`
- `Gateway: ...`
- `Session: ...`
- `SMS polling: every 10s ...` OR `SMS polling: disabled ...`

## Health Check

```bash
curl http://localhost:3002/health
```

Returns JSON with:

- `status`
- `connected` (OpenClaw gateway status)
- `agent`
- `session`

## AgentNumber Integration

For phone calls to hit the bridge, the number's `webhook_url` must point to the bridge's public URL.

Examples:

- local dev tunnel URL: `https://<tunnel>/`
- hosted bridge URL: `https://bridge.yourdomain.com/`

For SMS push mode to bridge, send webhook payloads to:

- `https://<bridge>/sms`

## Operational Notes

- Voice uses a single call session key: `SESSION_KEY`.
- SMS uses per-sender sessions: `agent:<AGENT_ID>:sms:<senderNumber>`.
- `thinking: "off"` is used for low-latency phone behavior.
- Response timeout is 30s for both voice and SMS handling.

## Troubleshooting

### Bridge says not connected

Cause: OpenClaw gateway is not reachable/authenticated.

Check:

- gateway running
- `GATEWAY_URL` port
- `GATEWAY_TOKEN`

### Calls hit AgentNumber but no bridge response

Cause: Number `webhook_url` is wrong or not publicly reachable.

Check:

- number config `webhook_url`
- bridge `/health`
- ingress/tunnel status

### SMS polling enabled but no replies

Check:

- `AN_API_KEY` and `AN_NUMBER_ID`
- inbound messages visible via AgentNumber API
- Twilio compliance (A2P 10DLC/Toll-Free verification) for US delivery

### Twilio 30034 / US 10DLC errors

Not a bridge bug. Outbound US delivery is blocked until A2P registration (or toll-free path) is completed.

## When To Use This Skill

Use this skill when users ask:

- "How does the OpenClaw bridge work?"
- "Why aren't calls or SMS reaching my agent?"
- "How do I wire AgentNumber number webhooks to OpenClaw?"
- "How do I enable/disable SMS polling?"
