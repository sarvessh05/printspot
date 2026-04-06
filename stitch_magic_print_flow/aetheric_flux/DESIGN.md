```markdown
# Design System Strategy: The Ethereal Frontier

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Ethereal Frontier."** We are moving away from the "boxy" constraints of traditional web design to create a UI that feels less like a series of containers and more like a fluid, high-performance instrument. 

This system leverages the tension between "Invisible" (the dark, ebony depth of the background) and "Magic" (the vibrant, neon-pulsing interactive elements). By utilizing intentional asymmetry and overlapping glass layers, we break the "template" look. We treat the screen as a three-dimensional space where content floats in a liquid void, guided by subtle particle movements and soft, neon-tinted atmosphere.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the "Ebony to Midnight" spectrum, using deep blacks and violets to create an infinite sense of depth.

### The "No-Line" Rule
Standard 1px solid borders are strictly prohibited for sectioning. Structural boundaries must be defined through **Background Color Shifts** or **Tonal Transitions**.
*   **Method:** Separate a hero section from a content grid by transitioning from `surface` (#0e0e10) to `surface_container_low` (#131316). 
*   **The Signature Textures:** Use linear gradients for primary surfaces (e.g., `primary` to `primary_container`) to give CTAs a "liquid light" feel rather than a flat plastic look.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical, stacked layers.
*   **Base:** `surface_container_lowest` (#000000) for global backgrounds.
*   **Level 1:** `surface` (#0e0e10) for main content areas.
*   **Level 2:** `surface_container` (#19191c) for elevated modules.
*   **Top Level:** Use `surface_bright` (#2c2c2f) for interactive tooltips or floating menus, always paired with a `backdrop-blur`.

---

## 3. Typography
We utilize a pairing of **Manrope** for high-impact editorial moments and **Inter** for high-performance utility.

*   **Display & Headlines (Manrope):** These are your "Statement" layers. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to create an authoritative, premium feel. Headlines should often be "On-Surface" but can occasionally use a gradient clip from `primary` to `secondary` for a futuristic pulse.
*   **Titles & Body (Inter):** Inter provides the "Performance" aspect. It is clean, neutral, and highly legible. Use `body-lg` (1rem) for primary reading paths to ensure the dark background doesn't cause eye strain.
*   **Labels:** Use `label-sm` (0.6875rem) in uppercase with increased letter-spacing (0.05em) for technical metadata, mimicking high-end avionics or luxury watch interfaces.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** and the physics of light.

### The Layering Principle
Do not use shadows to create "pop." Instead, use "Nesting." A `surface_container_high` card placed on a `surface_dim` background provides a soft, natural lift that feels integrated into the environment.

### Ambient Shadows & Neon Glow
When an element must "float" (like a Modal), use an **Ambient Glow**:
*   **Shadow:** 0px 20px 40px rgba(0, 0, 0, 0.4).
*   **Neon Aura:** Add a secondary, very soft outer glow using the `primary` (#a1faff) or `secondary` (#ff51fa) tokens at 5-10% opacity to simulate light refracting through the glass.

### Glassmorphism & The Ghost Border
Floating elements should use a "Frosted Glass" effect:
*   **Fill:** `surface_variant` at 40% opacity.
*   **Blur:** `backdrop-filter: blur(12px)`.
*   **Ghost Border:** If a boundary is needed, use `outline_variant` (#48474a) at 15% opacity. Never use 100% opaque borders.

---

## 5. Components

### Buttons: The "Liquid Interactive"
*   **Primary:** A gradient fill from `primary` (#a1faff) to `primary_container` (#00f4fe). No border. On hover, the "Neon Glow" increases in intensity.
*   **Secondary (Soft Neumorphism):** Use `surface_container_highest` with a subtle inner-shadow (top-left light, bottom-right dark) to create a "pressed-into-the-glass" look. 
*   **Tertiary:** Ghost style. No background, `primary` text, transitions to a subtle `surface_variant` fill on hover.

### Input Fields: The "Etched" Style
Inputs should not be boxes. They are "etched" into the surface using `surface_container_lowest` with a bottom-only "Ghost Border." Upon focus, the border animates into a `primary` neon underline that glows slightly.

### Chips & Tags
Small capsules with `full` roundedness. Use `surface_container_high` backgrounds with `label-md` typography. For active states, use a subtle `tertiary` (#a7ffb3) tint to signal "Go" or "Success."

### Cards & Lists: The "Fluid Flow"
**Forbid the use of divider lines.**
*   **Lists:** Separate items using `1.5rem` (xl) vertical spacing. 
*   **Cards:** Use `surface_container_low` with `lg` (1rem) corner radius. The separation is created by the shift in black tones, not by a stroke.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical layouts (e.g., a headline offset to the left with a floating glass card on the right).
*   **Do** implement "Liquid Transitions." When a user navigates, elements should feel like they are sliding through ink, not just snapping into place.
*   **Do** use `primary_dim` for icons to keep them from being overly distracting while maintaining "Magic" accents.

### Don't:
*   **Don't** use pure white (#FFFFFF) for body text. Use `on_surface` (#fffbfe) or `on_surface_variant` (#adaaad) to maintain the premium dark-mode comfort.
*   **Don't** use sharp corners. Everything in this system must feel "Fluid"; stick to the `md` (0.75rem) to `xl` (1.5rem) roundedness scale.
*   **Don't** clutter the background. The "Particle Background" should be sparse—tiny, `primary` colored dots at 10% opacity that move slowly, suggesting a vast, living space.

---

## 7. Interaction Note: High-Performance Fluidity
Every interaction must have a "Liquid" physics feel. Use **Ease-In-Out-Expo** timing functions for all transitions. When a button is clicked, it shouldn't just change color; it should feel like a soft pulse of energy (the "Invisible Magic") emanating from the point of contact.