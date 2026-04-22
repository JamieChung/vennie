vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  BrowserWindow: vi.fn(),
  dialog: { showOpenDialog: vi.fn() },
}));

import { validateCommitHash } from '../../src/desktop/main/ipc';

// ── validateCommitHash ─────────────────────────────────────────────────────

describe('validateCommitHash', () => {
  test('accepts a valid 40-character lowercase hex hash', () => {
    expect(validateCommitHash('a'.repeat(40))).toBe(true);
  });

  test('accepts a valid 40-character uppercase hex hash', () => {
    expect(validateCommitHash('A'.repeat(40))).toBe(true);
  });

  test('accepts a realistic mixed-case git hash', () => {
    expect(validateCommitHash('3448124fa2a580788a7556427a36c8205122a1b2')).toBe(true);
  });

  test('rejects hash shorter than 40 characters', () => {
    expect(validateCommitHash('abc123')).toBe(false);
    expect(validateCommitHash('a'.repeat(39))).toBe(false);
  });

  test('rejects hash longer than 40 characters', () => {
    expect(validateCommitHash('a'.repeat(41))).toBe(false);
  });

  test('rejects shell metacharacters — semicolon injection', () => {
    expect(validateCommitHash('abc; rm -rf /')).toBe(false);
  });

  test('rejects shell metacharacters — pipe injection', () => {
    expect(validateCommitHash('abc | cat /etc/passwd')).toBe(false);
  });

  test('rejects shell metacharacters — backtick injection', () => {
    expect(validateCommitHash('`id`' + 'a'.repeat(36))).toBe(false);
  });

  test('rejects shell metacharacters — dollar sign substitution', () => {
    expect(validateCommitHash('$(id)' + 'a'.repeat(35))).toBe(false);
  });

  test('rejects empty string', () => {
    expect(validateCommitHash('')).toBe(false);
  });

  test('rejects null', () => {
    expect(validateCommitHash(null as unknown as string)).toBe(false);
  });

  test('rejects undefined', () => {
    expect(validateCommitHash(undefined as unknown as string)).toBe(false);
  });

  test('rejects non-hex characters', () => {
    expect(validateCommitHash('g'.repeat(40))).toBe(false);
    expect(validateCommitHash('z'.repeat(40))).toBe(false);
  });

  test('rejects strings with spaces', () => {
    expect(validateCommitHash('a'.repeat(20) + ' ' + 'a'.repeat(19))).toBe(false);
  });

  test('rejects path traversal attempt', () => {
    expect(validateCommitHash('../../../etc/passwd' + 'a'.repeat(21))).toBe(false);
  });
});
