## 2024-06-24 - [Navbar Mobile Menu Accessibility]
**Learning:** Found that the main navigation bar's interactive icon-only elements (mobile menu hamburger and theme toggles) lacked descriptive labels for screen readers. Using titles alone is insufficient for robust accessibility.
**Action:** Always ensure that any icon-only `<button>` has a descriptive `aria-label`, and interactive toggles that reveal new UI sections use `aria-expanded` to communicate their state to assistive technologies.
