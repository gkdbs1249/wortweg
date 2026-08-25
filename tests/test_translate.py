import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from translate_batches import clean_query_word, parse_json_array


class TranslationUtilityTests(unittest.TestCase):
    def test_removes_plural_notation_but_keeps_headword(self):
        self.assertEqual(clean_query_word("die Adresse,-en"), "die Adresse")
        self.assertEqual(clean_query_word("der Zug, -ü, e"), "der Zug")

    def test_parses_json_inside_markdown_fence(self):
        result = parse_json_array('```json\n[{"id":"a","korean":"집"}]\n```')
        self.assertEqual(result[0]["korean"], "집")

    def test_uses_last_complete_array_when_cli_echoes_prompt(self):
        text = 'Query: 입력 [{"id":"a","german":"Haus"}]\nHermes: [{"id":"a","korean":"집"}]\nSession: done'
        result = parse_json_array(text)
        self.assertEqual(result, [{"id":"a","korean":"집"}])


if __name__ == "__main__":
    unittest.main()
