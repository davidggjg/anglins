// ══════════════════════════════════════════════════════════════════
//  DRILL ENGINE  –  2000+ exercises, all skill types, all levels
//  Each session is AI-generated on the fly so content never repeats
// ══════════════════════════════════════════════════════════════════

import { getApiKey } from './storage';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL   = 'llama-3.3-70b-versatile';

// ── low-level helper ─────────────────────────────────────────────
const grok = async (prompt, temperature = 0.85) => {
  const key = await getApiKey();
  if (!key) throw new Error('NO_API_KEY');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: 2000,
    }),
  });
  if (!res.ok) throw new Error('API_ERROR');
  const d = await res.json();
  const raw = d.choices[0].message.content.replace(/```json|```/g, '').trim();
  return JSON.parse(raw);
};

// ────────────────────────────────────────────────────────────────
//  DRILL TYPES  (14 distinct skill categories)
// ────────────────────────────────────────────────────────────────
export const DRILL_TYPES = [
  { id: 'vocab_mc',       label: 'אוצר מילים',       emoji: '🔤', skill: 'vocabulary'    },
  { id: 'fill_blank',     label: 'מלא חסר',           emoji: '✏️', skill: 'grammar'       },
  { id: 'translate_he',   label: 'תרגום עברית→אנגלית', emoji: '🇮🇱', skill: 'translation'   },
  { id: 'translate_en',   label: 'תרגום אנגלית→עברית', emoji: '🇬🇧', skill: 'translation'   },
  { id: 'sentence_build', label: 'בנה משפט',          emoji: '🧩', skill: 'writing'       },
  { id: 'error_fix',      label: 'תקן שגיאה',         emoji: '🔍', skill: 'grammar'       },
  { id: 'listening_q',    label: 'הבנת הנקרא',        emoji: '📖', skill: 'reading'       },
  { id: 'phrasal_verb',   label: 'פעלים מורכבים',     emoji: '💡', skill: 'vocabulary'    },
  { id: 'idiom',          label: 'ביטויים אנגליים',   emoji: '🎭', skill: 'vocabulary'    },
  { id: 'tense_drill',    label: 'זמנים',             emoji: '⏰', skill: 'grammar'       },
  { id: 'word_form',      label: 'צורות מילה',        emoji: '🔄', skill: 'grammar'       },
  { id: 'preposition',    label: 'מילות יחס',         emoji: '📍', skill: 'grammar'       },
  { id: 'collocation',    label: 'צירופי מילים',      emoji: '🔗', skill: 'vocabulary'    },
  { id: 'pronunciation',  label: 'הגייה',             emoji: '🔊', skill: 'pronunciation' },
  { id: 'reading_comp',   label: 'קריאה והבנה',       emoji: '📚', skill: 'reading'       },
  { id: 'writing_prompt', label: 'כתיבה חופשית',      emoji: '✍️', skill: 'writing'       },
  { id: 'conditional',    label: 'משפטי תנאי',        emoji: '🤔', skill: 'grammar'       },
  { id: 'passive_active', label: 'פסיבי ואקטיבי',    emoji: '↔️', skill: 'grammar'       },
  { id: 'article',        label: 'a/an/the',          emoji: '📌', skill: 'grammar'       },
  { id: 'comparative',    label: 'השוואות',           emoji: '⚖️', skill: 'grammar'       },
];

// ────────────────────────────────────────────────────────────────
//  BATCH GENERATOR  –  generates 20 exercises at once per type
// ────────────────────────────────────────────────────────────────
export const generateDrillBatch = async (drillType, level, topic = null, count = 20) => {
  const topicLine = topic ? `Topic/context: "${topic}".` : 'Choose a varied real-life context.';
  const levelGuide = {
    A1: 'Use very simple, basic everyday words. Max 5-word sentences.',
    A2: 'Simple grammar, common vocabulary, short sentences.',
    B1: 'Intermediate grammar, work/travel/daily life topics.',
    B2: 'Upper-intermediate. Complex sentences, nuanced vocabulary.',
    C1: 'Advanced grammar, idiomatic language, professional contexts.',
    C2: 'Native-level. Subtle distinctions, literary/formal register.',
  }[level] || 'Intermediate level.';

  const typeInstructions = {
    vocab_mc: `Multiple-choice vocabulary: give an English word or phrase, ask for Hebrew meaning or use in context. 4 options.`,
    fill_blank: `Fill-in-the-blank grammar sentences. Use ___ for the blank. 4 options provided.`,
    translate_he: `Hebrew sentence → translate to English. No options (open answer). correctAnswer is the best English translation.`,
    translate_en: `English sentence → translate to Hebrew. No options (open answer). correctAnswer is the best Hebrew translation.`,
    sentence_build: `Give 4-6 words/phrases scrambled, user must put them in correct order. Options are the 4 reordered versions (3 wrong). correctAnswer = correct sentence.`,
    error_fix: `Show a sentence with ONE grammar/spelling error. 4 options: corrected versions (only 1 is fully correct).`,
    listening_q: `Short English reading passage (2-3 sentences), then a comprehension question. 4 options.`,
    phrasal_verb: `Question about a phrasal verb (e.g. "give up", "look after"). Test meaning or usage. 4 options.`,
    idiom: `English idiom or expression. Test meaning or usage in context. 4 options.`,
    tense_drill: `Fill the blank with the correct verb tense form. 4 options showing different tenses.`,
    word_form: `Give a base word, ask for its correct form (noun/verb/adjective/adverb) in a sentence. 4 options.`,
    preposition: `Fill blank with correct preposition (in/on/at/for/of/to etc). 4 options.`,
    collocation: `Which word collocates correctly with the given word? (e.g. "make/do/have ___"). 4 options.`,
    pronunciation: `Which word has a different pronunciation pattern / stress / silent letter? 4 words as options.`,
    reading_comp: `A paragraph (3-4 sentences) then a comprehension/inference question. 4 options.`,
    writing_prompt: `An open writing prompt. correctAnswer is a model answer. options: [] (open answer type).`,
    conditional: `Conditional sentence (0/1st/2nd/3rd conditional) – fill blank or choose correct form. 4 options.`,
    passive_active: `Convert active→passive or passive→active. Or identify which is passive. 4 options.`,
    article: `Fill the blank with a / an / the / (nothing). 4 options.`,
    comparative: `Comparative/superlative form or usage question. 4 options.`,
  }[drillType] || 'General English grammar/vocabulary multiple choice.';

  const prompt = `You are an expert English teacher creating exercises for Hebrew speakers at level ${level}.
${levelGuide}
${topicLine}

Generate EXACTLY ${count} exercises of type: "${drillType}".
Instruction for this type: ${typeInstructions}

Return ONLY a valid JSON array of ${count} objects. Each object:
{
  "id": "unique_id_string",
  "type": "${drillType}",
  "question": "The question / sentence",
  "passage": "optional reading passage if needed (null otherwise)",
  "options": ["opt1","opt2","opt3","opt4"],
  "correctAnswer": "exact correct answer",
  "explanation": "explanation in Hebrew – why this is correct and what to remember",
  "difficulty": "${level}",
  "skill": "vocabulary|grammar|translation|writing|reading|pronunciation",
  "topic": "topic tag in English",
  "xpReward": 10
}

Rules:
- For open-answer types (translate_he, translate_en, writing_prompt): set options to []
- correctAnswer must EXACTLY match one of the options (for MC) or be the model answer (for open)
- Vary difficulty slightly within the batch (some easier, some harder)
- Make exercises genuinely educational, not trivial
- Explanations MUST be in Hebrew
- No duplicate questions
- Return ONLY the JSON array, no markdown, no extra text`;

  return await grok(prompt, 0.9);
};

// ────────────────────────────────────────────────────────────────
//  SMART SESSION BUILDER
//  Builds a ~50-exercise mega-session mixing drill types by skill
// ────────────────────────────────────────────────────────────────
export const buildMegaSession = async (level, focus = 'balanced') => {
  // focus: 'balanced' | 'grammar' | 'vocabulary' | 'translation' | 'reading' | 'writing'
  
  const mixes = {
    balanced:    ['vocab_mc','fill_blank','translate_he','translate_en','tense_drill','phrasal_verb','error_fix','reading_comp','collocation','article'],
    grammar:     ['fill_blank','tense_drill','error_fix','conditional','passive_active','article','word_form','preposition','comparative','sentence_build'],
    vocabulary:  ['vocab_mc','phrasal_verb','idiom','collocation','word_form','translate_he','translate_en','pronunciation','vocab_mc','phrasal_verb'],
    translation: ['translate_he','translate_en','translate_he','translate_en','sentence_build','translate_he','translate_en','idiom','translate_he','translate_en'],
    reading:     ['reading_comp','listening_q','reading_comp','vocab_mc','error_fix','reading_comp','fill_blank','listening_q','reading_comp','translate_en'],
    writing:     ['writing_prompt','sentence_build','translate_he','error_fix','writing_prompt','fill_blank','sentence_build','writing_prompt','translate_he','error_fix'],
  };

  const selectedTypes = mixes[focus] || mixes.balanced;
  
  // We generate 5 exercises per type in parallel (5 × 10 types = 50 exercises)
  const batches = await Promise.all(
    selectedTypes.map(type => generateDrillBatch(type, level, null, 5))
  );

  // Flatten and shuffle
  const all = batches.flat();
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  return { exercises: all, focus, level, total: all.length };
};

// ────────────────────────────────────────────────────────────────
//  INFINITE DRILL  –  generate next batch when running low
// ────────────────────────────────────────────────────────────────
export class InfiniteDrill {
  constructor(level, drillType) {
    this.level = level;
    this.drillType = drillType;
    this.buffer = [];
    this.loading = false;
    this.totalGenerated = 0;
  }

  async prefetch(count = 20) {
    if (this.loading) return;
    this.loading = true;
    try {
      const batch = await generateDrillBatch(this.drillType, this.level, null, count);
      this.buffer.push(...batch);
      this.totalGenerated += batch.length;
    } finally {
      this.loading = false;
    }
  }

  async next() {
    if (this.buffer.length < 5 && !this.loading) {
      this.prefetch(20); // background fetch
    }
    if (this.buffer.length === 0) {
      await this.prefetch(20);
    }
    return this.buffer.shift();
  }

  hasMore() { return true; } // infinite
  bufferSize() { return this.buffer.length; }
}

// ────────────────────────────────────────────────────────────────
//  ADAPTIVE DIFFICULTY ENGINE
// ────────────────────────────────────────────────────────────────
export const getAdaptedLevel = (baseLevel, recentResults) => {
  if (!recentResults || recentResults.length < 5) return baseLevel;
  
  const recent10 = recentResults.slice(-10);
  const correctRate = recent10.filter(r => r.correct).length / recent10.length;
  
  const levels = ['A1','A2','B1','B2','C1','C2'];
  const idx = levels.indexOf(baseLevel);
  
  if (correctRate >= 0.85 && idx < 5) return levels[idx + 1]; // Level up
  if (correctRate < 0.40 && idx > 0) return levels[idx - 1];  // Level down
  return baseLevel;
};

// ────────────────────────────────────────────────────────────────
//  SPACED REPETITION SCHEDULER
// ────────────────────────────────────────────────────────────────
const SM2 = (item, quality) => {
  // quality: 0-5 (0=blackout, 5=perfect)
  let { interval = 1, repetitions = 0, easeFactor = 2.5 } = item;

  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions++;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  return {
    interval,
    repetitions,
    easeFactor,
    nextReview: new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString(),
  };
};

export const updateSRS = (item, wasCorrect) => {
  const quality = wasCorrect ? 4 : 1;
  return SM2(item, quality);
};

// ────────────────────────────────────────────────────────────────
//  READING COMPREHENSION GENERATOR (long passages)
// ────────────────────────────────────────────────────────────────
export const generateReadingPassage = async (level, topic = null) => {
  const wordCount = { A1: 80, A2: 150, B1: 250, B2: 400, C1: 600, C2: 900 }[level] || 200;

  const prompt = `Create a reading comprehension exercise for a Hebrew speaker at English level ${level}.
${topic ? `Topic: ${topic}.` : 'Choose an interesting real-world topic.'}

Return ONLY valid JSON:
{
  "title": "Article title",
  "titleHe": "כותרת בעברית",
  "passage": "The full passage in English (${wordCount} words approximately)",
  "vocabulary": [{"word":"...","translation":"...","inPassage":true}],
  "questions": [
    {
      "id": "q1",
      "question": "Comprehension question",
      "type": "multiple_choice|true_false|open",
      "options": ["a","b","c","d"],
      "correctAnswer": "...",
      "explanation": "הסבר בעברית",
      "skill": "literal|inferential|vocabulary|main_idea"
    }
  ],
  "summary": "Summary in Hebrew – 2-3 sentences",
  "difficulty": "${level}"
}

Generate 5 questions covering: main idea, detail, inference, vocabulary in context, and author's purpose.`;

  return await grok(prompt, 0.8);
};

// ────────────────────────────────────────────────────────────────
//  WRITING EVALUATOR
// ────────────────────────────────────────────────────────────────
export const evaluateWriting = async (prompt_text, userText, level) => {
  const prompt = `You are an expert English writing evaluator. Evaluate this Hebrew speaker's English writing.

Level: ${level}
Prompt given: "${prompt_text}"
Student wrote: "${userText}"

Return ONLY valid JSON:
{
  "overallScore": 85,
  "grade": "B+",
  "feedback": {
    "grammar": { "score": 80, "issues": ["issue1","issue2"], "comment": "comment in Hebrew" },
    "vocabulary": { "score": 85, "highlights": ["good word used"], "comment": "comment in Hebrew" },
    "coherence": { "score": 90, "comment": "comment in Hebrew" },
    "taskAchievement": { "score": 88, "comment": "comment in Hebrew" }
  },
  "corrections": [
    { "original": "wrong phrase", "corrected": "better phrase", "explanation": "הסבר בעברית" }
  ],
  "improvedVersion": "A rewritten, improved version of what the student wrote",
  "encouragement": "Encouraging comment in Hebrew",
  "nextFocus": "What to practice next, in Hebrew"
}`;

  return await grok(prompt, 0.5);
};

// ────────────────────────────────────────────────────────────────
//  TOPIC CATEGORIES for drill menu
// ────────────────────────────────────────────────────────────────
export const TOPIC_CATEGORIES = [
  { id: 'daily',      label: 'חיי יומיום',     emoji: '🏠', topics: ['home','food','shopping','transport','time'] },
  { id: 'work',       label: 'עבודה',           emoji: '💼', topics: ['job interview','meetings','emails','office','career'] },
  { id: 'travel',     label: 'טיולים',          emoji: '✈️', topics: ['airport','hotel','directions','booking','tourism'] },
  { id: 'social',     label: 'חברתי',           emoji: '👥', topics: ['friendship','dating','family','parties','small talk'] },
  { id: 'health',     label: 'בריאות',          emoji: '🏥', topics: ['doctor','fitness','diet','mental health','pharmacy'] },
  { id: 'tech',       label: 'טכנולוגיה',       emoji: '💻', topics: ['internet','apps','social media','AI','coding'] },
  { id: 'culture',    label: 'תרבות',           emoji: '🎭', topics: ['movies','music','books','art','sports'] },
  { id: 'news',       label: 'חדשות ועולם',     emoji: '🌍', topics: ['politics','environment','economy','science','society'] },
  { id: 'academic',   label: 'אקדמי',           emoji: '🎓', topics: ['essays','research','presentations','discussions','critical thinking'] },
  { id: 'business',   label: 'עסקים',           emoji: '📈', topics: ['negotiations','presentations','reports','marketing','finance'] },
];
