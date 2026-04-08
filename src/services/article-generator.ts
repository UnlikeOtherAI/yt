import { AppError, EXIT_CODE } from "../errors.js";

type CoverageReport = {
  notes: string[];
  passed: boolean;
};

const callGemini = async (
  apiKey: string,
  prompt: string,
  responseMimeType?: string
): Promise<string> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: responseMimeType ? { responseMimeType } : undefined
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    }
  );

  if (!response.ok) {
    throw new AppError(await response.text(), EXIT_CODE.upstreamFailure);
  }

  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new AppError("Gemini returned an empty response.", EXIT_CODE.upstreamFailure);
  }

  return text;
};

const createRewritePrompt = (title: string, transcriptText: string) => `
Rewrite the following YouTube transcript into a coherent article.

Rules:
- Preserve every fact, opinion, example, caveat, and materially meaningful detail.
- Do not shorten for brevity.
- Do not remove uncertainty or soften strong opinions.
- Improve readability, structure, and transitions.
- Do not include timestamps in the article prose.
- Do not invent facts or add outside information.

Title: ${title}

Transcript:
${transcriptText}
`;

const createCoveragePrompt = (article: string, transcriptText: string) => `
Compare the transcript and article.

Return compact JSON with:
- passed: boolean
- notes: string[]

Mark passed false if the article dropped any fact, opinion, example, caveat, or
important nuance from the transcript.

Transcript:
${transcriptText}

Article:
${article}
`;

export class ArticleGenerator {
  readonly #apiKey?: string;

  public constructor(apiKey?: string) {
    this.#apiKey = apiKey;
  }

  public async generate(args: {
    title: string;
    transcriptText: string;
  }): Promise<{ article: string; coverageReport: CoverageReport }> {
    if (!this.#apiKey) {
      throw new AppError(
        "GEMINI_API_KEY is required for article generation.",
        EXIT_CODE.runtimeError
      );
    }

    const article = await callGemini(
      this.#apiKey,
      createRewritePrompt(args.title, args.transcriptText)
    );
    const coverageResponse = await callGemini(
      this.#apiKey,
      createCoveragePrompt(article, args.transcriptText),
      "application/json"
    );

    return {
      article,
      coverageReport: JSON.parse(coverageResponse) as CoverageReport
    };
  }
}
