"use client";

import { useRef } from "react";
import ReactSelect, { type ClassNamesConfig, type GroupBase } from "react-select";
import AsyncReactSelect from "react-select/async";

export interface SelectOption {
  label: string;
  value: string;
}

interface FieldChromeProps {
  label?: string;
  hint?: string;
  error?: string;
  id?: string;
}

/**
 * Tailwind classes for react-select in `unstyled` mode, so the dropdown uses
 * the same tokens as every other control (light/dark included).
 */
function buildClassNames(
  error: boolean,
  compact: boolean,
): ClassNamesConfig<SelectOption, false, GroupBase<SelectOption>> {
  return {
    control: ({ isFocused, isDisabled }) =>
      [
        "w-full rounded-control border bg-surface text-sm text-ink transition-colors",
        compact ? "min-h-9 px-2.5" : "min-h-[42px] px-3",
        error
          ? "border-danger"
          : isFocused
            ? "border-accent ring-2 ring-accent/30"
            : "border-border-strong hover:border-faint",
        isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      ].join(" "),
    valueContainer: () => "gap-1 py-0.5",
    placeholder: () => "text-faint",
    input: () => "text-ink",
    singleValue: () => "text-ink",
    indicatorsContainer: () => "gap-1",
    clearIndicator: () => "rounded-control p-1 text-faint hover:text-ink",
    dropdownIndicator: () => "rounded-control p-1 text-faint hover:text-ink",
    menu: () => "mt-1 overflow-hidden rounded-surface border border-border bg-surface-raised shadow-md",
    menuList: () => "max-h-64 overflow-y-auto p-1",
    option: ({ isFocused, isSelected }) =>
      [
        "cursor-pointer rounded-control px-3 py-2 text-sm",
        isSelected ? "bg-accent text-accent-contrast" : isFocused ? "bg-canvas-subtle text-ink" : "text-ink",
      ].join(" "),
    noOptionsMessage: () => "px-3 py-3 text-sm text-muted",
    loadingMessage: () => "px-3 py-3 text-sm text-muted",
  };
}

function Chrome({ label, hint, error, id, children }: FieldChromeProps & { children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export interface SelectProps extends FieldChromeProps {
  options: SelectOption[];
  /** Selected option value; "" means nothing selected. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isClearable?: boolean;
  isSearchable?: boolean;
  isDisabled?: boolean;
  /** Smaller control for filter bars. */
  compact?: boolean;
  className?: string;
}

/**
 * The app's dropdown. Wraps react-select, so every dropdown gets type-to-search,
 * keyboard navigation and a clear button for free. Use this instead of a native <select>.
 */
export function Select({
  options,
  value,
  onChange,
  label,
  hint,
  error,
  id,
  placeholder = "Select…",
  isClearable = false,
  isSearchable = true,
  isDisabled,
  compact = false,
  className,
}: SelectProps) {
  const selected = options.find((o) => o.value === value) ?? null;
  return (
    <div className={className}>
      <Chrome label={label} hint={hint} error={error} id={id}>
        <ReactSelect<SelectOption, false>
          inputId={id}
          unstyled
          options={options}
          value={selected}
          onChange={(option) => onChange(option?.value ?? "")}
          placeholder={placeholder}
          isClearable={isClearable}
          isSearchable={isSearchable}
          isDisabled={isDisabled}
          classNames={buildClassNames(!!error, compact)}
          menuPlacement="auto"
          noOptionsMessage={() => "No matches"}
        />
      </Chrome>
    </div>
  );
}

export interface AsyncSelectProps extends FieldChromeProps {
  /** Called with the typed text (debounced). Return the options to show. */
  loadOptions: (input: string) => Promise<SelectOption[]>;
  value: SelectOption | null;
  onChange: (option: SelectOption | null) => void;
  placeholder?: string;
  isClearable?: boolean;
  isDisabled?: boolean;
  formatOptionLabel?: (option: SelectOption) => React.ReactNode;
  className?: string;
}

/** Searches the server as you type (250 ms debounce). */
export function AsyncSelect({
  loadOptions,
  value,
  onChange,
  label,
  hint,
  error,
  id,
  placeholder = "Search…",
  isClearable = true,
  isDisabled,
  formatOptionLabel,
  className,
}: AsyncSelectProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounced = (input: string) =>
    new Promise<SelectOption[]>((resolve) => {
      if (timer.current) clearTimeout(timer.current);
      // Superseded requests are ignored by react-select, so leaving them pending is fine.
      timer.current = setTimeout(
        () => {
          loadOptions(input).then(resolve, () => resolve([]));
        },
        input ? 250 : 0,
      );
    });

  return (
    <div className={className}>
      <Chrome label={label} hint={hint} error={error} id={id}>
        <AsyncReactSelect<SelectOption, false>
          inputId={id}
          unstyled
          defaultOptions
          cacheOptions
          loadOptions={debounced}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          isClearable={isClearable}
          isDisabled={isDisabled}
          classNames={buildClassNames(!!error, false)}
          formatOptionLabel={formatOptionLabel}
          menuPlacement="auto"
          noOptionsMessage={({ inputValue }) => (inputValue ? "No matches" : "Start typing to search")}
          loadingMessage={() => "Searching…"}
        />
      </Chrome>
    </div>
  );
}
