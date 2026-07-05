## 2026-07-05 - Added ARIA labels to icon-only buttons
**Learning:** Icon-only buttons lacking ARIA labels negatively impact screen reader accessibility. Adding contextual `aria-label` attributes to elements like theme toggles, profile navigation, and interactive component buttons significantly improves UX for assistive technologies.
**Action:** When implementing new icon-only interactive elements, ensure an `aria-label` attribute is included by default.
