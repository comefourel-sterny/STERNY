# Design Rules — UI Design Tips Compilation

Actionable rules extracted from professional UI design resources.
Apply these systematically to every frontend you build.

## Typography

1. **Type scale ratio**: minimum 1.25x between hierarchy levels
   - If body is 16px: h3=20px, h2=25px, h1=31px
   - For dramatic headers: use 1.5x ratio

2. **Line width**: cap at 60-75 characters per line
   - CSS: `max-width: 65ch` on paragraphs
   - Never let text span full viewport width

3. **Font weights**: maximum 3 per page
   - Regular (400) for body
   - Medium (500) or Semibold (600) for subheads
   - Bold (700) for headlines only

4. **Line height**: 1.5-1.7 for body, 1.1-1.3 for headlines
   - Larger text needs less line-height
   - Smaller text needs more line-height

5. **Letter spacing**: slight positive for uppercase, slight negative for large display text

## Color

6. **The 60-30-10 rule**: 60% dominant (background), 30% secondary (surfaces), 10% accent (CTAs, highlights)

7. **Brand color application**: use sparingly on high-impact elements only
   - Primary buttons, active states, key links
   - NOT on backgrounds, borders everywhere, or decorative elements

8. **Color-blind safety**: never use color alone to convey meaning
   - Always pair with icon, text, or pattern
   - Test with red-green colorblind simulation

9. **Opacity for variants**: instead of picking new colors, use your primary at different opacities
   - Hover background: primary at 8-12% opacity
   - Subtle border: primary at 15-20% opacity
   - Disabled state: primary at 30% opacity

10. **Dark theme colors**: never pure black
    - Background: #0a0a0a to #1a1a2e (slightly tinted)
    - Surface: 4-8% lighter than background
    - Text: #e5e5e5 to #f0f0f0 (never pure white)

## Spacing

11. **8px grid system**: all spacing in multiples of 4 or 8
    - Tight: 4px, 8px (within components)
    - Normal: 16px, 24px (between elements)
    - Spacious: 32px, 48px, 64px (between sections)

12. **Border-radius harmony**: outer = 2x inner for nested elements
    - Inner card element: 8px
    - Outer card: 16px
    - Container around cards: 24px or 32px

13. **Section separation**: whitespace > dividers > borders
    - 48-80px vertical padding between page sections
    - Horizontal rules only when absolutely necessary

14. **Padding asymmetry**: double padding on flat edges
    - Card with rounded corners: equal padding
    - Card flush to a container edge: 2x padding on the flat side

## Layout

15. **The Gutenberg Principle**: readers scan in Z-pattern
    - Logo/brand top-left (first fixation)
    - Navigation top-right
    - Hero content/image center
    - CTA bottom-right (terminal area)

16. **Above the fold**: primary CTA must be visible without scrolling
    - Show partial content below to hint at scrollability

17. **Grid-breaking**: one intentional asymmetric element per section
    - Oversized image bleeding off-grid
    - Text offset from center
    - One card larger than others

18. **Bento layouts**: instead of equal-width columns, use varied sizes
    - 2:1 ratio, 1:1:2, or irregular masonry
    - More visual interest than uniform grids

## Interaction

19. **Single primary CTA**: one hero section = one clear action
    - Secondary actions are visually muted (ghost button, text link)

20. **Destructive actions**: always de-emphasize visually
    - Never red primary button for delete
    - Use ghost/outline style, require confirmation

21. **Social login first**: place above email/password form
    - Reduces friction for returning users

22. **Empty states**: never blank screens
    - Illustration + helpful text + primary action
    - Pre-populated with example data if possible

23. **Hover feedback**: every clickable element must respond to hover
    - Minimum: cursor change + subtle color/shadow shift
    - Better: transform, underline animation, or icon movement

24. **Fitts's Law**: important targets should be large and near likely cursor positions
    - Primary CTA: generous padding (min 44px tap target)
    - Navigation items: full clickable area, not just text

## Trust & Social Proof

25. **Testimonials**: place near signup/CTA for maximum impact
    - Real names and photos increase trust
    - Specific results > vague praise

26. **Value demonstration**: show a calculator, demo, or before/after
    - "See what you'll save" > "We help you save money"
