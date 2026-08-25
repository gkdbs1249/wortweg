import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from extract_goethe import extract_entries


class GoetheExtractionTests(unittest.TestCase):
    def test_extracts_headwords_not_example_sentences(self):
        pdf = ROOT / "data" / "goethe-a1-wortliste.pdf"
        entries = extract_entries(pdf)
        heads = [entry["german"] for entry in entries]
        self.assertIn("ab", heads)
        self.assertIn("aber", heads)
        self.assertIn("abfahren", heads)
        self.assertIn("die Abfahrt", heads)
        self.assertIn("der Anrufbeantworter", heads)
        self.assertNotIn("der Anruf-", heads)
        self.assertNotIn("beantworter", heads)
        self.assertNotIn("Ab morgen muss ich arbeiten.", heads)
        self.assertEqual(entries[0]["exampleGerman"], "Ab morgen muss ich arbeiten.")
        self.assertEqual(entries[2]["exampleGerman"], "Wir fahren um zwölf Uhr ab.")
        sight = next(entry for entry in entries if entry["german"] == "die Sehenswürdigkeit,")
        self.assertEqual(sight["exampleGerman"], "Welche Sehenswürdigkeiten gibt es in Frankfurt?")
        self.assertTrue(all(entry["exampleGerman"].strip() for entry in entries))

    def test_official_list_has_plausible_a1_size_and_unique_ids(self):
        entries = extract_entries(ROOT / "data" / "goethe-a1-wortliste.pdf")
        self.assertGreaterEqual(len(entries), 500)
        self.assertLessEqual(len(entries), 800)
        self.assertEqual(len(entries), len({entry["id"] for entry in entries}))


if __name__ == "__main__":
    unittest.main()
