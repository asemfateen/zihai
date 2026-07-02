## 2026-07-02 - Added accessible aria-labels to icon-only buttons
**Learning:** Found multiple icon-only buttons missing aria-labels making them inaccessible to screen readers. React testing library may surface this issue during manual interaction tests.
**Action:** Always verify that icon-only buttons have an aria-label or accessible text to make sure the app meets basic accessibility standards.
