// Manual smoke test for lib/ai/chat.ts — hits real provider APIs, so it's not
// part of `npm test` / CI (no network calls to paid/rate-limited services in
// the automated suite). Run by hand: node scripts/smoke-test-ai.mjs
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).trim()];
    })
);
Object.assign(process.env, env);

const { runChat } = await import("../lib/ai/chat.ts");

const providers = process.argv[2] ? [process.argv[2]] : ["groq", "mistral"];

for (const provider of providers) {
  process.env.AI_PROVIDER = provider;
  try {
    const reply = await runChat({
      messages: [{ role: "user", content: "Reply with exactly one word: pong" }],
    });
    console.log(provider, "-> OK:", reply.trim());
  } catch (err) {
    console.log(provider, "-> FAILED:", err.message);
  }
}
