# Component Patterns — UIverse.io Inspired

Reference for building distinctive UI components. Each category lists creative patterns
that go beyond flat defaults. Use these as starting points, not copy-paste templates.

## Buttons (1970+ variations on UIverse.io)

### Creative Patterns
- **Gradient fill** with hover shift (background-position transition)
- **Border-only** with fill animation on hover (background slides in from left/bottom)
- **3D press effect** using box-shadow + translateY on :active
- **Icon morph** — icon rotates or transforms on hover
- **Glow pulse** — subtle box-shadow animation on primary CTAs
- **Split button** — text + icon separated by a divider, each with its own hover
- **Underline slide** — text-only button with underline that slides in on hover

### CSS Techniques
```css
/* Gradient shift on hover */
.btn-gradient {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  background-size: 200% 200%;
  transition: background-position 0.4s ease;
}
.btn-gradient:hover { background-position: 100% 100%; }

/* Fill from left on hover */
.btn-fill {
  position: relative;
  overflow: hidden;
  z-index: 1;
}
.btn-fill::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease-out;
  z-index: -1;
}
.btn-fill:hover::before { transform: scaleX(1); }
```

## Cards

### Creative Patterns
- **Accent border** — colored left border or top border (not all-around shadow)
- **Image bleed** — image extends beyond card boundaries with negative margin
- **Tilt on hover** — subtle perspective transform (rotateX/Y 2-5deg)
- **Badge overlay** — colored badge or tag positioned at corner
- **Bento grid** — mixed card sizes in a masonry/bento layout
- **Glassmorphism card** — frosted glass with backdrop-filter blur
- **Neumorphic card** — soft inner/outer shadows, no border

### CSS Techniques
```css
/* Tilt on hover */
.card-tilt {
  transition: transform 0.3s ease;
}
.card-tilt:hover {
  transform: perspective(800px) rotateY(3deg) rotateX(-2deg) scale(1.02);
}

/* Glassmorphism */
.card-glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
```

## Inputs & Forms

### Creative Patterns
- **Floating label** — label inside input that floats up on focus
- **Underline only** — no border, just a bottom line that changes color on focus
- **Accent focus ring** — glowing ring in brand color (not default blue outline)
- **Icon prefix** — icon inside input, aligned left, with subtle separator
- **Validation glow** — green/red subtle glow instead of border color change
- **Grouped inputs** — connected inputs with no gap (like date range pickers)

### CSS Techniques
```css
/* Floating label */
.input-group input:focus + label,
.input-group input:not(:placeholder-shown) + label {
  transform: translateY(-1.5rem) scale(0.85);
  color: var(--primary);
}

/* Accent focus ring */
.input-accent:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.2);
  border-color: var(--primary);
}
```

## Loaders & Spinners

### Creative Patterns
- **Skeleton screens** — gray pulsing shapes matching content layout (always preferred over spinners)
- **Progress bar** with percentage — for known-duration operations
- **Bouncing dots** — 3 dots with staggered animation-delay
- **Logo pulse** — brand logo/icon with subtle scale + opacity animation
- **Typing indicator** — for chat/AI contexts
- Never use a generic circular spinner unless the aesthetic is intentionally minimal

## Toggles & Checkboxes

### Creative Patterns
- **iOS-style toggle** with smooth knob slide and color transition
- **Checkbox with checkmark animation** — SVG stroke-dashoffset trick
- **Toggle with icons** — sun/moon for dark mode, on/off labels
- **Color-coded toggle** — different colors for on/off states

## Navigation

### Creative Patterns
- **Active indicator** — animated underline or background pill that slides between items
- **Hamburger morph** — menu icon transforms to X with CSS transitions
- **Sticky header** with blur — backdrop-filter on scroll
- **Breadcrumb with chevrons** — SVG arrows, not > characters
- **Tab bar with pill** — active tab has a moving pill background (not just color change)

## Notifications & Toasts

### Creative Patterns
- **Slide-in from edge** with elastic easing
- **Accent left border** — colored strip indicating type (success/error/info)
- **Auto-dismiss with progress bar** — visual countdown
- **Stack effect** — multiple toasts stack with slight offset
- Never center a toast — position consistently (top-right or bottom-right)
