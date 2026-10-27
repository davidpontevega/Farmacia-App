"use client";

import { useId, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { filterCategories } from "@/lib/categories";
import { useCategories } from "../hooks/use-products";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
  className?: string;
};

/** Elige una categoría de la lista o escribe una nueva y la agrega con «Crear». */
export function CategoryCombobox({ id, value, onChange, className, ...rest }: Props) {
  const all = useCategories();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = useId();
  const root = useRef<HTMLDivElement>(null);
  const { matches, isNew } = filterCategories(all, value);
  const typed = value.trim();
  const options = [...matches, ...(isNew ? [typed] : [])];

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={list}
        aria-autocomplete="list"
        aria-activedescendant={open && options.length ? `${list}-${active}` : undefined}
        autoComplete="off"
        placeholder="Elige o escribe una categoría"
        className={className}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open && options[active]) {
            e.preventDefault();
            pick(options[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        {...rest}
      />
      {open && options.length > 0 && (
        <ul id={list} role="listbox" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-xl border bg-popover p-1 shadow-lg">
          {options.map((c, i) => {
            const creating = isNew && i === options.length - 1;
            const selected = !creating && c.trim().toLocaleLowerCase("es") === typed.toLocaleLowerCase("es");
            return (
              <li
                key={`${creating ? "new" : "old"}-${c}`}
                id={`${list}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
                className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm ${i === active ? "bg-secondary text-secondary-foreground" : ""}`}
              >
                {creating ? <Plus className="size-4 text-primary" aria-hidden="true" /> : selected ? <Check className="size-4 text-primary" aria-hidden="true" /> : <span className="size-4" />}
                {creating ? (
                  <span>
                    Crear categoría «<strong>{c}</strong>»
                  </span>
                ) : (
                  c
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
