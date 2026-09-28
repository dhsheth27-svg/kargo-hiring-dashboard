import { GoogleGenAI, Type } from "@google/genai";

// Pinned rather than an "-latest" alias: at time of writing the plain
// "gemini-flash-latest" alias resolves to gemini-3.8-flash, whose free-tier
// quota is separate from (and much smaller/easier to exhaust than) the
// flash-lite family's. Swap this for a full "flash" model on a paid key if
// you want more scoring nuance than lite gives you.
const MODEL = "gemini-3.1-flash-lite";

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local before running the pipeline."
    );
  }
  return new GoogleGenAI({ apiKey });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateJson<T>(prompt: string, schema: object): Promise<T> {
  const ai = client();
  // Free-tier Gemini quotas can be as low as 5 requests/minute, and one
  // candidate needs 8+ calls (scoring alone). Retry generously and respect
  // the API's own retryDelay rather than giving up after a couple of tries —
  // on a paid tier this budget is never exercised.
  const maxAttempts = 8;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.2,
        },
      });
      const text = response.text;
      if (!text) throw new Error("Gemini returned an empty response.");
      return JSON.parse(text) as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isTransient = /429|503|RESOURCE_EXHAUSTED|UNAVAILABLE/.test(message);
      if (!isTransient || attempt === maxAttempts) throw err;

      const retryDelayMatch = message.match(/retryDelay":"(\d+)s"/);
      const waitMs = retryDelayMatch
        ? parseInt(retryDelayMatch[1], 10) * 1000 + 500
        : attempt * 2000;
      await sleep(waitMs);
    }
  }
  throw new Error("Unreachable");
}

// ---- Criterion scoring ---------------------------------------------------
// IMPORTANT: `cvContent` passed in here must already be PII-stripped by
// src/lib/extraction.ts. This function never receives, and never sends,
// a candidate's name, email, or phone number. It also only ever sees ONE
// candidate's content per call — never used to compare candidates.

const SCORE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    raw_score: {
      type: Type.INTEGER,
      nullable: true,
      description:
        "1-5 score against the anchors, or null if the criterion is genuinely not evidenced in the CV content.",
    },
    reasoning: {
      type: Type.STRING,
      description:
        "One line grounded in specific CV content (quote or closely paraphrase it) — never a generic restatement of the anchor text.",
    },
  },
  required: ["raw_score", "reasoning"],
};

export async function scoreCriterion(params: {
  cvContent: string;
  criterionName: string;
  criterionDescription: string;
  anchors: Record<"1" | "2" | "3" | "4" | "5", string>;
  extraGuidance?: string;
}): Promise<{ raw_score: number | null; reasoning: string }> {
  const prompt = `You are scoring a single job candidate's CV against ONE hiring criterion. You are evaluating this candidate in isolation — you have no knowledge of and must not imagine any other candidate.

CRITERION: ${params.criterionName}
WHAT A STRONG CANDIDATE LOOKS LIKE: ${params.criterionDescription}
${params.extraGuidance ? `ADDITIONAL GUIDANCE FOR THIS CRITERION: ${params.extraGuidance}\n` : ""}
SCORING ANCHORS:
1 = ${params.anchors["1"]}
2 = ${params.anchors["2"]}
3 = ${params.anchors["3"]}
4 = ${params.anchors["4"]}
5 = ${params.anchors["5"]}

RULES:
- Score 1-5 strictly against the anchors above.
- If the CV content genuinely does not address this criterion, return raw_score: null (this means "not evidenced", never treat it as a low score like 1).
- Do not infer ownership, initiative, or outcomes from a vague claim (e.g. "responsible for X") unless there is a concrete supporting detail in the same bullet/section.
- Ignore title, employer name/prestige, school, location, age, gender, ethnicity, or any other protected/irrelevant characteristic — do not let these affect the score even if present in the content.
- Your reasoning must cite specific content from the CV below, not a paraphrase of the anchor text.

CANDIDATE CV CONTENT (personal details already removed):
"""
${params.cvContent}
"""

Return the structured JSON result.`;

  return generateJson(prompt, SCORE_SCHEMA);
}

// ---- Interview brief ------------------------------------------------------

const BRIEF_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    brief_text: {
      type: Type.STRING,
      description:
        "Exactly 3 sentences: (1) who they are, grounded in CV facts not adjectives, (2) why they ranked here, tied to 1-2 of their strongest scoring criteria and the evidence behind them, (3) what to probe in interview, aimed at their weakest/not-evidenced criterion, framed as a question to ask.",
    },
  },
  required: ["brief_text"],
};

export async function generateBrief(params: {
  cvContent: string;
  role: "PM" | "SPM";
  scoredCriteria: Array<{
    name: string;
    rawScore: number | null;
    reasoning: string;
  }>;
}): Promise<{ brief_text: string }> {
  const strongest = [...params.scoredCriteria]
    .filter((c) => c.rawScore !== null)
    .sort((a, b) => (b.rawScore ?? 0) - (a.rawScore ?? 0))
    .slice(0, 2);
  const weakest = [...params.scoredCriteria].sort((a, b) => {
    const av = a.rawScore ?? -1;
    const bv = b.rawScore ?? -1;
    return av - bv;
  })[0];

  const prompt = `Write a 3-sentence interview brief for a hiring manager about this candidate, who is a top-ranked shortlist candidate for the ${params.role} role.

Sentence 1: Who they are, grounded in concrete CV facts (roles, scope, domain) — not adjectives like "impressive" or "strong".
Sentence 2: Why the system ranked them here, tying to these strongest scoring criteria and their evidence:
${strongest.map((c) => `- ${c.name} (score ${c.rawScore}/5): ${c.reasoning}`).join("\n")}
Sentence 3: What the interviewer should probe, framed as a question to ask in the interview, aimed at this weakest/least-evidenced criterion:
- ${weakest?.name ?? "N/A"} (score ${weakest?.rawScore ?? "not evidenced"}): ${weakest?.reasoning ?? "No evidence found in CV."}

Do not state the weak criterion as a flaw or weakness — phrase it strictly as a question Arjun (the founder) should ask in the interview.

CANDIDATE CV CONTENT (personal details already removed):
"""
${params.cvContent}
"""

Return exactly 3 sentences as structured JSON.`;

  return generateJson(prompt, BRIEF_SCHEMA);
}

// ---- Draft email ------------------------------------------------------

const EMAIL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING },
    body: {
      type: Type.STRING,
      description:
        'Use the literal placeholder token {{NAME}} everywhere the candidate\'s name should appear — never invent a name, and never leave it blank.',
    },
  },
  required: ["subject", "body"],
};

export async function draftInviteEmail(params: {
  cvContent: string;
  role: "PM" | "SPM";
}): Promise<{ subject: string; body: string }> {
  const prompt = `Draft a short interview-invite email from Arjun, the founder of Kargo (a Series A logistics SaaS company), to a candidate shortlisted for the ${params.role} role.

Requirements:
- Warm and specific: reference exactly ONE concrete thing from their CV content below (a real project, outcome, or responsibility — not a generic "we were impressed by your background").
- State the next step is an interview, without inventing a specific date/time (say something like "I'd like to find 30 minutes this week").
- Signed as Arjun.
- Use the literal token {{NAME}} wherever the candidate's name belongs (e.g. "Hi {{NAME}},"). Never invent a name.
- Do not include a placeholder like [Company] — the company is Kargo.

CANDIDATE CV CONTENT (personal details already removed):
"""
${params.cvContent}
"""

Return structured JSON with subject and body.`;

  return generateJson(prompt, EMAIL_SCHEMA);
}

export async function draftRejectEmail(params: {
  cvContent: string;
  role: "PM" | "SPM";
}): Promise<{ subject: string; body: string }> {
  const prompt = `Draft a short, warm rejection email from Arjun, the founder of Kargo (a Series A logistics SaaS company), to a candidate who applied for the ${params.role} role and was not shortlisted.

Requirements:
- Warm and brief.
- Do NOT include any specific negative feedback about why they didn't make it.
- Leave the door open where genuinely appropriate (e.g. "we'd welcome hearing from you again as Kargo grows"), but don't overpromise.
- Signed as Arjun.
- Use the literal token {{NAME}} wherever the candidate's name belongs (e.g. "Hi {{NAME}},"). Never invent a name.

CANDIDATE CV CONTENT (personal details already removed, provided only for tone context — do not reference specifics from it in a rejection):
"""
${params.cvContent}
"""

Return structured JSON with subject and body.`;

  return generateJson(prompt, EMAIL_SCHEMA);
}
