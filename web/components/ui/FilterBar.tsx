import { MagnifyingGlassIcon } from "@/components/icons";
import { Select, type SelectOption } from "@/components/ui/Select";

export interface FilterConfig {
  name: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

export interface FilterBarProps {
  search?: { value: string; placeholder?: string; onChange: (value: string) => void };
  filters?: FilterConfig[];
}

export function FilterBar({ search, filters }: FilterBarProps) {
  if (!search && !filters?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3.5">
      {search && (
        <div className="relative min-w-[220px] flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="text"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "Search…"}
            className="focus-ring w-full rounded-control border border-border-strong bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-faint"
          />
        </div>
      )}
      {filters?.map((filter) => (
        <Select
          key={filter.name}
          compact
          className="w-44"
          options={filter.options}
          value={filter.value}
          onChange={filter.onChange}
          placeholder={filter.name}
          isClearable
        />
      ))}
    </div>
  );
}
