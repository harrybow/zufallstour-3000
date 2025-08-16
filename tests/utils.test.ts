import { describe, it, expect } from 'vitest';
import { googleMapsUrl, pickThreeUnvisited, rollAllowed, makeDataUrl, stationLabel } from '../src/App';
import { formatDate } from '../src/formatDate.js';

describe('utility functions', () => {
  it('formats ISO dates in de-DE format', () => {
    expect(formatDate('2025-08-09')).toBe('09.08.2025');
    expect(formatDate('')).toBe('');
    expect(formatDate('1999-12-31')).toBe('31.12.1999');
  });

  it('builds Google Maps URLs containing encoded station names', () => {
    const g1 = googleMapsUrl('Alexanderplatz');
    expect(typeof g1).toBe('string');
    expect(g1).toContain('Alexanderplatz');

    const g2 = googleMapsUrl('Frankfurter Allee');
    expect(g2).toContain('Frankfurter%20Allee');

    const g3 = googleMapsUrl('R+S+U Berlin Hbf');
    expect(g3).toContain('S%2BU%20Berlin%20Hbf');
    expect(g3).not.toContain('R%');
  });

  it('prefixes station names with their types', () => {
    expect(stationLabel({ name: 'Ullsteinstraße', types: ['U'] })).toBe('U Ullsteinstraße');
    expect(stationLabel({ name: 'Alexanderplatz', types: ['S', 'U'] })).toBe('S+U Alexanderplatz');
  });

  it('picks up to three unique unvisited stations', () => {
    const demo = [
      { id: 'a', name: 'A', types: ['S'], visits: [] },
      { id: 'b', name: 'B', types: ['U'], visits: [] },
      { id: 'c', name: 'C', types: ['R'], visits: [{ date: '2024-01-01' }] },
      { id: 'd', name: 'D', types: ['S', 'U'], visits: [] },
    ];
    const picked = pickThreeUnvisited(demo);
    expect(picked.length >= 1 && picked.length <= 3).toBe(true);
    expect(picked).not.toContain('c');
    expect(new Set(picked).size).toBe(picked.length);
  });

  it('respects roll cooldown', () => {
    const now = Date.now();
    expect(rollAllowed(0, now)).toBe(true);
    expect(rollAllowed(now - 21000, now)).toBe(true);
    expect(rollAllowed(now - 5000, now)).toBe(false);
  });

  it('creates object URLs for data', () => {
    expect(typeof makeDataUrl('{}')).toBe('string');
  });

  it('returns empty array when all stations were visited', () => {
    const res = pickThreeUnvisited([
      { id: 'x', name: 'X', types: ['S'], visits: [{ date: '2020-01-01' }] },
    ]);
    expect(res.length).toBe(0);
  });
});

