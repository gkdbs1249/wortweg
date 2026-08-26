import { addDays, bilingualMeaning, buildNightLesson, calendarDayStatus, cumulativeNounQuestions, dueReviews, exampleClozeQuestion, exampleFormExplanation, examplePromptParts, extendCohortWithWords, finalFailures, isExampleGapCorrect, isGermanHeadwordCorrect, learningCardSides, lessonOverview, monthCalendarDays, prioritizeReviewItems, pronounceableGerman, reverseEnterAction, shuffleCopy, summarizeLearningDay, summarizeReverseAttempts } from './src/core.mjs';
import { createAccountWithPin, initializeCloudSync, queueCloudProgressSave, signInWithPin, signOutFromAccount } from './src/cloud-sync.mjs';

const STORAGE_KEY = 'wortweg-a1-progress-v1';
const STORAGE_OWNER_KEY = `${STORAGE_KEY}:owner`;
const ANONYMOUS_STORAGE_KEY = `${STORAGE_KEY}:anonymous`;
const EXAM_DATE = '2026-10-20';
const STUDY_START_DATE = '2026-08-25';
const GOETHE_SOURCE = 'https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf';
const app = document.querySelector('#app');
const settingsDialog = document.querySelector('#settingsDialog');
const dayDetailDialog = document.querySelector('#dayDetailDialog');
let words = [];
let byId = new Map();
let activeStorageKey = STORAGE_KEY;
let state = loadState(activeStorageKey);
let calendarCursor = null;
let appReady = false;

function loadState(storageKey = activeStorageKey) {
  try {
    return { ...defaultState(), ...JSON.parse(localStorage.getItem(storageKey) || '{}') };
  } catch { return defaultState(); }
}
function switchLocalProfile(user) {
  const previousStorageKey = activeStorageKey;
  const previousOwner = localStorage.getItem(STORAGE_OWNER_KEY);
  if (user) {
    const userStorageKey = `${STORAGE_KEY}:user:${user.uid}`;
    const hasUserState = Boolean(localStorage.getItem(userStorageKey));
    const migratedState = !previousOwner && !hasUserState ? state : null;
    activeStorageKey = userStorageKey;
    state = migratedState || loadState(userStorageKey);
    localStorage.setItem(STORAGE_OWNER_KEY, user.uid);
    localStorage.setItem(activeStorageKey, JSON.stringify(state));
  } else if (previousOwner) {
    activeStorageKey = ANONYMOUS_STORAGE_KEY;
    state = loadState(activeStorageKey);
  }
  const profileChanged = previousStorageKey !== activeStorageKey;
  if (appReady && profileChanged && words.length) renderDashboard();
}
function defaultState() { return { dailyCount: 20, nextIndex: 0, carryIds: [], cohorts: [], totalAnswers: 0, correctAnswers: 0 }; }
function saveState() {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(activeStorageKey, JSON.stringify(state));
  queueCloudProgressSave(state);
}
function todayKst() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
function examDays() { return Math.max(0, Math.ceil((Date.parse(`${EXAM_DATE}T00:00:00+09:00`) - Date.parse(`${todayKst()}T00:00:00+09:00`)) / 86400000)); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
function word(id) { return byId.get(id); }

function renderDashboard() {
  const today = todayKst();
  const due = dueReviews(state.cohorts, today);
  const todayCohort = state.cohorts.find(cohort => cohort.learnedDate === today);
  const reverseSummary = summarizeReverseAttempts(todayCohort?.reverseAttempts || [], todayCohort?.wordIds || []);
  const reverseHistory = reverseAttemptsHtml(todayCohort?.reverseAttempts || [], reverseSummary);
  const accuracy = state.totalAnswers ? Math.round(state.correctAnswers / state.totalAnswers * 100) : 0;
  const progress = Math.round(state.nextIndex / words.length * 100);
  const reviewFirst = due.final.length > 0;
  const remainingFreshCount = Math.max(0, words.length - state.nextIndex);
  const canAddExtraWords = Boolean(todayCohort?.learningDone && !reviewFirst && remainingFreshCount);
  const nounQuestions = cumulativeNounQuestions(state.cohorts, words);
  const exampleQuestions = todayCohort?.learningDone
    ? todayCohort.wordIds.map(word).filter(Boolean).map(exampleClozeQuestion).filter(Boolean)
    : [];
  if (!calendarCursor) {
    const [year, month] = today.split('-').map(Number);
    calendarCursor = { year, monthIndex: month - 1 };
  }
  const calendar = calendarHtml(today);
  app.innerHTML = `
    <section class="hero"><div><p class="eyebrow">Goethe-Zertifikat A1 · 10월 20일</p><h1>매일 조금씩,<br>두 번 더 기억하기.</h1><p>공식 A1 어휘 ${words.length}개를 학습하고 다음 날 아침과 이틀 뒤 밤에 다시 확인해요.</p><div class="progress-track"><div class="progress-bar" style="width:${progress}%"></div></div></div><div class="countdown"><strong>D-${examDays()}</strong><span>A1 시험까지</span></div></section>
    <section class="stats"><div class="stat"><strong>${state.nextIndex}</strong><span>신규 학습 단어</span></div><div class="stat"><strong>${state.carryIds.length}</strong><span>오늘 이월 단어</span></div><div class="stat"><strong>${accuracy}%</strong><span>누적 정답률</span></div><div class="stat"><strong>${progress}%</strong><span>A1 어휘 진도</span></div></section>
    <div class="section-title"><h2>Heute(오늘)의 학습</h2><span>${today}</span></div>
    <section class="task-list">
      ${due.final.length ? taskHtml('🌙','최종 기억 시험',`${due.final[0].wordIds.length}개 · 두 번 이상 틀리면 오늘 학습으로 이월`,'final',false) : ''}
      ${due.morning.length ? taskHtml('☀️','아침 재시험',`${due.morning[0].wordIds.length}개 · 틀린 단어는 맞힐 때까지 반복`,'morning',false) : ''}
      ${taskHtml('📚',todayCohort ? '오늘 단어 이어서 보기' : `신규 ${Math.min(state.dailyCount,words.length-state.nextIndex)}개${state.carryIds.length ? ` + 이월 ${state.carryIds.length}개` : ''}`,reviewFirst ? '최종시험을 먼저 마치면 오늘 학습이 열려요' : '독일어를 보고 한국어·영어 뜻을 익혀요','learn',reviewFirst)}
      <article class="task extra-word-task"><div class="task-icon">➕</div><div class="task-copy"><h3>오늘 단어 더 배우기</h3><p>${remainingFreshCount ? canAddExtraWords ? `남은 신규 단어 ${remainingFreshCount}개 중 원하는 만큼 추가할 수 있어요` : '오늘의 기본 학습을 완료하면 원하는 개수를 추가할 수 있어요' : '공식 A1 어휘 670개를 모두 추가했어요'}</p></div><form id="extraWordsForm" class="extra-word-controls"><label for="extraWordCount">추가 개수</label><input id="extraWordCount" type="number" min="1" max="${Math.min(50, remainingFreshCount || 1)}" value="${Math.min(5, remainingFreshCount || 1)}" inputmode="numeric" ${canAddExtraWords?'':'disabled'}><button class="primary" type="submit" ${canAddExtraWords?'':'disabled'}>더 배우기</button></form></article>
      <div class="reverse-task-group ${reverseHistory?'with-history':''}">
        ${taskHtml('🔄','거꾸로 학습',reviewFirst ? '최종시험을 먼저 마치면 거꾸로 학습이 열려요' : '한국어·영어 뜻을 보고 독일어를 떠올려요','reverse',reviewFirst)}
        ${reverseHistory}
      </div>
      <article class="task example-cloze-task"><div class="task-icon">✍️</div><div class="task-copy"><h3>예문 빈칸 학습</h3><p>${exampleQuestions.length ? `오늘 배운 단어를 공식 Goethe A1 예문 ${exampleQuestions.length}개로 연습해요` : '기본 학습을 완료하면 오늘 단어의 공식 예문 문제가 열려요'}</p></div><button class="primary" data-action="example-cloze" ${exampleQuestions.length===0||reviewFirst?'disabled':''}>시작</button></article>
    </section>
    <div class="section-title noun-practice-title"><h2>Nomen(명사) 관사 연습</h2><span>누적 ${nounQuestions.length}개</span></div>
    <section class="task-list noun-practice-list">
      <article class="task"><div class="task-icon">🧩</div><div class="task-copy"><h3>der · das · die 고르기</h3><p>${nounQuestions.length ? `지금까지 학습 완료한 명사 ${nounQuestions.length}개를 모두 복습해요` : '기본 학습을 완료하면 배운 명사가 여기에 누적돼요'}</p></div><button class="primary" data-action="noun-articles" ${nounQuestions.length === 0?'disabled':''}>시작</button></article>
    </section>
    ${calendar}
    <p class="source">어휘 출처: <a href="${GOETHE_SOURCE}" target="_blank" rel="noreferrer">Goethe-Zertifikat A1 공식 Wortliste(단어 목록)</a> · 로그인하면 계정별 클라우드에, 로그아웃 상태에서는 현재 기기에 진도가 저장됩니다.</p>`;
  app.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'learn') startLearning('forward');
    else if (action === 'reverse') startLearning('reverse');
    else if (action === 'noun-articles') startNounArticleQuiz();
    else if (action === 'example-cloze') startExampleCloze();
    else startReview(action, action === 'final' ? due.final[0] : due.morning[0]);
  }));
  const extraWordsForm = document.querySelector('#extraWordsForm');
  extraWordsForm.onsubmit = event => {
    event.preventDefault();
    addExtraWordsToday(document.querySelector('#extraWordCount').value);
  };
  bindCalendarControls();
}

let availableGermanVoices = [];

function pronunciationButton(text, label = '발음 듣기', rate = 0.86) {
  const spoken = pronounceableGerman(text);
  if (!spoken) return '';
  return `<button type="button" class="pronunciation-button" data-speak-german="${escapeHtml(spoken)}" data-speech-rate="${rate}" aria-label="${escapeHtml(spoken)} ${escapeHtml(label)}" aria-pressed="false">🔊 ${label}</button>`;
}

function refreshGermanVoices() {
  if (!('speechSynthesis' in window)) return;
  availableGermanVoices = window.speechSynthesis.getVoices()
    .filter(voice => voice.lang.toLowerCase().startsWith('de'));
}

function resetPronunciationButtons() {
  document.querySelectorAll('[data-speak-german]').forEach(button => {
    button.classList.remove('speaking');
    button.setAttribute('aria-pressed', 'false');
  });
}

function stopGermanSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  resetPronunciationButtons();
}

function speakGerman(text, rate, button) {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    alert('이 기기에서는 독일어 음성 재생을 지원하지 않아요.');
    return;
  }
  refreshGermanVoices();
  const voice = availableGermanVoices.find(voice =>
    voice.lang.toLowerCase() === 'de-de' && voice.name.toLowerCase().includes('anna')
  );
  if (!voice) {
    alert('Anna 독일어 음성을 찾지 못했어요. 기기 설정에서 독일어(독일) Anna 음성을 설치한 뒤 다시 시도해주세요.');
    return;
  }
  window.speechSynthesis.cancel();
  resetPronunciationButtons();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'de-DE';
  utterance.voice = voice;
  utterance.rate = rate;
  utterance.pitch = 1;
  if (button) {
    button.classList.add('speaking');
    button.setAttribute('aria-pressed', 'true');
  }
  utterance.onend = resetPronunciationButtons;
  utterance.onerror = resetPronunciationButtons;
  window.speechSynthesis.speak(utterance);
}

function bindPronunciation() {
  if ('speechSynthesis' in window) {
    refreshGermanVoices();
    window.speechSynthesis.addEventListener('voiceschanged', refreshGermanVoices);
  }
  app.addEventListener('click', event => {
    const button = event.target.closest('[data-speak-german]');
    if (button) {
      const rate = Number(button.dataset.speechRate);
      speakGerman(button.dataset.speakGerman, Number.isFinite(rate) ? rate : 0.86, button);
      return;
    }
    if (event.target.closest('button')) stopGermanSpeech();
  });
}

function taskHtml(icon,title,description,action,disabled) {
  return `<article class="task"><div class="task-icon">${icon}</div><div class="task-copy"><h3>${title}</h3><p>${description}</p></div><button class="primary" data-action="${action}" ${disabled?'disabled':''}>시작</button></article>`;
}

function exampleFormExplanationHtml(explanation) {
  if (!explanation) return '';
  return `<section class="example-form-explanation"><p class="eyebrow">왜 이렇게 바뀌나요?</p><h3>${escapeHtml(explanation.title)}</h3><p>${escapeHtml(explanation.body)}</p><strong>${escapeHtml(explanation.pattern)}</strong>${explanation.note ? `<small>${escapeHtml(explanation.note)}</small>` : ''}</section>`;
}

function startExampleCloze() {
  const cohort = state.cohorts.find(item => item.learnedDate === todayKst() && item.learningDone);
  if (!cohort) return renderDashboard();
  const questions = shuffleCopy(cohort.wordIds.map(word).filter(Boolean).map(exampleClozeQuestion).filter(Boolean));
  if (!questions.length) return renderDashboard();
  renderExampleClozeQuestion(questions, 0, 0);
}

function renderExampleClozeQuestion(questions, index, correctCount, submittedAnswer = null) {
  if (index >= questions.length) {
    app.innerHTML = `<section class="complete example-cloze-result"><div class="celebrate">✍️</div><p class="eyebrow">Beispielsätze(예문)</p><h1>${correctCount}/${questions.length} 정답</h1><p>오늘 배운 단어를 공식 Goethe A1 예문 속에서 확인했어요.</p><div class="result-actions"><button id="backHome" class="secondary">홈으로</button><button id="retryExampleCloze" class="primary">다시 풀기</button></div></section>`;
    document.querySelector('#backHome').onclick=renderDashboard;
    document.querySelector('#retryExampleCloze').onclick=startExampleCloze;
    return;
  }
  const question = questions[index];
  const submitted = submittedAnswer !== null;
  const correct = submitted && isExampleGapCorrect(submittedAnswer, question);
  const formExplanation = submitted ? exampleFormExplanation(question) : null;
  const glosses = [];
  const promptHtml = examplePromptParts(question, words).map(part => {
    if (!part.gloss) return escapeHtml(part.text);
    const glossIndex = glosses.push({ surface: part.text, ...part.gloss }) - 1;
    return `<button type="button" class="example-token" data-example-gloss="${glossIndex}" aria-label="${escapeHtml(part.text)} 뜻 보기">${escapeHtml(part.text)}</button>`;
  }).join('');
  app.innerHTML = `<section class="session example-cloze-session"><div class="session-head"><div><p class="eyebrow">공식 Goethe A1 예문</p><h1>문맥을 보고 빈칸을 채우세요</h1></div><span class="pill">${index+1} / ${questions.length}</span></div><div class="progress-track"><div class="progress-bar" style="width:${(index/questions.length)*100}%"></div></div><article class="flashcard example-cloze-card"><div class="example-prompt">${promptHtml}</div><div class="meta">문장 속 단어를 누르면 한국어·영어 뜻을 볼 수 있어요.</div><div class="example-gloss-panel" role="status" aria-live="polite"><span>모르는 단어를 눌러 뜻을 확인해보세요.</span></div><form id="exampleForm" class="answer-form"><input id="exampleAnswer" type="text" value="${escapeHtml(submittedAnswer ?? '')}" placeholder="빈칸에 들어갈 독일어" autocomplete="off" autocapitalize="none" spellcheck="false" ${submitted?'disabled':'required'}>${submitted?`<div class="submitted-answer-actions"><button id="home" class="secondary" type="button">나가기</button><button id="nextExample" class="primary" type="button">${index===questions.length-1?'결과 보기':'다음 문제'}</button></div>`:`<button class="primary" type="submit">제출</button>`}</form>${submitted?`<div class="feedback ${correct?'correct-text':'wrong-text'}">${correct?'Richtig(정답)!':'Noch nicht(아직 아니에요).'}</div><div class="example-reveal"><strong>${escapeHtml(question.sentence)}</strong><span>빈칸 정답: ${escapeHtml(question.gapAnswer)}</span><small>${escapeHtml(question.meaning)}</small><div class="pronunciation-actions">${pronunciationButton(question.gapAnswer, '정답 발음')}${pronunciationButton(question.sentence, '문장 듣기')}${pronunciationButton(question.sentence, '천천히 듣기', 0.43)}</div></div>${exampleFormExplanationHtml(formExplanation)}`:''}</article>${submitted?'':`<div class="card-actions"><button id="home" class="secondary">나가기</button></div>`}</section>`;
  document.querySelector('#home').onclick=renderDashboard;
  const glossPanel = document.querySelector('.example-gloss-panel');
  document.querySelectorAll('[data-example-gloss]').forEach(button => button.onclick=()=>{
    const gloss = glosses[Number(button.dataset.exampleGloss)];
    document.querySelectorAll('[data-example-gloss]').forEach(token => token.classList.toggle('selected', token === button));
    glossPanel.innerHTML = `<strong>${escapeHtml(gloss.surface)}</strong><span>${escapeHtml(gloss.korean)}</span><small>${escapeHtml(gloss.english)}</small>`;
  });
  if (submitted) {
    document.querySelector('#nextExample').onclick=()=>renderExampleClozeQuestion(questions,index+1,correctCount+(correct?1:0));
  } else {
    const input = document.querySelector('#exampleAnswer');
    input.focus();
    document.querySelector('#exampleForm').onsubmit=event=>{
      event.preventDefault();
      const answer = input.value.trim();
      if (!answer) return;
      renderExampleClozeQuestion(questions,index,correctCount,answer);
    };
  }
}

function startNounArticleQuiz() {
  const questions = shuffleCopy(cumulativeNounQuestions(state.cohorts, words));
  if (!questions.length) return renderDashboard();
  renderNounArticleQuestion(questions, 0, 0);
}

function renderNounArticleQuestion(questions, index, correctCount, selectedArticle = null) {
  if (index >= questions.length) {
    app.innerHTML = `<section class="complete noun-article-result"><div class="celebrate">🧩</div><p class="eyebrow">Nomen(명사) 관사 연습</p><h1>${correctCount}/${questions.length} 정답</h1><p>지금까지 학습 완료한 명사 ${questions.length}개의 관사를 모두 확인했어요.</p><div class="result-actions"><button id="backHome" class="secondary">홈으로</button><button id="retryNounArticles" class="primary">다시 풀기</button></div></section>`;
    document.querySelector('#backHome').onclick=renderDashboard;
    document.querySelector('#retryNounArticles').onclick=startNounArticleQuiz;
    return;
  }
  const question = questions[index];
  const answered = selectedArticle !== null;
  const correct = answered && selectedArticle === question.article;
  const articleClass = article => answered ? article === question.article ? 'correct' : article === selectedArticle ? 'wrong' : '' : '';
  const articleDisabled = answered ? 'disabled' : '';
  app.innerHTML = `<section class="session noun-article-session"><div class="session-head"><div><p class="eyebrow">Nomen(명사) 관사 연습</p><h1>알맞은 관사를 고르세요</h1></div><span class="pill">${index+1} / ${questions.length}</span></div><div class="progress-track"><div class="progress-bar" style="width:${(index/questions.length)*100}%"></div></div><article class="flashcard"><div class="noun-article-prompt"><span class="article-blank">___</span> <strong>${escapeHtml(question.noun)}</strong></div><div class="article-choices"><button class="choice article-choice ${articleClass('der')}" data-article="der" ${articleDisabled}>der</button><button class="choice article-choice ${articleClass('das')}" data-article="das" ${articleDisabled}>das</button><button class="choice article-choice ${articleClass('die')}" data-article="die" ${articleDisabled}>die</button></div>${answered?`<div class="feedback ${correct?'correct-text':'wrong-text'}">${correct?'Richtig(정답)!':'Noch nicht(아직 아니에요).'}</div><div class="meaning">정답: ${question.article} ${escapeHtml(question.noun)}<small>${escapeHtml(question.meaning)}</small></div>${pronunciationButton(`${question.article} ${question.noun}`)}`:''}</article><div class="card-actions"><button id="home" class="secondary">나가기</button>${answered?`<button id="nextNounArticle" class="primary">${index === questions.length-1?'결과 보기':'다음 문제'}</button>`:''}</div></section>`;
  document.querySelector('#home').onclick=renderDashboard;
  if (answered) {
    document.querySelector('#nextNounArticle').onclick=()=>renderNounArticleQuestion(questions, index+1, correctCount+(correct?1:0));
  } else {
    document.querySelectorAll('[data-article]').forEach(button => button.onclick=()=>renderNounArticleQuestion(questions, index, correctCount, button.dataset.article));
  }
}

function calendarHtml(today) {
  const { year, monthIndex } = calendarCursor;
  const days = monthCalendarDays(year, monthIndex);
  const cohortByDate = new Map(state.cohorts.map(cohort => [cohort.learnedDate, cohort]));
  const cells = days.map(date => {
    if (!date) return '<span class="calendar-empty" aria-hidden="true"></span>';
    const cohort = cohortByDate.get(date);
    const summary = cohort ? summarizeLearningDay(cohort) : null;
    const statusClass = calendarDayStatus(date, today, STUDY_START_DATE, Boolean(cohort), Boolean(summary?.memorized));
    const inactive = statusClass === 'inactive';
    const statusLabel = statusClass === 'mastered' ? '암기 완료' : statusClass === 'studied' ? '학습함' : statusClass === 'missed' ? '미학습' : statusClass === 'open' ? '오늘' : '';
    return `<button type="button" class="calendar-day ${statusClass} ${date===today?'today':''}" data-calendar-date="${date}" aria-label="${date} ${inactive?'학습 시작 전':statusLabel||'기록 보기'}" ${inactive?'disabled':''}><span class="calendar-number">${Number(date.slice(-2))}</span>${statusLabel?`<small>${statusLabel}</small>`:''}</button>`;
  }).join('');
  return `<section class="calendar-panel"><div class="calendar-heading"><div><p class="eyebrow">Lernkalender(학습 캘린더)</p><h2>${year}년 ${monthIndex+1}월</h2></div><div class="calendar-nav"><button type="button" id="calendarPrev" aria-label="이전 달">‹</button><button type="button" id="calendarToday">오늘</button><button type="button" id="calendarNext" aria-label="다음 달">›</button></div></div><div class="calendar-legend"><span><i class="legend-dot mastered"></i>암기 완료</span><span><i class="legend-dot studied"></i>학습함</span><span><i class="legend-dot missed"></i>미학습</span><span><i class="legend-dot inactive"></i>8월 25일 이전</span></div><div class="calendar-weekdays"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div><div class="calendar-grid">${cells}</div><p class="calendar-hint">날짜를 누르면 단어 수, 시도별 점수와 무오답 완료 3회까지의 과정을 볼 수 있어요.</p></section>`;
}

function bindCalendarControls() {
  document.querySelector('#calendarPrev').onclick=()=>shiftCalendar(-1);
  document.querySelector('#calendarNext').onclick=()=>shiftCalendar(1);
  document.querySelector('#calendarToday').onclick=()=>{
    const [year, month] = todayKst().split('-').map(Number);
    calendarCursor = { year, monthIndex: month-1 };
    renderDashboard();
  };
  app.querySelectorAll('[data-calendar-date]').forEach(button => button.onclick=()=>showDayDetail(button.dataset.calendarDate));
}

function shiftCalendar(offset) {
  const next = new Date(Date.UTC(calendarCursor.year, calendarCursor.monthIndex + offset, 1));
  calendarCursor = { year: next.getUTCFullYear(), monthIndex: next.getUTCMonth() };
  renderDashboard();
}

function formatStudyDate(date) {
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date(`${date}T12:00:00+09:00`));
}

function formatStudyTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
}

function showDayDetail(date) {
  const cohort = state.cohorts.find(item => item.learnedDate === date);
  const content = document.querySelector('#dayDetailContent');
  if (!cohort) {
    const future = date > todayKst();
    content.innerHTML = `<div class="dialog-title"><div><p class="eyebrow">Tagesbericht(날짜 기록)</p><h2>${escapeHtml(formatStudyDate(date))}</h2></div><button type="button" id="closeDayDetail" class="icon-button" aria-label="닫기">×</button></div><div class="empty-day"><div>${future?'🗓️':'○'}</div><h3>${future?'아직 오지 않은 날이에요':'학습 기록이 없어요'}</h3><p>${future?'해당 날짜가 되면 학습 기록을 확인할 수 있어요.':'이 날짜에는 저장된 학습이나 시험 기록이 없습니다.'}</p></div>`;
  } else {
    const summary = summarizeLearningDay(cohort);
    const attempts = (cohort.reverseAttempts || []).filter(attempt => attempt.completed);
    const firstScore = summary.firstAttempt ? `${summary.firstAttempt.correctCount}/${summary.firstAttempt.totalCount}` : '-';
    const mastery = summary.memorized
      ? `<strong>무오답 완료 3/3회 · 암기 완료</strong><span>${summary.perfectAttemptNumber}회차에 세 번째 무오답 전체 학습을 완료했어요.</span>`
      : summary.coverageComplete
        ? `<strong>무오답 완료 ${summary.perfectFullCount}/3회</strong><span>전체 단어를 한 번도 틀리지 않고 ${summary.requiredPerfectFullCount-summary.perfectFullCount}회 더 완료하면 암기 완료예요.</span>`
        : `<strong>아직 전체 단어 학습 중</strong><span>${summary.masteredCount}/${summary.totalWords}개 정답 경험 · ${summary.totalWords-summary.masteredCount}개 남음</span>`;
    const attemptRows = attempts.length ? attempts.map((attempt, index) => {
      const score = `${attempt.correctCount}/${attempt.totalCount} 정답 · ${attempt.totalCount-attempt.correctCount}개 오답`;
      const times = `${formatStudyTime(attempt.startedAt)}–${formatStudyTime(attempt.completedAt)}`;
      return `<li><div><strong>${index+1}회차</strong><span>${score}</span></div><time>${times}</time></li>`;
    }).join('') : '<li class="empty-attempt">완료한 거꾸로 학습 기록이 없어요.</li>';
    const learnedWords = lessonOverview((cohort.wordIds || []).map(word).filter(Boolean)).map((item,index)=>`<li><span>${index+1}</span><div><strong>${escapeHtml(item.german)}</strong>${pronunciationButton(item.german, '듣기')}<small>${escapeHtml(item.meaning)}</small></div></li>`).join('');
    content.innerHTML = `<div class="dialog-title"><div><p class="eyebrow">Tagesbericht(날짜 기록)</p><h2>${escapeHtml(formatStudyDate(date))}</h2></div><button type="button" id="closeDayDetail" class="icon-button" aria-label="닫기">×</button></div><div class="day-status ${summary.memorized?'done':''}">${mastery}</div><div class="day-stats"><div><strong>${summary.totalWords}</strong><span>학습 단어</span></div><div><strong>${summary.newCount}</strong><span>신규 단어</span></div><div><strong>${firstScore}</strong><span>첫 시도 점수</span></div><div><strong>${summary.totalAttempts}</strong><span>전체 시도</span></div></div><div class="review-status"><span class="${summary.learningDone?'done':''}">기본 학습 ${summary.learningDone?'완료':'미완료'}</span><span class="${summary.morningDone?'done':''}">아침 재시험 ${summary.morningDone?'완료':'미완료'}</span><span class="${summary.finalDone?'done':''}">최종시험 ${summary.finalDone?'완료':'미완료'}</span></div><div class="day-relearn-actions"><button type="button" id="reviewDayWords" class="secondary">단어 다시 보기</button><button type="button" id="reverseDayWords" class="primary">뜻 → 독일어 거꾸로 학습</button></div><details class="attempt-detail-fold"><summary>시도별 점수 · 완료 ${summary.completedAttempts}회</summary><ol class="day-attempts">${attemptRows}</ol></details><details class="learned-word-details"><summary>이날 학습한 단어 ${summary.totalWords}개 보기</summary><ol>${learnedWords}</ol></details>`;
  }
  document.querySelector('#closeDayDetail').onclick=()=>dayDetailDialog.close();
  if (cohort) {
    document.querySelector('#reviewDayWords').onclick=()=>{
      dayDetailDialog.close();
      renderLearning(cohort, [...cohort.wordIds], 0, false, 'forward');
    };
    document.querySelector('#reverseDayWords').onclick=()=>{
      dayDetailDialog.close();
      startReverseAttempt(cohort);
    };
  }
  if (dayDetailDialog.open) dayDetailDialog.close();
  dayDetailDialog.showModal();
}

function reverseAttemptsHtml(attempts, summary) {
  const completedAttempts = attempts.filter(attempt => attempt.completed);
  if (!completedAttempts.length) return '';
  const status = summary.memorized
    ? '무오답 3/3회 · 암기 완료'
    : summary.coverageComplete
      ? `무오답 ${summary.perfectFullCount}/3회`
      : `${summary.masteredCount}/${summary.totalWords}개 정답 경험`;
  const rows = completedAttempts.map((attempt, index) => {
    const score = `${attempt.correctCount}/${attempt.totalCount}`;
    const perfect = attempt.totalCount === summary.totalWords && attempt.correctCount === summary.totalWords;
    return `<li class="${perfect?'perfect':''}"><strong>${index+1}회</strong><span>${score}</span></li>`;
  }).join('');
  const badge = summary.memorized ? '✓ 암기 완료' : summary.coverageComplete ? `무오답 ${summary.perfectFullCount}/3` : '도전 중';
  return `<section class="attempt-panel reverse-attempt-compact"><div class="attempt-heading"><strong>오늘의 거꾸로 학습</strong><span class="memory-status ${summary.memorized?'done':''}">${badge}</span></div><p class="attempt-score-flow">${status}</p><ol class="attempt-list">${rows}</ol></section>`;
}

function addExtraWordsToday(requestedCount) {
  const cohortIndex = state.cohorts.findIndex(item => item.learnedDate === todayKst());
  if (cohortIndex < 0 || !state.cohorts[cohortIndex].learningDone) return renderDashboard();
  const count = Math.max(1, Math.min(50, Math.floor(Number(requestedCount) || 1)));
  const freshCandidates = words.slice(state.nextIndex);
  const result = extendCohortWithWords(state.cohorts[cohortIndex], freshCandidates, count);
  if (!result.addedIds.length) return renderDashboard();
  state.cohorts[cohortIndex] = result.cohort;
  state.nextIndex += result.addedIds.length;
  saveState();
  renderLearning(result.cohort, shuffleCopy(result.addedIds), 0, false, 'forward');
}

function startLearning(direction = 'forward') {
  const today = todayKst();
  let cohort = state.cohorts.find(item => item.learnedDate === today);
  if (!cohort) {
    const fresh = words.slice(state.nextIndex, state.nextIndex + state.dailyCount);
    const carried = state.carryIds.map(word).filter(Boolean);
    const lesson = buildNightLesson(fresh, carried, state.dailyCount);
    cohort = { id:`cohort-${today}`, learnedDate:today, wordIds:lesson.map(item=>item.id), newCount:fresh.length, learningDone:false, morningDone:false, finalDone:false, finalMisses:{}, reverseAttempts:[] };
    state.cohorts.push(cohort); state.nextIndex += fresh.length; state.carryIds = []; saveState();
  }
  if (direction === 'reverse') return startReverseAttempt(cohort);
  renderLearning(cohort, shuffleCopy(cohort.wordIds), 0, false, direction);
}

function startReverseAttempt(cohort) {
  cohort.reverseAttempts ||= [];
  const summary = summarizeReverseAttempts(cohort.reverseAttempts, cohort.wordIds);
  const masteredIds = new Set(
    cohort.reverseAttempts
      .filter(attempt => attempt.completed)
      .flatMap(attempt => (attempt.results || []).filter(result => result.correct).map(result => result.wordId))
  );
  const remainingIds = cohort.wordIds.filter(id => !masteredIds.has(id));
  const attemptWordIds = summary.coverageComplete ? [...cohort.wordIds] : remainingIds;
  const attempt = {
    id: `reverse-${cohort.learnedDate}-${Date.now()}`,
    number: summary.completedCount + 1,
    startedAt: new Date().toISOString(),
    completedAt: null,
    completed: false,
    correctCount: 0,
    totalCount: attemptWordIds.length,
    wordIds: attemptWordIds,
    practiceAfterMastery: summary.coverageComplete,
    results: [],
  };
  cohort.reverseAttempts.push(attempt);
  saveState();
  renderReverseLearning(cohort, shuffleCopy(attemptWordIds), 0, attempt.id);
}

function renderLearning(cohort, sessionWordIds, index, revealed, direction) {
  if (index >= sessionWordIds.length) {
    return renderLessonOverview(cohort, sessionWordIds);
  }
  const item = word(sessionWordIds[index]);
  const sides = learningCardSides(item, 'forward');
  app.innerHTML = `<section class="session"><div class="session-head"><h1>독일어 → 뜻 학습</h1><span class="pill">${index+1} / ${sessionWordIds.length}</span></div><div class="progress-track"><div class="progress-bar" style="width:${(index/sessionWordIds.length)*100}%"></div></div><article class="flashcard"><div class="word">${escapeHtml(sides.prompt)}</div>${pronunciationButton(item.german)}${revealed?`<div class="meaning">${escapeHtml(sides.answer)}</div><div class="meta">소리 내어 독일어를 두 번 읽어보세요.</div>`:`<div class="meta">먼저 뜻을 떠올려보세요.</div>`}</article><div class="card-actions"><button id="home" class="secondary">나가기</button><button id="next" class="primary">${revealed?'다음 단어':'뜻 보기'}</button></div></section>`;
  document.querySelector('#home').onclick=renderDashboard;
  document.querySelector('#next').onclick=()=>revealed?renderLearning(cohort,sessionWordIds,index+1,false,'forward'):renderLearning(cohort,sessionWordIds,index,true,'forward');
}

function renderLessonOverview(cohort, sessionWordIds) {
  const items = lessonOverview(sessionWordIds.map(word).filter(Boolean));
  const pastReview = cohort.learnedDate !== todayKst();
  const rows = items.map((item, index) => `<li><span class="overview-number">${index+1}</span><div><strong>${escapeHtml(item.german)}</strong>${pronunciationButton(item.german, '듣기')}<p>${escapeHtml(item.meaning)}</p></div></li>`).join('');
  const title = pastReview ? `이날 배운 단어 ${items.length}개` : `오늘 배운 단어 ${items.length}개`;
  const intro = pastReview ? `${formatStudyDate(cohort.learnedDate)}에 배운 단어를 다시 확인해보세요.` : '오늘 학습을 완료하기 전에 배운 단어를 한눈에 다시 확인해보세요.';
  const finishLabel = pastReview ? '복습 마치기' : '오늘 학습 완료';
  app.innerHTML = `<section class="lesson-overview"><div class="session-head"><div><p class="eyebrow">Übersicht(전체보기)</p><h1>${escapeHtml(title)}</h1></div><span class="pill">${items.length}개</span></div><p class="overview-intro">${escapeHtml(intro)}</p><ol class="overview-list">${rows}</ol><div class="overview-actions"><button id="home" class="secondary">나가기</button><button id="finishLearning" class="primary">${finishLabel}</button></div></section>`;
  document.querySelector('#home').onclick=renderDashboard;
  document.querySelector('#finishLearning').onclick=()=>{
    if (pastReview) return renderComplete('📚','복습 완료!',`${formatStudyDate(cohort.learnedDate)}에 배운 단어 ${items.length}개를 다시 공부했어요.`);
    cohort.learningDone = true;
    saveState();
    renderComplete('🎉','오늘 학습 완료!',`신규 ${cohort.newCount}개${cohort.wordIds.length-cohort.newCount ? `와 이월 ${cohort.wordIds.length-cohort.newCount}개` : ''}를 학습했어요. 원하는 만큼 다시 학습할 수 있어요.`);
  };
}

function renderReverseLearning(cohort, sessionWordIds, index, attemptId, submittedAnswer = null) {
  const attempt = (cohort.reverseAttempts || []).find(item => item.id === attemptId);
  if (!attempt) return renderDashboard();
  if (index >= sessionWordIds.length) {
    attempt.completed = true;
    attempt.completedAt = new Date().toISOString();
    attempt.correctCount = attempt.results.filter(result => result.correct).length;
    const summary = summarizeReverseAttempts(cohort.reverseAttempts, cohort.wordIds);
    cohort.memorized = summary.memorized;
    if (summary.memorized && !cohort.memorizedAt) cohort.memorizedAt = attempt.completedAt;
    if (!summary.memorized) delete cohort.memorizedAt;
    cohort.learningDone = true;
    saveState();
    return renderReverseOverview(cohort, attempt);
  }
  const item = word(sessionWordIds[index]);
  const prompt = bilingualMeaning(item);
  const submitted = submittedAnswer !== null;
  const correct = submitted && isGermanHeadwordCorrect(submittedAnswer, item.german);
  const isFinalQuestion = index === sessionWordIds.length - 1;
  const isFullPerfectNow = submitted && isFinalQuestion && sessionWordIds.length === cohort.wordIds.length && attempt.results.length === sessionWordIds.length && attempt.results.every(result => result.correct);
  const answerFeedback = correct
    ? isFullPerfectNow ? 'Richtig(정답)! 🎉 이번 회차 전체 무오답이에요!' : 'Richtig(정답)!'
    : 'Noch nicht(아직 아니에요).';
  const nextLabel = isFinalQuestion ? '전체 단어 보기' : '다음 단어';
  app.innerHTML = `<section class="session reverse-learning-session" data-reverse-submitted="${submitted}"><div class="session-head"><h1>뜻 → 독일어 거꾸로 학습</h1><span class="pill">${attempt.number}회차 · ${index+1} / ${sessionWordIds.length}</span></div><div class="progress-track"><div class="progress-bar" style="width:${(index/sessionWordIds.length)*100}%"></div></div><article class="flashcard"><div class="word">${escapeHtml(prompt)}</div><div class="meta">한국어·영어 뜻에 맞는 독일어를 직접 입력하세요. 명사는 관사까지 써보세요.</div><form id="reverseForm" class="answer-form"><input id="reverseAnswer" type="text" style="font-size:20px" value="${escapeHtml(submittedAnswer ?? '')}" placeholder="독일어를 입력하세요" autocomplete="off" autocapitalize="none" spellcheck="false" ${submitted?'disabled':'required'}><button class="primary" type="submit" ${submitted?'disabled':''}>제출</button></form>${submitted?`<div class="feedback ${correct?'correct-text':'wrong-text'}">${answerFeedback}</div><div class="meaning">정답: ${escapeHtml(item.german)}</div>${pronunciationButton(item.german)}`:''}</article><div class="card-actions"><button id="home" class="secondary">나가기</button>${submitted?`<button id="next" class="primary">${nextLabel}</button>`:''}</div></section>`;
  document.querySelector('#home').onclick=renderDashboard;
  if (submitted) {
    const nextButton = document.querySelector('#next');
    nextButton.onclick=()=>renderReverseLearning(cohort,sessionWordIds,index+1,attemptId);
    nextButton.focus();
  } else {
    const input = document.querySelector('#reverseAnswer');
    input.focus();
    document.querySelector('#reverseForm').onsubmit=event=>{
      event.preventDefault();
      const answer = input.value.trim();
      if (!answer) return;
      const answerCorrect = isGermanHeadwordCorrect(answer, item.german);
      attempt.results.push({ wordId:item.id, answer, correct:answerCorrect, answeredAt:new Date().toISOString() });
      attempt.correctCount = attempt.results.filter(result => result.correct).length;
      state.totalAnswers += 1;
      if (answerCorrect) state.correctAnswers += 1;
      saveState();
      renderReverseLearning(cohort,sessionWordIds,index,attemptId,answer);
    };
  }
}

function renderReverseOverview(cohort, attempt) {
  const resultByWord = new Map((attempt.results || []).map(result => [result.wordId, result]));
  const summary = summarizeReverseAttempts(cohort.reverseAttempts, cohort.wordIds);
  const attemptWasFullPerfect = attempt.completed && attempt.totalCount === summary.totalWords && attempt.correctCount === summary.totalWords;
  const masteryJustCompleted = attemptWasFullPerfect && summary.perfectAttemptNumber === attempt.number;
  const overviewTitle = masteryJustCompleted
    ? '무오답 3/3회! 오늘 암기 완료!'
    : attemptWasFullPerfect
      ? '한 번도 안 틀렸어요!'
      : '거꾸로 학습 전체 단어';
  const overviewIntro = masteryJustCompleted
    ? '전체 단어를 한 번도 틀리지 않고 세 번째로 완료했어요! 정말 잘했어요! 단어를 확인한 뒤 결과를 볼 수 있어요.'
    : attemptWasFullPerfect
      ? `Perfekt(완벽해요)! 문제를 끝내자마자 무오답 전체 학습 ${summary.perfectFullCount}/3회 달성을 확인했어요. 오늘의 전체 단어를 확인해보세요.`
      : `이번 회차를 마쳤어요. 결과를 보기 전에 오늘의 전체 단어 ${summary.totalWords}개를 한눈에 확인해보세요.`;
  const overviewCelebration = attemptWasFullPerfect
    ? `<div class="perfect-celebration" aria-label="무오답 완료 축하"><span>🎉</span><strong>${masteryJustCompleted?'🏆':'✨'}</strong><span>🎉</span><small>Perfekt!</small></div>`
    : '';
  const originalItems = (cohort.wordIds || []).map(id => ({ id, item: word(id) })).filter(entry => entry.item);
  const missedIds = (attempt.results || []).filter(result => !result.correct).map(result => result.wordId);
  const sourceItems = prioritizeReviewItems(originalItems, missedIds);
  const overviewItems = lessonOverview(sourceItems.map(entry => entry.item));
  const rows = overviewItems.map((item, index) => {
    const result = resultByWord.get(sourceItems[index].id);
    const resultLabel = result ? `<small class="overview-result ${result.correct?'correct':'wrong'}">${result.correct?'✓ 이번 회차 정답':'● 다시 볼 단어'}</small>` : '';
    return `<li><span class="overview-number">${index+1}</span><div><strong>${escapeHtml(item.german)}</strong>${pronunciationButton(item.german, '듣기')}<p>${escapeHtml(item.meaning)}</p>${resultLabel}</div></li>`;
  }).join('');
  app.innerHTML = `<section class="lesson-overview reverse-overview ${attemptWasFullPerfect?'perfect-overview':''}">${overviewCelebration}<div class="session-head"><div><p class="eyebrow">Übersicht(전체보기)</p><h1>${overviewTitle}</h1></div><span class="pill">${attempt.number}회차 · ${attempt.correctCount}/${attempt.totalCount}</span></div><p class="overview-intro">${overviewIntro}</p><ol class="overview-list">${rows}</ol><div class="overview-actions"><button id="home" class="secondary">홈으로</button><button id="showReverseResult" class="primary">결과 보기</button></div></section>`;
  document.querySelector('#home').onclick=renderDashboard;
  document.querySelector('#showReverseResult').onclick=()=>renderReverseResult(cohort, attempt);
}

function renderReverseResult(cohort, attempt) {
  const summary = summarizeReverseAttempts(cohort.reverseAttempts, cohort.wordIds);
  const coverageComplete = summary.coverageComplete;
  const remainingCount = summary.totalWords - summary.masteredCount;
  const attemptWasFullPerfect = attempt.completed && attempt.totalCount === summary.totalWords && attempt.correctCount === summary.totalWords;
  const masteryJustCompleted = attemptWasFullPerfect && summary.perfectAttemptNumber === attempt.number;
  const resultMessage = masteryJustCompleted
    ? `Perfekt(완벽해요)! 전체 단어를 한 번도 틀리지 않고 세 번째로 완료해 오늘 암기 완료가 됐어요! 정말 잘했어요!`
    : attemptWasFullPerfect
      ? summary.memorized
        ? `완벽한 무오답 학습이에요! 오늘 암기 완료 기록도 멋지게 유지했어요.`
        : `무오답 전체 학습 ${summary.perfectFullCount}/3회를 완료했어요! ${summary.requiredPerfectFullCount-summary.perfectFullCount}회만 더 성공하면 암기 완료예요.`
      : attempt.practiceAfterMastery
        ? `이번 전체 학습은 ${attempt.correctCount}/${attempt.totalCount}점이에요. 무오답 완료 ${summary.perfectFullCount}/3회 기록은 유지됩니다.`
        : coverageComplete
          ? `오늘 단어를 모두 한 번 이상 맞혔어요. 이제 전체 단어 무오답 완료에 3번 도전하세요.`
          : `이번에 틀린 단어만 다시 풀면 돼요. 아직 ${remainingCount}개를 한 번 이상 맞혀야 해요.`;
  const scoreHistory = summary.scores.map(score => {
    const fullPerfect = score.totalCount === summary.totalWords && score.correctCount === summary.totalWords;
    return `<span class="score-chip ${fullPerfect?'perfect':''}">${score.number}회차 ${score.correctCount}/${score.totalCount}</span>`;
  }).join('');
  app.innerHTML = `<section class="complete"><div class="celebrate">🎯</div><h1>${attempt.number}회차 결과: ${attempt.correctCount}/${attempt.totalCount}</h1><p>${resultMessage}</p><div class="score-history">${scoreHistory}</div><div class="result-actions"><button id="backHome" class="secondary">홈으로</button><button id="retryReverse" class="primary">${coverageComplete?'전체 무오답 도전':'오답 다시 풀기'}</button></div></section>`;
  document.querySelector('#backHome').onclick=renderDashboard;
  document.querySelector('#retryReverse').onclick=()=>startReverseAttempt(cohort);
}

function startReview(type, cohort) {
  const queue = shuffleCopy(cohort.wordIds);
  const misses = type === 'final' ? {...(cohort.finalMisses||{})} : {};
  renderQuestion(type, cohort, queue, misses, new Set());
}

function renderQuestion(type, cohort, queue, misses, completed) {
  if (!queue.length) {
    if (type === 'morning') cohort.morningDone = true;
    else {
      cohort.finalDone = true; cohort.finalMisses = misses;
      state.carryIds = [...new Set([...state.carryIds, ...finalFailures(misses)])];
    }
    saveState();
    const failed = type === 'final' ? finalFailures(misses).length : 0;
    return renderComplete(type==='morning'?'☀️':'🌙',type==='morning'?'아침 재시험 완료!':'최종시험 완료!',failed?`${failed}개가 오늘 밤 학습에 자동으로 추가됐어요.`:'모든 단어를 안정적으로 기억했어요.');
  }
  const id = queue.shift(), item = word(id), germanPrompt = type === 'morning';
  const options = makeChoices(item, germanPrompt ? 'korean' : 'german');
  app.innerHTML=`<section class="session"><div class="session-head"><h1>${type==='morning'?'아침 재시험':'이틀 뒤 최종시험'}</h1><span class="pill">완료 ${completed.size} / ${cohort.wordIds.length}</span></div><article class="flashcard"><div class="quiz-prompt">${germanPrompt?'독일어의 뜻을 고르세요':'한국어·영어 뜻에 맞는 독일어를 고르세요'}</div><div class="word">${escapeHtml(germanPrompt?item.german:bilingualMeaning(item))}</div><div class="choices">${options.map(option=>`<button class="choice" data-id="${option.id}">${escapeHtml(germanPrompt?bilingualMeaning(option):option.german)}</button>`).join('')}</div><div class="feedback" id="feedback"></div></article><div class="card-actions"><button id="home" class="secondary">나가기</button><button id="skip" class="secondary">모르겠어요</button></div></section>`;
  document.querySelector('#home').onclick=renderDashboard;
  const answer = chosenId => {
    const correct = chosenId === id; state.totalAnswers += 1;
    if (correct) { state.correctAnswers += 1; completed.add(id); }
    else { misses[id]=(misses[id]||0)+1; queue.push(id); }
    saveState();
    document.querySelectorAll('.choice').forEach(btn=>{btn.disabled=true;if(btn.dataset.id===id)btn.classList.add('correct');else if(btn.dataset.id===chosenId)btn.classList.add('wrong')});
    document.querySelector('#feedback').textContent=correct?'Richtig(정답)!':'다시 나오니 그때 맞혀보세요.';
    setTimeout(()=>renderQuestion(type,cohort,queue,misses,completed),650);
  };
  document.querySelectorAll('.choice').forEach(button=>button.onclick=()=>answer(button.dataset.id));
  document.querySelector('#skip').onclick=()=>answer('');
}

function makeChoices(correct, field) {
  const pool = words.filter(item => item.id !== correct.id && item[field] && item[field] !== correct[field]);
  for (let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  const choices=[correct,...pool.slice(0,3)];
  for (let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
  return choices;
}

function renderComplete(icon,title,message) {
  app.innerHTML=`<section class="complete"><div class="celebrate">${icon}</div><h1>${title}</h1><p>${message}</p><button id="backHome" class="primary">홈으로</button></section>`;
  document.querySelector('#backHome').onclick=renderDashboard;
}

function bindReverseKeyboard() {
  app.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const session = event.target.closest('[data-reverse-submitted]');
    if (!session) return;
    const action = reverseEnterAction({
      submitted: session.dataset.reverseSubmitted === 'true',
      targetIsNext: Boolean(event.target.closest('#next')),
      isComposing: event.isComposing || event.keyCode === 229,
      repeat: event.repeat,
      isTextArea: event.target.matches('textarea,[contenteditable="true"]'),
    });
    if (action === 'native' || action === 'submit') return;
    event.preventDefault();
    if (action === 'next') session.querySelector('#next')?.click();
  });
}

function bindGlobalNavigation() {
  document.querySelector('.brand').onclick=event=>{
    event.preventDefault();
    if (settingsDialog.open) settingsDialog.close();
    if (dayDetailDialog.open) dayDetailDialog.close();
    renderDashboard();
  };
}

function authErrorMessage(error, mode) {
  if (error?.code === 'auth/email-already-in-use') return '이미 사용 중인 아이디예요. 다른 아이디를 골라주세요.';
  if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(error?.code)) return '아이디 또는 PIN 번호가 맞지 않아요.';
  if (error?.code === 'auth/too-many-requests') return '로그인 시도가 너무 많아요. 잠시 후 다시 시도해 주세요.';
  if (error?.code === 'auth/network-request-failed') return '인터넷 연결을 확인해 주세요.';
  return error?.message?.includes('아이디') || error?.message?.includes('6자리')
    ? error.message
    : `${mode === 'create' ? '회원가입' : '로그인'}에 실패했어요. 잠시 후 다시 시도해 주세요.`;
}

function bindAuth() {
  const accountButton = document.querySelector('#accountButton');
  const signOutButton = document.querySelector('#accountSignOut');
  const accountDialog = document.querySelector('#accountDialog');
  const accountForm = document.querySelector('#accountForm');
  const accountIdInput = document.querySelector('#accountIdInput');
  const pinInput = document.querySelector('#pinInput');
  const createButton = document.querySelector('#createAccountButton');
  const signInButton = document.querySelector('#signInButton');
  const accountMessage = document.querySelector('#accountMessage');
  const userLabel = document.querySelector('#authUser');
  const syncStatus = document.querySelector('#syncStatus');

  accountButton.onclick = () => {
    accountMessage.textContent = '';
    accountDialog.showModal();
    accountIdInput.focus();
  };
  document.querySelector('#closeAccountDialog').onclick = () => accountDialog.close();

  const runAccountAction = async mode => {
    if (!accountForm.reportValidity()) return;
    accountMessage.dataset.status = 'working';
    accountMessage.textContent = mode === 'create' ? '계정을 만드는 중…' : '로그인하는 중…';
    createButton.disabled = true;
    signInButton.disabled = true;
    try {
      const action = mode === 'create' ? createAccountWithPin : signInWithPin;
      await action(accountIdInput.value, pinInput.value);
      accountMessage.textContent = mode === 'create' ? '가입 완료! 진도를 연결하고 있어요.' : '로그인 완료! 진도를 불러오고 있어요.';
    } catch (error) {
      console.error(`WortWeg ${mode} failed`, error);
      accountMessage.dataset.status = 'error';
      accountMessage.textContent = authErrorMessage(error, mode);
    } finally {
      createButton.disabled = false;
      signInButton.disabled = false;
    }
  };

  accountForm.onsubmit = event => {
    event.preventDefault();
    runAccountAction('signin');
  };
  createButton.onclick = () => runAccountAction('create');
  signOutButton.onclick = () => signOutFromAccount().catch(error => {
    console.error('WortWeg sign-out failed', error);
    syncStatus.textContent = '로그아웃 실패';
  });

  return initializeCloudSync({
    getLocalState: () => structuredClone(state),
    applyMergedState: merged => {
      state = { ...defaultState(), ...merged };
      localStorage.setItem(activeStorageKey, JSON.stringify(state));
      if (appReady) renderDashboard();
    },
    onUserChanged: user => {
      switchLocalProfile(user);
      accountButton.hidden = Boolean(user);
      signOutButton.hidden = !user;
      userLabel.hidden = !user;
      userLabel.textContent = user?.displayName || user?.email?.split('@')[0] || '';
      if (user && accountDialog.open) accountDialog.close();
      if (user) {
        accountIdInput.value = '';
        pinInput.value = '';
      }
    },
    onStatus: ({ status, message }) => {
      syncStatus.dataset.status = status;
      syncStatus.textContent = message;
    },
    onError: error => console.error('WortWeg cloud sync', error),
  });
}

function bindSettings() {
  document.querySelector('#menuButton').onclick=()=>{document.querySelector('#dailyCountInput').value=state.dailyCount;settingsDialog.showModal()};
  document.querySelector('#saveSettingsButton').onclick=()=>{state.dailyCount=Math.max(5,Math.min(40,Number(document.querySelector('#dailyCountInput').value)||20));saveState();settingsDialog.close();renderDashboard()};
  document.querySelector('#exportButton').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`wortweg-progress-${todayKst()}.json`;a.click();URL.revokeObjectURL(a.href)};
  document.querySelector('#importInput').onchange=async event=>{
    try{
      const file=event.target.files[0];
      if(!file)return;
      const parsed=JSON.parse(await file.text());
      if(!parsed||!Array.isArray(parsed.cohorts))throw new Error('올바른 진도 파일이 아닙니다.');
      state={...defaultState(),...parsed};
      saveState();
      settingsDialog.close();
      renderDashboard();
    }catch(error){
      alert(`진도 파일을 가져오지 못했습니다. ${error.message||'파일 내용을 확인해 주세요.'}`);
      event.target.value='';
    }
  };
  document.querySelector('#resetButton').onclick=()=>{if(confirm('모든 학습 진도를 지울까요?')){state=defaultState();saveState();settingsDialog.close();renderDashboard()}};
}

async function init() {
  const response=await fetch('./data/words.json');
  if(!response.ok) throw new Error('단어 데이터를 불러오지 못했습니다.');
  words=await response.json();
  if(words.some(item=>!item.korean||!item.english||!item.exampleGerman)) throw new Error('한국어·영어 뜻 또는 공식 예문 데이터가 아직 완성되지 않았습니다.');
  byId=new Map(words.map(item=>[item.id,item]));
  bindGlobalNavigation();
  bindPronunciation();
  bindReverseKeyboard();
  bindSettings();
  await bindAuth();
  appReady = true;
  renderDashboard();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
}
init().catch(error=>{app.innerHTML=`<section class="complete"><div class="celebrate">⚠️</div><h1>앱을 시작할 수 없어요</h1><p>${escapeHtml(error.message)}</p></section>`});
