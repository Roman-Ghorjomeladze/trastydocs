import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

export interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  onSearch?: (query: string) => Promise<MultiSelectOption[]>;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  onSearch,
  disabled = false,
  className = '',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [asyncOptions, setAsyncOptions] = useState<MultiSelectOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // When onSearch is provided, show static options initially and async results when searching
  const displayOptions = onSearch
    ? query.trim() ? asyncOptions : options
    : options;

  const filteredOptions = query.trim()
    ? displayOptions.filter((opt) => {
        const q = query.toLowerCase();
        return (
          opt.label.toLowerCase().includes(q) ||
          (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
        );
      })
    : displayOptions;

  // Find labels for selected values (check both static and async options)
  const allKnown = [...options, ...asyncOptions];
  const selectedOptions = value
    .map((v) => allKnown.find((o) => o.value === v))
    .filter(Boolean) as MultiSelectOption[];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Async search with debounce
  const handleQueryChange = useCallback(
    (q: string) => {
      setQuery(q);
      if (!onSearch) return;

      clearTimeout(debounceRef.current);
      if (!q.trim()) {
        setAsyncOptions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await onSearch(q);
          setAsyncOptions(results);
        } catch {
          setAsyncOptions([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [onSearch],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const removeValue = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 border border-border rounded-lg text-sm text-left flex items-center justify-between gap-2 transition-colors outline-none min-h-[38px]',
          disabled
            ? 'opacity-50 cursor-not-allowed bg-muted'
            : 'bg-card hover:border-accent/50 focus:ring-2 focus:ring-accent focus:border-accent',
        )}
      >
        <div className="flex-1 flex flex-wrap gap-1 min-w-0">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent/10 text-accent text-xs font-medium max-w-[150px]"
              >
                <span className="truncate">{opt.label}</span>
                <X
                  className="w-3 h-3 flex-shrink-0 hover:text-accent-hover"
                  onClick={(e) => removeValue(e, opt.value)}
                />
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value.length > 0 && (
            <span
              onClick={clearAll}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180',
            )}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search..."
              className="w-full px-2.5 py-1.5 border border-border rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {isSearching ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                Searching...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                {query.trim() ? 'No results found' : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption(option.value)}
                    className={cn(
                      'w-full px-3 py-2 text-sm text-left flex items-center justify-between transition-colors',
                      isSelected
                        ? 'bg-accent/10 text-accent'
                        : 'text-foreground hover:bg-muted',
                    )}
                  >
                    <div className="min-w-0">
                      <span>{option.label}</span>
                      {option.sublabel && (
                        <span className="text-muted-foreground ml-1.5 text-xs font-mono">
                          {option.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-accent flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
