/**
 * Gemini API Key helper.
 * Set GEMINI_API_KEY in your project secrets / .env.local — never hardcode keys.
 */
export const getGeminiApiKey = (): string | null => {
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && envKey !== "undefined" && envKey !== "null" && envKey.length > 10) {
    return envKey;
  }
  return null;
};
