import json
import re
import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class MobileInputTests(unittest.TestCase):
    def test_reverse_answer_input_has_ios_safe_inline_font_size(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        match = re.search(
            r'id="reverseAnswer"[^>]*style="[^"]*font-size:\s*(\d+)px',
            app,
        )
        self.assertIsNotNone(match, "reverse answer input needs a critical inline font size")
        self.assertGreaterEqual(int(match.group(1)), 16)

    def test_calendar_uses_a_contiguous_rectangular_month_grid(self):
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertRegex(styles, r"\.calendar-weekdays,\.calendar-grid\{[^}]*gap:0")
        self.assertRegex(styles, r"\.calendar-day\{[^}]*border-radius:0")
        self.assertRegex(styles, r"\.calendar-grid>\*\{[^}]*border-left:")

    def test_attempt_history_uses_compact_chips_and_folded_details(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn('class="attempt-score-flow"', app)
        self.assertIn('class="attempt-detail-fold"', app)
        self.assertRegex(styles, r"\.attempt-list\{[^}]*display:flex")

    def test_reverse_history_is_lightweight_and_attached_below_reverse_task(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        dashboard = app.split("app.innerHTML = `", 1)[1].split("app.querySelectorAll('[data-action]')", 1)[0]
        self.assertIn('class="reverse-task-group', dashboard)
        self.assertLess(dashboard.index("${reverseHistory}"), dashboard.index("extra-practice-title"))
        self.assertIn('class="attempt-panel reverse-attempt-compact"', app)
        self.assertNotIn('<p class="eyebrow">Versuche(시도 기록)</p>', app)
        self.assertRegex(styles, r"\.reverse-task-group\.with-history \.task\{[^}]*border-radius:20px 20px 0 0")
        self.assertRegex(styles, r"\.reverse-attempt-compact\{[^}]*box-shadow:none")
        self.assertRegex(styles, r"\.reverse-task-group\{[^}]*min-width:0")
        self.assertRegex(styles, r"\.reverse-attempt-compact\{[^}]*min-width:0")

    def test_attempt_history_excludes_interrupted_rounds(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        self.assertIn("const completedAttempts = attempts.filter(attempt => attempt.completed);", app)
        self.assertIn("number: summary.completedCount + 1", app)
        self.assertNotIn("중단 ${answered}", app)
        self.assertNotIn("중단 ${summary.interruptedAttempts}", app)

    def test_official_example_cloze_is_a_separate_today_task(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn("exampleClozeQuestion", app)
        self.assertIn('data-action="example-cloze"', app)
        self.assertIn('class="session example-cloze-session"', app)
        self.assertIn('id="exampleAnswer"', app)
        self.assertIn("공식 Goethe A1 예문", app)
        self.assertIn("isExampleGapCorrect", app)
        self.assertIn("examplePromptParts", app)
        self.assertIn("exampleFormExplanation", app)
        self.assertIn('class="example-form-explanation"', app)
        self.assertIn('class="submitted-answer-actions"', app)
        self.assertIn("submitted?'disabled':'required'", app)
        self.assertIn("submitted?'':", app)
        self.assertRegex(styles, r"\.submitted-answer-actions\{[^}]*grid-template-columns:repeat\(2,1fr\)")
        self.assertIn("왜 이렇게 바뀌나요?", app)
        self.assertIn('data-example-gloss', app)
        self.assertIn('class="example-gloss-panel"', app)
        self.assertNotIn("표제어:", app)
        self.assertIn("문장 속 단어를 누르면 한국어·영어 뜻을 볼 수 있어요.", app)
        self.assertRegex(styles, r"\.example-token\{[^}]*min-height:44px")
        self.assertRegex(styles, r"#exampleAnswer\{[^}]*font-size:20px")

    def test_pronunciation_uses_only_a_native_german_voice(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn("pronounceableGerman", app)
        self.assertIn('data-speak-german', app)
        self.assertIn("new SpeechSynthesisUtterance(text)", app)
        self.assertIn("utterance.lang = 'de-DE'", app)
        self.assertIn("utterance.rate = rate", app)
        self.assertIn('data-speech-rate', app)
        self.assertIn("pronunciationButton(question.sentence, '천천히 듣기', 0.43)", app)
        self.assertNotIn("문장 천천히 70%", app)
        self.assertNotIn("pronunciationButton(question.sentence, '천천히 듣기', 0.602)", app)
        self.assertIn("천천히 듣기", app)
        self.assertIn("voiceschanged", app)
        self.assertIn("aria-pressed=\"false\"", app)
        self.assertIn("utterance.onend", app)
        self.assertIn("if (event.target.closest('button')) stopGermanSpeech();", app)
        self.assertIn("voice.lang.toLowerCase().startsWith('de')", app)
        self.assertIn("voice.name.toLowerCase().includes('anna')", app)
        self.assertIn("Anna 독일어 음성을 찾지 못했어요", app)
        self.assertNotIn("availableGermanVoices.at(0)", app)
        self.assertNotIn("voices[0]", app)
        self.assertRegex(styles, r"\.pronunciation-button\{[^}]*min-height:44px")

    def test_noun_article_quiz_moves_inside_the_extra_practice_hub(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        dashboard = app.split("function renderDashboard()", 1)[1].split("let availableGermanVoices", 1)[0]
        hub = app.split("function renderExtraPracticeHub()", 1)[1].split("function renderAllWordsPracticeSetup", 1)[0]
        self.assertIn('class="section-title extra-practice-title"', dashboard)
        self.assertIn("추가 연습", dashboard)
        self.assertIn('data-action="extra-practice"', dashboard)
        self.assertNotIn('class="section-title noun-practice-title"', dashboard)
        self.assertIn("Nomen(명사) 관사 연습", hub)
        self.assertIn("'Nomen(명사) 관사 연습'", hub)
        self.assertIn("'noun-articles'", hub)
        self.assertIn("function startNounArticleQuiz()", app)
        self.assertIn("function renderNounArticleQuestion", app)
        self.assertIn('data-article="der"', app)
        self.assertIn('data-article="das"', app)
        self.assertIn('data-article="die"', app)
        self.assertIn('class="article-blank"', app)
        self.assertRegex(styles, r"\.article-choices\{[^}]*grid-template-columns:repeat\(3,1fr\)")
        self.assertRegex(styles, r"\.article-choice\{[^}]*min-height:64px")

    def test_extra_practice_modes_are_independent_from_calendar_progress(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn("function renderAllWordsPracticeSetup", app)
        self.assertIn("function renderIndependentReversePractice", app)
        self.assertIn("function renderRootFamilyHub", app)
        self.assertIn("function renderRootMatchingRound", app)
        self.assertIn("function renderPrefixCards", app)
        self.assertIn("function renderTopicPracticeHub", app)
        self.assertIn("function startAntonymPractice", app)
        self.assertIn("data-practice-count=\"all\"", app)
        self.assertIn("shuffleCopy", app)
        independent = app.split("function renderIndependentReversePractice", 1)[1].split("function renderRootFamilyHub", 1)[0]
        self.assertNotIn("saveState()", independent)
        self.assertIn("function resetPracticeScroll()", app)
        self.assertIn("resetPracticeScroll();", app.split("function renderExtraPracticeHub()", 1)[1].split("function renderAllWordsPracticeSetup", 1)[0])
        self.assertNotIn("reverseAttempts", independent)
        self.assertRegex(styles, r"\.practice-answer-input\{[^}]*font-size:20px")
        self.assertRegex(styles, r"\.practice-hub-grid\{[^}]*display:grid")

    def test_root_prefix_matching_uses_up_to_five_korean_meaning_pairs(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        self.assertIn("items.slice(offset, offset+5)", app)
        self.assertIn("data-match-word", app)
        self.assertIn("data-match-meaning", app)
        self.assertIn("escapeHtml(item.korean)", app)
        self.assertIn("matched.size === batch.length", app)

    def test_calendar_mastered_label_includes_that_days_completed_word_count(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        self.assertIn("calendarStatusLabel(statusClass, summary)", app)
        self.assertIn("암기완료/", (ROOT / "src" / "core.mjs").read_text(encoding="utf-8"))

    def test_calendar_swaps_mastered_to_pink_and_studied_to_green(self):
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertRegex(styles, r"\.legend-dot\.mastered\{background:#ff8aa0")
        self.assertRegex(styles, r"\.legend-dot\.studied\{background:#20a779")
        self.assertRegex(styles, r"\.calendar-day\.mastered\{background:#fff0f3;[^}]*color:var\(--accent-dark\)")
        self.assertRegex(styles, r"\.calendar-day\.studied\{background:#eafaf4;[^}]*color:var\(--success\)")

    def test_calendar_starts_on_august_25(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        self.assertIn("const STUDY_START_DATE = '2026-08-25';", app)
        self.assertIn("8월 25일 이전", app)

    def test_calendar_day_can_restudy_only_that_days_words_in_both_directions(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        detail = app.split("function showDayDetail(date)", 1)[1].split("function reverseAttemptsHtml", 1)[0]
        self.assertIn('class="day-relearn-actions"', detail)
        self.assertIn('id="reviewDayWords"', detail)
        self.assertIn('id="reverseDayWords"', detail)
        self.assertIn("단어 다시 보기", detail)
        self.assertIn("거꾸로 학습", detail)
        self.assertIn("[...cohort.wordIds]", detail)
        self.assertNotIn("shuffleCopy(cohort.wordIds)", detail)
        self.assertIn("startReverseAttempt(cohort)", detail)
        self.assertRegex(styles, r"\.day-relearn-actions\{[^}]*grid-template-columns:repeat\(2,1fr\)")

    def test_past_calendar_reverse_mastery_marks_that_date_complete_after_three_perfect_rounds(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        overview = app.split("function renderReverseOverview(cohort, attempt)", 1)[1].split("function renderReverseResult(cohort, attempt)", 1)[0]
        self.assertIn("cohort.learnedDate === todayKst() ? '오늘' : '이날'", overview)
        self.assertIn("${masteryDayLabel} 암기 완료", overview)
        self.assertIn("summary.memorized", overview)

    def test_past_calendar_replay_finishes_as_review_not_as_todays_new_lesson(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        overview = app.split("function renderLessonOverview", 1)[1].split("function renderReverseLearning", 1)[0]
        self.assertIn("cohort.learnedDate !== todayKst()", overview)
        self.assertIn("이날 배운 단어", overview)
        self.assertIn("복습 마치기", overview)
        self.assertIn("복습 완료!", overview)

    def test_reverse_session_ends_with_a_full_word_overview(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        self.assertIn("function renderReverseOverview(cohort, attempt)", app)
        self.assertIn("거꾸로 학습 전체 단어", app)
        self.assertIn("return renderReverseOverview(cohort, attempt);", app)

    def test_error_free_full_round_celebrates_before_the_result_screen(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        overview = app.split("function renderReverseOverview(cohort, attempt)", 1)[1].split("function renderReverseResult(cohort, attempt)", 1)[0]
        result = app.split("function renderReverseResult(cohort, attempt)", 1)[1]
        self.assertIn("한 번도 안 틀렸어요!", overview)
        self.assertIn('class="perfect-celebration"', overview)
        self.assertIn("이번 회차 전체 무오답이에요!", app)
        self.assertNotIn('class="perfect-celebration"', result)
        self.assertIn(".perfect-celebration", styles)

    def test_simple_id_and_six_digit_pin_auth_keeps_firestore_progress_private(self):
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        cloud = (ROOT / "src" / "cloud-sync.mjs").read_text(encoding="utf-8")
        config = (ROOT / "firebase-config.mjs").read_text(encoding="utf-8")
        rules = (ROOT / "firestore.rules").read_text(encoding="utf-8")
        workflow = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")
        self.assertIn('id="authControls"', index)
        self.assertIn('id="accountDialog"', index)
        self.assertIn('id="accountIdInput"', index)
        self.assertIn('id="pinInput"', index)
        self.assertIn('inputmode="numeric"', index)
        self.assertIn('pattern="[0-9]{6}"', index)
        self.assertIn("처음 가입하기", index)
        self.assertIn("로그인", index)
        self.assertNotIn("Google로 로그인", index)
        self.assertIn("initializeCloudSync", app)
        self.assertIn("queueCloudProgressSave", app)
        self.assertIn("createAccountWithPin", app)
        self.assertIn("signInWithPin", app)
        self.assertIn("createUserWithEmailAndPassword", cloud)
        self.assertIn("signInWithEmailAndPassword", cloud)
        self.assertNotIn("GoogleAuthProvider", cloud)
        self.assertNotIn("signInWithRedirect", cloud)
        self.assertIn("runTransaction", cloud)
        self.assertIn("users", cloud)
        self.assertIn("progress", cloud)
        self.assertIn("current", cloud)
        self.assertIn("FIREBASE_CONFIG", config)
        self.assertIn("request.auth.uid == userId", rules)
        self.assertIn("actions/deploy-pages", workflow)

    def test_learner_can_choose_n_more_words_for_today(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn('id="extraWordCount"', app)
        self.assertIn("오늘 단어 더 배우기", app)
        self.assertIn("addExtraWordsToday", app)
        self.assertRegex(styles, r"\.extra-word-controls\{[^}]*display:grid")

    def test_initial_auth_settles_before_dashboard_accepts_learning_actions(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        cloud = (ROOT / "src" / "cloud-sync.mjs").read_text(encoding="utf-8")
        self.assertIn("let appReady = false", app)
        self.assertIn("if (appReady && profileChanged && words.length) renderDashboard()", app)
        self.assertIn("await bindAuth()", app)
        self.assertIn("appReady = true", app)
        self.assertIn("initialAuthReady", cloud)
        self.assertIn("await initialAuthReady", cloud)
        self.assertIn("writeMergedProgress(hooks.getLocalState(), true)", cloud)
        self.assertIn("if (applyMerged) hooks?.applyMergedState?.(mergedState)", cloud)
        self.assertIn("if (appReady) renderDashboard()", app)

    def test_review_answer_is_single_shot_and_exit_cancels_stale_question_timer(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        review = app.split("function renderQuestion(type, cohort, queue, misses, completed)", 1)[1].split("function renderComplete", 1)[0]
        self.assertIn("if (answered) return", review)
        self.assertIn("skipButton.disabled = true", review)
        self.assertIn("reviewTransitionTimer = setTimeout", review)
        self.assertIn("clearReviewTransition()", app.split("function renderDashboard()", 1)[1].split("const today", 1)[0])

    def test_invalid_progress_import_shows_a_message_instead_of_throwing(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        settings = app.split("function bindSettings()", 1)[1].split("async function init()", 1)[0]
        self.assertIn("try{", settings)
        self.assertIn("catch(error)", settings)
        self.assertIn("진도 파일을 가져오지 못했습니다", settings)
        self.assertIn("event.target.value=''", settings)

    def test_disabled_learning_buttons_are_visually_distinct(self):
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".primary:disabled,.secondary:disabled", styles)
        self.assertIn("cursor:not-allowed", styles)

    def test_extra_word_card_stays_compact_on_mobile(self):
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".extra-word-task{display:grid;grid-template-columns:48px minmax(0,1fr)}", styles)
        self.assertIn(".extra-word-task .task-copy{min-width:0}", styles)
        self.assertIn(".extra-word-controls{grid-column:1/-1;width:100%", styles)

    def test_all_words_practice_retries_only_the_wrong_answers(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        self.assertGreaterEqual(app.count("retryMisses:true"), 2)
        self.assertIn("incorrectPracticeItems(items, nextRoundResults)", app)
        self.assertIn("오답 ${retryItems.length}개 다시 풀기", app)
        self.assertIn("선택한 ${initialCount}개를 모두 한 번 이상 맞혔어요", app)

    def test_reverse_recall_accepts_every_headword_for_an_identical_bilingual_prompt(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        self.assertGreaterEqual(app.count("reverseAnswerHeadwords(reverseAnswerPool(), item)"), 2)
        self.assertIn("가능한 정답:", app)

    def test_reverse_answer_feedback_has_distinct_success_and_error_colors(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertGreaterEqual(app.count('aria-live="polite"'), 2)
        self.assertGreaterEqual(app.count('✓ Richtig(정답)!'), 2)
        self.assertGreaterEqual(app.count('✕ Noch nicht(아직 아니에요).'), 2)
        self.assertRegex(styles, r"\.feedback\.correct-text\{[^}]*background:#eafaf4;[^}]*border:2px solid #66c7a5;[^}]*color:#066343")
        self.assertRegex(styles, r"\.feedback\.wrong-text\{[^}]*background:#fff0f0;[^}]*border:2px solid #ed8d8d;[^}]*color:#a61b1b")

    def test_reverse_enter_submits_then_advances_on_a_fresh_second_press(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        self.assertIn("bindReverseKeyboard()", app)
        self.assertIn("data-reverse-submitted=", app)
        self.assertIn("reverseEnterAction", app)
        self.assertIn("nextButton.focus()", app)
        self.assertIn("event.isComposing", app)
        self.assertIn("event.repeat", app)

    def test_service_worker_activates_new_keyboard_fix_without_waiting_for_old_tabs(self):
        worker = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn("self.skipWaiting()", worker)
        self.assertIn("self.clients.claim()", worker)

    def test_service_worker_precaches_extra_practice_module(self):
        worker = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn("./src/practice-data.mjs", worker)

    def test_wortweg_favicon_and_install_icons_replace_the_browser_default(self):
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        manifest = (ROOT / "manifest.webmanifest").read_text(encoding="utf-8")
        worker = (ROOT / "sw.js").read_text(encoding="utf-8")
        workflow = (ROOT / ".github/workflows/pages.yml").read_text(encoding="utf-8")
        self.assertIn("wortweg-v54", worker)
        self.assertIn("wortweg-cache=${encodeURIComponent(CACHE)}", worker)
        self.assertIn("const responses=await Promise.all(ASSETS.map", worker)
        self.assertIn("cache.put(asset,responses[index])", worker)
        self.assertIn("await caches.delete(CACHE)", worker)
        self.assertIn("key.startsWith('wortweg-v')&&key!==CACHE", worker)
        self.assertIn("caches.open(CACHE).then(cache=>cache.match(event.request))", worker)
        self.assertIn('rel="icon" type="image/png" sizes="32x32" href="icons/wortweg-tab-v54.png"', index)
        self.assertIn('rel="shortcut icon" type="image/png" href="icons/wortweg-tab-v54.png"', index)
        self.assertIn('rel="apple-touch-icon" sizes="180x180" href="icons/wortweg-touch-v54.png"', index)
        self.assertNotIn('rel="icon" type="image/svg+xml"', index)
        self.assertIn('"src": "icons/wortweg-app-v54-192.png"', manifest)
        self.assertIn('"src": "icons/wortweg-app-v54-512.png"', manifest)
        manifest_data = json.loads(manifest)
        self.assertEqual([icon["sizes"] for icon in manifest_data["icons"]], ["192x192", "512x512"])
        self.assertTrue(all(icon["type"] == "image/png" for icon in manifest_data["icons"]))
        for asset in ["./favicon.ico", "./icons/wortweg-tab-v54.png", "./icons/wortweg-touch-v54.png", "./icons/wortweg-app-v54-192.png", "./icons/wortweg-app-v54-512.png"]:
            self.assertIn(asset, worker)
        self.assertIn("cp favicon.ico _site/", workflow)
        self.assertIn("cp -R icons _site/", workflow)
        self.assertTrue((ROOT / "favicon.ico").is_file())
        for filename in ["wortweg-tab-v54.png", "wortweg-touch-v54.png", "wortweg-app-v54-192.png", "wortweg-app-v54-512.png"]:
            self.assertTrue((ROOT / "icons" / filename).is_file(), filename)
        expected_dimensions = {
            "wortweg-tab-v54.png": (32, 32),
            "wortweg-touch-v54.png": (180, 180),
            "wortweg-app-v54-192.png": (192, 192),
            "wortweg-app-v54-512.png": (512, 512),
        }
        for filename, expected in expected_dimensions.items():
            png = (ROOT / "icons" / filename).read_bytes()
            self.assertEqual(png[:8], b"\x89PNG\r\n\x1a\n", filename)
            self.assertEqual(struct.unpack(">II", png[16:24]), expected, filename)

    def test_all_words_practice_accepts_a_custom_question_count(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn('id="customPracticeCount"', app)
        self.assertIn('id="customPracticeCountForm"', app)
        self.assertIn("practiceWordsForCount(state.cohorts, words, requestedCount)", app)
        self.assertIn(".custom-practice-count", styles)
        self.assertIn("font-size:16px", styles)

    def test_pages_build_deploys_and_tests_extra_practice_module(self):
        workflow = (ROOT / ".github/workflows/pages.yml").read_text(encoding="utf-8")
        self.assertIn("node --test tests/*.test.mjs", workflow)
        self.assertIn("src/practice-data.mjs", workflow)


if __name__ == "__main__":
    unittest.main()
