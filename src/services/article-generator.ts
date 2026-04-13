import { AppError, EXIT_CODE } from "../errors.js";
import type { LlmClient } from "./llm-client.js";

type CoverageReport = {
  notes: string[];
  passed: boolean;
};

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
  readonly #client: LlmClient | undefined;

  public constructor(client?: LlmClient) {
    this.#client = client;
  }

  public async generate(args: {
    title: string;
    transcriptText: string;
  }): Promise<{ article: string; coverageReport: CoverageReport }> {
    if (!this.#client) {
      throw new AppError(
        "Article generation requires an LLM API. Set GEMINI_API_KEY or " +
          "OPENAI_BASE_URL + OPENAI_API_KEY + OPENAI_MODEL in ~/.yt/.env.",
        EXIT_CODE.runtimeError
      );
    }

    const article = await this.#client.call({
      systemPrompt: ARTICLE_SYSTEM_PROMPT,
      userPrompt: createRewritePrompt(args.title, args.transcriptText)
    });

    const coverageResponse = await this.#client.call({
      jsonMode: true,
      systemPrompt: COVERAGE_SYSTEM_PROMPT,
      userPrompt: createCoveragePrompt(article, args.transcriptText)
    });

    return {
      article,
      coverageReport: JSON.parse(coverageResponse) as CoverageReport
    };
  }
}
