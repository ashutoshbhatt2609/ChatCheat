import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SCHEMA } from '../api/_lib/db';

const norm = (s: string) => s.replace(/--.*$/gm, '').replace(/\s+/g, '').toLowerCase();

describe('db/schema.sql', () => {
  it('matches the schema the app creates (api/_lib/db.ts)', () => {
    const file = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
    // Strip comments before splitting: a comment may contain ';'.
    const fromFile = file.replace(/--.*$/gm, '').split(';').map(norm).filter(Boolean);
    expect(fromFile).toEqual(SCHEMA.map(norm));
  });
});
