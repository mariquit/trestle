---
name: frontend
description: Design accessible, mobile-first web interfaces for HTML-first apps such as Astro and FastHTML, with Basecoat and Tailwind CSS as the default when no design system is established. React, Vue, and Svelte targets are out of scope. Use when the user runs `/frontend` or asks to "design a mobile-friendly web interface".
license: Apache-2.0
metadata:
  copyright: Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
---

# Frontend

**Requires OpenCode V2 with the [Trestle frontend plugin](https://github.com/mariquit/trestle/tree/main/plugins/frontend) loaded.** If its discovery, planning, or verification tools are unavailable, stop before planning or editing. Tell the user to install the skill and plugin together with `./install.sh frontend` and reinvoke the skill. Do not continue without the gate.

Design around the user's task. When the brief leaves the design system open and the project has none, start with [Basecoat UI](https://basecoatui.com/introduction/). Its component interface is HTML: semantic elements, short classes, and documented attributes carry component structure and styling. Use Tailwind for layout and responsive composition, and add vanilla JavaScript only for behavior the browser or the app does not already provide. This brings shadcn-style components and theme tokens to plain HTML and server-rendered apps without requiring React. Reuse the project's existing design system, renderer, and build pipeline for bounded changes.

## When to Use

- Use only for HTML-first sites and apps, including [Astro](https://astro.build/) and [FastHTML](https://fastht.ml/). React, Vue, and Svelte targets are out of scope.
- Building or updating UI components, pages, or layout shells.
- Scaffolding feature modules in frontend applications.
- Reviewing hierarchy, responsive behavior, accessibility, or the use of an existing design system.

## Check the frontend stack first

On invocation, inspect the app or package that owns the requested UI, not just the workspace root. Set `frontend_stack` only after identifying a supported renderer. Include the flag and renderer evidence in the discovery checkpoint. Do not write it to project configuration.

| Flag | Evidence and behavior |
| --- | --- |
| `astro` | A target `.astro` component, Astro config importing `astro/config`, or the target package's direct `astro` dependency. Reuse Astro pages, layouts, and components. |
| `fasthtml` | A target Python entry point importing `fasthtml` or the target app's `python-fasthtml` dependency. Reuse its Python-rendered components and existing HTMX swaps. |
| `other` | Positive evidence that another supported HTML-first renderer owns the target, such as plain HTML or Jinja. Do not infer `other` from the absence of Astro or FastHTML markers. |

If the stack is unclear, leave the flag unset and end the turn with this question: “`/frontend` is for HTML-first apps such as Astro and FastHTML. I couldn't verify which renderer owns this UI. Can you confirm the app or renderer to target?” Do not submit discovery, plan, or edit while waiting. If the user identifies the target, check it and record a supported flag. If the user names a supported renderer that the files do not establish, record it as user-confirmed. If the user asks to proceed without classifying the renderer, end the `/frontend` invocation without setting a flag, planning, or editing.

If React (including Next.js), Vue (including Nuxt), or Svelte (including SvelteKit) owns the requested UI, stop without setting a flag, planning, or editing. Check the target component, imports, and package or framework config. A framework used elsewhere in the workspace does not disqualify a supported target. Tell the user which framework is out of scope. For React only, direct the user to `/frontend-react` when available; do not invoke it on their behalf. Use the gate's stop checkpoint for unsupported targets and requests to proceed unclassified.

## Design Intent

- Before choosing a layout, identify the audience and the primary task the screen supports from the brief and verified product context. Ask only when missing context would materially change the design; do not invent a product or audience.
- Use the product's actual content and existing visual identity. Label necessary placeholders explicitly, and do not fabricate metrics, testimonials, or other claims to fill a layout.
- For existing screens, preserve established patterns unless the requested change requires otherwise. Design intent guides the requested work; it is not permission for an unsolicited redesign.
- Identify what users need to see, decide, or do first. Put the primary action near the content it affects; distinguish secondary actions without making them hard to find. Choose a list for scanning, a table for comparing attributes, a form for editing, and cards only when separate groups need a visible boundary.
- Plan the narrow-screen reading and action order before choosing a desktop layout. Decide which information must remain visible and how users recover from relevant empty, loading, validation, and failure states. Do not invent a dashboard, hero, or decoration to fill unused space.

## Core Rules & Guardrails

### 1. Implement with the Existing Stack

1. **Choose the asset path.** Find the renderer, shared components, CSS entry point, and loaded assets. Use [Installation](https://basecoatui.com/installation/) when setup or asset changes are in scope. With an existing compatible Tailwind build, load Tailwind first, then one Basecoat style bundle. For a static or server-rendered project without a build, start with a version-pinned prebuilt stylesheet. It provides Basecoat component styles, not every Tailwind utility. Use the project's own CSS for any missing layout rules instead of adding a build or browser compiler by default.
2. **Verify the component contract.** Reuse a shared primitive when it fits. Otherwise find the component guide via the [Introduction](https://basecoatui.com/introduction/) and check its required HTML, variants, and scripts against the installed release. Find the release in the lockfile, installed package, or served asset URL. If the live docs describe a newer version, inspect the installed assets or release-matched docs before using their examples. If the contract is unavailable, use known native HTML instead of guessing.
3. **Choose how to render the markup.** Start with plain HTML or the project's existing partials or components. For repeated, more complex markup in an existing Jinja or Nunjucks app, consult [Templates](https://basecoatui.com/templates/). Reuse an app-owned macro if present; otherwise copy only the needed macro from the matching `basecoat-css` package when adoption is in scope. Do not add a template engine or use the deprecated `basecoat-cli` for this. Check the local macro's arguments and rendered output, including unique IDs, label associations, and which arguments accept raw HTML. Keep untrusted text escaped and check whether generated handlers fit the app's script policy.
4. **Assign one owner for interaction.** Prefer native links, forms, and disclosures. A blocking Basecoat dialog uses native `<dialog>` and an opener wired to `showModal()`; it does not need the Basecoat runtime. For a component that does need a controller, such as a dropdown menu, follow its guide. Use the existing all-in-one bundle or the runtime followed by the required component script, not both. Do not attach a second controller to DOM already managed by the app. If navigation inserts, replaces, or restores that markup, test that path before adding manual initialization.

### 2. Compose the Layout

- Use standard Flexbox and Grid utilities for alignment, wrapping, and responsive structure: `flex`, `grid`, `items-center`, `flex-wrap`, `flex-col md:flex-row`, and `grid-cols-1 md:grid-cols-2`.
- Prefer standard spacing scales, such as `gap-2`, `gap-4`, and `gap-6`, and keep repeated relationships consistent across screens.
- Reuse the page wrapper when its width and spacing suit the task. A focused form and a data workspace need not share a maximum width. Avoid duplicated page padding or gaps and margins that account for the same separation.
- Let components provide their internal spacing. Use utilities for placement and responsive layout, not to reconstruct each component's appearance. Prefer fluid widths and standard spacing; scope exceptions to a real requirement such as a safe-area inset.

### 3. Theme Colors and Visual Consistency

- Reuse the app's style pack, tokens, and theme switch. In a compiled Basecoat Tailwind setup, use paired semantic colors such as `bg-background text-foreground` or `bg-card text-card-foreground` for custom surfaces. Verify token availability in the actual build. Let component variants set control colors; use a quiet variant such as an outline button for subordinate actions where appropriate. Do not create a competing palette per screen. See [Basecoat customization](https://basecoatui.com/customization/) when a theme change is in scope.
- Check affected UI for contrast in supported themes. Semantic tokens support theme switching but do not guarantee accessible contrast, especially with opacity modifiers or custom themes. Meet WCAG AA contrast: 4.5:1 for normal text and 3:1 for large text.
- Keep borders, radius, and elevation consistent with the theme. Add decoration only when it supports hierarchy, identity, or readability.
- Preserve existing fonts and use a small, consistent type hierarchy for headings, body text, and supporting text. Constrain long-form prose with a standard maximum-width utility, without narrowing data views unnecessarily. Do not add decorative fonts or override control typography for novelty.
- Use motion only to explain a state change or provide useful feedback. Respect reduced-motion preferences with supported utilities such as `motion-reduce:transition-none` and `motion-reduce:animate-none`; keep information and controls usable without animation.


### 4. Mobile-First App Shell and Accessibility

- Reuse the existing shared layout and navigation without duplicating main landmarks, page wrappers, or scrolling regions. Let content grow naturally; use bounded viewport layouts only when the interaction requires them.
- Account for device safe areas and fixed navigation where relevant. Keep focused inputs visible above the on-screen keyboard.
- Stack content on mobile and expand at larger breakpoints. Avoid page-level horizontal scrolling, clipped labels, and fixed widths that prevent reflow at 200% zoom.
- Require interactive targets of at least 44 by 44 CSS pixels. Measure the rendered target, not the icon. When needed, use a shared size variant or enlarge a checkbox's clickable label area.
- Use links for navigation, mark the current page with `aria-current="page"`, and use native buttons for actions. Associate visible labels with form controls and link errors to the affected field, for example with `aria-describedby`. Give icon-only buttons accessible names and keep focus indicators visible.
- Make controls keyboard-operable. For modal dialogs, give the dialog an accessible name and a visible close action; check that focus enters and stays inside, Escape dismisses it, and focus returns to the opener. For menus, exercise keyboard navigation, activation, and dismissal rather than assuming the styles provide behavior.

### 5. Separate Application Logic from Presentation

- Keep hardware access, network requests, subscriptions, and cleanup in the project's established handlers, services, or framework APIs. Reuse existing partials or shared components without restructuring unrelated files.

### 6. UI Copy

- Name the action in control labels, such as "Save profile" rather than "Submit". Use the same term for the same concept across headings, labels, navigation, and feedback.
- Explain errors in specific, factual language and provide a recovery action when one exists. Do not promise success or a recovery option the implementation cannot provide.
- Make empty states explain what is absent and identify a useful next action when available. Keep instructions close to the relevant control, and remove promotional filler that does not help the user complete the task.

## Composition Example

This Basecoat 1.x fragment fits inside an existing page wrapper. A card groups contact information, and a link leads to its edit page without client JavaScript. Use the application's actual route and escaped template values.

```html
<div class="card">
  <header>
    <h2>Contact details</h2>
  </header>
  <section aria-label="Current contact details">
    <dl>
      <dt>Email address</dt>
      <dd>{{ contact_email }}</dd>
    </dl>
  </section>
  <footer>
    <a class="btn" href="{{ edit_contact_url }}">Edit contact details</a>
  </footer>
</div>
```

## Verification Before Completion

Verify affected UI proportionately to the change:

- Check the rendered markup against component selectors and confirm the expected stylesheet and style pack actually load. If a Tailwind utility is missing, check the generated CSS and whether the relevant templates are scanned before adding an override. If a styled control does not respond, check the native action or the applicable script and its initialization on that DOM.
- Check responsive layout, spacing, hierarchy, and theme consistency in the rendered UI when tools are available. Screenshots can support visual review, not prove functional behavior.
- Check relevant accessibility behavior, including keyboard access, focus, contrast, touch targets, and zoom/reflow.
- Exercise changed controls and relevant loading, empty, validation, and error states. Do not ship dead controls, placeholder links, or fabricated data presented as real.
- Run relevant project checks. Report the design decision that shaped the screen, the shared pattern or component source used when applicable, and what passed, failed, or remains unverified. Do not infer rendered behavior from class names or claim coverage beyond what was tested.
