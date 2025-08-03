/**
 * Select Component
 *
 * Dropdown select for choosing from options
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';

interface SelectContextValue {
  value: string | undefined;
  onValueChange: ((value: string) => void) | undefined;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined);

const Select = ({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

const useSelectContext = () => {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within <Select>');
  }
  return context;
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { open, setOpen } = useSelectContext();

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        open && 'ring-2 ring-ring ring-offset-2',
        className
      )}
      aria-expanded={open}
      aria-haspopup="listbox"
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

const SelectValue = ({
  placeholder,
}: {
  placeholder?: string;
}) => {
  const { value } = useSelectContext();
  const [displayValue, setDisplayValue] = React.useState<string>('');

  React.useEffect(() => {
    if (value) {
      // This will be updated by SelectItem when it matches
      const item = document.querySelector(`[data-value="${value}"]`);
      if (item) {
        setDisplayValue(item.textContent || value);
      }
    }
  }, [value]);

  return <span>{displayValue || placeholder || 'Select...'}</span>;
};

const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelectContext();

    if (!open) return null;

    return (
      <>
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
        <div
          ref={ref}
          className={cn(
            'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md',
            'animate-in fade-in-0 zoom-in-95',
            className
          )}
          role="listbox"
          {...props}
        >
          {children}
        </div>
      </>
    );
  }
);
SelectContent.displayName = 'SelectContent';

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string;
  }
>(({ className, value, children, ...props }, ref) => {
  const { value: selectedValue, onValueChange, setOpen } = useSelectContext();
  const isSelected = value === selectedValue;

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={isSelected}
      data-value={value}
      onClick={() => {
        onValueChange?.(value);
        setOpen(false);
      }}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
        'focus:bg-accent focus:text-accent-foreground',
        'hover:bg-accent hover:text-accent-foreground',
        isSelected && 'bg-accent text-accent-foreground',
        className
      )}
      {...props}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
      {children}
    </div>
  );
});
SelectItem.displayName = 'SelectItem';

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
