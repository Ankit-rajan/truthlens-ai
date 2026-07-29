const Groq = require("groq-sdk");
const axios = require("axios");

class AIService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    this.geminiApiKey = process.env.GEMINI_API_KEY;
  }

  async analyzeNews(articleContent) {
    const provider = (process.env.AI_PROVIDER || "groq").toLowerCase();

    const prompt = `
You are a professional investigative journalist with expertise in fact-checking and misinformation analysis.

Analyze the following news article and provide a structured report in JSON format.

Article:
${articleContent}

Return JSON with exactly these fields:

{
  "summary": "",
  "verdict": "Fake | Likely Fake | Partially True | True",
  "confidence": 0,
  "reasons": [],
  "possibleMisinformation": [],
  "manipulationTechniques": [],
  "evidence": [],
  "crossVerification": [],
  "alternativeSources": [],
  "suggestions": []
}

Return ONLY valid JSON.
`;

    try {
      let result;

      // ===========================
      // GROQ
      // ===========================
      if (provider === "groq") {
        const response = await this.groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          temperature: 0.3,
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "system",
              content:
                "You are an expert fact checker. Return ONLY valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        result = JSON.parse(response.choices[0].message.content);
      }

      // ===========================
      // GEMINI
      // ===========================
      else if (provider === "gemini") {
        if (!this.geminiApiKey) {
          throw new Error("GEMINI_API_KEY is missing.");
        }

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
            },
          }
        );

        const text =
          response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
          throw new Error("Gemini returned invalid JSON.");
        }

        result = JSON.parse(jsonMatch[0]);
      }

      // ===========================
      // INVALID PROVIDER
      // ===========================
      else {
        throw new Error(`Unsupported AI Provider: ${provider}`);
      }

      return result;
    } catch (error) {
      console.error("\n========== AI ERROR ==========");

      if (error.response) {
        console.error("Status:", error.response.status);
        console.error(
          JSON.stringify(error.response.data, null, 2)
        );
      } else {
        console.error(error.message);
      }

      console.error("==============================\n");

      throw new Error("Failed to analyze news with AI");
    }
  }
}

module.exports = new AIService();