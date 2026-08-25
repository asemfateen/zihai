## 2024-05-18 - [Missing aria-labels on icon-only buttons]
**Learning:** Icon-only buttons often rely on `title` attributes, but screen readers might not always read `title` reliably. It's better to provide an explicit `aria-label` on icon-only buttons. I found a few buttons in `src/pages/WordPage.jsx` (Favorites, Add to Deck, Add to List, Listen to pronunciation) that have `title` but lack `aria-label`.
**Action:** Add explicit `aria-label` attributes to these icon-only buttons to improve screen reader accessibility.
