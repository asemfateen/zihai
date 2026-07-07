## 2026-06-14 - Added Missing ARIA Labels to Navbar
**Learning:** The `Navbar` component contained multiple icon-only buttons (Profile, Settings, Logout, Theme toggle) that lacked `aria-label` attributes, making them inaccessible to screen readers. Interactive toggles (like the mobile menu) also lacked `aria-expanded` state indicators.
**Action:** Always ensure that any button whose primary content is an icon (without visible text) receives a descriptive `aria-label`. Interactive dropdown/menu toggles should utilize `aria-expanded` to dynamically communicate their open/closed state to assistive technologies.

## 2026-07-07 - Improved Keyboard Accessibility for Password Visibility Toggles
**Learning:** Icon-only buttons used for functional toggles (e.g., showing/hiding passwords) should never have `tabIndex={-1}` as it completely blocks keyboard navigation. They also require explicit `aria-label` attributes to be accessible to screen reader users since they don't contain textual content.
**Action:** When creating form inputs with appended action buttons, verify they are reachable by `Tab` and include descriptive ARIA labels explaining their action to assistive technologies.
