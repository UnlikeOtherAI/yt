import { AppError, EXIT_CODE } from "../errors.js";
import type { AppConfig } from "../config.js";

export interface LlmClient {
  call(args: { jsonMode?: boolean; systemPrompt: string; userPrompt: string }): Promise<string>;
}

export class GeminiClient implements LlmClient {
  readonly #apiKey: string;
  readonly #model: string;

  public constructor(apiKey: string, model: string) {
    this.#apiKey = apiKey;
    this.#model = model;
  }

  public async call(args: {
    jsonMode?: boolean;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.#model}:generateContent?key=${this.#apiKey}`,
      {
        body: JSON.stringify({
          contents: [{ parts: [{ text: args.userPrompt }] }],
          generationConfig: args.jsonMode ? { responseMimeType: "application/json" } : undefined,
          systemInstruction: { parts: [{ text: args.systemPrompt }] }
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      }
    );

    if (!response.ok) {
      throw new AppError(await response.text(), EXIT_CODE.upstreamFailure);
    }

    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new AppError("Gemini returned an empty response.", EXIT_CODE.upstreamFailure);
    }

    return text;
  }
}

export class OpenAIClient implements LlmClient {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #model: string;

  public constructor(apiKey: string, baseUrl: string, model: string) {
    this.#apiKey = apiKey;
    this.#baseUrl = baseUrl.replace(/\/+$/u, "");
    this.#model = model;
  }

  public async call(args: {
    jsonMode?: boolean;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<string> {
    const response = await fetch(`${this.#baseUrl}/chat/completions`, {
      body: JSON.stringify({
        messages: [
          { content: args.systemPrompt, role: "system" },
          { content: args.userPrompt, role: "user" }
        ],
        model: this.#model,
        ...(args.jsonMode ? { response_format: { type: "json_object" } } : {})
      }),
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      throw new AppError(await response.text(), EXIT_CODE.upstreamFailure);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content;

    if (!text) {
      throw new AppError(
        "OpenAI-compatible API returned an empty response.",
        EXIT_CODE.upstreamFailure
      );
    }

    return text;
  }
}

export const createLlmClient = (config: AppConfig): LlmClient | undefined => {
  if (config.openaiBaseUrl) {
    if (!config.openaiApiKey) {
      throw new AppError(
        "OPENAI_API_KEY is required when OPENAI_BASE_URL is set.",
        EXIT_CODE.runtimeError
      );
    }

    if (!config.openaiModel) {
      throw new AppError(
        "OPENAI_MODEL is required when OPENAI_BASE_URL is set.",
        EXIT_CODE.runtimeError
      );
    }

    return new OpenAIClient(config.openaiApiKey, config.openaiBaseUrl, config.openaiModel);
  }

  if (config.geminiApiKey) {
    return new GeminiClient(config.geminiApiKey, config.geminiModel);
  }

  return undefined;
};
