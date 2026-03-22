/**
 * Optional OpenAI Moderation API for recommendation text (phase 2).
 * If no API key or request fails, text is treated as approved at submission time.
 */

export type ModerationOutcome = "approved" | "pending";

export async function moderateRecommendationText(text: string): Promise<ModerationOutcome> {
  const trimmed = text.trim();
  if (!trimmed) {
    return "approved";
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "approved";
  }

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: trimmed }),
    });

    if (!res.ok) {
      return "pending";
    }

    const payload = (await res.json()) as {
      results?: Array<{ flagged?: boolean; categories?: Record<string, boolean> }>;
    };
    const result = payload.results?.[0];
    if (result?.flagged) {
      return "pending";
    }
    return "approved";
  } catch {
    return "pending";
  }
}

/**
 * Optional: thematic summary of many public reviews — call only server-side with caching.
 * Stub returns null when no API key (caller shows counts only).
 */
export async function summarizePublicRecommendations(_texts: string[]): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  // Intentionally not implemented in v1 — avoids extra cost; wire in when product needs themes.
  return null;
}
