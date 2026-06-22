import { ReactNode, useState } from 'react';
import { format, parse } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Input } from '@/shadecn/components/ui/input';
import { Textarea } from '@/shadecn/components/ui/textarea';
import Calendar from '@/shadecn/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shadecn/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shadecn/components/ui/select';
import { cn } from '@/shadecn/lib/utils';

// Design-system form primitives for the EPCC demo — wrap the shadcn UI inputs so
// every form field shares the app's label/spacing/focus styling.

const Label = ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-800">
    {children}
  </label>
);

export const DsField = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  leftIcon,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  leftIcon?: ReactNode;
  className?: string;
}) => (
  <div className={cn('flex flex-col gap-2', className)}>
    {label && <Label>{label}</Label>}
    <Input
      type={type}
      value={value}
      placeholder={placeholder}
      leftIcon={leftIcon}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

export const DsTextarea = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 5,
  maxLength,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) => (
  <div className="flex flex-col gap-2">
    {label && (
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {maxLength && (
          <span className="text-xs text-neutral-500">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    )}
    <Textarea
      value={value}
      rows={rows}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-0"
    />
  </div>
);

// Design-system date picker (Popover + Calendar) — value/onChange are 'yyyy-MM-dd'.
export const DsDatePicker = ({
  label, value, onChange,
}: { label?: string; value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const date = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  return (
    <div className="flex flex-col gap-2">
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="flex min-h-10 items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-6 outline outline-1 outline-neutral-200 transition-all hover:outline-neutral-300 focus-visible:outline-2 focus-visible:outline-primary-300">
            <span className={date ? 'text-neutral-900' : 'text-neutral-500'}>
              {date ? format(date, 'EEE, dd MMM yyyy') : 'Select a date'}
            </span>
            <CalendarDays size={16} className="text-neutral-500" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={(d: Date | undefined) => { if (d) { onChange(format(d, 'yyyy-MM-dd')); setOpen(false); } }} />
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Design-system time picker (Select of 30-min slots), value/onChange are 'HH:mm'.
const TIME_SLOTS = (() => {
  const out: { value: string; label: string }[] = [];
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 30]) {
      const v = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const ap = h < 12 ? 'AM' : 'PM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      out.push({ value: v, label: `${h12}:${String(m).padStart(2, '0')} ${ap}` });
    }
  }
  return out;
})();

export const DsTimePicker = ({
  label, value, onChange,
}: { label?: string; value: string; onChange: (v: string) => void }) => {
  const slots = TIME_SLOTS.some((s) => s.value === value) ? TIME_SLOTS : [{ value, label: value }, ...TIME_SLOTS];
  return (
    <div className="flex flex-col gap-2">
      {label && <Label>{label}</Label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="min-h-10 rounded-lg text-sm shadow-6 outline outline-1 outline-neutral-200">
          <SelectValue placeholder="Select a time" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {slots.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
};

export interface IDsOption {
  label: string;
  value: string;
}

export const DsSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: IDsOption[];
  placeholder?: string;
}) => (
  <div className="flex flex-col gap-2">
    {label && <Label>{label}</Label>}
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="min-h-10 rounded-lg text-sm shadow-6 outline outline-1 outline-neutral-200">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
