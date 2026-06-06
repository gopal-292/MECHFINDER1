// AI triage of a breakdown description using Google Gemini's free REST API.
// Entirely optional: when GEMINI_API_KEY is unset (or the call fails), this
// returns null and the rest of the app behaves exactly as before.

const GEMINI_MODEL = "gemini-1.5-flash";

type TriageInput = {
  issueDescription: string;
  vehicleType?: string | null;
  vehicleModel?: string | null;
};

export function isTriageEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function triageIssue(input: TriageInput): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const vehicle = [input.vehicleType, input.vehicleModel].filter(Boolean).join(" ");
  const prompt = [
    "You are a roadside-assistance dispatcher. A driver reported a breakdown.",
    "In 2-3 short sentences, give the mechanic a quick triage:",
    "the most likely cause, the urgency (low/medium/high), and what tools or parts to bring.",
    "Be concrete and avoid filler. Do not use markdown or headings.",
    "",
    vehicle ? `Vehicle: ${vehicle}` : "Vehicle: unspecified",
    `Reported issue: ${input.issueDescription}`,
  ].join("\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 200 },
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
