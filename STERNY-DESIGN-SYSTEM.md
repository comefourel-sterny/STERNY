# 🎨 STERNY Design System v2.0
> Référence absolue pour toutes les pages — À lire avant chaque redesign
---
## 🎨 COULEURS
/* PRIMARY */
--orange: #E8622A;
--orange-hover: #D4571F;
--orange-light: rgba(232, 98, 42, 0.1);
--orange-shadow: rgba(232, 98, 42, 0.16);
/* NEUTRAL */
--navy: #1E293B;
--navy-light: #334155;
--bg-page: #F4F5F7;
--white: #FFFFFF;
/* BORDERS */
--border: #E8EAF0;
--border-nav: rgba(232, 98, 42, 0.12);
/* TEXT */
--text-primary: #1E293B;
--text-secondary: #475569;
--text-muted: #94A3B8;
--text-light: #6B7280;
/* STATUS */
--success: #059669;
--warning: #F59E0B;
--danger: #FF6B6B;
--blue: #2563EB;
---
## 📐 RÈGLES OBLIGATOIRES
1. html { background: #E8622A; } — effet overscroll orange
2. body { background: #F4F5F7; }
3. Nav : border-bottom: 2px solid rgba(232, 98, 42, 0.12)
4. Cards : box-shadow: 0 6px 28px rgba(232, 98, 42, 0.16); border: 1px solid #E8EAF0; border-radius: 16px
5. Boutons : background #E8622A, hover translateY(-2px) + box-shadow 0 6px 20px rgba(232, 98, 42, 0.3)
6. Inputs : border: 1.5px solid #E8EAF0, focus border-color #E8622A + box-shadow 0 0 0 3px rgba(232, 98, 42, 0.08)
7. Border-radius : 16px (cards), 12px (buttons/inputs), 20px (modals)
8. Font : DM Sans
---
## 🎯 SECTION ICONS
.section-icon.orange { background: #FDF0EB; } svg stroke: #E8622A
.section-icon.navy { background: #EEF1F8; } svg stroke: #1E293B
.section-icon.green { background: #ECFDF5; } svg stroke: #059669
.section-icon.blue { background: #EFF6FF; } svg stroke: #2563EB
.section-icon.red { background: #FEF2F2; } svg stroke: #DC2626
---
## 📱 RESPONSIVE (768px)
- Grids → 1 colonne
- Boutons → full-width
- Section padding → 20px
- Nav height → 70px
---
## ⚠️ NE JAMAIS MODIFIER
- La logique JavaScript/Supabase
- Les appels API
- Les noms de classes utilisés dans le JS
