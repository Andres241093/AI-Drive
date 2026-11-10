import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSearchContext } from '../vector-store.js';

test('buildSearchContext formats OpenAI vector store search results with source names', () => {
  const context = buildSearchContext([
    {
      filename: 'stored-document.pdf',
      attributes: { original_name: 'manual.pdf' },
      content: [
        { type: 'text', text: 'Primer fragmento.' },
        { type: 'image', text: '' },
      ],
    },
    {
      filename: 'notes.md',
      attributes: null,
      content: [{ type: 'text', text: 'Segundo fragmento.' }],
    },
  ]);

  assert.equal(
    context,
    '--- Fragmento de manual.pdf ---\nPrimer fragmento.\n\n--- Fragmento de notes.md ---\nSegundo fragmento.',
  );
});

test('buildSearchContext returns empty text when no textual results are found', () => {
  assert.equal(buildSearchContext([]), '');
  assert.equal(buildSearchContext([{
    filename: 'empty.txt',
    content: [{ type: 'text', text: '  ' }],
  }]), '');
});
