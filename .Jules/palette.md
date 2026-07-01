## 2024-06-25 - Password Toggle Accessibility
**Learning:** Form helper buttons like password toggles are easily overlooked for accessibility, leaving screen readers confused. Removing `tabIndex={-1}` enables critical keyboard navigation, while `aria-label` provides the required context.
**Action:** When creating interactable components, consider keyboard-only and screen reader navigation from the start. Never use `tabIndex={-1}` on controls that are essential form helpers, and always provide an `aria-label` for icon-only buttons.
