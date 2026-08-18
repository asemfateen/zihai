## 2026-06-14 - Added Missing ARIA Labels to Navbar
**Learning:** The `Navbar` component contained multiple icon-only buttons (Profile, Settings, Logout, Theme toggle) that lacked `aria-label` attributes, making them inaccessible to screen readers. Interactive toggles (like the mobile menu) also lacked `aria-expanded` state indicators.
**Action:** Always ensure that any button whose primary content is an icon (without visible text) receives a descriptive `aria-label`. Interactive dropdown/menu toggles should utilize `aria-expanded` to dynamically communicate their open/closed state to assistive technologies.
## 2024-05-18 - Password Visibility Toggle Accessibility
**Learning:** Adding `tabIndex={-1}` to password visibility toggles is a common anti-pattern that removes critical functionality from keyboard and screen reader users. These elements need to be in the tab order, have clear `aria-label`s, and `aria-pressed` state to be accessible.
**Action:** When implementing or reviewing password inputs, ensure the visibility toggles are fully interactive with a keyboard, have distinct focus rings, and provide clear ARIA labels (e.g., "Show password", "Hide password") and state.
