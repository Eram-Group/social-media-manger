---
name: create-component
description: Use when adding a new React component to the URViral client (client/) — decides between a reusable shared UI component and a feature sub-component, then scaffolds it with the project's cn()/variant/Tailwind-token conventions, barrel export, and optional Storybook story.
---

# Create a new component — URViral client

First decide the kind, then follow that section. Reference: `documentation/client/design-system.md`, `client/CLAUDE.md`.

- **Reusable across features** (input, modal, card, badge…) → **Shared UI** in `src/shared/UI/`, named `Main<Name>` (or a primitive like `Button`), exported from the barrel.
- **Belongs to one feature** → **Feature sub-component** in `src/modules/<Feature>/_components/`, no barrel.

Before creating: check `@UI/index` and `src/shadecn/components/ui/` — the component may already exist. Prefer composing existing ones.

## A. Shared UI component
Path: `src/shared/UI/<ComponentName>/<ComponentName>.tsx`. Use `cn()`, expose `className`, use variant/size props and **semantic color tokens** (`bg-primary-800`, `text-text-medium`…), never arbitrary colors.
```tsx
import React from 'react';
import { cn } from '@/shadecn/lib/utils';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined';
  size?: 'small' | 'medium' | 'large';
}

const MainStatCard: React.FC<Props> = ({
  variant = 'default',
  size = 'medium',
  className,
  ...props
}) => (
  <div
    className={cn(
      'rounded-xl border bg-white shadow-7',
      { 'border-neutral-200': variant === 'default',
        'border-primary-300': variant === 'outlined' },
      { 'p-4': size === 'small', 'p-6': size === 'medium', 'p-8': size === 'large' },
      className,
    )}
    {...props}
  />
);

export default MainStatCard;
```
Then add it to the barrel `src/shared/UI/index.ts`:
```ts
export { default as MainStatCard } from './MainStatCard/MainStatCard';
```
Use it anywhere via `import { MainStatCard } from '@UI/index'`.

Optional Storybook story — `src/shared/UI/<ComponentName>/<ComponentName>.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import MainStatCard from './MainStatCard';

const meta = { component: MainStatCard, tags: ['autodocs'] } satisfies Meta<typeof MainStatCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { variant: 'default' } };
export const Outlined: Story = { args: { variant: 'outlined' } };
```

## B. Feature sub-component
Path: `src/modules/<Feature>/_components/<Name>.tsx`. Typed props, default export, compose shared UI. Forms use React Hook Form + Yup.
```tsx
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { Form, FormField } from '@/shadecn/components/ui/form';
import { MainInput, Button } from '@UI/index';

const schema = Yup.object({ name: Yup.string().required('Name is required') });

interface Props {
  onSubmit: (data: { name: string }) => Promise<void>;
  isLoading?: boolean;
}

export default function ReportForm({ onSubmit, isLoading }: Props) {
  const form = useForm({ resolver: yupResolver(schema) });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => <MainInput field={field} label="Report name" />}
        />
        <Button type="submit" variant="primary" loading={isLoading}>Save</Button>
      </form>
    </Form>
  );
}
```

## Rules (both kinds)
- `cn()` for class merging; semantic Tailwind tokens only; reuse `@UI/index`.
- PascalCase file + default export; props interface named `Props` (or `I<Name>Props`).
- Handle loading/disabled/error states; errors via `useErrorToast`.
- Keep shared components presentational — pass data/handlers via props, don't fetch inside them.
