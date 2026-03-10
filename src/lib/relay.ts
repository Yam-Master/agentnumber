interface RelayConfig {
  gatewayUrl: string; // https://relay.agentnumber.com
  gatewayToken: string;
  agentId: string;
  sessionKey: string;
}

interface RelayParams {
  message: string;
  extraSystemPrompt?: string;
}

interface RelayCallbacks {
  onDelta: (cumulativeText: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
}

export function relayRequest(
  config: RelayConfig,
  params: RelayParams,
  callbacks: RelayCallbacks,
  timeoutMs = 55000
): Promise<void> {
  return new Promise(async (resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        callbacks.onError("Relay timeout");
        resolve();
      }
    }, timeoutMs);

    function finish() {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve();
      }
    }

    try {
      const url = `${config.gatewayUrl.replace(/\/$/, "")}/v1/request`;
      const controller = new AbortController();

      // Abort on timeout
      const abortTimer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.gatewayToken}`,
        },
        body: JSON.stringify({
          agentId: config.agentId,
          sessionKey: config.sessionKey,
          message: params.message,
          extraSystemPrompt: params.extraSystemPrompt,
          timeout: timeoutMs,
        }),
        signal: controller.signal,
      });

      clearTimeout(abortTimer);

      if (!response.ok) {
        let errorMsg = `Relay error: ${response.status}`;
        try {
          const body = await response.json();
          if (body.error) errorMsg = body.error;
        } catch {}
        callbacks.onError(errorMsg);
        finish();
        return;
      }

      if (!response.body) {
        callbacks.onError("Relay returned empty response");
        finish();
        return;
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          let event: { type: string; text?: string; message?: string };
          try {
            event = JSON.parse(json);
          } catch {
            continue;
          }

          if (event.type === "delta" && event.text) {
            callbacks.onDelta(event.text);
          } else if (event.type === "final") {
            callbacks.onFinal(event.text || "");
            finish();
            return;
          } else if (event.type === "error") {
            callbacks.onError(event.message || "Relay request failed");
            finish();
            return;
          }
        }
      }

      // Stream ended without final/error
      if (!settled) {
        callbacks.onError("Relay stream ended unexpectedly");
        finish();
      }
    } catch (err) {
      if (!settled) {
        callbacks.onError(`Relay connection error: ${err instanceof Error ? err.message : String(err)}`);
        finish();
      }
    }
  });
}
