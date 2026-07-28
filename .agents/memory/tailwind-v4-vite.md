---
name: Tailwind v4 + Vite setup
description: How to correctly configure Tailwind CSS v4 with Vite and @tailwindcss/postcss in this project
---

## Rule
Tailwind v4 no longer uses `@tailwind base/components/utilities` or a JS-only `tailwind.config.js` for tokens. Use the CSS-first approach.

**postcss.config.js:**
```js
export default { plugins: { '@tailwindcss/postcss': {}, autoprefixer: {} } };
```

**index.css:**
```css
@import "tailwindcss";
@theme {
  --color-navy: #0A2947;
  --color-cream: #F3E4C9;
  /* etc. */
  --font-heading: "Space Grotesk", ...;
}
@layer utilities {
  .font-heading { font-family: var(--font-heading); }
}
```

**Why:** v4 moved PostCSS plugin to `@tailwindcss/postcss`. The old `tailwindcss` key in postcss config throws "moved to a separate package" error. `@apply` with custom theme utilities also fails unless they're declared in `@layer utilities`.

**How to apply:** Any time Tailwind is set up in this project, use this pattern. `tailwind.config.js` is only needed for `content` glob in v4; theme goes in CSS.
