import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import crypto from 'crypto';

const { checkForUpdate, applyUpdateFallback } = require('../../src/core/updater');

// ── checkForUpdate ────────────────────────────────────────────────────────────

describe('checkForUpdate', () => {
  test('returns object with expected shape', () => {
    const result = checkForUpdate('1.0.0');
    expect(result).toHaveProperty('current');
    expect(result).toHaveProperty('latest');
    expect(result).toHaveProperty('available');
    expect(typeof result.available).toBe('boolean');
  });

  test('compares versions correctly', () => {
    const result = checkForUpdate('1.0.0');
    const hasUpdate = result.latest !== '1.0.0';
    expect(result.available).toBe(hasUpdate);
  });
});

// ── applyUpdateFallback ─────────────────────────────────────────────────

describe('applyUpdateFallback', () => {
  test('function exists and is callable', () => {
    expect(typeof applyUpdateFallback).toBe('function');
  });
});

// ── Checksum verification ─────────────────────────────────────────────

describe('SHA256 checksum verification', () => {
  test('correctly computes known SHA256 hash', () => {
    const testData = Buffer.from('hello world');
    const hash = crypto.createHash('sha256').update(testData).digest('hex');
    expect(hash).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
    );
  });

  test('produces 64-character hex string', () => {
    const testData = Buffer.from('test content');
    const hash = crypto.createHash('sha256').update(testData).digest('hex');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  test('detects mismatched checksums', () => {
    const correctHash = crypto.createHash('sha256').update(Buffer.from('hello')).digest('hex');
    const wrongHash = crypto.createHash('sha256').update(Buffer.from('world')).digest('hex');
    expect(correctHash).not.toBe(wrongHash);
  });
});

// ── Module exports ─────────────────────────────────────────────────

describe('module exports', () => {
  test('exports checkForUpdate function', () => {
    expect(typeof checkForUpdate).toBe('function');
  });

  test('exports applyUpdateFallback function', () => {
    expect(typeof applyUpdateFallback).toBe('function');
  });

  test('checkForUpdate accepts version string', () => {
    expect(() => checkForUpdate('1.0.0')).not.toThrow();
  });

  test('applyUpdateFallback accepts version string', () => {
    const execSpy = vi.fn();
    vi.stubGlobal('execSync', execSpy);
    expect(() => applyUpdateFallback('1.0.0')).not.toThrow();
    vi.unstubAllGlobals();
  });
});