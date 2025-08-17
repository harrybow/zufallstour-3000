import { describe, it, expect } from 'vitest';
import { extractUsername } from '../src/profile.tsx';

describe('extractUsername', () => {
  it('prefers query parameter when present', () => {
    expect(extractUsername('?user=bob', '/profil/ignored')).toBe('bob');
  });

  it('extracts username from /profil/ path', () => {
    expect(extractUsername('', '/profil/bob')).toBe('bob');
  });

  it('handles trailing slash in path', () => {
    expect(extractUsername('', '/profil/alice/')).toBe('alice');
  });

  it('supports /profile/ path as well', () => {
    expect(extractUsername('', '/profile/charlie')).toBe('charlie');
  });

  it('returns empty string when no username found', () => {
    expect(extractUsername('', '/profile')).toBe('');
  });
});
