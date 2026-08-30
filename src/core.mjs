const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeAnswer(value) {
  return String(value ?? '').normalize('NFC').trim().toLocaleLowerCase('de-DE').replace(/\s+/g, ' ');
}

export function isCorrect(answer, expected) {
  const actual = normalizeAnswer(answer);
  return String(expected ?? '').split('/').map(normalizeAnswer).some(option => option === actual);
}

export function isGermanHeadwordCorrect(answer, expected) {
  const expectedHeadwords = Array.isArray(expected) ? expected : [expected];
  const actual = normalizeAnswer(answer);
  return expectedHeadwords.some(value => {
    const headword = String(value ?? '').replace(/,.*$/, '').trim();
    const articleVariant = headword.match(/^(\S+)\/(\S+)\s+(.+)$/);
    const accepted = articleVariant
      ? [`${articleVariant[1]} ${articleVariant[3]}`, `${articleVariant[2]} ${articleVariant[3]}`]
      : [headword];
    return accepted.map(normalizeAnswer).includes(actual);
  });
}

export function bilingualMeaning(item) {
  return `${item.korean} · ${item.english}`;
}

function normalizedGloss(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('de-DE')
    .split('/').map(part => part.trim()).filter(Boolean).sort().join('/');
}

function normalizedMeaningKey(item) {
  return `${normalizedGloss(item.korean)} · ${normalizedGloss(item.english)}`;
}

export function reverseAnswerHeadwords(items, target) {
  const targetMeaning = normalizedMeaningKey(target);
  return [...new Set((items || [])
    .filter(item => item?.german && normalizedMeaningKey(item) === targetMeaning)
    .map(item => item.german))];
}

export function reviewChoicePool(items, correct, germanPrompt) {
  const correctMeaning = normalizedMeaningKey(correct);
  const correctChoice = germanPrompt ? correctMeaning : correct.german;
  return items.filter(item => item.id !== correct.id
    && item.german
    && item.korean
    && item.english
    && normalizedMeaningKey(item) !== correctMeaning
    && (germanPrompt ? normalizedMeaningKey(item) : item.german) !== correctChoice);
}

function safeInteger(value, fallback = 0, maximum = 1_000_000) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= maximum ? number : fallback;
}

function safeString(value, maximum = 500) {
  return typeof value === 'string' ? value.slice(0, maximum) : '';
}

function safeIsoTime(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
}

function safeWordIds(value) {
  return Array.isArray(value)
    ? [...new Set(value.filter(id => typeof id === 'string' && id.length > 0 && id.length <= 200))]
    : [];
}

function safeMisses(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([id]) => typeof id === 'string' && id.length > 0 && id.length <= 200)
    .map(([id, count]) => [id, safeInteger(count)]));
}

function sanitizeReverseAttempt(attempt) {
  if (!attempt || typeof attempt !== 'object' || Array.isArray(attempt)) return null;
  const results = Array.isArray(attempt.results) ? attempt.results.map(result => {
    if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
    const wordId = safeString(result.wordId, 200);
    if (!wordId) return null;
    return {
      wordId,
      answer: safeString(result.answer),
      correct: result.correct === true,
      answeredAt: safeIsoTime(result.answeredAt),
    };
  }).filter(Boolean) : [];
  return {
    id: safeString(attempt.id, 200),
    number: safeInteger(attempt.number),
    startedAt: safeIsoTime(attempt.startedAt),
    completedAt: safeIsoTime(attempt.completedAt),
    completed: attempt.completed === true,
    correctCount: safeInteger(attempt.correctCount),
    totalCount: safeInteger(attempt.totalCount),
    wordIds: safeWordIds(attempt.wordIds),
    practiceAfterMastery: attempt.practiceAfterMastery === true,
    results,
  };
}

export function sanitizeProgressState(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const cohorts = Array.isArray(source.cohorts) ? source.cohorts.map(cohort => {
    if (!cohort || typeof cohort !== 'object' || Array.isArray(cohort)) return null;
    const learnedDate = safeString(cohort.learnedDate, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(learnedDate) || !Number.isFinite(Date.parse(`${learnedDate}T00:00:00Z`))) return null;
    const wordIds = safeWordIds(cohort.wordIds);
    const explicitNewWordIds = Array.isArray(cohort.newWordIds) ? safeWordIds(cohort.newWordIds) : undefined;
    return {
      id: safeString(cohort.id, 200) || `cohort-${learnedDate}`,
      learnedDate,
      wordIds,
      newWordIds: explicitNewWordIds,
      newCount: safeInteger(cohort.newCount, wordIds.length),
      learningDone: cohort.learningDone === true,
      morningDone: cohort.morningDone === true,
      finalDone: cohort.finalDone === true,
      finalMisses: safeMisses(cohort.finalMisses),
      reverseAttempts: Array.isArray(cohort.reverseAttempts) ? cohort.reverseAttempts.map(sanitizeReverseAttempt).filter(Boolean) : [],
      memorized: cohort.memorized === true,
      memorizedAt: safeIsoTime(cohort.memorizedAt),
    };
  }).filter(Boolean) : [];
  const dailyCount = safeInteger(source.dailyCount, 20, 40);
  return {
    dailyCount: dailyCount >= 5 ? dailyCount : 20,
    nextIndex: safeInteger(source.nextIndex),
    carryIds: [],
    cohorts,
    totalAnswers: safeInteger(source.totalAnswers),
    correctAnswers: safeInteger(source.correctAnswers),
    ...(safeIsoTime(source.updatedAt) ? { updatedAt: source.updatedAt } : {}),
  };
}

export function learningTaskTitle(cohort) {
  if (!cohort) return null;
  return cohort.learningDone ? '오늘 단어 랜덤으로 다시 보기' : '오늘 단어 이어서 보기';
}

export function pronounceableGerman(value) {
  let text = String(value ?? '').trim();
  if (!text) return '';
  if (/^der,\s*die,\s*das$/i.test(text)) return 'der, die, das';
  text = text
    .replace(/\(pl\.\)/gi, '')
    .replace(/^\(([^)]+)\)-([A-ZÄÖÜ])/u, (_, prefix, next) => `${prefix}${next.toLowerCase()}`)
    .replace(/([a-zäöüß])\(([a-zäöüß])\)/gi, '$1$2')
    .replace(/\(([^)]+)\)/g, '$1')
    .replace(/^der\/die\s+/i, 'der ');
  text = text.split('/')[0].trim();
  text = text.replace(/,\s*[–-].*$/, '').replace(/,$/, '').replace(/-$/, '').trim();
  return text;
}

export function learningCardSides(item, direction = 'forward') {
  if (direction === 'reverse') {
    return { prompt: bilingualMeaning(item), answer: item.german };
  }
  return { prompt: item.german, answer: bilingualMeaning(item) };
}

export function exampleClozeQuestion(item) {
  const sentence = String(item?.exampleGerman ?? '').trim();
  const canonical = String(item?.german ?? '').trim();
  if (!sentence || !canonical) return null;
  const cleanHeadword = canonical
    .replace(/,.*$/, '')
    .replace(/^\(sich\)\s*/i, '')
    .replace(/^(?:der|die|das)\s+/i, '')
    .trim();
  const normalized = value => String(value).toLocaleLowerCase('de-DE')
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
  const candidates = cleanHeadword
    .split(/[\s/]+/)
    .map(value => value.replace(/^-+|-+$/g, ''))
    .filter(Boolean);
  const separablePrefixes = ['zurück', 'zusammen', 'weiter', 'vorbei', 'fern', 'statt', 'teil', 'ab', 'an', 'auf', 'aus', 'ein', 'fest', 'her', 'hin', 'los', 'mit', 'nach', 'vor', 'weg', 'zu'];
  for (const candidate of [...candidates]) {
    const lower = normalized(candidate);
    const prefix = separablePrefixes.find(value => lower.startsWith(normalized(value)) && lower.length - normalized(value).length >= 3);
    if (prefix) candidates.push(candidate.slice(prefix.length));
  }
  const irregular = {
    sein: ['bin', 'bist', 'ist', 'sind', 'seid', 'war'],
    haben: ['habe', 'hast', 'hat', 'haben', 'habt'],
    werden: ['werde', 'wirst', 'wird', 'werden'],
    gehen: ['gehe', 'gehst', 'geht', 'ging'],
    konnen: ['kann', 'kannst', 'konnen', 'konnt'],
    mussen: ['muss', 'musst', 'mussen', 'musst'],
    durfen: ['darf', 'darfst', 'durfen', 'durft'],
    wollen: ['will', 'willst', 'wollen', 'wollt'],
    wissen: ['weiss', 'weisst', 'wissen', 'wisst'],
  };
  for (const candidate of [...candidates]) candidates.push(...(irregular[normalized(candidate)] || []));
  const tokens = [...sentence.matchAll(/[\p{L}]+(?:[-’'][\p{L}]+)*/gu)];
  let best = null;
  for (const token of tokens) {
    const tokenValue = normalized(token[0]);
    for (const candidate of candidates) {
      const candidateValue = normalized(candidate);
      if (!candidateValue || !tokenValue) continue;
      let score = tokenValue === candidateValue ? 100 + candidateValue.length : 0;
      const stem = candidateValue.endsWith('en') ? candidateValue.slice(0, -2)
        : candidateValue.endsWith('n') ? candidateValue.slice(0, -1)
          : candidateValue.endsWith('e') ? candidateValue.slice(0, -1) : candidateValue;
      if (stem.length >= 3 && tokenValue.startsWith(stem)) score = Math.max(score, 85 + stem.length);
      if (!best || score > best.score) best = { score, token: token[0], index: token.index };
    }
  }
  if (!best || best.score < 85) return null;
  let gapEnd = best.index + best.token.length;
  const optionalSuffix = sentence.slice(gapEnd).match(/^\([–-][^)]+\)/);
  if (optionalSuffix) gapEnd += optionalSuffix[0].length;
  return {
    id: item.id,
    canonical,
    sentence,
    prompt: `${sentence.slice(0, best.index)}___${sentence.slice(gapEnd)}`,
    gapAnswer: best.token,
    meaning: bilingualMeaning(item),
  };
}

export function exampleFormExplanation(question) {
  const canonical = String(question?.canonical ?? '').replace(/,.*$/, '').trim();
  const sentence = String(question?.sentence ?? '').trim();
  const gapAnswer = String(question?.gapAnswer ?? '').trim();
  if (!canonical || !sentence || !gapAnswer) return null;

  const headword = canonical
    .replace(/^\(sich\)\s*/i, '')
    .replace(/^(?:der|die|das)\s+/i, '')
    .trim();
  const normalized = value => String(value).normalize('NFC').toLocaleLowerCase('de-DE');
  const lowerHeadword = normalized(headword);
  const lowerGap = normalized(gapAnswer);
  const separablePrefixes = ['zurück', 'zusammen', 'weiter', 'vorbei', 'fern', 'statt', 'teil', 'ab', 'an', 'auf', 'aus', 'ein', 'fest', 'her', 'hin', 'los', 'mit', 'nach', 'vor', 'weg', 'zu'];
  const prefix = !/\s/u.test(headword) && separablePrefixes.find(candidate =>
    lowerHeadword.startsWith(candidate) && lowerHeadword.length - candidate.length >= 3
  );
  if (prefix) {
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefixAtEnd = new RegExp(`\\b${escapedPrefix}[.!?]?\\s*$`, 'iu').test(sentence);
    if (prefixAtEnd) {
      const gapIndex = normalized(sentence).indexOf(lowerGap);
      const beforeSentence = gapIndex >= 0 ? sentence.slice(0, gapIndex) : sentence;
      const clauseStart = Math.max(beforeSentence.lastIndexOf('.'), beforeSentence.lastIndexOf('!'), beforeSentence.lastIndexOf('?')) + 1;
      const beforeGap = beforeSentence.slice(clauseStart);
      const subjects = [...beforeGap.matchAll(/\b(ich|du|er|sie|es|wir|ihr|Sie)\b/giu)];
      const afterGap = gapIndex >= 0 ? sentence.slice(gapIndex + gapAnswer.length) : '';
      const followingSubject = afterGap.match(/^\s+(ich|du|er|sie|es|wir|ihr|Sie)\b/iu);
      const rawSubject = followingSubject?.[1] || (subjects.length ? subjects.at(-1)[0] : '');
      const subject = rawSubject === 'Sie' ? 'Sie' : normalized(rawSubject);
      const verbPart = headword.slice(prefix.length);
      const subjectSentence = subject
        ? `현재형에서 주어가 ${subject}이므로 동사 부분은 ${gapAnswer} 형태가 됩니다.`
        : `문장 안에서는 동사 부분이 ${gapAnswer}로 활용됩니다.`;
      return {
        title: `왜 ${gapAnswer}인가요?`,
        body: `${headword}은 ${prefix} + ${verbPart}으로 이루어진 분리동사입니다. ${subjectSentence} 분리되는 접두사 ${prefix}는 문장 끝으로 이동합니다.`,
        note: lowerHeadword === 'abfahren'
          ? `참고: abfahren은 “출발하다”라는 동사 원형이고, die Abfahrt는 “출발”이라는 별도의 명사예요.`
          : '',
        pattern: `${headword} → ${sentence}`,
      };
    }
  }
  return null;
}

export function examplePromptParts(question, items = []) {
  const prompt = String(question?.prompt ?? '');
  const targetId = question?.id;
  const normalized = value => String(value).toLocaleLowerCase('de-DE')
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
  const irregular = {
    sein: ['bin', 'bist', 'ist', 'sind', 'seid', 'war'],
    haben: ['habe', 'hast', 'hat', 'haben', 'habt'],
    werden: ['werde', 'wirst', 'wird', 'werden'],
    gehen: ['gehe', 'gehst', 'geht', 'ging'],
    konnen: ['kann', 'kannst', 'konnen', 'konnt'],
    mussen: ['muss', 'musst', 'mussen', 'musst'],
    durfen: ['darf', 'darfst', 'durfen', 'durft'],
    wollen: ['will', 'willst', 'wollen', 'wollt'],
    wissen: ['weiss', 'weisst', 'wissen', 'wisst'],
    nehmen: ['nehme', 'nimmst', 'nimmt', 'nehmen'],
    geben: ['gebe', 'gibst', 'gibt', 'geben'],
  };
  const commonGlosses = {
    du:['너','you'], s:['그것','it'], der:['그/그것의','the'], die:['그/그것의','the'], das:['그것/그','that/the'], mir:['나에게','to me'], im:['~안에','in the'],
    eine:['하나의','a/one'], einen:['하나의','a/one'], einem:['하나의','a/one'], einer:['하나의','a/one'], und:['그리고','and'],
    dem:['그/그것에','the/to the'], des:['그것의','of the'], am:['~에/~할 때','at/on the'], mich:['나를','me'], etwas:['무언가','something'],
    uns:['우리를/우리에게','us'], ihnen:['당신에게','to you'], ihm:['그에게','to him'], euch:['너희를/너희에게','you (plural)'],
    zur:['~로','to the'], ins:['~안으로','into the'], an:['~에/~로','at/to'], auf:['~위에/~로','on/to'], aus:['~에서/~로 만든','from/out of'], zu:['~로/~하기에','to/too'], fur:['~을 위해','for'], wie:['어떻게/~처럼','how/like'], sich:['자기 자신을','oneself'], mal:['한번','once'], doch:['하지만/그래도','however/after all'], als:['~로서/~보다','as/than'],
    wenn:['~할 때/만약','when/if'], deshalb:['그래서','therefore'], ganz:['아주/완전히','quite/completely'], dabei:['그때/함께','there/with it'],
    erst:['먼저/비로소','first/only then'], paar:['몇몇','a few'], wem:['누구에게','to whom'],
    eins:['하나','one'], zwei:['둘','two'], drei:['셋','three'], vier:['넷','four'], funf:['다섯','five'], sieben:['일곱','seven'],
    acht:['여덟','eight'], zwolf:['열둘','twelve'], dreissig:['서른','thirty'], funfzig:['쉰','fifty'], funfundzwanzig:['스물다섯','twenty-five'],
    euro:['유로','euro'], kilo:['킬로그램','kilo'], kg:['킬로그램','kilogram'], kilometer:['킬로미터','kilometre'], meter:['미터','metre'], pfund:['파운드/500그램','pound'],
    tag:['날','day'], tagen:['날들/며칠','days'], woche:['주','week'], wochen:['주들','weeks'], wochenende:['주말','weekend'],
    monat:['달/개월','month'], minuten:['분','minutes'], abend:['저녁','evening'], sommer:['여름','summer'],
    montag:['월요일','Monday'], dienstag:['화요일','Tuesday'], samstag:['토요일','Saturday'], samstags:['토요일마다','on Saturdays'],
    marz:['3월','March'], september:['9월','September'], oktober:['10월','October'], jahren:['년 동안','years'], jahre:['년/살','years'],
    tur:['문','door'], buro:['사무실','office'], tasse:['잔','cup'], kase:['치즈','cheese'], rad:['자전거','bicycle'], jeans:['청바지','jeans'],
    deutsch:['독일어','German'], englisch:['영어','English'], franzosisch:['프랑스어','French'], russisch:['러시아어','Russian'],
    deutschkurs:['독일어 강좌','German course'], museum:['박물관','museum'], supermarkt:['슈퍼마켓','supermarket'], disko:['디스코텍','disco'],
    tut:['하다/아프다','does/hurts'], waren:['~였다/~있었다','were'], hatten:['가지고 있었다','had'], mag:['좋아한다','likes'],
    verstanden:['이해한','understood'], gelesen:['읽은','read'], gesehen:['본','seen'], gemietet:['임대한','rented'], interessiert:['관심 있는','interested'],
    schreibe:['쓴다','write'], schreibst:['쓴다','write'], schreiben:['쓰다','write'], rufe:['전화한다/부른다','call'],
    zieh:['당기다/입다','pull/put on'], gib:['주다','give'], lies:['읽어라','read'], sprichst:['말한다','speak'], kreuzen:['표시하다','mark/cross'],
    kummert:['돌본다','takes care of'], stimmt:['맞다','is correct'], raus:['밖으로','out'], weg:['가버린/치워진','away'],
    erste:['첫 번째','first'], ersten:['첫 번째의','first'], zweiten:['두 번째의','second'], linke:['왼쪽의','left'], rechtes:['오른쪽의','right'],
    blaue:['파란','blue'], grun:['초록색의','green'], schwarze:['검은','black'], kalt:['추운/차가운','cold'], billig:['저렴한','cheap'],
    leid:['유감인','sorry'], frites:['감자튀김','fries'], vollpension:['3식 포함 숙박','full board'], japaner:['일본인','Japanese person'], spanier:['스페인인','Spanish person'],
    osten:['동쪽','east'], norddeutschen:['북독일의','North German'], offenbach:['오펜바흐','Offenbach'],
  };
  const targetTerms = new Set([String(question?.gapAnswer ?? '')].map(normalized).filter(Boolean));
  const entries = items.filter(item => item?.id !== targetId).map(item => {
    let headword = String(item?.german ?? '').replace(/,.*$/, '').replace(/^\(sich\)\s*/i, '').trim();
    const words = headword.split(/[\s/]+/).filter(Boolean);
    if (words.length > 1 && /^(der|die|das)$/i.test(words[0])) words.shift();
    return {
      item,
      candidates: words.map(word => normalized(word.replace(/^-+|-+$/g, ''))).filter(Boolean),
    };
  });
  const glossFor = surface => {
    const token = normalized(surface);
    if (targetTerms.has(token)) return null;
    let best = null;
    for (const entry of entries) {
      for (const candidate of entry.candidates) {
        let score = token === candidate ? 100 + candidate.length : 0;
        if ((irregular[candidate] || []).includes(token)) score = Math.max(score, 98);
        const stem = candidate.endsWith('en') ? candidate.slice(0, -2)
          : candidate.endsWith('n') ? candidate.slice(0, -1)
            : candidate.endsWith('e') ? candidate.slice(0, -1) : candidate;
        if (stem.length >= 3 && token.startsWith(stem)) score = Math.max(score, 85 + stem.length);
        if (!best || score > best.score) best = { score, item: entry.item };
      }
    }
    if (best && best.score >= 85) return { id: best.item.id, korean: best.item.korean, english: best.item.english };
    const common = commonGlosses[token];
    if (common) return { id: `common-${token}`, korean: common[0], english: common[1] };
    if (/^[A-ZÄÖÜ]/u.test(surface)) return { id: `name-${token}`, korean: '이름·지명 등 고유명사', english: 'proper name or place' };
    return null;
  };
  const parts = [];
  let cursor = 0;
  for (const match of prompt.matchAll(/___|[\p{L}]+(?:[-’'][\p{L}]+)*/gu)) {
    if (match.index > cursor) parts.push({ text: prompt.slice(cursor, match.index), gloss: null });
    parts.push({ text: match[0], gloss: match[0] === '___' ? null : glossFor(match[0]) });
    cursor = match.index + match[0].length;
  }
  if (cursor < prompt.length) parts.push({ text: prompt.slice(cursor), gloss: null });
  return parts;
}

export function isExampleGapCorrect(answer, question) {
  return normalizeAnswer(answer) === normalizeAnswer(question?.gapAnswer);
}

export function nounArticleQuestion(item) {
  const match = String(item?.german ?? '').match(/^(der|die|das)\s+([^,]+)/);
  if (!match) return null;
  return {
    id: item.id,
    article: match[1],
    noun: match[2].trim(),
    meaning: bilingualMeaning(item),
  };
}

export function cumulativeNounQuestions(cohorts = [], items = []) {
  const itemById = new Map(items.map(item => [item.id, item]));
  const seen = new Set();
  const questions = [];
  for (const cohort of cohorts) {
    if (!cohort.learningDone) continue;
    for (const id of cohortLearningWordIds(cohort, cohorts)) {
      if (seen.has(id)) continue;
      seen.add(id);
      const question = nounArticleQuestion(itemById.get(id));
      if (question) questions.push(question);
    }
  }
  return questions;
}

export function lessonOverview(items) {
  return items.map(item => ({ german: item.german, meaning: bilingualMeaning(item) }));
}

export function prioritizeReviewItems(items, missedIds = []) {
  const missed = new Set(missedIds);
  return [
    ...items.filter(item => missed.has(item.id)),
    ...items.filter(item => !missed.has(item.id)),
  ];
}

export function monthCalendarDays(year, monthIndex) {
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    if (day < 1 || day > daysInMonth) return null;
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });
}

export function calendarDayStatus(date, today, studyStartDate, studied, memorized) {
  if (date < studyStartDate) return 'inactive';
  if (memorized) return 'mastered';
  if (studied) return 'studied';
  if (date > today) return 'future';
  if (date === today) return 'open';
  return 'missed';
}

export function calendarStatusLabel(statusClass, summary = null) {
  if (statusClass === 'mastered') return `암기완료/${summary?.totalWords || 0}`;
  if (statusClass === 'studied') return '학습함';
  if (statusClass === 'missed') return '미학습';
  if (statusClass === 'open') return '오늘';
  return '';
}

export function cohortLearningWordIds(cohort, cohorts = []) {
  const storedIds = uniqueValues(cohort?.wordIds || []);
  const explicitIds = Array.isArray(cohort?.newWordIds)
    ? uniqueValues(cohort.newWordIds).filter(id => storedIds.includes(id))
    : null;
  const candidates = explicitIds || storedIds;
  const earlierIds = new Set(
    (cohorts || [])
      .filter(item => item && item !== cohort && item.learnedDate && cohort?.learnedDate && item.learnedDate < cohort.learnedDate)
      .flatMap(item => item.newWordIds || item.wordIds || [])
  );
  const freshIds = candidates.filter(id => !earlierIds.has(id));
  const expectedCount = Math.max(0, Number(cohort?.newCount) || candidates.length);
  return freshIds.slice(0, expectedCount);
}

export function completedLearnedWordIds(cohorts = []) {
  const learned = [];
  const seen = new Set();
  for (const cohort of cohorts) {
    if (!cohort?.learningDone) continue;
    for (const wordId of cohortLearningWordIds(cohort, cohorts)) {
      if (!wordId || seen.has(wordId)) continue;
      seen.add(wordId);
      learned.push(wordId);
    }
  }
  return learned;
}

export function validPracticeCount(requestedCount, availableCount) {
  const raw = String(requestedCount ?? '').trim();
  const available = Math.max(0, Math.floor(Number(availableCount) || 0));
  if (!/^\d+$/.test(raw)) return null;
  const count = Number(raw);
  return Number.isSafeInteger(count) && count >= 1 && count <= available ? count : null;
}

export function practiceWordsForCount(cohorts, items, requestedCount = 'all', random = Math.random) {
  const learnedIds = new Set(completedLearnedWordIds(cohorts));
  const shuffled = shuffleCopy((items || []).filter(item => learnedIds.has(item.id)), random);
  if (requestedCount === 'all') return shuffled;
  const count = Math.max(1, Math.floor(Number(requestedCount) || 1));
  return shuffled.slice(0, count);
}

export function practiceGroupWords(group, learnedWordIds) {
  const learned = learnedWordIds instanceof Set ? learnedWordIds : new Set(learnedWordIds || []);
  return (group?.wordIds || []).filter(wordId => learned.has(wordId));
}

export function shuffleCopy(items, random = Math.random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function isPerfectReverseAttempt(attempt, lessonWordIds = []) {
  if (!attempt?.completed) return false;
  const targetIds = new Set(lessonWordIds);
  if (!targetIds.size) return false;
  const results = attempt.results || [];
  if (results.length) {
    const targetResults = results.filter(result => targetIds.has(result.wordId));
    const correctTargetIds = new Set(targetResults.filter(result => result.correct).map(result => result.wordId));
    return correctTargetIds.size === targetIds.size && targetResults.every(result => result.correct);
  }
  const attemptedIds = new Set(attempt.wordIds || []);
  return attempt.totalCount >= targetIds.size
    && attempt.correctCount === attempt.totalCount
    && [...targetIds].every(wordId => attemptedIds.has(wordId));
}

export function reverseAttemptWordIds(attempts = [], lessonWordIds = []) {
  const targetWordIds = uniqueValues(lessonWordIds);
  const targetIds = new Set(targetWordIds);
  const masteredIds = new Set();
  for (const attempt of attempts.filter(item => item.completed)) {
    const results = attempt.results || [];
    for (const result of results) {
      if (result.correct && targetIds.has(result.wordId)) masteredIds.add(result.wordId);
    }
    if (!results.length && isPerfectReverseAttempt(attempt, targetWordIds)) {
      for (const wordId of targetWordIds) masteredIds.add(wordId);
    }
  }
  if (targetWordIds.length && masteredIds.size === targetWordIds.length) return targetWordIds;
  return targetWordIds.filter(wordId => !masteredIds.has(wordId));
}

export function summarizeReverseAttempts(attempts = [], lessonWordIds = []) {
  const completed = attempts.filter(attempt => attempt.completed);
  const targetIds = new Set(lessonWordIds);
  const masteredIds = new Set();
  let coverageAttemptNumber = null;
  let perfectFullCount = 0;
  let perfectAttemptNumber = null;
  for (const [completedIndex, attempt] of completed.entries()) {
    const completedNumber = completedIndex + 1;
    for (const result of attempt.results || []) {
      if (result.correct && (!targetIds.size || targetIds.has(result.wordId))) masteredIds.add(result.wordId);
    }
    const legacyAggregatePerfect = !(attempt.results || []).length
      && isPerfectReverseAttempt(attempt, lessonWordIds);
    if (legacyAggregatePerfect) {
      for (const wordId of targetIds) masteredIds.add(wordId);
    }
    if (targetIds.size && masteredIds.size === targetIds.size && coverageAttemptNumber === null) {
      coverageAttemptNumber = completedNumber;
    }
    const isPerfectFullCompletion = isPerfectReverseAttempt(attempt, lessonWordIds);
    if (isPerfectFullCompletion) {
      perfectFullCount += 1;
      if (perfectFullCount === 3) perfectAttemptNumber = completedNumber;
    }
  }
  const coverageComplete = targetIds.size > 0 && masteredIds.size === targetIds.size;
  return {
    completedCount: completed.length,
    coverageAttemptNumber,
    coverageComplete,
    perfectFullCount,
    requiredPerfectFullCount: 3,
    perfectAttemptNumber,
    memorized: perfectFullCount >= 3,
    masteredCount: masteredIds.size,
    totalWords: targetIds.size,
    scores: completed.map((attempt, index) => ({
      number: index + 1,
      correctCount: attempt.correctCount,
      totalCount: attempt.totalCount,
    })),
  };
}

export function summarizeLearningDay(cohort) {
  const attempts = cohort.reverseAttempts || [];
  const reverse = summarizeReverseAttempts(attempts, cohort.wordIds || []);
  return {
    studied: true,
    totalWords: (cohort.wordIds || []).length,
    newCount: cohort.newCount || 0,
    learningDone: Boolean(cohort.learningDone),
    morningDone: Boolean(cohort.morningDone),
    finalDone: Boolean(cohort.finalDone),
    totalAttempts: reverse.completedCount,
    completedAttempts: reverse.completedCount,
    interruptedAttempts: attempts.filter(attempt => !attempt.completed).length,
    firstAttempt: reverse.scores[0] || null,
    masteredCount: reverse.masteredCount,
    coverageComplete: reverse.coverageComplete,
    coverageAttemptNumber: reverse.coverageAttemptNumber,
    perfectFullCount: reverse.perfectFullCount,
    requiredPerfectFullCount: reverse.requiredPerfectFullCount,
    memorized: reverse.memorized,
    perfectAttemptNumber: reverse.perfectAttemptNumber,
  };
}

export function accountCredentials(rawAccountId, rawPin) {
  const accountId = String(rawAccountId || '').trim().toLowerCase();
  const password = String(rawPin || '').trim();
  if (!/^[a-z0-9_]{4,20}$/.test(accountId)) {
    throw new Error('아이디는 영문 소문자, 숫자, 밑줄로 4~20자여야 해요.');
  }
  if (!/^\d{6}$/.test(password)) {
    throw new Error('PIN 번호는 숫자 6자리여야 해요.');
  }
  return { accountId, email: `${accountId}@users.wortweg.app`, password };
}

export function reverseEnterAction({ submitted, targetIsNext = false, isComposing = false, repeat = false, enterHeld = false, isTextArea = false }) {
  if (isTextArea) return 'native';
  if (isComposing || repeat || enterHeld) return 'ignore';
  if (!submitted) return 'submit';
  return targetIsNext ? 'next' : 'native';
}


export function extendCohortWithWords(cohort, candidates, requestedCount) {
  const existingIds = new Set(cohort.wordIds || []);
  const count = Math.max(0, Math.floor(Number(requestedCount) || 0));
  const addedIds = [];
  for (const item of candidates) {
    if (!item?.id || existingIds.has(item.id)) continue;
    addedIds.push(item.id);
    existingIds.add(item.id);
    if (addedIds.length >= count) break;
  }
  const nextCohort = {
    ...cohort,
    wordIds: [...(cohort.wordIds || []), ...addedIds],
    newWordIds: [...(cohort.newWordIds || cohort.wordIds || []), ...addedIds],
    newCount: (Number(cohort.newCount) || 0) + addedIds.length,
    learningDone: addedIds.length ? false : Boolean(cohort.learningDone),
    memorized: addedIds.length ? false : Boolean(cohort.memorized),
  };
  if (addedIds.length) delete nextCohort.memorizedAt;
  return { addedIds, cohort: nextCohort };
}

export function finalFailures(wrongAttemptsByWord) {
  return Object.entries(wrongAttemptsByWord)
    .filter(([, misses]) => Number(misses) >= 2)
    .map(([wordId]) => wordId);
}

function dateKeyInKorea(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

export function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const base = new Date(Date.UTC(year, month - 1, day));
  return new Date(base.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function dueReviews(cohorts, today) {
  return {
    morning: cohorts.filter(cohort => !cohort.morningDone && addDays(cohort.learnedDate, 1) <= today),
    final: cohorts.filter(cohort => !cohort.finalDone && addDays(cohort.learnedDate, 2) <= today),
  };
}

export function getSessionForTime(learnedDate, now = new Date()) {
  const today = dateKeyInKorea(now);
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul', hour: '2-digit', hourCycle: 'h23'
  }).format(now));
  if (today === learnedDate && hour >= 18) return 'learn';
  if (today === addDays(learnedDate, 1) && hour < 12) return 'morning-review';
  if (today === addDays(learnedDate, 2) && hour >= 18) return 'final-review';
  return null;
}

function uniqueValues(...lists) {
  return [...new Set(lists.flat().filter(value => value !== undefined && value !== null))];
}

function mergeNumberMap(left = {}, right = {}) {
  const merged = { ...left };
  for (const [key, value] of Object.entries(right || {})) {
    merged[key] = Math.max(Number(merged[key]) || 0, Number(value) || 0);
  }
  return merged;
}

function recordTime(record = {}) {
  return Date.parse(record.completedAt || record.updatedAt || record.startedAt || '') || 0;
}

function mergeAttempts(left = [], right = []) {
  const order = uniqueValues(left.map(item => item?.id), right.map(item => item?.id));
  const withoutIds = [...left, ...right].filter(item => item && !item.id);
  const byId = new Map();
  for (const attempt of [...left, ...right]) {
    if (!attempt?.id) continue;
    const current = byId.get(attempt.id);
    if (!current) {
      byId.set(attempt.id, { ...attempt, results: [...(attempt.results || [])], wordIds: [...(attempt.wordIds || [])] });
      continue;
    }
    const preferred = attempt.completed && !current.completed
      ? attempt
      : current.completed && !attempt.completed
        ? current
        : recordTime(attempt) >= recordTime(current) ? attempt : current;
    const resultByWord = new Map();
    for (const result of [...(current.results || []), ...(attempt.results || [])]) {
      if (!result?.wordId) continue;
      const existing = resultByWord.get(result.wordId);
      const resultTime = Date.parse(result.answeredAt || '') || 0;
      const existingTime = Date.parse(existing?.answeredAt || '') || 0;
      if (!existing || resultTime >= existingTime) resultByWord.set(result.wordId, result);
    }
    const mergedResults = [...resultByWord.values()];
    byId.set(attempt.id, {
      ...current,
      ...attempt,
      ...preferred,
      completed: Boolean(current.completed || attempt.completed),
      wordIds: uniqueValues(current.wordIds || [], attempt.wordIds || []),
      results: mergedResults,
      correctCount: mergedResults.length
        ? mergedResults.filter(result => result.correct).length
        : Math.max(Number(current.correctCount) || 0, Number(attempt.correctCount) || 0),
      totalCount: Math.max(Number(current.totalCount) || 0, Number(attempt.totalCount) || 0),
    });
  }
  return [...order.map(id => byId.get(id)).filter(Boolean), ...withoutIds.map(item => ({ ...item }))];
}

function mergeCohort(left = {}, right = {}) {
  const rightIsNewer = recordTime(right) >= recordTime(left);
  const newer = rightIsNewer ? right : left;
  const older = rightIsNewer ? left : right;
  const mergedLearningIds = uniqueValues(left.wordIds || [], right.wordIds || []);
  return {
    ...older,
    ...newer,
    id: newer.id || older.id,
    learnedDate: newer.learnedDate || older.learnedDate,
    wordIds: mergedLearningIds,
    newWordIds: undefined,
    learningDone: Boolean(left.learningDone || right.learningDone),
    morningDone: Boolean(left.morningDone || right.morningDone),
    finalDone: Boolean(left.finalDone || right.finalDone),
    memorized: Boolean(left.memorized || right.memorized),
    newCount: mergedLearningIds.length,
    finalMisses: mergeNumberMap(left.finalMisses, right.finalMisses),
    reverseAttempts: mergeAttempts(left.reverseAttempts, right.reverseAttempts),
  };
}

export function shouldDeferCloudMerge({ appReady, dashboardVisible }) {
  return Boolean(appReady && !dashboardVisible);
}

export function mergeProgressStates(local = {}, remote = {}) {
  local = sanitizeProgressState(local);
  remote = sanitizeProgressState(remote);
  const localTime = Date.parse(local.updatedAt || '') || 0;
  const remoteTime = Date.parse(remote.updatedAt || '') || 0;
  const newer = remoteTime > localTime ? remote : local;
  const older = newer === local ? remote : local;
  const localCohorts = Array.isArray(local.cohorts) ? local.cohorts : [];
  const remoteCohorts = Array.isArray(remote.cohorts) ? remote.cohorts : [];
  const cohortOrder = [];
  const mergedByKey = new Map();
  let anonymousIndex = 0;
  for (const cohort of [...localCohorts, ...remoteCohorts]) {
    if (!cohort) continue;
    const key = cohort.learnedDate
      ? `date:${cohort.learnedDate}`
      : cohort.id ? `id:${cohort.id}` : `anonymous:${anonymousIndex++}`;
    if (!mergedByKey.has(key)) cohortOrder.push(key);
    mergedByKey.set(key, mergedByKey.has(key) ? mergeCohort(mergedByKey.get(key), cohort) : { ...cohort });
  }
  const mergedCohorts = cohortOrder.map(key => mergedByKey.get(key));
  const cohorts = mergedCohorts.map(cohort => {
    const newWordIds = cohortLearningWordIds(cohort, mergedCohorts);
    return { ...cohort, wordIds: newWordIds, newWordIds, newCount: newWordIds.length };
  });
  return {
    ...older,
    ...newer,
    dailyCount: Number(newer.dailyCount ?? older.dailyCount ?? 20),
    nextIndex: Math.max(Number(local.nextIndex) || 0, Number(remote.nextIndex) || 0),
    carryIds: [],
    cohorts,
    totalAnswers: Math.max(Number(local.totalAnswers) || 0, Number(remote.totalAnswers) || 0),
    correctAnswers: Math.max(Number(local.correctAnswers) || 0, Number(remote.correctAnswers) || 0),
    updatedAt: localTime >= remoteTime ? local.updatedAt : remote.updatedAt,
  };
}
