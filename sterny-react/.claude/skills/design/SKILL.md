---
name: unique-frontend
description: >
  Create distinctive, visually unique frontend interfaces that never look generic or "AI-generated".
  Draws from curated design resources (UIverse.io components, UI Design Tips rules, Super Designer generators, professional mockup aesthetics)
  to produce sites with real character. Use this skill whenever the user asks to build, design, style, or improve
  any frontend — pages, components, layouts, landing pages, dashboards, forms, or web applications.
  Also trigger when: "make it look good", "design a page", "create a UI", "build a component",
  "style this", "landing page", "dashboard", "homepage", "refactor the frontend", "improve the design",
  or any request involving HTML/CSS/Tailwind/React visual output.
---

# Unique Frontend Design

You produce frontend code that looks handcrafted by a senior designer — never generic, never cookie-cutter.
The reason most AI-generated sites look alike is convergence on the same safe defaults: Inter font, purple gradients, rounded cards with drop shadows, predictable 2-column layouts. This skill exists to break that pattern.

## Before You Write Any Code

### 1. Roll a Design Direction

Every project gets a unique aesthetic identity. Before coding, pick ONE direction from this palette and commit fully:

| Direction | Mood | Typography | Colors | Layout |
|-----------|------|------------|--------|--------|
| **Brutalist** | Raw, honest, anti-design | Mono or heavy grotesque | Black/white + one neon accent | Harsh grids, visible borders, exposed structure |
| **Editorial** | Magazine-like, refined | Elegant serif + clean sans | Muted earth tones or ink-black | Asymmetric columns, generous whitespace, pull quotes |
| **Neo-Retro** | 70s/80s/90s nostalgia | Chunky retro display fonts | Warm oranges, browns, olive, cream | Rounded containers, stacked sections, analog textures |
| **Glassmorphism** | Ethereal, layered | Light geometric sans | Translucent whites on vivid gradients | Frosted cards, layered depth, blur effects |
| **Organic** | Natural, warm, alive | Handwritten or rounded soft | Greens, warm beige, terracotta | Flowing shapes, blob backgrounds, soft curves |
| **Swiss/Grid** | Precise, systematic | Helvetica-style, strict hierarchy | Limited palette (2-3 colors max) | Rigid grid, strong alignment, mathematical spacing |
| **Art Deco** | Luxurious, geometric | Gold serif or geometric display | Gold, navy, black, emerald | Symmetric patterns, ornamental borders, chevrons |
| **Cyberpunk** | Dark, neon, dystopian | Tech mono or angular display | Dark base + cyan/magenta/electric | Dense grids, glitch effects, terminal aesthetics |
| **Soft/Pastel** | Gentle, approachable | Rounded friendly sans | Pastels with soft shadows | Generous padding, rounded everything, neumorphism |
| **Industrial** | Utilitarian, no-nonsense | Condensed grotesque | Grays, yellows, hazard orange | Dense layout, label-heavy, data-forward |
| **Playful** | Fun, expressive | Bouncy display + casual body | Bright primaries, unexpected combos | Tilted elements, animations, surprise interactions |
| **Luxury** | Premium, exclusive | Thin elegant serif | Black, gold, marble textures | Full-bleed images, dramatic negative space |

Never default to the same direction twice in a row. If unsure, pick the direction that feels LEAST like what Claude would normally generate.

### 2. Apply the Design Rules

These rules come from professional UI design principles and must be followed:

**Typography**
- Choose fonts from Google Fonts that have CHARACTER — not Inter, Roboto, Open Sans, or system fonts
- Display font ≠ body font: pair a distinctive headline with a readable body
- Type scale ratio: 1.25x minimum between hierarchy levels
- Line width: cap paragraphs at 60-75ch (max-width: 65ch) for readability
- Never use more than 3 font weights on a single page

**Color**
- One dominant color, one accent, one neutral — that's it
- Brand color goes on CTAs and key highlights only, not everywhere
- Use opacity variations (10%, 20%, 50%) of your primary instead of inventing new colors
- Dark themes: never pure #000000 background — use #0a0a0a, #111827, or tinted darks
- Light themes: never pure #ffffff — use #fafafa, #f8fafc, or warm whites

**Spacing & Layout**
- The Gutenberg Principle: key content flows Z-pattern (top-left to top-right to bottom-left to bottom-right)
- Outer border-radius = 2x inner border-radius for nested elements
- Card padding on non-rounded edges = 2x padding on rounded edges
- Use whitespace to separate sections, not dividers or horizontal rules
- Break the grid intentionally: one asymmetric element per page section creates visual interest

**Interaction & Motion**
- One orchestrated entrance animation (staggered reveal on load) beats many scattered micro-interactions
- Hover states must exist on every clickable element — and they should surprise
- Transitions: 150-300ms with ease-out. Never instant, never slow
- Scroll-triggered animations for below-the-fold content

**Components (inspired by UIverse.io patterns)**
- Buttons: never plain rectangles. Add micro-details — gradient fills, icon accents, hover transforms, shadow shifts
- Cards: vary the anatomy — some with accent borders, some with image bleeds, some with colored badges
- Forms: inputs should feel substantial — visible focus rings, smooth label transitions, contextual icons
- Loaders: match the page aesthetic — no generic spinners
- Notifications/toasts: slide-in with character, match the design direction

### 3. Anti-Patterns to Avoid

| Anti-Pattern | What To Do Instead |
|---|---|
| Purple gradient hero on white | Pick a color that matches the brand/context |
| Inter/Roboto/Arial everywhere | A distinctive Google Font the user hasn't seen 100 times |
| Perfectly centered everything | Asymmetry, offset grids, left-aligned sections |
| 3 equal-width feature cards | Vary card sizes, use a bento grid, stagger heights |
| Generic stock-photo hero | Gradient meshes, blob shapes, CSS patterns, or bold typography as hero |
| Rounded-everything (8px all) | Mix sharp and rounded. Match border-radius to the aesthetic direction |
| Shadow-everything | Shadows only where depth makes sense |
| Blue links, gray text | Links in accent color. Text in a warm or tinted neutral |
| Cookie-cutter footer | Footer that matches page personality |

### 4. Implementation

Always define a custom palette and fonts in CSS variables:

:root {
  --color-primary: your chosen primary;
  --color-accent: your chosen accent;
  --color-surface: your background;
  --color-text: your text color;
  --font-display: your display font;
  --font-body: your body font;
  --radius-sm: inner radius;
  --radius-lg: outer radius = 2x inner;
}

Google Fonts to consider:
- Display: Playfair Display, Syne, Space Grotesk, Clash Display, Instrument Serif, DM Serif Display, Fraunces, Libre Baskerville, Unbounded, Archivo Black
- Body: DM Sans, Plus Jakarta Sans, Outfit, Satoshi, General Sans, Source Serif 4, Lora, Crimson Pro, Nunito Sans, Karla
- Mono: JetBrains Mono, Fira Code, IBM Plex Mono, Source Code Pro

### 5. Quality Checklist

Before delivering any frontend code, verify:
- Design direction is clear and consistently applied
- No default/generic fonts (Inter, Roboto, Arial, system-ui)
- Color palette is intentional and limited (not rainbow)
- At least one element breaks the expected grid or symmetry
- Typography hierarchy is visible (display ≠ body ≠ caption)
- Hover states exist on all interactive elements
- At least one entrance animation or scroll effect
- Mobile-responsive (test at 375px width mentally)
- The page has personality — could you describe its vibe in one word?

### 6. Background & Visual Assets

Gradient Meshes:
.hero-mesh {
  background:
    radial-gradient(at 20% 80%, rgba(var(--primary-rgb), 0.3) 0%, transparent 50%),
    radial-gradient(at 80% 20%, rgba(var(--accent-rgb), 0.2) 0%, transparent 50%),
    radial-gradient(at 50% 50%, rgba(var(--primary-rgb), 0.1) 0%, transparent 70%);
  background-color: var(--color-surface);
}

Blob Shapes:
.blob {
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
  animation: morph 8s ease-in-out infinite;
}
@keyframes morph {
  50% { border-radius: 70% 30% 30% 70% / 70% 70% 30% 30%; }
}

CSS Patterns:
.pattern-dots {
  background-image: radial-gradient(circle, var(--primary) 1px, transparent 1px);
  background-size: 20px 20px;
  opacity: 0.05;
}

## Reference Files

When building components, always read:
- .claude/skills/design/component-patterns.md — UIverse.io component patterns
- .claude/skills/design/design-rules.md — UI Design Tips actionable rules
- .claude/skills/design/generators.md — Super Designer CSS techniques
