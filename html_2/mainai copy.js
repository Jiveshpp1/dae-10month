console.log("Main AI script loaded");

const SERVER = "http://localhost:3000";

// ── Send a message to the server (OpenRouter auto picks the best model) ───────
export async function askModel(prompt, conversationHistory = [], signal = null) {
  try {
    const res = await fetch(`${SERVER}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: localStorage.getItem("user_id") || null,
        prompt,
        history: conversationHistory
      }),
      signal
    });

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.reply;

  } catch (err) {
    if (err.name === "AbortError") throw err;

    console.error("askModel error:", err.message);

    if (err.message.includes("Failed to fetch"))
      return "❌ Cannot reach server — is it running on port 3000?";
    if (err.message.includes("429"))
      return "⏳ Rate limit hit — try again in a moment.";

    return "❌ Error: " + err.message;
  }
}

// ── Aliases so any existing code still works ──────────────────────────────────
export const askGemini     = askModel;
export const askOpenRouter = askModel;