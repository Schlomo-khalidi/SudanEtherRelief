/** Gemini structured-JSON client. The API key / model come from env. */

const MODEL = process.env.LLM_MODEL ?? "gemini-3.8-flash";
const FALLBACK_MODELS = [
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-pro",
];

export function llmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tries the configured model, then known-good fallbacks, retrying transient 429/503s. */
export async function llmJson<T>(prompt: string, opts?: { temperature?: number; timeoutMs?: number }): Promise<T> {
  const key = process.env.LLM_API_KEY;
  if (!key) throw new Error("LLM_API_KEY is not set");

  const models = [MODEL, ...FALLBACK_MODELS.filter((m) => m !== MODEL)];
  let lastError: Error | null = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: opts?.temperature ?? 0.2,
              },
            }),
            signal: AbortSignal.timeout(opts?.timeoutMs ?? 90_000),
          },
        );
        if (res.status === 429 || res.status === 503) {
          lastError = new Error(`${model} ${res.status} (high demand)`);
          await sleep(2500 * (attempt + 1));
          continue;
        }
        if (!res.ok) throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 300)}`);

        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
        const cleaned = text
          .replace(/^```json\s*/i, "")
          .replace(/```\s*$/, "")
          .trim();
        return JSON.parse(cleaned) as T;
      } catch (e) {
        lastError = e as Error;
        if (String(e).includes("aborted")) break; // timeout — move to next model
      }
    }
  }
  throw lastError ?? new Error("LLM call failed");
}
