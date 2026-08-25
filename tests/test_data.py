import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class WordDataIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.words = json.loads((ROOT / "data" / "words.json").read_text(encoding="utf-8"))

    def test_all_670_words_have_unique_ids_and_korean_and_english_meanings(self):
        self.assertEqual(len(self.words), 670)
        self.assertEqual(len({word["id"] for word in self.words}), 670)
        self.assertTrue(all(word["german"].strip() for word in self.words))
        self.assertTrue(all(word["korean"].strip() for word in self.words))
        self.assertTrue(all(word["english"].strip() for word in self.words))
        self.assertTrue(all(word["exampleGerman"].strip() for word in self.words))

    def test_every_word_cites_official_goethe_a1_source(self):
        self.assertTrue(all("Goethe-Zertifikat A1" in word["source"] for word in self.words))


if __name__ == "__main__":
    unittest.main()
