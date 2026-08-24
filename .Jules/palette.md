## 2026-06-14 - Added Missing ARIA Labels to Navbar
**Learning:** The `Navbar` component contained multiple icon-only buttons (Profile, Settings, Logout, Theme toggle) that lacked `aria-label` attributes, making them inaccessible to screen readers. Interactive toggles (like the mobile menu) also lacked `aria-expanded` state indicators.
**Action:** Always ensure that any button whose primary content is an icon (without visible text) receives a descriptive `aria-label`. Interactive dropdown/menu toggles should utilize `aria-expanded` to dynamically communicate their open/closed state to assistive technologies.

## 2026-06-15 - Improved Accessibility for Icon-only Navigation Docks
**Learning:** Icon-only navigation buttons with visual tooltips can cause double-reading for screen readers or no reading at all if not properly marked up. The tooltip text might be read along with missing button labels.
**Action:** Add `aria-label` to the button itself for screen reader context, use `aria-hidden="true"` on the visual tooltip span to prevent redundant reading, and use `aria-current="page"` to indicate active navigation states.
