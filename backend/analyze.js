// Temporary file to hold the new endpoint code
app.post('/api/analyze', apiLimiter, (req, res) => {
  const text = req.body.text || '';
  if (typeof text !== 'string') return res.status(400).json({ error: 'Text must be a string' });
  if (text.length > 2000) return res.status(400).json({ error: 'Text too long (max 2000 characters)' });
  if (!text.trim()) return res.json({ tokens: [] });

  try {
    const tokens = [];
    const maxLen = 6;
    let i = 0;

    const getWord = db.prepare(`
      SELECT id, simplified, pinyin, definition, hsk_level, 'word' as type
      FROM cedict_words WHERE simplified = ?
      UNION ALL
      SELECT id, simplified, pinyin, definition, hsk_level, 'char' as type
      FROM characters WHERE simplified = ?
      ORDER BY (CASE WHEN type = 'word' THEN 0 ELSE 1 END) ASC, (CASE WHEN hsk_level > 0 THEN 0 ELSE 1 END) ASC, hsk_level ASC
      LIMIT 1
    `);

    while (i < text.length) {
      let matched = false;
      for (let len = maxLen; len > 0; len--) {
        if (i + len > text.length) continue;
        const substr = text.substring(i, i + len);
        
        // Skip DB lookup for multi-char non-Chinese strings (speed optimization)
        if (len > 1 && !/[\\u4e00-\\u9fa5]/.test(substr)) continue;

        const row = getWord.get(substr, substr);
        if (row) {
          tokens.push({
            text: substr,
            isChinese: true,
            id: row.id,
            type: row.type,
            pinyin: row.pinyin,
            definition: resolveDefinition(row.definition),
            hsk_level: row.hsk_level
          });
          i += len;
          matched = true;
          break;
        }
      }

      if (!matched) {
        const char = text[i];
        const isChinese = /[\\u4e00-\\u9fa5]/.test(char);
        
        // Combine consecutive non-Chinese characters into single tokens
        if (!isChinese && tokens.length > 0 && !tokens[tokens.length - 1].isChinese) {
          tokens[tokens.length - 1].text += char;
        } else {
          tokens.push({
            text: char,
            isChinese,
            id: null,
            pinyin: null,
            definition: null,
            hsk_level: null
          });
        }
        i++;
      }
    }
    
    res.json({ tokens });
  } catch (err) {
    console.error('Analyzer error:', err);
    res.status(500).json({ error: 'Failed to analyze text' });
  }
});
