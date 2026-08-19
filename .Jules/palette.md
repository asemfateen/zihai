## 2026-06-14 - Added Missing ARIA Labels to Navbar
**Learning:** The `Navbar` component contained multiple icon-only buttons (Profile, Settings, Logout, Theme toggle) that lacked `aria-label` attributes, making them inaccessible to screen readers. Interactive toggles (like the mobile menu) also lacked `aria-expanded` state indicators.
**Action:** Always ensure that any button whose primary content is an icon (without visible text) receives a descriptive `aria-label`. Interactive dropdown/menu toggles should utilize `aria-expanded` to dynamically communicate their open/closed state to assistive technologies.
## 2026-08-19 - Password Toggle Accessibility
**Learning:** Using `tabIndex={-1}` on password visibility toggles is a common oversight that prevents keyboard navigation, and lacking `aria-label` makes them invisible to screen readers.
**Action:** Always ensure interactive elements are keyboard-accessible (no `tabIndex={-1}` unless intentionally skipping) and use state-dependent `aria-label`, `aria-pressed`, and `title` for icon-only buttons.
