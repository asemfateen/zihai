## 2026-06-14 - Added Missing ARIA Labels to Navbar
**Learning:** The `Navbar` component contained multiple icon-only buttons (Profile, Settings, Logout, Theme toggle) that lacked `aria-label` attributes, making them inaccessible to screen readers. Interactive toggles (like the mobile menu) also lacked `aria-expanded` state indicators.
**Action:** Always ensure that any button whose primary content is an icon (without visible text) receives a descriptive `aria-label`. Interactive dropdown/menu toggles should utilize `aria-expanded` to dynamically communicate their open/closed state to assistive technologies.

## 2024-05-24 - Make password visibility toggles accessible
**Learning:** Setting `tabIndex={-1}` on interactive elements like password visibility toggle buttons completely removes them from the keyboard navigation flow, making them inaccessible to keyboard-only users. Furthermore, icon-only buttons need an `aria-label` so screen reader users understand their function and state.
**Action:** Always ensure interactive elements are keyboard-accessible (avoid `tabIndex={-1}` unless specifically managing focus in a complex widget) and provide descriptive, dynamic `aria-label`s for icon-only toggles.
