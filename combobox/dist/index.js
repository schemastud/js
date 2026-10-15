// src/Combobox.tsx
import { useEffect, useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
function Combobox({
  primitives,
  trigger,
  search,
  onSelect,
  currentValue,
  placeholder = "Search\u2026",
  emptyText = "No matches",
  loadingText = "Searching\u2026",
  debounceMs = 200,
  contentClassName,
  inputClassName,
  listClassName,
  optionClassName
}) {
  const { Popover, PopoverTrigger, PopoverContent, Input } = primitives;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const requestSeq = useRef(0);
  const inputRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const seq = ++requestSeq.current;
    setLoading(true);
    const timer = setTimeout(() => {
      search(query).then((result) => {
        if (cancelled || seq !== requestSeq.current) return;
        setOptions(result);
        setActiveIndex(0);
      }).catch(() => {
        if (cancelled || seq !== requestSeq.current) return;
        setOptions([]);
      }).finally(() => {
        if (cancelled || seq !== requestSeq.current) return;
        setLoading(false);
      });
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query, search, debounceMs]);
  useEffect(() => {
    if (open) {
      setQuery("");
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);
  const choose = (option) => {
    onSelect(option);
    setOpen(false);
  };
  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) choose(option);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };
  return /* @__PURE__ */ jsxs(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: trigger }),
    /* @__PURE__ */ jsxs(
      PopoverContent,
      {
        className: contentClassName ?? "w-72 p-0",
        onOpenAutoFocus: (event) => event.preventDefault(),
        children: [
          /* @__PURE__ */ jsx("div", { className: "border-b border-border p-1.5", children: /* @__PURE__ */ jsx(
            Input,
            {
              ref: inputRef,
              value: query,
              onChange: (event) => setQuery(event.target.value),
              onKeyDown,
              placeholder,
              className: inputClassName ?? "h-8",
              "aria-label": placeholder
            }
          ) }),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: listClassName ?? "max-h-72 overflow-y-auto p-1",
              role: "listbox",
              children: loading ? /* @__PURE__ */ jsx("div", { className: "px-2 py-2 text-sm text-muted-foreground", children: loadingText }) : options.length === 0 ? /* @__PURE__ */ jsx("div", { className: "px-2 py-2 text-sm text-muted-foreground", children: emptyText }) : options.map((option, index) => {
                const current = option.value === currentValue;
                const active = index === activeIndex;
                return /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    role: "option",
                    "aria-selected": current,
                    onMouseEnter: () => setActiveIndex(index),
                    onClick: () => choose(option),
                    className: optionClassName ?? `flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors ${active ? "bg-accent" : ""} ${current ? "font-medium" : ""}`,
                    children: [
                      /* @__PURE__ */ jsx("span", { className: "mt-0.5 w-3 shrink-0 text-primary", children: current ? "\u2713" : "" }),
                      /* @__PURE__ */ jsxs("span", { className: "min-w-0 flex-1", children: [
                        /* @__PURE__ */ jsx("span", { className: "block truncate", children: option.label }),
                        option.hint && /* @__PURE__ */ jsx("span", { className: "block truncate text-xs text-muted-foreground", children: option.hint })
                      ] })
                    ]
                  },
                  option.value
                );
              })
            }
          )
        ]
      }
    )
  ] });
}
export {
  Combobox
};
//# sourceMappingURL=index.js.map