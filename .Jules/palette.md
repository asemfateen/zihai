## 2026-06-23 - Accessible Password Toggles
**Learning:** Found that custom password toggle buttons often disable keyboard focus (`tabIndex={-1}`) by default in some boilerplates, making password visibility completely inaccessible to keyboard and screen reader users.
**Action:** When encountering custom input icons/toggles, always verify keyboard focusability, add dynamic `aria-label`s for screen readers, and implement clear `focus-visible` states.
