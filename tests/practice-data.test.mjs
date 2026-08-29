import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ANTONYM_PAIRS, PREFIX_CARDS, ROOT_FAMILIES, SUPPLEMENTAL_PRACTICE_WORDS, TOPIC_GROUPS } from '../src/practice-data.mjs';

const words = JSON.parse(await readFile(new URL('../data/words.json', import.meta.url), 'utf8'));
const byGerman = new Map(words.map(item => [item.german, item]));
const supplementalByGerman = new Map(SUPPLEMENTAL_PRACTICE_WORDS.map(item => [item.german, item]));
const assertKnown = (german, context) => assert.ok(byGerman.has(german), `${context}: unknown headword ${german}`);
const assertPracticeWord = (german, context) => assert.ok(byGerman.has(german) || supplementalByGerman.has(german), `${context}: unavailable practice word ${german}`);

test('root transformation families include useful unlearned supplemental words', () => {
  assert.ok(ROOT_FAMILIES.length >= 15);
  for (const group of ROOT_FAMILIES) {
    assert.ok(group.words.length >= 2, `${group.id} needs at least two words`);
    group.words.forEach(german => assertPracticeWord(german, group.id));
  }
  assert.ok(ROOT_FAMILIES.some(group => group.words.some(german => supplementalByGerman.has(german))));
  assert.equal(new Set(SUPPLEMENTAL_PRACTICE_WORDS.map(item => item.id)).size, SUPPLEMENTAL_PRACTICE_WORDS.length);
  assert.equal(new Set(ROOT_FAMILIES.map(group => group.id)).size, ROOT_FAMILIES.length);
  assert.ok(SUPPLEMENTAL_PRACTICE_WORDS.every(item => !byGerman.has(item.german)));
  const officialIds = new Set(words.map(item => item.id));
  assert.ok(SUPPLEMENTAL_PRACTICE_WORDS.every(item => !officialIds.has(item.id)));
  for (const item of SUPPLEMENTAL_PRACTICE_WORDS) assert.ok(item.id && item.german && item.korean && item.english);
});

test('topic groups use exact headwords and contain enough words to grow with study', () => {
  assert.ok(TOPIC_GROUPS.length >= 8);
  for (const group of TOPIC_GROUPS) {
    assert.ok(group.words.length >= 5, `${group.id} needs at least five words`);
    group.words.forEach(german => assertKnown(german, group.id));
  }
});

test('antonym practice has ordered Korean prompts and exact German answer pairs', () => {
  assert.ok(ANTONYM_PAIRS.length >= 30);
  for (const pair of ANTONYM_PAIRS) {
    assert.equal(pair.prompts.length, 2);
    assert.equal(pair.words.length, 2);
    pair.words.forEach(german => assertPracticeWord(german, pair.id));
  }
  assert.ok(ANTONYM_PAIRS.some(pair => pair.words.some(german => supplementalByGerman.has(german))));
  assert.equal(new Set(ANTONYM_PAIRS.map(pair => pair.id)).size, ANTONYM_PAIRS.length);
});

test('prefix cards combine official headwords with clearly defined extra examples', () => {
  assert.ok(PREFIX_CARDS.length >= 10);
  for (const card of PREFIX_CARDS) {
    assert.ok(card.prefix && card.meaning && card.note);
    assert.ok(card.examples.length + (card.extraExamples?.length || 0) >= 1);
    card.examples.forEach(german => assertKnown(german, card.prefix));
    for (const example of card.extraExamples || []) {
      assert.ok(example.german && example.korean && example.english, `${card.prefix} extra example is incomplete`);
    }
  }
  assert.ok(PREFIX_CARDS.find(card => card.prefix === 'aus-').extraExamples.some(item => item.german === 'auskommen'));
  assert.ok(PREFIX_CARDS.find(card => card.prefix === 'be-').examples.includes('bekommen'));
});
