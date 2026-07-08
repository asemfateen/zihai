## 2026-06-14 - Added Missing ARIA Labels to Navbar
**Learning:** The `Navbar` component contained multiple icon-only buttons (Profile, Settings, Logout, Theme toggle) that lacked `aria-label` attributes, making them inaccessible to screen readers. Interactive toggles (like the mobile menu) also lacked `aria-expanded` state indicators.
**Action:** Always ensure that any button whose primary content is an icon (without visible text) receives a descriptive `aria-label`. Interactive dropdown/menu toggles should utilize `aria-expanded` to dynamically communicate their open/closed state to assistive technologies.
## 2024-05-18 - Icon Button Accessibility
**Learning:** Icon-only buttons without `aria-label` or focus styles are widespread in standard components, often relying solely on `title` tags, which are insufficient for screen readers and keyboard navigation users.
**Action:** Always verify icon-only buttons have explicit `aria-label` attributes and implement explicit keyboard focus outlines (e.g. `focus-visible:ring-2`) to ensure full keyboard and screen reader accessibility without polluting mouse-click aesthetics.
