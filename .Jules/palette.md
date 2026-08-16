## 2026-06-14 - Added Missing ARIA Labels to Navbar
**Learning:** The `Navbar` component contained multiple icon-only buttons (Profile, Settings, Logout, Theme toggle) that lacked `aria-label` attributes, making them inaccessible to screen readers. Interactive toggles (like the mobile menu) also lacked `aria-expanded` state indicators.
**Action:** Always ensure that any button whose primary content is an icon (without visible text) receives a descriptive `aria-label`. Interactive dropdown/menu toggles should utilize `aria-expanded` to dynamically communicate their open/closed state to assistive technologies.
## 2024-05-18 - Floating Dock Accessibility Insight
**Learning:** Icon-only navigation bars or floating docks often lack ARIA labels because tooltips (e.g. on hover) are provided for desktop users. These tooltips do not translate to accessibility labels for screen readers unless explicitly tied with attributes like `aria-label`.
**Action:** When inspecting visually pleasing, icon-heavy UI components (like bottom navigation bars), immediately check for `aria-label` or `aria-labelledby` attributes to ensure they are screen-reader friendly.
