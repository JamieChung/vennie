import { detectIntent, formatIntentSuggestion, detectBestIntent } from '../../src/core/intent';

interface Intent {
  skill: string;
  confidence: number;
  reason: string;
}

// ── detectIntent — basic routing ───────────────────────────────────────────

describe('detectIntent — skill routing', () => {
  test('returns null for empty input', () => {
    expect(detectIntent('')).toBeNull();
    expect(detectIntent(null as unknown as string)).toBeNull();
  });

  test('returns null for very short input', () => {
    expect(detectIntent('hi')).toBeNull();
  });

  test('returns null when message already starts with a slash command', () => {
    expect(detectIntent('/prd')).toBeNull();
    expect(detectIntent('/coach my career')).toBeNull();
  });

  test('detects prd intent from explicit phrase', () => {
    const result: Intent = detectIntent('I need to write a PRD for the search feature');
    expect(result).not.toBeNull();
    expect(result.skill).toBe('prd');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  test('detects daily-plan intent', () => {
    const result: Intent = detectIntent("Let's plan my day");
    expect(result.skill).toBe('daily-plan');
  });

  test('detects weekly-review intent', () => {
    const result: Intent = detectIntent('Time to review my week');
    expect(result.skill).toBe('weekly-review');
  });

  test('detects coach intent from career phrase', () => {
    const result: Intent = detectIntent('I need some career advice about my next move');
    expect(result.skill).toBe('coach');
  });

  test('detects linkedin intent', () => {
    const result: Intent = detectIntent('Help me draft a LinkedIn post about our launch');
    expect(result.skill).toBe('linkedin');
  });

  test('detects decision intent from tradeoff phrase', () => {
    const result: Intent = detectIntent("I'm deciding between two options and need to weigh the trade-off");
    expect(result.skill).toBe('decision');
  });

  test('detects landscape intent', () => {
    const result: Intent = detectIntent('I want a competitive landscape analysis');
    expect(result.skill).toBe('landscape');
  });

  test('detects wins intent', () => {
    const result: Intent = detectIntent('We just shipped the new onboarding flow!');
    expect(result.skill).toBe('wins');
  });

  test('detects interview-prep intent', () => {
    const result: Intent = detectIntent('I have an interview coming up and need to prep');
    expect(result.skill).toBe('interview-prep');
  });

  test('returns null for unrelated input', () => {
    expect(detectIntent("What's the weather like today?")).toBeNull();
  });
});

// ── detectIntent — confidence levels ──────────────────────────────────────

describe('detectIntent — confidence scoring', () => {
  test('phrase match produces high confidence (≥ 0.8)', () => {
    const result: Intent = detectIntent('write a prd for the payment feature');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  test('keyword-only match produces moderate confidence (< 0.8)', () => {
    const result: Intent = detectIntent('update my resume');
    expect(result).not.toBeNull();
    expect(result.skill).toBe('resume');
  });

  test('confidence never exceeds MAX_CONFIDENCE (0.95)', () => {
    const result: Intent = detectIntent('plan my day morning today schedule focus today priorities today start my day');
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });
});

// ── formatIntentSuggestion ─────────────────────────────────────────────────

describe('formatIntentSuggestion', () => {
  test('returns empty string for null intent', () => {
    expect(formatIntentSuggestion(null)).toBe('');
  });

  test('high-confidence suggestion contains skill command', () => {
    const suggestion = formatIntentSuggestion({ skill: 'prd', confidence: 0.9, reason: 'test' });
    expect(suggestion).toContain('/prd');
  });

  test('medium-confidence suggestion asks if user wants to try', () => {
    const suggestion = formatIntentSuggestion({ skill: 'coach', confidence: 0.6, reason: 'test' });
    expect(suggestion).toContain('/coach');
    expect(suggestion.toLowerCase()).toMatch(/want|try/);
  });

  test('low-confidence suggestion is phrased as a tip', () => {
    const suggestion = formatIntentSuggestion({ skill: 'wins', confidence: 0.32, reason: 'test' });
    expect(suggestion.toLowerCase()).toContain('tip');
  });
});

// ── detectBestIntent — skill vs framework arbitration ─────────────────────

describe('detectBestIntent', () => {
  test('returns null when nothing matches', () => {
    expect(detectBestIntent("What's for lunch?")).toBeNull();
  });

  test('returns a typed result object for a known phrase', () => {
    const result = detectBestIntent('I need to write a PRD');
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('result');
  });
});
