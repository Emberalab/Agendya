import { useEffect, useId, useState } from 'react';
import {
  ADMIN_SEARCH_MIN_CHARS,
  PLAN_LABELS,
  type ProfessionalSearchResult,
} from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';

/** Wait this long after the last keystroke before querying the API. */
const SEARCH_DEBOUNCE_MS = 250;

interface ProfessionalSearchProps {
  /** A suggestion was picked (click, or Enter on the highlighted one). */
  onSelect: (email: string) => void;
  /** Enter / "Buscar" without a highlighted suggestion: exact lookup. */
  onSubmit: (text: string) => void;
  /** Called on every keystroke, e.g. to clear stale messages. */
  onType?: () => void;
  busy?: boolean;
}

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; results: ProfessionalSearchResult[] }
  | { status: 'error' };

/**
 * Type-ahead over accounts (email or business name). Searches once the input
 * has ADMIN_SEARCH_MIN_CHARS characters, debounced, cancelling any request
 * still in flight when the text changes. ARIA combobox + listbox pattern:
 * ↑/↓ move, Enter picks, Escape closes.
 */
export function ProfessionalSearch({
  onSelect,
  onSubmit,
  onType,
  busy = false,
}: ProfessionalSearchProps) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const inputId = useId();

  const term = query.trim();
  const ready = term.length >= ADMIN_SEARCH_MIN_CHARS;

  useEffect(() => {
    if (!ready) {
      setState({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState({ status: 'loading' });
      apiClient
        .get<ProfessionalSearchResult[]>('/admin/professionals', {
          params: { q: term },
          signal: controller.signal,
        })
        .then(({ data }) => {
          setState({ status: 'done', results: data });
          setActive(-1);
        })
        .catch(() => {
          if (!controller.signal.aborted) setState({ status: 'error' });
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, ready]);

  const results = state.status === 'done' ? state.results : [];
  const showList = open && ready && state.status !== 'idle';

  const pick = (result: ProfessionalSearchResult) => {
    setQuery(result.email);
    setOpen(false);
    setActive(-1);
    onSelect(result.email);
  };

  const submit = () => {
    if (showList && active >= 0 && results[active]) {
      pick(results[active]);
      return;
    }
    setOpen(false);
    onSubmit(term);
  };

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium mb-2">
        Buscar profesional por correo o negocio
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id={inputId}
            type="search"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              showList && active >= 0 ? `${listId}-${active}` : undefined
            }
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              onType?.();
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && results.length > 0) {
                e.preventDefault();
                setOpen(true);
                setActive((i) => (i + 1) % results.length);
              } else if (e.key === 'ArrowUp' && results.length > 0) {
                e.preventDefault();
                setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              } else if (e.key === 'Escape') {
                setOpen(false);
                setActive(-1);
              }
            }}
            className="w-full px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'var(--color-surface-soft)',
              border: '1px solid var(--color-border)',
            }}
            placeholder="usuario@ejemplo.com"
          />

          {showList && (
            <ul
              id={listId}
              role="listbox"
              aria-label="Profesionales encontrados"
              className="absolute left-0 right-0 mt-1 rounded-lg overflow-hidden z-10 text-sm"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
              }}
            >
              {state.status === 'loading' && (
                <li
                  className="px-3 py-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Buscando…
                </li>
              )}
              {state.status === 'error' && (
                <li
                  className="px-3 py-2"
                  style={{ color: 'var(--color-danger)' }}
                >
                  No se pudo buscar. Intenta de nuevo.
                </li>
              )}
              {state.status === 'done' && results.length === 0 && (
                <li
                  className="px-3 py-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Ninguna cuenta coincide con “{term}”.
                </li>
              )}
              {results.map((result, index) => (
                <li
                  key={result.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // mousedown, not click: runs before the input's blur closes the list.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(result);
                  }}
                  onMouseEnter={() => setActive(index)}
                  className="px-3 py-2 cursor-pointer flex items-center justify-between gap-3"
                  style={{
                    backgroundColor:
                      index === active
                        ? 'var(--color-brand-tint)'
                        : 'transparent',
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {result.email}
                    </span>
                    <span
                      className="block truncate text-xs"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {result.businessName}
                    </span>
                  </span>
                  <span
                    className="shrink-0 text-xs"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {PLAN_LABELS[result.plan]}
                    {result.trialActive && (
                      <span
                        className="ml-2 px-1.5 py-0.5 rounded font-semibold"
                        style={{
                          backgroundColor: 'var(--color-brand-tint)',
                          color: 'var(--color-text-brand)',
                        }}
                      >
                        Prueba
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'var(--color-brand-primary)',
            color: 'var(--color-text-on-brand)',
            opacity: busy ? 0.5 : 1,
          }}
        >
          {busy ? 'Buscando…' : 'Buscar'}
        </button>
      </div>
      {term.length > 0 && !ready && (
        <p
          className="mt-2 text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Escribe al menos {ADMIN_SEARCH_MIN_CHARS} caracteres para buscar.
        </p>
      )}
    </div>
  );
}
