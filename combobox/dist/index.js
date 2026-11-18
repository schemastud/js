// src/Combobox.tsx
import { useState as useState2 } from "react";

// src/messages.ts
import { useMessages } from "@schemastud/messages/react";

// messages.default.json
var messages_default_default = {
  version: 1,
  package: "@schemastud/combobox",
  sourceLocale: "en",
  namespace: "schemastud-combobox",
  sharesWith: null,
  messages: {
    "schemastud-combobox::messages.search": "Search\u2026",
    "schemastud-combobox::messages.no_matches": "No matches",
    "schemastud-combobox::messages.searching": "Searching\u2026"
  }
};

// src/messages.ts
var useComboboxMessages = () => useMessages(messages_default_default.messages);

// src/ComboboxList.tsx
import { useEffect, useId, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function ComboboxList({
  Input,
  search,
  onSelect,
  selectedValues = [],
  multiple = false,
  open = true,
  onOpenChange,
  autoFocus = false,
  label,
  placeholder,
  emptyText,
  loadingText,
  debounceMs = 200,
  inputClassName,
  inputWrapperClassName,
  listClassName,
  optionClassName,
  inputRef
}) {
  const messages = useComboboxMessages();
  placeholder ??= messages.t("schemastud-combobox::messages.search");
  emptyText ??= messages.t("schemastud-combobox::messages.no_matches");
  loadingText ??= messages.t("schemastud-combobox::messages.searching");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const ownInput = useRef(null);
  const requestSeq = useRef(0);
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
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) setQuery("");
    wasOpen.current = open;
    if (open && autoFocus) {
      const id = requestAnimationFrame(() => ownInput.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open, autoFocus]);
  const choose = (option) => {
    onSelect(option);
    setQuery("");
  };
  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        onOpenChange?.(true);
        return;
      }
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      if (!open || loading) return;
      event.preventDefault();
      const option = options[activeIndex];
      if (option) choose(option);
    } else if (event.key === "Escape") {
      if (open && onOpenChange) {
        event.preventDefault();
        onOpenChange(false);
      }
    }
  };
  const optionId = (index) => `${listId}-option-${index}`;
  const showOptions = open && !loading && options.length > 0;
  const input = /* @__PURE__ */ jsx(
    Input,
    {
      ref: (node) => {
        ownInput.current = node;
        if (typeof inputRef === "function") inputRef(node);
        else if (inputRef) inputRef.current = node;
      },
      role: "combobox",
      "aria-label": label ?? placeholder,
      "aria-expanded": open,
      "aria-controls": open ? listId : void 0,
      "aria-autocomplete": "list",
      "aria-activedescendant": showOptions && options[activeIndex] ? optionId(activeIndex) : void 0,
      value: query,
      onChange: (event) => {
        setQuery(event.target.value);
        if (!open) onOpenChange?.(true);
      },
      onFocus: () => {
        if (!open) onOpenChange?.(true);
      },
      onKeyDown,
      placeholder,
      className: inputClassName ?? "h-8",
      autoComplete: "off"
    }
  );
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    inputWrapperClassName ? /* @__PURE__ */ jsx("div", { className: inputWrapperClassName, children: input }) : input,
    open && /* @__PURE__ */ jsx(
      "div",
      {
        id: listId,
        role: "listbox",
        "aria-label": label ?? placeholder,
        "aria-multiselectable": multiple || void 0,
        className: listClassName ?? "max-h-72 overflow-y-auto p-1",
        children: loading ? /* @__PURE__ */ jsx("div", { className: "px-2 py-2 text-sm text-muted-foreground", children: loadingText }) : options.length === 0 ? /* @__PURE__ */ jsx("div", { className: "px-2 py-2 text-sm text-muted-foreground", children: emptyText }) : options.map((option, index) => {
          const current = selectedValues.includes(option.value);
          const active = index === activeIndex;
          return /* @__PURE__ */ jsxs(
            "div",
            {
              id: optionId(index),
              role: "option",
              "aria-selected": current,
              "data-active": active || void 0,
              onMouseEnter: () => setActiveIndex(index),
              onMouseDown: (event) => event.preventDefault(),
              onClick: () => choose(option),
              className: optionClassName ?? `flex w-full cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors ${active ? "bg-accent" : ""} ${current ? "font-medium" : ""}`,
              children: [
                /* @__PURE__ */ jsx("span", { className: "mt-0.5 w-3 shrink-0 text-primary", "aria-hidden": "true", children: current ? "\u2713" : "" }),
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
  ] });
}

// src/Combobox.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function Combobox({
  primitives,
  trigger,
  search,
  onSelect,
  currentValue,
  multiple = false,
  placeholder,
  emptyText,
  loadingText,
  debounceMs,
  contentClassName,
  inputClassName,
  listClassName,
  optionClassName
}) {
  const { Popover, PopoverTrigger, PopoverContent, Input } = primitives;
  const [open, setOpen] = useState2(false);
  const selectedValues = currentValue === void 0 ? [] : typeof currentValue === "string" ? [currentValue] : currentValue;
  return /* @__PURE__ */ jsxs2(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx2(PopoverTrigger, { asChild: true, children: trigger }),
    /* @__PURE__ */ jsx2(
      PopoverContent,
      {
        className: contentClassName ?? "w-72 p-0",
        onOpenAutoFocus: (event) => event.preventDefault(),
        children: /* @__PURE__ */ jsx2(
          ComboboxList,
          {
            inputWrapperClassName: "border-b border-border p-1.5",
            Input,
            search,
            onSelect: (option) => {
              onSelect(option);
              if (!multiple) setOpen(false);
            },
            selectedValues,
            multiple,
            open,
            onOpenChange: setOpen,
            autoFocus: true,
            placeholder,
            emptyText,
            loadingText,
            debounceMs,
            inputClassName,
            listClassName,
            optionClassName
          }
        )
      }
    )
  ] });
}
export {
  Combobox,
  ComboboxList
};
//# sourceMappingURL=index.js.map