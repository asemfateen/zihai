## 2026-06-29 - ARIA labels for icon-only buttons
**Learning:** Icon-only buttons often use `title` for hover tooltips, but screen readers explicitly prefer or require `aria-label` for guaranteed accessibility. These can often just mirror the `title` attribute when appropriate.
**Action:** Always add `aria-label` alongside `title` on icon-only interactive elements (like the favorite heart, deck flashcard, etc.).
