import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, db } from '../server.js'; // Ensure app and db are exported from server.js

// We'll mock the database prepare and get methods directly using vitest.
import { vi } from 'vitest';

describe('GET /api/word/:query', () => {
  it('should return a word when found by simplified character', async () => {
    // We will set up mock database responses
    const mockWord = {
      id: 1,
      character: '我',
      traditional: '我',
      pinyin: 'wo3',
      pinyin_display: 'wo3',
      pinyin_flat: 'wo',
      english_definition: 'I; me',
      hsk_level: 1
    };

    // Spy on db.prepare to intercept calls
    const prepareSpy = vi.spyOn(db, 'prepare').mockImplementation((sql) => {
      return {
        get: () => {
          if (sql.includes('cedict_words')) {
            return mockWord;
          }
          return null;
        }
      };
    });

    const res = await request(app).get('/api/word/我');

    expect(res.status).toBe(200);
    expect(res.body.character).toBe('我');
    expect(res.body.english_definition).toBe('I; me');

    prepareSpy.mockRestore();
  });

  it('should return 404 when word is not found', async () => {
    const prepareSpy = vi.spyOn(db, 'prepare').mockImplementation(() => {
      return {
        get: () => null
      };
    });

    const res = await request(app).get('/api/word/notaword');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Word not found' });

    prepareSpy.mockRestore();
  });

  it('should return 500 on database error', async () => {
    const prepareSpy = vi.spyOn(db, 'prepare').mockImplementation(() => {
      throw new Error('Test database error');
    });

    const res = await request(app).get('/api/word/errorword');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Database error' });

    prepareSpy.mockRestore();
  });
});
