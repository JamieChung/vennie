import fs from 'fs';
import os from 'os';
import path from 'path';
import { searchVault, rebuildIndex } from '../../src/core/search';

interface SearchResult {
  file: string;
  snippet: string;
  score: number;
}

// ── Vault fixture ──────────────────────────────────────────────────────────

let VAULT: string;

beforeAll(async () => {
  VAULT = fs.mkdtempSync(path.join(os.tmpdir(), 'vennie-search-vault-'));

  fs.writeFileSync(path.join(VAULT, 'roadmap.md'), [
    '# Q2 Roadmap',
    'We will ship the authentication migration in Q2.',
    'The payment flow redesign is the top priority.',
    'Team velocity has improved after the retrospective.',
  ].join('\n'));

  fs.writeFileSync(path.join(VAULT, 'notes.md'), [
    '# Meeting Notes',
    'Discussed the authentication system with Jane.',
    'Action item: review the security audit findings.',
  ].join('\n'));

  await rebuildIndex(VAULT);
});

afterAll(() => {
  fs.rmSync(VAULT, { recursive: true, force: true });
});

// ── searchVault ────────────────────────────────────────────────────────────

describe('searchVault', () => {
  test('returns results for a keyword present in the vault', async () => {
    const results: SearchResult[] = await searchVault(VAULT, 'authentication');
    expect(results.length).toBeGreaterThan(0);
    const files = results.map(r => path.basename(r.file));
    expect(files.some(f => ['roadmap.md', 'notes.md'].includes(f))).toBe(true);
  });

  test('returns top result for a distinctive term', async () => {
    const results: SearchResult[] = await searchVault(VAULT, 'payment flow redesign');
    expect(results.length).toBeGreaterThan(0);
    expect(path.basename(results[0].file)).toBe('roadmap.md');
  });

  test('returns empty array for a query with no matches', async () => {
    const results: SearchResult[] = await searchVault(VAULT, 'xyzzy-nonexistent-term-123');
    expect(results).toEqual([]);
  });

  test('result objects have file, snippet, and score properties', async () => {
    const results: SearchResult[] = await searchVault(VAULT, 'roadmap');
    if (results.length > 0) {
      expect(results[0]).toHaveProperty('file');
      expect(results[0]).toHaveProperty('snippet');
      expect(results[0]).toHaveProperty('score');
    }
  });

  test('scores are positive numbers', async () => {
    const results: SearchResult[] = await searchVault(VAULT, 'authentication');
    for (const r of results) {
      expect(r.score).toBeGreaterThan(0);
    }
  });

  test('handles empty vault gracefully', async () => {
    const emptyVault = fs.mkdtempSync(path.join(os.tmpdir(), 'vennie-empty-vault-'));
    try {
      const results: SearchResult[] = await searchVault(emptyVault, 'anything');
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    } finally {
      fs.rmSync(emptyVault, { recursive: true, force: true });
    }
  });
});

// ── rebuildIndex ───────────────────────────────────────────────────────────

describe('rebuildIndex', () => {
  test('creates a search index file in .vennie/', async () => {
    const indexPath = path.join(VAULT, '.vennie', 'search-index.json');
    await rebuildIndex(VAULT);
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  test('index file is valid JSON', async () => {
    await rebuildIndex(VAULT);
    const raw = fs.readFileSync(path.join(VAULT, '.vennie', 'search-index.json'), 'utf8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});
