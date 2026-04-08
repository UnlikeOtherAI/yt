import { AppError, EXIT_CODE } from "../errors.js";

type CoverageReport = {
  notes: string[];
  passed: boolean;
};

const DEFAULT_GEMINI_MODEL = "gemini-3.1-pro-preview";

const ARTICLE_SYSTEM_PROMPT = `
You convert raw YouTube transcripts into readable article-form prose without
losing source meaning.

Non-negotiable requirements:
- Preserve every factual claim, opinion, example, caveat, joke, qualification,
  speculation, prediction, criticism, endorsement, comparison, and conclusion.
- Do not drop information because it seems repetitive, minor, obvious, weak, or
  stylistically awkward.
- Do not summarize, condense, compress, abstract away, or merge separate points
  into a shorter statement if that would remove meaning.
- Do not neutralize tone. If the speaker is confident, skeptical, dismissive,
  enthusiastic, uncertain, sarcastic, or strongly opinionated, preserve that
  stance in the prose.
- Do not invent facts, examples, transitions, or outside context.
- Do not add analysis that is not already supported by the transcript.
- Do not output timestamps in the article body.

Writing objective:
- Make the transcript easier to read as an article.
- Improve structure, paragraphing, transitions, and sentence clarity.
- Keep the original informational density.
- Prefer faithful prose over elegance whenever there is a tradeoff.

If a sentence contains an opinion and a fact, preserve both.
If a passage repeats a point with a meaningful variation, preserve the
variation.
If the source is ambiguous or uncertain, preserve the ambiguity.
`;

const COVERAGE_SYSTEM_PROMPT = `
You are a strict fidelity auditor.

Compare a source transcript and a derived article. The article passes only if it
preserves all meaningful facts, opinions, examples, caveats, reasoning steps,
and tone from the transcript.

Fail the article if it:
- drops any factual detail
- drops or softens any opinion
- removes examples, caveats, or uncertainty
- compresses multiple distinct claims into one vaguer claim
- changes the speaker's stance or emphasis

Return compact JSON only with:
- passed: boolean
- notes: string[]
`;

const callGemini = async (args: {
  apiKey: string;
  model: string;
  prompt: string;
  responseMimeType?: string;
  systemInstruction: string;
}): Promise<string> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent?key=${args.apiKey}`,
    {
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: args.prompt }]
          }
        ],
        systemInstruction: {
          parts: [{ text: args.systemInstruction }]
        },
        generationConfig: args.responseMimeType
          ? { responseMimeType: args.responseMimeType }
          : undefined
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
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new AppError("Gemini returned an empty response.", EXIT_CODE.upstreamFailure);
  }

  return text;
};

const createRewritePrompt = (title: string, transcriptText: string) => `
Rewrite the transcript into article-form prose.

Return only the article body.

<title>
${title}
</title>

<transcript>
${transcriptText}
</transcript>
`;

const createCoveragePrompt = (article: string, transcriptText: string) => `
Check whether the article preserves the transcript with full fidelity.

<transcript>
${transcriptText}
</transcript>

<article>
${article}
</article>
`;

export class ArticleGenerator {
  readonly #apiKey: string | undefined;
  readonly #model: string;

  public constructor(apiKey?: string, model = DEFAULT_GEMINI_MODEL) {
    this.#apiKey = apiKey;
    this.#model = model;
  }

  public async generate(args: {
    title: string;
    transcriptText: string;
  }): Promise<{ article: string; coverageReport: CoverageReport }> {
    const apiKey = this.#apiKey;

    if (!apiKey) {
      throw new AppError(
        "GEMINI_API_KEY is required for article generation.",
        EXIT_CODE.runtimeError
      );
    }

    const article = await callGemini({
      apiKey,
      model: this.#model,
      prompt: createRewritePrompt(args.title, args.transcriptText),
      systemInstruction: ARTICLE_SYSTEM_PROMPT
    });
    const coverageResponse = await callGemini({
      apiKey,
      model: this.#model,
      prompt: createCoveragePrompt(article, args.transcriptText),
      responseMimeType: "application/json",
      systemInstruction: COVERAGE_SYSTEM_PROMPT
    });

    return {
      article,
      coverageReport: JSON.parse(coverageResponse) as CoverageReport
    };
  }
}
