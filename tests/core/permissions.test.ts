import fs from 'fs';
import os from 'os';
import path from 'path';
import { getToolTier } from '../../src/core/agent';
import {
  loadPreferences,
  savePreferences,
  buildPermissionDescription,
  createPermissionChecker,
} from '../../src/core/permissions';

// ── Tool permission tiers ──────────────────────────────────────────────────

describe('getToolTier', () => {
  test('Read is auto', () => expect(getToolTier('Read')).toBe('auto'));
  test('Glob is auto', () => expect(getToolTier('Glob')).toBe('auto'));
  test('Grep is auto', () => expect(getToolTier('Grep')).toBe('auto'));
  test('WebFetch is auto', () => expect(getToolTier('WebFetch')).toBe('auto'));
  test('Write requires confirm', () => expect(getToolTier('Write')).toBe('confirm'));
  test('Edit requires confirm', () => expect(getToolTier('Edit')).toBe('confirm'));
  test('Bash requires approve', () => expect(getToolTier('Bash')).toBe('approve'));
  test('unknown MCP tool defaults to confirm', () => expect(getToolTier('mcp__x__y')).toBe('confirm'));
  test('unknown tool defaults to confirm', () => expect(getToolTier('SomeUnknownTool')).toBe('confirm'));
});

// ── loadPreferences / savePreferences ──────────────────────────────────────

describe('loadPreferences', () => {
  let tmpVault: string;

  beforeEach(() => {
    tmpVault = fs.mkdtempSync(path.join(os.tmpdir(), 'vennie-perms-'));
  });

  afterEach(() => {
    fs.rmSync(tmpVault, { recursive: true, force: true });
  });

  test('returns empty preferences when no file exists', () => {
    const prefs = loadPreferences(tmpVault);
    expect(prefs).toEqual({ alwaysAllow: {}, alwaysDeny: {} });
  });

  test('round-trips saved preferences', () => {
    const prefs = { alwaysAllow: { Write: true }, alwaysDeny: { Bash: true } };
    savePreferences(tmpVault, prefs);
    expect(loadPreferences(tmpVault)).toEqual(prefs);
  });

  test('creates .vennie directory when saving', () => {
    savePreferences(tmpVault, { alwaysAllow: {}, alwaysDeny: {} });
    expect(fs.existsSync(path.join(tmpVault, '.vennie', 'permissions.json'))).toBe(true);
  });
});

// ── buildPermissionDescription ─────────────────────────────────────────────

describe('buildPermissionDescription', () => {
  test('describes a Write operation with filename', () => {
    const desc = buildPermissionDescription('Write', { file_path: '/vault/notes/todo.md', content: 'hi' });
    expect(desc).toContain('todo.md');
  });

  test('describes an Edit operation with truncated old_string', () => {
    const desc = buildPermissionDescription('Edit', { file_path: 'notes.md', old_string: 'old text here', new_string: 'new' });
    expect(desc).toContain('notes.md');
    expect(desc).toContain('old text here');
  });

  test('describes a Bash operation with truncated command', () => {
    const desc = buildPermissionDescription('Bash', { command: 'git status' });
    expect(desc).toContain('git status');
  });

  test('describes MCP tools by server and action', () => {
    const desc = buildPermissionDescription('mcp__work__create_task', {});
    expect(desc).toContain('work');
    expect(desc).toContain('create_task');
  });

  test('falls back to tool name for unrecognised tools', () => {
    const desc = buildPermissionDescription('SomeTool', {});
    expect(desc).toBe('SomeTool');
  });
});

// ── createPermissionChecker ────────────────────────────────────────────────

describe('createPermissionChecker', () => {
  let tmpVault: string;

  beforeEach(() => {
    tmpVault = fs.mkdtempSync(path.join(os.tmpdir(), 'vennie-checker-'));
  });

  afterEach(() => {
    fs.rmSync(tmpVault, { recursive: true, force: true });
  });

  test('auto-tier tools are always allowed without prompting', async () => {
    const prompt = vi.fn();
    const check = createPermissionChecker(tmpVault, prompt);
    const allowed = await check('Read', { file_path: 'note.md' }, 'auto');
    expect(allowed).toBe(true);
    expect(prompt).not.toHaveBeenCalled();
  });

  test('confirm-tier tool prompts the user', async () => {
    const prompt = vi.fn().mockResolvedValue('yes');
    const check = createPermissionChecker(tmpVault, prompt);
    const allowed = await check('Write', {}, 'confirm');
    expect(allowed).toBe(true);
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  test('"always" response persists across calls without re-prompting', async () => {
    const prompt = vi.fn().mockResolvedValueOnce('always');
    const check = createPermissionChecker(tmpVault, prompt);
    await check('Write', {}, 'confirm');
    const second = await check('Write', {}, 'confirm');
    expect(second).toBe(true);
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  test('"no" response denies for the call', async () => {
    const prompt = vi.fn().mockResolvedValue('no');
    const check = createPermissionChecker(tmpVault, prompt);
    const allowed = await check('Bash', { command: 'rm -rf /' }, 'approve');
    expect(allowed).toBe(false);
  });

  test('"never" response persists as deny', async () => {
    const prompt = vi.fn().mockResolvedValueOnce('never');
    const check = createPermissionChecker(tmpVault, prompt);
    await check('Bash', {}, 'approve');
    const second = await check('Bash', {}, 'approve');
    expect(second).toBe(false);
    expect(prompt).toHaveBeenCalledTimes(1);
  });
});
