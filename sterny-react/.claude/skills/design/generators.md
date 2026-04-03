# CSS Generators — Super Designer Inspired

Tools and techniques for generating unique visual assets directly in CSS.
These replace generic backgrounds with atmospheric, distinctive visuals.

Source: https://superdesigner.co/resources

## Available Generator Categories

### 1. Gradient Library (50+ curated)
Pre-built CSS gradients ready to use. Categories:
- **Linear gradients** — classic directional color blends
- **Radial gradients** — center-out color diffusion
- **Conic gradients** — angular sweeps (great for progress indicators)

**Implementation tip**: never use a single-direction gradient. Combine 2-3 radial gradients at different positions for mesh effect:
```css
background:
  radial-gradient(ellipse at 10% 90%, #ee5a24 0%, transparent 50%),
  radial-gradient(ellipse at 90% 10%, #0984e3 0%, transparent 50%),
  radial-gradient(ellipse at 50% 50%, #6c5ce7 0%, transparent 60%),
  #0a0a0a;
```

### 2. Mesh Gradients (53 SVG)
Smooth multi-point gradients that feel organic and premium.
Use as hero backgrounds, card accents, or full-page atmospheres.

**CSS approximation**:
```css
.mesh-bg {
  background-color: #f0e6ef;
  background-image:
    radial-gradient(at 40% 20%, #f093fb 0px, transparent 50%),
    radial-gradient(at 80% 0%, #fccb90 0px, transparent 50%),
    radial-gradient(at 0% 50%, #d4fc79 0px, transparent 50%),
    radial-gradient(at 80% 50%, #8fd3f4 0px, transparent 50%),
    radial-gradient(at 0% 100%, #ffecd2 0px, transparent 50%);
}
```

### 3. Blob Generator
Organic, irregular shapes for backgrounds and decorative elements.

**CSS blob with animation**:
```css
.blob {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border-radius: 30% 70% 53% 47% / 26% 46% 54% 74%;
  filter: blur(40px);
  opacity: 0.4;
  position: absolute;
  animation: blob-morph 10s ease-in-out infinite alternate;
}

@keyframes blob-morph {
  0%   { border-radius: 30% 70% 53% 47% / 26% 46% 54% 74%; }
  25%  { border-radius: 58% 42% 75% 25% / 76% 46% 54% 24%; }
  50%  { border-radius: 50% 50% 33% 67% / 55% 27% 73% 45%; }
  75%  { border-radius: 33% 67% 58% 42% / 63% 68% 32% 37%; }
  100% { border-radius: 70% 30% 47% 53% / 30% 54% 46% 70%; }
}
```

### 4. CSS Backgrounds (Patterns)
Subtle repeating patterns for texture without images.

**Dot grid**:
```css
.bg-dots {
  background-image: radial-gradient(circle, currentColor 1px, transparent 1px);
  background-size: 24px 24px;
  color: var(--primary);
  opacity: 0.04;
}
```

**Cross-hatch**:
```css
.bg-crosshatch {
  background:
    linear-gradient(45deg, currentColor 25%, transparent 25%) -10px 0,
    linear-gradient(-45deg, currentColor 25%, transparent 25%) -10px 0;
  background-color: transparent;
  background-size: 20px 20px;
  color: var(--primary);
  opacity: 0.03;
}
```

**Diagonal lines**:
```css
.bg-diag {
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 4px,
    rgba(var(--primary-rgb), 0.03) 4px,
    rgba(var(--primary-rgb), 0.03) 5px
  );
}
```

### 5. 3D Shapes
CSS 3D transforms for decorative floating elements.

**Floating 3D card**:
```css
.float-3d {
  transform: perspective(600px) rotateX(5deg) rotateY(-5deg);
  box-shadow:
    10px 10px 0 rgba(0,0,0,0.05),
    20px 20px 0 rgba(0,0,0,0.03);
  transition: transform 0.4s ease;
}
.float-3d:hover {
  transform: perspective(600px) rotateX(0) rotateY(0);
}
```

### 6. Color Palettes
Curated combinations. When the skill's design direction doesn't specify colors, draw from these families:

| Mood | Colors |
|------|--------|
| Warm Professional | #2d3436, #e17055, #ffeaa7, #dfe6e9 |
| Cool Tech | #0c0c1d, #6c5ce7, #00cec9, #dfe6e9 |
| Earth Natural | #2d5016, #a0c334, #f4e8c1, #1a1a1a |
| Sunset Vibrant | #eb4d4b, #f0932b, #ffbe76, #130f40 |
| Ocean Calm | #0a3d62, #3c6382, #82ccdd, #f8f9fa |
| Berry Rich | #6c0f3d, #c0392b, #e8daef, #1a1a2e |

### 7. Grain/Noise Overlay
Adds warmth and analog texture to any design.

**SVG noise filter** (lightweight, no image needed):
```css
.grain::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.025;
  pointer-events: none;
  z-index: 9999;
  mix-blend-mode: overlay;
}
```

## Combination Recipes

**Recipe: Premium Landing Page**
Mesh gradient hero + grain overlay + blob accents + glassmorphic cards

**Recipe: Dashboard**
Subtle dot grid pattern + tinted dark background + accent color borders + no grain

**Recipe: Portfolio**
Full-bleed images + thin grain + editorial typography + minimal color (black + one accent)

**Recipe: SaaS Marketing**
Gradient mesh + animated blobs + bold typography hero + bento feature grid
