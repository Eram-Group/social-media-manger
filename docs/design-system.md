# Design System & Theme — URViral Client

> Reference for building consistent client-side screens. Source of truth: `client/tailwind.config.js`, `client/src/index.css`, `client/components.json`, `client/src/shadecn/`, `client/src/shared/UI/`.

## Brand & color palette
Colors are Tailwind tokens (used as `bg-primary-800`, `text-neutral-700`, …). Five scales + semantics.

**Primary (blue — brand / CTAs):** `primary-100 #F7FBFF` → `primary-800 #025FCC` (main CTA) → `primary-900 #024CA3` (hover) → `primary-1300 #001329`. Mid stops: 200 `#DEEBFA`, 300 `#C6DCF5`, 600 `#649DE0`, 700 `#337ED6`, 1000 `#01397A`.

**Secondary (cyan):** `secondary-100 #FFFFFF` → `secondary-200 #EDFBFF` (badge bg) → `secondary-800 #4ED6FC` → `secondary-1400 #092D38`.

**Accent (gold):** `accent-100 #FDF9E5` → `accent-800 #F0C500` (emphasis) → `accent-1400 #181400`.

**Neutral (gray):** `neutral-100 #F1F1F1` → `neutral-200 #E3E3E3` (borders) → `neutral-500 #ACACAC` (secondary text) → `neutral-700 #757575` (body) → `neutral-1000 #2F2F2F` → `neutral-1300 #0C0C0C`.

**Dark-mode primary:** `dark-primary-100 #CEDAEE` (light text) → `dark-primary-1000 #172742` (bg) → `dark-primary-1400 #04060B`.

**Semantic tokens**
| Token | Value | Use |
|---|---|---|
| `text-dark` | `#000A14` | primary text |
| `text-medium` | `#737373` | secondary text |
| `text-darker` | `#3B3B3B` | strong text |
| `text-red` | `#D50415` | error / delete |
| `text-light_red` | `#FDA29B` | light error |
| `text-green` | `#00A87E` | success |
| `surface-background` | `#FAFCFF` | page background |
| `surface-white` | `#FFFFFF` | component bg |
| `icon-grey` | `#4B4B4B` | icons |
| `icon-dark` | `#001329` | dark icons |
| `warnings-caution` / `warnings-cautionBg` | `#B54708` / `#FFFAEB` | caution |
| `warnings-success` / `warnings-successBg` | `#00A87E` / `#ECFDF3` | success |
| `stroke-Primary-light` | `#C6D8ED` | focus border |

**Gradients:** `button-gradient` `linear-gradient(0deg,#024CA3,#025FCC)`; `border-gradient` `linear-gradient(90.35deg,#025FCC,#01397A)`. Helper classes in `index.css`: `.text-gradient`, `.border-gradient-wrapper:focus-within`.

> **EPCC rebrand note:** the palette is token-driven, so re-skinning to Chamber colors = editing `tailwind.config.js` color values; components consume tokens, not raw hex.

## Typography
Fonts (Google Fonts, imported in `index.css`): **Montserrat** (`font-Montserrat`, headings), **Poppins** (`font-Poppins`, body/default), **Sora** (`font-Sora`, alt headings). Base `16px`, body `Poppins`.
| Role | Classes |
|---|---|
| Page title | `font-Sora text-2xl font-semibold` |
| Section header | `text-lg font-semibold` |
| Body | `text-sm text-neutral-700` |
| Label | `text-sm font-medium` |
| Helper | `text-xs text-neutral-600` |
| Required `*` | `text-xs font-medium text-text-red` |

## Spacing, radius, shadows
- **Spacing:** Tailwind scale; common `gap-2/3/4/6`, `p-3/p-6`, `px-3 py-2` (inputs/buttons).
- **Radius:** `rounded-md` (6px), `rounded-lg` (8px, inputs/buttons), `rounded-xl` (12px, cards), `rounded-2xl` (badges), `rounded-full` (avatars).
- **Shadows** (custom): `shadow-1`…`shadow-7`. Common: inputs `shadow-6`, cards `shadow-7` (`0 4px 14px rgba(0,0,0,.05)`), button hover `shadow-4`.
- **Breakpoints:** standard `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536` + custom `x 1440`.

## UI primitives — shadcn (`src/shadecn/components/ui/`)
Config (`components.json`): **New York** style, base **slate**, aliases `@/shadecn/components` + `@/shadecn/lib/utils`.
Available: `button, input, textarea, card, dialog, sheet, badge, label, form, select, popover, command, checkbox, radio-group, slider, switch, tabs, avatar, progress, separator, tooltip, calendar, pagination, chart, skeleton, table`.

**shadcn Button** (`cva`): variants `default | destructive | outline | secondary | ghost | link | warning | info`; sizes `default | sm | lg | icon`.

## Shared components (`src/shared/UI/`, barrel `index.ts`)
Import via `@UI/index`. Highlights:
- **Button** — variants `primary` (default, `bg-primary-800`), `outline`, `outlined-secondry`, `tinted`, `text`, `error`, `destructive`; sizes `small | medium | large`; `loading`, `leftIcon`, `rightIcon`.
- **Inputs:** `MainInput`, `MaintextArea` (max-length counter), `MainSelect`, `MainMultiSelect`, `MainMultipleCheckbox`, `MainMultipleRadio`, `MainRangeInput`, `EmailChipsInput`, `MainDatePicker`.
- **Layout/nav:** `MainSidebare`, `MainNavbare`, `Stepper`, `Divider`.
- **Data:** `MainTable` (TanStack), `MainPagination`, `BadgeList`.
- **Media/people:** `MainAvatar` (sizes xs–4xl, online dot), `AvaterGroup`, `MainImgUpload`, `MainAttachmentUpload`.
- **Overlay/feedback:** `MainModal`, `Tooltip`, `ReadMore`, `GradientIcon`, `ViralIlustrator`.

### Button usage
```tsx
import { Button } from '@UI/index';
<Button variant="primary" size="large" loading={isSaving}>Save</Button>
<Button variant="outline" leftIcon={<Icon/>}>Cancel</Button>
```

## Icons
Primary **Hugeicons** (`@hugeicons/react` + `@hugeicons/core-free-icons`); **Lucide** for common (`Loader2`, `X`, `Bell`); `react-icons` and Radix icons appear occasionally. Sizes: inline `h-4 w-4`, standard `h-5 w-5`/`size={20}`, actions `h-6 w-6`. Brand gradient icons via `GradientIcon`. Platform/illustration SVGs in `src/assets/`.
```tsx
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
<HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
```

## Motion & loading
- Tailwind `animate-spin | animate-pulse | animate-ping`; custom `accordion-down/up` keyframes.
- Framer Motion for entrance/exit (`AnimatePresence` + `motion.div`).
- Loading: `<Button loading>`, `Skeleton`, `react-loader-spinner`.

## Storybook
`.storybook/` (Vite + React); `*.stories.tsx` co-located in `src/shared/UI/*` (Avatar, Modal, Pagination, Navbar, Tooltip, ImgUpload). Run `npm run storybook` (:6006).

## How to style a new screen — do's & don'ts
**Do**
- Use semantic tokens: `bg-surface-background`, `bg-primary-800 text-secondary-100`, `text-text-medium`, `text-warnings-success`.
- Reuse shared components (`@UI/index`) before building new ones.
- Merge classes with `cn()`; expose `className` for overrides.
- Page shell: `<div className="flex flex-col gap-6">`; card: `rounded-xl border border-neutral-200 bg-white p-6 shadow-7`.
- Responsive-first: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`, `flex-col lg:flex-row`.
- Focus states: `focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-300`.

**Don't**
- ❌ Arbitrary colors (`bg-blue-500`) — use tokens.
- ❌ Inline styles for things Tailwind covers; ❌ hardcoded px spacing.
- ❌ Override a component's look by clobbering its base classes — use its `variant`/`className`.
- ❌ Reinvent inputs/modals/tables — they exist in `@UI/index`.
- ❌ Skip loading/disabled/error states.
