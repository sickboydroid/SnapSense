# SnapSense — Theme (quick reference)

## Colors

| Token | Hex | Use |
|-------|-----|-----|
| Background | `#000000` | Page / app window |
| Surface | `#0A0A0A` | Panels, nav, cards |
| Surface raised | `#171717` | Inset areas |
| Text primary | `#F5F5F5` | Headings |
| Text body | `#A3A3A3` | Paragraphs |
| Text muted | `#737373` | Secondary labels |
| Text caption | `#525252` | Fine print |
| **Accent** | `#3B82F6` | Primary buttons, key UI |
| Accent hover | `#60A5FA` | Button hover |
| Accent soft | `#93C5FD` | Highlights, links |
| Border | `rgba(255,255,255,0.1)` | Default dividers |
| Border accent | `rgba(59,130,246,0.25)` | Focus / emphasis |

**Secondary accents** (use sparingly): teal `#5EEAD4`, violet `#C4B5FD`, amber `#FCD34D`, rose `#FDA4AF`.

## Typography

**Plus Jakarta Sans** · antialiased · headings semibold, tight tracking on large titles.

## UI notes

- **One** strong blue CTA per main view.  
- Cards: dark surface, `white/10` border, rounded ~`16px`–`24px`.  
- No gradient backgrounds; dark + flat tints only.

## CSS variables

```css
:root {
  --ss-bg: #000000;
  --ss-surface: #0a0a0a;
  --ss-surface-raised: #171717;
  --ss-text-primary: #f5f5f5;
  --ss-text-body: #a3a3a3;
  --ss-text-muted: #737373;
  --ss-text-caption: #525252;
  --ss-accent: #3b82f6;
  --ss-accent-hover: #60a5fa;
  --ss-accent-soft: #93c5fd;
  --ss-border: rgba(255, 255, 255, 0.1);
}
```
