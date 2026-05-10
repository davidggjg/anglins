import { getApiKey } from './storage';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const callGroq = async (messages, systemPrompt, temperature = 0.7) => {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const response = await fetch(GROQ_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('INVALID_API_KEY');
    throw new Error(err.error?.message || 'API_ERROR');
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

// ─── Level Assessment ───────────────────────────────────────────────
export const generateLevelTestQuestion = async (questionIndex, previousAnswers = []) => {
  const context = previousAnswers.length > 0
    ? `Previous answers: ${JSON.stringify(previousAnswers.slice(-3))}`
    : 'This is the first question.';

  const prompt = `You are an English level assessment AI. Generate question #${questionIndex + 1} of 10 for a Hebrew speaker learning English.
${context}
Adapt difficulty based on previous answers. Start easy (question 1-3: A1-A2), then go harder (4-7: B1-B2), then hardest (8-10: C1-C2).

Return ONLY valid JSON (no markdown, no explanation):
{
  "question": "The question text in English",
  "type": "multiple_choice" | "fill_blank" | "translate_he_to_en" | "translate_en_to_he" | "sentence_fix",
  "options": ["option1", "option2", "option3", "option4"],
  "correctAnswer": "the correct answer",
  "explanation": "Brief explanation in Hebrew why this is correct",
  "difficulty": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "topic": "grammar" | "vocabulary" | "reading" | "translation"
}

For fill_blank type, use ___ in the question. Options still required (4 choices).
For translate types, no options needed (set options to []).`;

  const raw = await callGroq([{ role: 'user', content: 'Generate the question.' }], prompt, 0.8);
  
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    throw new Error('PARSE_ERROR');
  }
};

export const calculateLevel = (answers) => {
  const levels = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };
  const levelNames = { 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1', 6: 'C2' };
  
  let totalScore = 0;
  let count = 0;
  
  answers.forEach(a => {
    if (a.correct) {
      totalScore += levels[a.difficulty] || 2;
    } else {
      totalScore += Math.max(1, (levels[a.difficulty] || 2) - 1);
    }
    count++;
  });
  
  const avg = count > 0 ? totalScore / count : 1;
  const levelNum = Math.max(1, Math.min(6, Math.round(avg)));
  
  return {
    code: levelNames[levelNum],
    score: Math.round((totalScore / (count * 6)) * 100),
    description: getLevelDescription(levelNames[levelNum]),
  };
};

const getLevelDescription = (level) => {
  const descriptions = {
    'A1': 'מתחיל - Beginner',
    'A2': 'בסיסי - Elementary',
    'B1': 'בינוני - Intermediate',
    'B2': 'בינוני מתקדם - Upper Intermediate',
    'C1': 'מתקדם - Advanced',
    'C2': 'שליטה מלאה - Mastery',
  };
  return descriptions[level] || 'Beginner';
};

// ─── Daily Lesson Generation ─────────────────────────────────────────
export const generateDailyLesson = async (userLevel, wordsLearned = [], topic = null) => {
  const learnedList = wordsLearned.slice(-20).map(w => w.word).join(', ');
  const topicPrompt = topic ? `Focus on topic: ${topic}.` : 'Pick an interesting everyday topic.';

  const prompt = `You are an expert English teacher for Hebrew speakers. Create a daily lesson for level ${userLevel}.
${topicPrompt}
Already learned words (don't repeat): ${learnedList || 'none yet'}.

Return ONLY valid JSON:
{
  "lessonTitle": "Catchy lesson title",
  "topicHe": "נושא השיעור בעברית",
  "topicEn": "Lesson topic in English",
  "vocabulary": [
    {
      "word": "English word",
      "translation": "תרגום לעברית",
      "pronunciation": "how to pronounce",
      "example": "Example sentence in English",
      "exampleHe": "תרגום המשפל לעברית",
      "difficulty": "easy|medium|hard"
    }
  ],
  "grammarTip": {
    "title": "Grammar point",
    "titleHe": "נקודה דקדוקית",
    "explanation": "Clear explanation in Hebrew",
    "examples": ["example 1", "example 2"],
    "examplesHe": ["תרגום 1", "תרגום 2"]
  },
  "exercises": [
    {
      "id": "ex1",
      "type": "multiple_choice|fill_blank|translate_he|translate_en|reorder",
      "question": "Question text",
      "options": ["opt1", "opt2", "opt3", "opt4"],
      "correctAnswer": "correct",
      "explanation": "Explanation in Hebrew",
      "xpReward": 10
    }
  ]
}

Include exactly 8 vocabulary words and 6 exercises. Make it engaging and relevant.`;

  const raw = await callGroq([{ role: 'user', content: 'Generate the daily lesson.' }], prompt, 0.85);
  
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
};

// ─── Review Session ──────────────────────────────────────────────────
export const generateReviewSession = async (mistakesBank, userLevel) => {
  const mistakes = mistakesBank.slice(0, 10);
  
  if (mistakes.length === 0) return null;
  
  const prompt = `Create a targeted review session based on these mistakes for level ${userLevel} English learner (Hebrew speaker).
Mistakes to review: ${JSON.stringify(mistakes)}

Return ONLY valid JSON:
{
  "sessionTitle": "Review Session Title",
  "exercises": [
    {
      "id": "rev1",
      "type": "multiple_choice|fill_blank|translate_he|translate_en",
      "question": "Question targeting the mistake",
      "options": ["opt1", "opt2", "opt3", "opt4"],
      "correctAnswer": "correct",
      "explanation": "Why this is correct - in Hebrew",
      "xpReward": 15,
      "targetsMistake": "which mistake this targets"
    }
  ]
}

Create 5 targeted exercises. Make them help the learner understand and remember correctly.`;

  const raw = await callGroq([{ role: 'user', content: 'Generate review session.' }], prompt, 0.7);
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
};

// ─── Chat Conversation Practice ──────────────────────────────────────
export const chatWithTutor = async (messages, userLevel) => {
  const systemPrompt = `You are an English tutor named "Max" helping a Hebrew speaker at level ${userLevel} practice English through conversation.
Rules:
- Always respond in English, but add Hebrew explanations when introducing new vocabulary
- Correct mistakes GENTLY - first respond naturally, then note the correction at the end
- Keep responses SHORT (2-4 sentences) and conversational
- Encourage the learner with positive reinforcement
- If the learner makes a grammar mistake, point it out friendly: "Quick tip: instead of '...' try '...'"
- Always end with a question to keep the conversation going
- Format corrections as: 💡 *Correction: ...*`;

  return await callGroq(messages, systemPrompt, 0.9);
};

// ─── Word of the Day ─────────────────────────────────────────────────
export const generateWordOfDay = async (userLevel) => {
  const prompt = `Generate an interesting, useful "Word of the Day" for an English learner at level ${userLevel} (Hebrew speaker).

Return ONLY valid JSON:
{
  "word": "English word",
  "partOfSpeech": "noun|verb|adjective|adverb|phrase",
  "translation": "תרגום לעברית",
  "pronunciation": "phonetic pronunciation",
  "definition": "Definition in simple English",
  "definitionHe": "הגדרה בעברית",
  "examples": [
    {"en": "Example sentence 1", "he": "תרגום 1"},
    {"en": "Example sentence 2", "he": "תרגום 2"}
  ],
  "synonyms": ["synonym1", "synonym2"],
  "memoryTip": "Memory tip in Hebrew - a trick to remember this word",
  "funFact": "Interesting fact about this word or its usage"
}`;

  const raw = await callGroq([{ role: 'user', content: 'Generate word of the day.' }], prompt, 0.9);
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
};

// ─── Validate API Key ────────────────────────────────────────────────
export const validateApiKey = async (apiKey) => {
  try {
    const response = await fetch(GROQ_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'Say "OK" only.' }],
        max_tokens: 5,
      }),
    });

    if (response.status === 401) return { valid: false, error: 'מפתח API לא תקין' };
    if (!response.ok) return { valid: false, error: 'שגיאה בחיבור ל-Groq' };
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'אין חיבור לאינטרנט' };
  }
};
