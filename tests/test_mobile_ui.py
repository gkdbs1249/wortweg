import re
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
        self.assertLess(dashboard.index("${reverseHistory}"), dashboard.index("noun-practice-title"))
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

    def test_cumulative_noun_article_quiz_is_separate_from_today_tasks(self):
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn('class="section-title noun-practice-title"', app)
        self.assertIn("Nomen(명사) 관사 연습", app)
        self.assertIn("data-action=\"noun-articles\"", app)
        self.assertIn("function startNounArticleQuiz()", app)
        self.assertIn("function renderNounArticleQuestion", app)
        self.assertIn('data-article="der"', app)
        self.assertIn('data-article="das"', app)
        self.assertIn('data-article="die"', app)
        self.assertIn('class="article-blank"', app)
        self.assertRegex(styles, r"\.article-choices\{[^}]*grid-template-columns:repeat\(3,1fr\)")
        self.assertRegex(styles, r"\.article-choice\{[^}]*min-height:64px")

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

    def test_google_login_and_private_firestore_progress_are_deployable(self):
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        app = (ROOT / "app.mjs").read_text(encoding="utf-8")
        cloud = (ROOT / "src" / "cloud-sync.mjs").read_text(encoding="utf-8")
        config = (ROOT / "firebase-config.mjs").read_text(encoding="utf-8")
        rules = (ROOT / "firestore.rules").read_text(encoding="utf-8")
        workflow = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")
        self.assertIn('id="authControls"', index)
        self.assertIn("Google로 로그인", index)
        self.assertIn("로그아웃", index)
        self.assertIn("initializeCloudSync", app)
        self.assertIn("queueCloudProgressSave", app)
        self.assertIn("signInWithRedirect", cloud)
        self.assertIn("GoogleAuthProvider", cloud)
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


if __name__ == "__main__":
    unittest.main()
