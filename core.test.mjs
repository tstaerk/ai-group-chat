import test from 'node:test';
import assert from 'node:assert/strict';
import { chunks, shouldReply, responseText } from './core.mjs';
test('Discord chunks preserve Unicode and stay within the limit', () => {
  const text = 'a'.repeat(1899) + '😀'.repeat(1000);
  const parts = chunks(text);
  assert.equal(parts.join(''), text);
  assert.ok(parts.every(x => x.length <= 1900 && !/[\uD800-\uDBFF]$/.test(x)));
});
test('Only mentions/replies trigger default mode and bots never trigger', () => {
  const m = { author: { bot: false }, mentions: { users: new Set(), repliedUser: null } };
  assert.equal(shouldReply(m, '1', 'mention'), false);
  m.mentions.repliedUser = { id: '1' };
  assert.equal(shouldReply(m, '1', 'mention'), true);
  m.author.bot = true;
  assert.equal(shouldReply(m, '1', 'always'), false);
});
test('Gemini extraction ignores thinking and handles blocked responses', () => {
  assert.equal(responseText({ candidates: [{ content: { parts: [{ thought: true, text: 'Hidden' }, { text: 'Hello' }] } }] }), 'Hello');
  assert.equal(responseText({ promptFeedback: { blockReason: 'SAFETY' } }), '');
});
