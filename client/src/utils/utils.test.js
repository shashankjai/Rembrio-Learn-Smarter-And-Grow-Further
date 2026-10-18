import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, validateRegister, validateLogin, validatePdfFile } from './validators.js';
import { formatBytes, firstName, isOverdue, dateInputToIso } from './format.js';
import { parseBlocks, parseInline } from './richText.js';

describe('validators', () => {
  it('validates emails', () => {
    expect(validateEmail('')).toMatch(/required/);
    expect(validateEmail('nope')).toMatch(/valid/);
    expect(validateEmail('ada@example.com')).toBe('');
  });

  it('mirrors the server password rules', () => {
    expect(validatePassword('short1')).toMatch(/8 characters/);
    expect(validatePassword('onlyletters')).toMatch(/letter and one number/);
    expect(validatePassword('12345678')).toMatch(/letter and one number/);
    expect(validatePassword('GoodPass123')).toBe('');
  });

  it('validates the registration form as a whole', () => {
    expect(validateRegister({ name: 'Ada', email: 'ada@example.com', password: 'GoodPass123', confirmPassword: 'GoodPass123' })).toEqual({});
    const errors = validateRegister({ name: '', email: 'x', password: 'abc', confirmPassword: 'abd' });
    expect(Object.keys(errors).sort()).toEqual(['confirmPassword', 'email', 'name', 'password']);
    expect(validateRegister({ name: 'Ada', email: 'a@b.co', password: 'GoodPass123', confirmPassword: 'Different1' }).confirmPassword).toMatch(/match/);
  });

  it('validates login', () => {
    expect(validateLogin({ email: 'a@b.co', password: 'x' })).toEqual({});
    expect(Object.keys(validateLogin({ email: '', password: '' }))).toEqual(['email', 'password']);
  });

  it('validates PDF uploads', () => {
    expect(validatePdfFile(null)).toBeTruthy();
    expect(validatePdfFile({ name: 'a.txt', type: 'text/plain', size: 10 })).toMatch(/PDF/);
    expect(validatePdfFile({ name: 'a.pdf', type: 'application/pdf', size: 0 })).toMatch(/empty/);
    expect(validatePdfFile({ name: 'a.pdf', type: 'application/pdf', size: 50 * 1024 * 1024 })).toMatch(/too large/);
    expect(validatePdfFile({ name: 'a.pdf', type: 'application/pdf', size: 1024 })).toBe('');
  });
});

describe('format helpers', () => {
  it('formats sizes and names', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(firstName('Ada Lovelace')).toBe('Ada');
    expect(firstName('')).toBe('there');
  });

  it('detects overdue tasks', () => {
    const yesterday = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
    const tomorrow = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
    expect(isOverdue(yesterday, false)).toBe(true);
    expect(isOverdue(yesterday, true)).toBe(false);
    expect(isOverdue(tomorrow, false)).toBe(false);
    expect(isOverdue(undefined, false)).toBe(false);
  });

  it('converts date inputs', () => {
    expect(dateInputToIso('')).toBeUndefined();
    expect(typeof dateInputToIso('2026-05-01')).toBe('string');
  });
});

describe('rich text parsing', () => {
  it('parses inline emphasis without producing HTML', () => {
    expect(parseInline('a **b** `c` *d*')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'bold', value: 'b' },
      { type: 'text', value: ' ' },
      { type: 'code', value: 'c' },
      { type: 'text', value: ' ' },
      { type: 'italic', value: 'd' },
    ]);
    const evil = parseInline('<img src=x onerror=alert(1)>');
    expect(evil).toEqual([{ type: 'text', value: '<img src=x onerror=alert(1)>' }]); // stays text, rendered escaped by React
  });

  it('builds paragraphs and lists', () => {
    const blocks = parseBlocks('Intro line\ncontinues here\n\n- one\n- two\n\n1. first\n2. second');
    expect(blocks.map((b) => b.type)).toEqual(['p', 'ul', 'ol']);
    expect(blocks[1].items).toHaveLength(2);
    expect(blocks[2].items).toHaveLength(2);
  });
});
