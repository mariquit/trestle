---
name: frontend
description: Build accessible React components, pages, and app layouts with version-appropriate daisyUI patterns and responsive Tailwind CSS, respecting content hierarchy and project conventions. Use when the user runs `/frontend` or asks to "build a mobile-friendly React interface".
license: Apache-2.0
metadata:
  copyright: Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
---

# Frontend

Build mobile-friendly React interfaces with daisyUI components and constrained Tailwind layouts. Reuse component sizes, page wrappers, and spacing patterns instead of styling each element independently.

## When to Use

- Building or updating UI components, pages, or layout shells.
- Scaffolding feature modules in frontend applications.
- Enforcing daisyUI component guardrails and responsive design patterns.

## Design Intent

- Before choosing a layout, identify the audience and the primary task the screen supports from the brief and verified product context. Ask only when missing context would materially change the design; do not invent a product or audience.
- Use the product's actual content and existing visual identity. Label necessary placeholders explicitly, and do not fabricate metrics, testimonials, or other claims to fill a layout.
- For existing screens, preserve established patterns unless the requested change requires otherwise. Design intent guides the requested work; it is not permission for an unsolicited redesign.

## Core Rules & Guardrails

### 1. daisyUI Owns Component Styling

1. **Inspect the integration.** Check the installed Tailwind CSS and daisyUI versions, the app's CSS entry point and plugin configuration, and existing shared components. Check for a class prefix or excluded modules before using an unprefixed docs example. For new daisyUI 5 setups, use Tailwind CSS 4 and the [framework installation guide](https://daisyui.com/docs/install/): the CSS entry typically starts with `@import "tailwindcss";` followed by `@plugin "daisyui";`. Do not migrate a working setup as part of a component task. See the [daisyUI 5 upgrade guide](https://daisyui.com/docs/upgrade/) if migration is in scope.
2. **Select by behavior.** Identify what the UI must do before choosing a component. Reuse a shared implementation when it fits; otherwise use the [component index](https://daisyui.com/components/) to find candidates and read the selected guide for the installed version. Verify the base class, the required element types and part nesting, and the supported modifier combinations against that release's docs or package source. A dependency declaration or a current docs example does not prove that a class exists locally. If a pattern cannot be verified, reuse one that can or use semantic native HTML with minimal Tailwind styling.
3. **Start with the defaults.** Use the base class and needed parts, then add supported size, style, color, or placement modifiers only when they serve a purpose. Use plain `btn` for ordinary actions and reserve `btn-primary` for the main action in its context. Keep related controls at a consistent size. Reuse shared variants for repeated styling or accessibility adjustments. Prefer a supported modifier or theme token to a utility override; use narrowly scoped utilities for requirements daisyUI cannot meet. Do not rebuild library components with raw utilities or use `!important` to force routine variants. Ask before adding a component library or materially changing the design system.

**Common patterns for daisyUI 5** (check the installed release and configuration):

| Need | Use | Check |
| --- | --- | --- |
| Labeled fields | Native controls with `input`, `select`, or `textarea`. Group related fields with `<fieldset className="fieldset">` and `<legend className="fieldset-legend">`. | Associate a visible label with each field. Do not copy v4 `form-control` or `input-bordered` classes into v5. For invalid fields, provide specific text and associate it with `aria-describedby`; use `aria-invalid` for app-managed errors. `validator` styles native validity; it does not replace error handling. |
| Navigation or a sidebar | Use `menu` on a list with real links for navigation and buttons for actions. For a `drawer`, follow the documented `drawer-toggle`, `drawer-content`, and `drawer-side` structure; use `lg:drawer-open` only if the sidebar should persist on large screens. | Mark the current route with `aria-current="page"`. For a toggleable sidebar, use a keyboard-operable trigger with an accessible name and expanded state; a styled checkbox label alone is not a button. Verify focus and dismissal for an overlay drawer. |
| Disclosure or blocking dialog | Prefer `<details>` and `<summary>` for a simple disclosure; use the documented `collapse` or `dropdown` parts as appropriate. For a modal, prefer `<dialog className="modal">` opened with `showModal()`, with `modal-box` and a visible close action. | Do not use hover-only disclosure or treat `modal-open` as modal behavior. Verify that focus enters the modal and stays inside, Escape closes it, and focus returns to the trigger. |
| Feedback | Use `alert` for a visible message and `toast` for placement when transient feedback is appropriate. | Keep actionable errors near the affected control. Announce dynamic feedback as appropriate and do not rely on color, animation, or a disappearing toast alone. |

### 2. Tailwind Owns Layout, Not Control Appearance

- Choose composition from the content and primary task, not a preset template. Use cards for meaningful groups, numbering for actual sequences, and visual emphasis for important information or actions. Do not turn every section into a card or add a hero to an application screen without a task-specific reason.
- Use standard Flexbox and Grid utilities for alignment, wrapping, and responsive structure: `flex`, `grid`, `items-center`, `flex-wrap`, `flex-col md:flex-row`, and `grid-cols-1 md:grid-cols-2`.
- Prefer standard spacing scales, such as `gap-2`, `gap-4`, and `gap-6`, and keep repeated relationships consistent across screens.
- Reuse a consistent page wrapper, such as `container mx-auto p-4 md:p-6 space-y-6`. Avoid duplicated page padding or gaps and margins that account for the same separation.
- Let `card-body`, `navbar`, and other daisyUI structures provide their internal spacing. Use layout utilities for placement, not to restyle every component's internals.
- Avoid arbitrary pixel values such as `p-[13px]` or `w-[320px]`, inline styling, and negative-margin fixes for ordinary layout. Prefer standard utilities, fluid widths, and responsive columns. When custom styling is justified by a real requirement, keep it narrowly scoped rather than stacking workarounds.

### 3. Theme Colors and Visual Consistency

- Use semantic surfaces and matching content tokens: `bg-base-100 text-base-content`, `bg-base-200 text-base-content`, and `bg-primary text-primary-content`. Let semantic component variants manage their own colors. Reuse the app's theme selection and `data-theme` scope; do not add `dark:` overrides just to restate semantic colors that already change with the theme. If rendering in a portal, check that it inherits the intended theme.
- Do not introduce hardcoded palette colors such as `bg-gray-900` or `text-blue-600` unless the user explicitly requires them. Preserve the app's existing theme rather than creating a separate palette per feature.
- Check affected UI for contrast in supported themes. Semantic tokens support theme switching but do not guarantee accessible contrast, especially with opacity modifiers or custom themes. Meet WCAG AA contrast: 4.5:1 for normal text and 3:1 for large text.
- Keep borders, radius, and elevation consistent with the theme. On custom surfaces, prefer supported theme radius utilities such as `rounded-box`. Add shadows or other decoration only when they communicate hierarchy; do not add a large shadow to every card by default.
- Preserve existing fonts and use a small, consistent type hierarchy for headings, body text, and supporting text. Constrain long-form prose with a standard maximum-width utility, without narrowing data views unnecessarily. Do not add decorative fonts or override control typography for novelty.
- Use motion only to explain a state change or provide useful feedback. Respect reduced-motion preferences with supported utilities such as `motion-reduce:transition-none` and `motion-reduce:animate-none`; keep information and controls usable without animation.


### 4. Follow Existing Architecture

Follow the project's existing organization and framework conventions. Do not restructure unrelated files. For a new application, feature-based modules are one possible starting point, not a required layout:

```text
src/
├── core/                  # Shared primitives and app shell
│   ├── components/        # Universal buttons, modals, cards
│   └── layout/            # AppShell, MobileNav, Header
├── features/              # Isolated feature modules
│   ├── dashboard/         # Feature components, hooks, api
│   └── voice-chat/        # Feature components, hooks, api

```

### 5. Mobile-First App Shell and Accessibility

- Reuse the existing shared layout and navigation without duplicating main landmarks, page wrappers, or scrolling regions. Let content grow naturally; use bounded viewport layouts only when the interaction requires them.
- Account for device safe areas and fixed navigation where relevant. Keep focused inputs visible above the on-screen keyboard.
- Stack content on mobile and expand at larger breakpoints. Avoid page-level horizontal scrolling, clipped labels, and fixed widths that prevent reflow at 200% zoom.
- Require interactive targets of at least 44 by 44 CSS pixels. Check the rendered size rather than assuming a daisyUI size name guarantees it. When needed, use a shared target variant with standard `min-h-12 min-w-12` utilities or enlarge the clickable label area for a checkbox. Keep the visible icon at `size-5` or `size-6` inside an icon button. Do not pad the icon instead of sizing the interactive element.
- Use semantic HTML, visible form labels, accessible names for icon-only buttons, and visible `focus-visible` indicators. Use native `disabled` for unavailable buttons rather than relying on `btn-disabled`; use `type="button"` for non-submit actions inside forms. All controls must work with the keyboard. daisyUI classes provide styling, not complete interaction behavior.

### 6. Separation of Hardware/API Logic from UI

- Keep hardware access, network requests, subscriptions, and cleanup separate from presentation using the project's established hooks, services, or framework APIs. Do not introduce a new architecture solely to follow this skill.

### 7. UI Copy

- Name the action in control labels, such as "Save profile" rather than "Submit". Use the same term for the same concept across headings, labels, navigation, and feedback.
- Explain errors in specific, factual language and provide a recovery action when one exists. Do not promise success or a recovery option the implementation cannot provide.
- Make empty states explain what is absent and identify a useful next action when available. Keep instructions close to the relevant control, and remove promotional filler that does not help the user complete the task.

## Composition Example

This daisyUI 5 example assumes an unprefixed plugin and fits inside the existing page wrapper. The card uses daisyUI parts for structure; the native dialog provides modal behavior. Use the project's shared dialog and button variants when available.

```tsx
import { useId, useRef } from "react";

export function NotificationOptions() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <section className="card card-border bg-base-100 text-base-content">
        <div className="card-body">
          <h2 className="card-title">Weekly activity summary</h2>
          <p>See what the summary email includes.</p>
          <div className="card-actions">
            <button
              className="btn btn-lg"
              type="button"
              onClick={() => dialogRef.current?.showModal()}
            >
              About the weekly summary
            </button>
          </div>
        </div>
      </section>
      <dialog ref={dialogRef} className="modal" aria-labelledby={titleId}>
        <div className="modal-box">
          <h2 id={titleId} className="text-lg font-semibold">
            About the weekly summary
          </h2>
          <p>A weekly overview of your account activity.</p>
          <form method="dialog" className="modal-action">
            <button className="btn btn-lg" type="submit">Close</button>
          </form>
        </div>
      </dialog>
    </div>
  );
}
```

## Verification Before Completion

Verify affected UI proportionately to the change:

- Check that changed components receive their styles in the built app. If a class has no effect, verify the release, plugin prefix and modules, documented part structure, and Tailwind source detection before adding overrides. Map state to complete class strings such as `alert-error` and `alert-success`; do not build them from fragments such as `alert-${status}`.
- Check responsive layout, spacing, hierarchy, and theme consistency in the rendered UI when tools are available. Screenshots can support visual review, not prove functional behavior.
- Check relevant accessibility behavior, including keyboard access, focus, contrast, touch targets, and zoom/reflow.
- Exercise changed controls and relevant loading, empty, validation, and error states. Do not ship dead controls, placeholder links, or fabricated data presented as real.
- Run relevant project checks and report what passed, failed, or remains unverified. Do not infer rendered behavior from class names or claim coverage beyond what was tested.
