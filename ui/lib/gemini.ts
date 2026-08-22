// Motor conversacional sobre Gemini (free tier) usando su endpoint compatible
// con la API de OpenAI — mismo SDK "openai", solo cambian baseURL/apiKey/modelo.
// https://ai.google.dev/gemini-api/docs/openai

import OpenAI from "openai";

export const gemini = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});
