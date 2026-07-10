import { db } from '../db.js'

function cleanDefinition(def) {
  if (!def) return '';
  let cleaned = def.replace(/CL:[^;/]+[;/]?/g, '').trim();
  const parts = cleaned.split(/[;/]/).map(p => p.trim()).filter(p => p.length > 0);
  return parts.slice(0, 2).join(', ');
}

console.log("Adding short_definition column to cedict_words and characters...");
try {
  db.prepare("ALTER TABLE cedict_words ADD COLUMN short_definition TEXT").run();
  console.log("Added short_definition to cedict_words");
} catch(e) {
  if (!e.message.includes("duplicate column")) {
    console.error(e);
  }
}

try {
  db.prepare("ALTER TABLE characters ADD COLUMN short_definition TEXT").run();
  console.log("Added short_definition to characters");
} catch(e) {
  if (!e.message.includes("duplicate column")) {
    console.error(e);
  }
}

console.log("Populating short_definition in cedict_words...");
const words = db.prepare("SELECT id, definition FROM cedict_words WHERE short_definition IS NULL").all();
const updateWord = db.prepare("UPDATE cedict_words SET short_definition = ? WHERE id = ?");
db.transaction(() => {
  for (const w of words) {
    updateWord.run(cleanDefinition(w.definition), w.id);
  }
})();

console.log("Populating short_definition in characters...");
const chars = db.prepare("SELECT id, definition FROM characters WHERE short_definition IS NULL").all();
const updateChar = db.prepare("UPDATE characters SET short_definition = ? WHERE id = ?");
db.transaction(() => {
  for (const c of chars) {
    updateChar.run(cleanDefinition(c.definition), c.id);
  }
})();

console.log("Done! Definitions parsed and saved to database.");
