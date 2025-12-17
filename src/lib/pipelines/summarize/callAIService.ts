import { AISummaryConfig } from "./config";

/**
 * Call AI service to generate a summary
 */

export async function callAIService(
  prompt: string,
  config: AISummaryConfig,
  options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  },
): Promise<string> {
  const model = options?.model || config.defaultModel || "openai/gpt-4o-mini";
  console.log("Using model:", model);
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "HTTP-Referer": process.env.SITE_URL || "https://github.com",
        "X-Title": process.env.SITE_NAME || "Contributor Leaderboard",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are writing GitHub activity summaries. Use only the actual contribution data provided. Never add, modify or make up information.",
          },
          { role: "user", content: prompt },
        ],
        temperature: options?.temperature ?? config.temperature,
        max_tokens: options?.maxTokens ?? config.max_tokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error calling AI service:", error);
    throw error;
  }
}
