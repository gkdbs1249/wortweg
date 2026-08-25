import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNightLesson,
  bilingualMeaning,
  calendarDayStatus,
  cumulativeNounQuestions,
  dueReviews,
  extendCohortWithWords,
  exampleClozeQuestion,
  exampleFormExplanation,
  examplePromptParts,
  finalFailures,
  getSessionForTime,
  isCorrect,
  isExampleGapCorrect,
  isGermanHeadwordCorrect,
  learningCardSides,
  lessonOverview,
  mergeProgressStates,
  monthCalendarDays,
  normalizeAnswer,
  nounArticleQuestion,
  prioritizeReviewItems,
  pronounceableGerman,
  shuffleCopy,
  summarizeLearningDay,
  summarizeReverseAttempts,
} from '../src/core.mjs';

test('night lesson contains 20 new words plus carried failures without duplicates', () => {
  const fresh = Array.from({ length: 25 }, (_, i) => ({ id: `n${i}` }));
  const carry = [{ id: 'c1' }, { id: 'c2' }, { id: 'n3' }];
  const lesson = buildNightLesson(fresh, carry, 20);
  assert.equal(lesson.length, 22);
  assert.deepEqual(lesson.slice(-2).map(w => w.id), ['c1', 'c2']);
});

test('only words missed at least twice in final night test are carried', () => {
  const attempts = { a: 0, b: 1, c: 2, d: 4 };
  assert.deepEqual(finalFailures(attempts), ['c', 'd']);
});

test('session timing follows learn night, next morning, and two-days-later final night', () => {
  const learned = '2026-08-23';
  assert.equal(getSessionForTime(learned, new Date('2026-08-23T21:00:00+09:00')), 'learn');
  assert.equal(getSessionForTime(learned, new Date('2026-08-24T08:00:00+09:00')), 'morning-review');
  assert.equal(getSessionForTime(learned, new Date('2026-08-25T21:00:00+09:00')), 'final-review');
  assert.equal(getSessionForTime(learned, new Date('2026-08-24T21:00:00+09:00')), null);
});

test('overdue reviews remain due until completed', () => {
  const cohorts = [
    { id: 'day1', learnedDate: '2026-08-20', morningDone: false, finalDone: false },
    { id: 'day2', learnedDate: '2026-08-21', morningDone: true, finalDone: false },
    { id: 'day3', learnedDate: '2026-08-22', morningDone: true, finalDone: true },
  ];
  const due = dueReviews(cohorts, '2026-08-23');
  assert.deepEqual(due.morning.map(c => c.id), ['day1']);
  assert.deepEqual(due.final.map(c => c.id), ['day1', 'day2']);
});

test('answers ignore case and surrounding spaces and accept slash-separated meanings', () => {
  assert.equal(normalizeAnswer('  Haus  '), 'haus');
  assert.equal(isCorrect('집', '집/가정'), true);
  assert.equal(isCorrect('가옥', '집/가정'), false);
});

test('typed German answers ignore case and plural notation but require the article', () => {
  assert.equal(isGermanHeadwordCorrect('  DIE ADRESSE ', 'die Adresse,-en'), true);
  assert.equal(isGermanHeadwordCorrect('der Aufzug', 'der Aufzug, -ü, e'), true);
  assert.equal(isGermanHeadwordCorrect('Adresse', 'die Adresse,-en'), false);
  assert.equal(isGermanHeadwordCorrect('die Bekannte', 'der/die Bekannte, -n'), true);
  assert.equal(isGermanHeadwordCorrect('die Abfahrt', 'die Abfahrt'), true);
});

test('German TTS text removes dictionary notation but keeps meaningful articles and reflexives', () => {
  assert.equal(pronounceableGerman('die Adresse,-en'), 'die Adresse');
  assert.equal(pronounceableGerman('der Gruß, -ü, e'), 'der Gruß');
  assert.equal(pronounceableGerman('(sich) duschen'), 'sich duschen');
  assert.equal(pronounceableGerman('zum Beispiel/z. B.'), 'zum Beispiel');
  assert.equal(pronounceableGerman('der, die, das'), 'der, die, das');
  assert.equal(pronounceableGerman('ander-'), 'ander');
  assert.equal(pronounceableGerman('die Eltern (pl.)'), 'die Eltern');
  assert.equal(pronounceableGerman('gern(e)'), 'gerne');
  assert.equal(pronounceableGerman('Grad (Celsius)'), 'Grad Celsius');
  assert.equal(pronounceableGerman('(Kredit)-Karte, -n'), 'Kreditkarte');
});

test('noun article questions hide one unambiguous der die or das article', () => {
  assert.deepEqual(nounArticleQuestion({ id: 'a', german: 'die Adresse,-en', korean: '주소', english: 'address' }), {
    id: 'a', article: 'die', noun: 'Adresse', meaning: '주소 · address',
  });
  assert.equal(nounArticleQuestion({ id: 'b', german: 'der/die Bekannte, -n', korean: '지인', english: 'acquaintance' }), null);
  assert.equal(nounArticleQuestion({ id: 'c', german: 'abfahren', korean: '출발하다', english: 'depart' }), null);
});

test('official A1 examples become context cloze questions', () => {
  assert.deepEqual(exampleClozeQuestion({
    id: 'address', german: 'die Adresse,-en', korean: '주소', english: 'address',
    exampleGerman: 'Können Sie mir seine Adresse sagen?',
  }), {
    id: 'address', canonical: 'die Adresse,-en',
    sentence: 'Können Sie mir seine Adresse sagen?',
    prompt: 'Können Sie mir seine ___ sagen?', gapAnswer: 'Adresse',
    meaning: '주소 · address',
  });
  const departure = exampleClozeQuestion({
    id: 'depart', german: 'abfahren', korean: '출발하다', english: 'depart',
    exampleGerman: 'Wir fahren um zwölf Uhr ab.',
  });
  assert.equal(departure.prompt, 'Wir ___ um zwölf Uhr ab.');
  assert.equal(isExampleGapCorrect(' FAHREN ', departure), true);
  assert.equal(isExampleGapCorrect('abfahren', departure), false);

  const arrival = exampleClozeQuestion({
    id: 'arrival', german: 'die Ankunft', korean: '도착', english: 'arrival',
    exampleGerman: 'Auf diesem Plan steht nur die Ankunft(-szeit) der Züge.',
  });
  assert.equal(arrival.prompt, 'Auf diesem Plan steht nur die ___ der Züge.');
  assert.equal(arrival.gapAnswer, 'Ankunft');
});

test('example form explanation teaches why a separable verb differs from the learned headword', () => {
  const departure = exampleClozeQuestion({
    id: 'depart', german: 'abfahren', korean: '출발하다', english: 'depart',
    exampleGerman: 'Wir fahren um zwölf Uhr ab.',
  });
  const explanation = exampleFormExplanation(departure);
  assert.equal(explanation.title, '왜 fahren인가요?');
  assert.match(explanation.body, /abfahren.*분리동사/);
  assert.match(explanation.body, /wir.*fahren/);
  assert.match(explanation.body, /ab.*문장 끝/);
  assert.match(explanation.note, /die Abfahrt.*명사/);
  assert.equal(explanation.pattern, 'abfahren → Wir fahren um zwölf Uhr ab.');
});

test('example form explanation stays conservative for unchanged forms', () => {
  const address = exampleClozeQuestion({
    id: 'address', german: 'die Adresse,-en', korean: '주소', english: 'address',
    exampleGerman: 'Können Sie mir seine Adresse sagen?',
  });
  assert.equal(exampleFormExplanation(address), null);

  const statePhrase = exampleClozeQuestion({
    id: 'on', german: 'an sein', korean: '켜져 있다', english: 'be on',
    exampleGerman: 'Heute Nacht war das Licht an.',
  });
  assert.equal(exampleFormExplanation(statePhrase), null);
});

test('separable verb explanation finds a subject placed after the verb', () => {
  const coming = exampleClozeQuestion({
    id: 'come-along', german: 'mitkommen', korean: '함께 가다', english: 'come along',
    exampleGerman: 'Ich gehe ins Kino. Kommst du mit?',
  });
  const explanation = exampleFormExplanation(coming);
  assert.match(explanation.body, /du.*Kommst/);
  assert.doesNotMatch(explanation.body, /주어가 ich/);
});

test('visible example words expose bilingual meanings without revealing the gap target', () => {
  const items = [
    { id: 'ab', german: 'ab', korean: '~부터', english: 'from/as of' },
    { id: 'tomorrow', german: 'morgen', korean: '내일', english: 'tomorrow' },
    { id: 'must', german: 'müssen', korean: '~해야 하다', english: 'must/have to' },
    { id: 'i', german: 'ich', korean: '나', english: 'I' },
    { id: 'work', german: 'arbeiten', korean: '일하다', english: 'work', exampleGerman: 'Ab morgen muss ich arbeiten.' },
  ];
  const question = exampleClozeQuestion(items[4]);
  const parts = examplePromptParts(question, items);
  assert.equal(parts.map(part => part.text).join(''), 'Ab morgen muss ich ___.');
  assert.deepEqual(parts.filter(part => part.gloss).map(part => [part.text, part.gloss.korean, part.gloss.english]), [
    ['Ab', '~부터', 'from/as of'],
    ['morgen', '내일', 'tomorrow'],
    ['muss', '~해야 하다', 'must/have to'],
    ['ich', '나', 'I'],
  ]);
  assert.equal(parts.some(part => part.gloss?.id === 'work'), false);
});

test('common inflected and function words have built-in bilingual glosses', () => {
  const parts = examplePromptParts({ id: 'target', prompt: 'Du bist im Büro um zwölf.' }, []);
  const glossByWord = new Map(parts.filter(part => part.gloss).map(part => [part.text, part.gloss]));
  assert.deepEqual([glossByWord.get('Du').korean, glossByWord.get('Du').english], ['너', 'you']);
  assert.deepEqual([glossByWord.get('im').korean, glossByWord.get('im').english], ['~안에', 'in the']);
  assert.deepEqual([glossByWord.get('zwölf').korean, glossByWord.get('zwölf').english], ['열둘', 'twelve']);
});

test('example prompt tokenization preserves punctuation and leaves the blank non-clickable', () => {
  const parts = examplePromptParts({ id: 'target', prompt: 'Hallo, ___!' }, [
    { id: 'hello', german: 'hallo', korean: '안녕하세요', english: 'hello' },
  ]);
  assert.equal(parts.map(part => part.text).join(''), 'Hallo, ___!');
  assert.equal(parts.find(part => part.text === '___').gloss, null);
});

test('cumulative noun quiz grows from five learned nouns to eleven without duplicates', () => {
  const learnedWords = Array.from({ length: 11 }, (_, index) => ({
    id: `n${index + 1}`,
    german: `${['der', 'die', 'das'][index % 3]} Nomen${index + 1},-e`,
    korean: `명사${index + 1}`,
    english: `noun${index + 1}`,
  }));
  const dayOne = cumulativeNounQuestions([
    { learningDone: true, wordIds: learnedWords.slice(0, 5).map(item => item.id) },
  ], learnedWords);
  const dayTwo = cumulativeNounQuestions([
    { learningDone: true, wordIds: learnedWords.slice(0, 5).map(item => item.id) },
    { learningDone: true, wordIds: [...learnedWords.slice(5).map(item => item.id), 'n1'] },
  ], learnedWords);
  assert.equal(dayOne.length, 5);
  assert.equal(dayTwo.length, 11);
  assert.equal(new Set(dayTwo.map(item => item.id)).size, 11);
});

test('word meanings show Korean together with English', () => {
  assert.equal(bilingualMeaning({ korean: '집', english: 'house/home' }), '집 · house/home');
});

test('learning cards support both German-to-meaning and meaning-to-German directions', () => {
  const word = { german: 'das Haus', korean: '집', english: 'house/home' };
  assert.deepEqual(learningCardSides(word, 'forward'), {
    prompt: 'das Haus',
    answer: '집 · house/home',
  });
  assert.deepEqual(learningCardSides(word, 'reverse'), {
    prompt: '집 · house/home',
    answer: 'das Haus',
  });
});

test('lesson overview lists every learned word with bilingual meaning in session order', () => {
  const learned = [
    { german: 'Guten Tag', korean: '안녕하세요', english: 'hello/good day' },
    { german: 'das Haus', korean: '집', english: 'house/home' },
  ];
  assert.deepEqual(lessonOverview(learned), [
    { german: 'Guten Tag', meaning: '안녕하세요 · hello/good day' },
    { german: 'das Haus', meaning: '집 · house/home' },
  ]);
});

test('review overview puts missed words first without changing their original relative order', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const ordered = prioritizeReviewItems(items, ['c', 'b']);
  assert.deepEqual(ordered.map(item => item.id), ['b', 'c', 'a', 'd']);
  assert.deepEqual(items.map(item => item.id), ['a', 'b', 'c', 'd']);
});

test('calendar month returns a Sunday-first six-week grid with ISO dates', () => {
  const days = monthCalendarDays(2026, 1);
  assert.equal(days.length, 42);
  assert.equal(days[0], '2026-02-01');
  assert.equal(days[27], '2026-02-28');
  assert.equal(days[28], null);
});

test('calendar days before the study start date are inactive', () => {
  assert.equal(calendarDayStatus('2026-08-23', '2026-08-25', '2026-08-25', false, false), 'inactive');
  assert.equal(calendarDayStatus('2026-08-24', '2026-08-25', '2026-08-25', false, false), 'inactive');
  assert.equal(calendarDayStatus('2026-08-25', '2026-08-25', '2026-08-25', true, true), 'mastered');
  assert.equal(calendarDayStatus('2026-08-26', '2026-08-25', '2026-08-25', false, false), 'future');
});

test('each study session can shuffle a copy without changing the saved word order', () => {
  const original = ['a', 'b', 'c', 'd'];
  const randomValues = [0.1, 0.7, 0.2];
  let index = 0;
  const shuffled = shuffleCopy(original, () => randomValues[index++]);

  assert.deepEqual(original, ['a', 'b', 'c', 'd']);
  assert.deepEqual(shuffled, ['b', 'd', 'c', 'a']);
});

test('reverse attempt summary tracks wrong-word retries until every daily word is eventually correct', () => {
  const attempts = [
    {
      number: 1, completed: true, correctCount: 2, totalCount: 4,
      results: [
        { wordId: 'a', correct: true }, { wordId: 'b', correct: true },
        { wordId: 'c', correct: false }, { wordId: 'd', correct: false },
      ],
    },
    {
      number: 2, completed: true, correctCount: 1, totalCount: 2,
      results: [{ wordId: 'c', correct: true }, { wordId: 'd', correct: false }],
    },
    {
      number: 3, completed: true, correctCount: 1, totalCount: 1,
      results: [{ wordId: 'd', correct: true }],
    },
    { number: 4, completed: false, correctCount: 0, totalCount: 4, results: [] },
  ];

  assert.deepEqual(summarizeReverseAttempts(attempts, ['a', 'b', 'c', 'd']), {
    completedCount: 3,
    coverageAttemptNumber: 3,
    coverageComplete: true,
    perfectFullCount: 0,
    requiredPerfectFullCount: 3,
    perfectAttemptNumber: null,
    memorized: false,
    masteredCount: 4,
    totalWords: 4,
    scores: [
      { number: 1, correctCount: 2, totalCount: 4 },
      { number: 2, correctCount: 1, totalCount: 2 },
      { number: 3, correctCount: 1, totalCount: 1 },
    ],
  });
});

test('calendar mastery requires three error-free full-cohort completions', () => {
  const wordIds = ['a', 'b'];
  const attempts = [
    { number: 1, completed: true, correctCount: 1, totalCount: 2, results: [{ wordId: 'a', correct: true }, { wordId: 'b', correct: false }] },
    { number: 2, completed: true, correctCount: 1, totalCount: 1, results: [{ wordId: 'b', correct: true }] },
    { number: 3, completed: true, correctCount: 2, totalCount: 2, results: [{ wordId: 'a', correct: true }, { wordId: 'b', correct: true }] },
    { number: 4, completed: true, correctCount: 2, totalCount: 2, results: [{ wordId: 'a', correct: true }, { wordId: 'b', correct: true }] },
  ];

  const beforeThirdPerfect = summarizeReverseAttempts(attempts, wordIds);
  assert.equal(beforeThirdPerfect.coverageComplete, true);
  assert.equal(beforeThirdPerfect.perfectFullCount, 2);
  assert.equal(beforeThirdPerfect.memorized, false);
  assert.equal(beforeThirdPerfect.perfectAttemptNumber, null);

  attempts.push({ number: 5, completed: true, correctCount: 2, totalCount: 2, results: [{ wordId: 'a', correct: true }, { wordId: 'b', correct: true }] });
  const afterThirdPerfect = summarizeReverseAttempts(attempts, wordIds);
  assert.equal(afterThirdPerfect.perfectFullCount, 3);
  assert.equal(afterThirdPerfect.memorized, true);
  assert.equal(afterThirdPerfect.perfectAttemptNumber, 5);
});

test('learning day summary includes first score, attempts to mastery, and review completion', () => {
  const cohort = {
    wordIds: ['a', 'b'], newCount: 2, learningDone: true, morningDone: true, finalDone: false,
    reverseAttempts: [
      {
        number: 1, completed: true, correctCount: 1, totalCount: 2,
        results: [{ wordId: 'a', correct: true }, { wordId: 'b', correct: false }],
      },
      { number: 2, completed: false, correctCount: 0, totalCount: 1, results: [] },
      {
        number: 3, completed: true, correctCount: 1, totalCount: 1,
        results: [{ wordId: 'b', correct: true }],
      },
    ],
  };
  assert.deepEqual(summarizeLearningDay(cohort), {
    studied: true,
    totalWords: 2,
    newCount: 2,
    learningDone: true,
    morningDone: true,
    finalDone: false,
    totalAttempts: 2,
    completedAttempts: 2,
    interruptedAttempts: 1,
    firstAttempt: { number: 1, correctCount: 1, totalCount: 2 },
    masteredCount: 2,
    coverageComplete: true,
    coverageAttemptNumber: 2,
    perfectFullCount: 0,
    requiredPerfectFullCount: 3,
    memorized: false,
    perfectAttemptNumber: null,
  });
});

test('cloud progress merge preserves both devices without duplicating cohorts or attempts', () => {
  const local = {
    dailyCount: 20,
    nextIndex: 20,
    carryIds: ['w1'],
    totalAnswers: 8,
    correctAnswers: 6,
    updatedAt: '2026-08-25T10:00:00.000Z',
    cohorts: [{
      id: 'cohort-2026-08-25', learnedDate: '2026-08-25', wordIds: ['w1', 'w2'],
      learningDone: true, morningDone: false, finalDone: false, finalMisses: { w1: 1 },
      reverseAttempts: [{ id: 'attempt-1', completed: false, results: [] }],
    }],
  };
  const remote = {
    dailyCount: 30,
    nextIndex: 40,
    carryIds: ['w2'],
    totalAnswers: 12,
    correctAnswers: 10,
    updatedAt: '2026-08-25T11:00:00.000Z',
    cohorts: [{
      id: 'cohort-2026-08-25', learnedDate: '2026-08-25', wordIds: ['w1', 'w2', 'w3'],
      learningDone: false, morningDone: true, finalDone: false, finalMisses: { w1: 2 },
      reverseAttempts: [
        { id: 'attempt-1', completed: true, completedAt: '2026-08-25T10:30:00.000Z', results: [{ wordId: 'w1', correct: true }] },
        { id: 'attempt-2', completed: true, results: [{ wordId: 'w2', correct: true }] },
      ],
    }],
  };

  const merged = mergeProgressStates(local, remote);
  assert.equal(merged.dailyCount, 30);
  assert.equal(merged.nextIndex, 40);
  assert.deepEqual(merged.carryIds, ['w1', 'w2']);
  assert.equal(merged.totalAnswers, 12);
  assert.equal(merged.correctAnswers, 10);
  assert.equal(merged.updatedAt, '2026-08-25T11:00:00.000Z');
  assert.equal(merged.cohorts.length, 1);
  assert.deepEqual(merged.cohorts[0].wordIds, ['w1', 'w2', 'w3']);
  assert.equal(merged.cohorts[0].learningDone, true);
  assert.equal(merged.cohorts[0].morningDone, true);
  assert.equal(merged.cohorts[0].finalMisses.w1, 2);
  assert.equal(merged.cohorts[0].reverseAttempts.length, 2);
  assert.equal(merged.cohorts[0].reverseAttempts[0].completed, true);
});

test('cloud progress merge keeps mastery and cohorts created on only one device', () => {
  const merged = mergeProgressStates(
    { updatedAt: '2026-08-25T12:00:00.000Z', cohorts: [{ id: 'day-a', wordIds: ['a'], memorized: true }] },
    { updatedAt: '2026-08-25T11:00:00.000Z', cohorts: [{ id: 'day-b', wordIds: ['b'], learningDone: true }] },
  );
  assert.deepEqual(merged.cohorts.map(cohort => cohort.id), ['day-a', 'day-b']);
  assert.equal(merged.cohorts[0].memorized, true);
});

test('learner can add a chosen number of fresh words to today without duplicates', () => {
  const cohort = { id: 'today', wordIds: ['w1', 'w2'], newCount: 2, learningDone: true };
  const result = extendCohortWithWords(cohort, [{ id: 'w2' }, { id: 'w3' }, { id: 'w4' }, { id: 'w5' }], 2);
  assert.deepEqual(result.addedIds, ['w3', 'w4']);
  assert.deepEqual(result.cohort.wordIds, ['w1', 'w2', 'w3', 'w4']);
  assert.equal(result.cohort.newCount, 4);
  assert.equal(result.cohort.learningDone, false);
  assert.deepEqual(cohort.wordIds, ['w1', 'w2']);
});
