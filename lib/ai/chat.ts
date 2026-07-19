/**
 * One entry point for calling the audit brain's LLM, provider chosen by
 * AI_PROVIDER so test runs (Groq/Mistral free tiers) and production
 * (Claude Opus, per docs/phase1-build-spec.md) never need different call
 * sites — only env vars change.
 */

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export interface RunChatInput {
  messages: ChatMessage[];
}

type Provider = "anthropic" | "groq" | "mistral";

function getProvider(): Provider {
  const provider = (process.env.AI_PROVIDER ?? "anthropic") as Provider;
  if (!["anthropic", "groq", "mistral"].includes(provider)) {
    throw new Error(`Unknown AI_PROVIDER: ${provider}`);
  }
  return provider;
}

async function postChatCompletion(
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${url} -> ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function runGroq(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  const model = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
  return postChatCompletion(
    "https://api.groq.com/openai/v1/chat/completions",
    apiKey,
    model,
    messages
  );
}

async function runMistral(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY is not set");
  const model = process.env.MISTRAL_MODEL ?? "mistral-small-latest";
  return postChatCompletion(
    "https://api.mistral.ai/v1/chat/completions",
    apiKey,
    model,
    messages
  );
}

async function runAnthropic(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

  const system = messages.find((m) => m.role === "system")?.content;
  const rest = messages.filter((m) => m.role !== "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system,
      messages: rest,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`anthropic -> ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export async function runChat({ messages }: RunChatInput): Promise<string> {
  const provider = getProvider();
  switch (provider) {
    case "groq":
      return runGroq(messages);
    case "mistral":
      return runMistral(messages);
    case "anthropic":
      return runAnthropic(messages);
  }
}
