// src/cn.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// src/sort.ts
function parseSort(sort) {
  if (!sort) return [];
  return sort.split(",").map((raw) => raw.trim()).filter(Boolean).map(
    (raw) => raw.startsWith("-") ? { field: raw.slice(1), desc: true } : { field: raw, desc: false }
  );
}
function serializeSort(keys) {
  if (keys.length === 0) return null;
  return keys.map((k) => k.desc ? `-${k.field}` : k.field).join(",");
}
function toggleSortKey(keys, field, append) {
  const existing = keys.find((k) => k.field === field);
  if (!append) {
    if (keys.length === 1 && existing) {
      return existing.desc ? [] : [{ field, desc: true }];
    }
    return [{ field, desc: false }];
  }
  if (!existing) {
    return [...keys, { field, desc: false }];
  }
  if (!existing.desc) {
    return keys.map((k) => k.field === field ? { field, desc: true } : k);
  }
  return keys.filter((k) => k.field !== field);
}
function sortStateFor(keys, field) {
  const index = keys.findIndex((k) => k.field === field);
  if (index === -1) return { active: false, desc: false, index: -1 };
  return { active: true, desc: keys[index].desc, index };
}

// src/button.tsx
import { cva } from "class-variance-authority";
import "react";

// src/hit-target.ts
var hitTargetFloor = 'relative before:absolute before:left-1/2 before:top-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[""] md:before:hidden';

// src/button.tsx
import { jsx } from "react/jsx-runtime";
var buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Disabled takes a foreground tint of whatever it sits on, not the base `opacity-50`:
        // halving a bright dark-scheme primary AND its dark label over a dark canvas left dark
        // text on muted green, unreadable (beam VR pass 2: Save / Connect / Install while
        // pending). A tint rather than `bg-muted`, which matched the light page and lost the
        // button's shape there.
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-100 disabled:bg-foreground/10 disabled:text-foreground/55 disabled:shadow-none",
        destructive: "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        // Outline and secondary follow the same rule, adapted: a disabled outline keeps its
        // frame as a faint foreground hairline with a dimmed label (half opacity greyed the
        // hairline into the page), and a disabled secondary takes the primary's tint so the
        // pair reads as one disabled treatment in both schemes.
        outline: "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground disabled:opacity-100 disabled:border-foreground/15 disabled:text-foreground/55 disabled:shadow-none",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 disabled:opacity-100 disabled:bg-foreground/10 disabled:text-foreground/55 disabled:shadow-none",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        // C40 (UX04): the 36px visual icon control keeps its exact desktop footprint and composes
        // the shared {@link hitTargetFloor} (the single source of the 44px mobile floor) — an
        // invisible, layout-free ::before overlay below md, removed at desktop.
        icon: `size-9 ${hitTargetFloor}`
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
function Button({
  className,
  variant,
  size,
  ...props
}) {
  return /* @__PURE__ */ jsx("button", { className: cn(buttonVariants({ variant, size, className })), ...props });
}

// src/badge.tsx
import { cva as cva2 } from "class-variance-authority";
import "react";
import { jsx as jsx2 } from "react/jsx-runtime";
var badgeVariants = cva2(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap gap-1 [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Badge({
  className,
  variant,
  ...props
}) {
  return /* @__PURE__ */ jsx2("span", { className: cn(badgeVariants({ variant }), className), ...props });
}

// src/switch.tsx
import * as SwitchPrimitive from "@radix-ui/react-switch";
import "react";
import { jsx as jsx3 } from "react/jsx-runtime";
function Switch({ className, ...props }) {
  return /* @__PURE__ */ jsx3(
    SwitchPrimitive.Root,
    {
      className: cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsx3(
        SwitchPrimitive.Thumb,
        {
          className: cn(
            "pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
          )
        }
      )
    }
  );
}

// src/card.tsx
import "react";
import { jsx as jsx4 } from "react/jsx-runtime";
function Card({ className, ...props }) {
  return /* @__PURE__ */ jsx4(
    "div",
    {
      className: cn("rounded-lg border bg-card text-card-foreground shadow-sm", className),
      ...props
    }
  );
}
function CardHeader({ className, ...props }) {
  return /* @__PURE__ */ jsx4("div", { className: cn("flex flex-col gap-1.5 p-6", className), ...props });
}
function CardTitle({ className, ...props }) {
  return /* @__PURE__ */ jsx4("div", { className: cn("font-semibold leading-none tracking-tight", className), ...props });
}
function CardDescription({ className, ...props }) {
  return /* @__PURE__ */ jsx4("div", { className: cn("text-sm text-muted-foreground", className), ...props });
}
function CardContent({ className, ...props }) {
  return /* @__PURE__ */ jsx4("div", { className: cn("p-6 pt-0", className), ...props });
}
function CardFooter({ className, ...props }) {
  return /* @__PURE__ */ jsx4("div", { className: cn("flex items-center p-6 pt-0", className), ...props });
}

// src/dialog.tsx
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import "react";
import { jsx as jsx5, jsxs } from "react/jsx-runtime";
var Dialog = DialogPrimitive.Root;
var DialogTrigger = DialogPrimitive.Trigger;
var DialogClose = DialogPrimitive.Close;
var DialogPortal = DialogPrimitive.Portal;
function DialogOverlay({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx5(
    DialogPrimitive.Overlay,
    {
      className: cn(
        "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      ),
      ...props
    }
  );
}
function DialogContent({
  className,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsxs(DialogPortal, { children: [
    /* @__PURE__ */ jsx5(DialogOverlay, {}),
    /* @__PURE__ */ jsxs(
      DialogPrimitive.Content,
      {
        className: cn(
          // ⚠️ `max-h` + `overflow-y-auto` are load-bearing, not polish. This element is
          // `position: fixed` and centred by translate, so a dialog TALLER than the
          // viewport hangs off both ends with nothing to scroll: the page behind it does
          // not move the dialog, and the dialog had `max-height: none; overflow: visible`.
          // Its footer — every dialog's confirm button — was then unreachable for a human
          // and unclickable for a browser driver. Measured 2026-09-12 on
          // splicewire-app's `/ui/settings/tokens`: the packaged mint dialog
          // (@splicewire/beam-accounts, whose scope picker listed 150 permissions) came to
          // 860px in a 720px viewport, putting "Mint token" 45px below the fold, and
          // Playwright reported "element is outside of the viewport" for 30s. Any laptop
          // or phone shorter than the dialog hits the same wall. `calc(100% - 2rem)`
          // resolves against the viewport for a fixed element — the same bound shadcn's
          // own dialog primitive carries upstream.
          "fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100%-2rem)] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg border bg-background p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className
        ),
        ...props,
        children: [
          children,
          /* @__PURE__ */ jsxs(DialogPrimitive.Close, { className: "absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:outline-hidden", children: [
            /* @__PURE__ */ jsx5(XIcon, { className: "size-4" }),
            /* @__PURE__ */ jsx5("span", { className: "sr-only", children: "Close" })
          ] })
        ]
      }
    )
  ] });
}
function DialogHeader({ className, ...props }) {
  return /* @__PURE__ */ jsx5("div", { className: cn("flex flex-col gap-1.5", className), ...props });
}
function DialogFooter({ className, ...props }) {
  return /* @__PURE__ */ jsx5(
    "div",
    {
      className: cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className),
      ...props
    }
  );
}
function DialogTitle({ className, ...props }) {
  return /* @__PURE__ */ jsx5(
    DialogPrimitive.Title,
    {
      className: cn("text-lg leading-none font-semibold", className),
      ...props
    }
  );
}
function DialogDescription({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx5(
    DialogPrimitive.Description,
    {
      className: cn("text-muted-foreground text-sm", className),
      ...props
    }
  );
}

// src/sheet.tsx
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon as XIcon2 } from "lucide-react";
import "react";
import { jsx as jsx6, jsxs as jsxs2 } from "react/jsx-runtime";
var Sheet = SheetPrimitive.Root;
var SheetTrigger = SheetPrimitive.Trigger;
var SheetClose = SheetPrimitive.Close;
var SheetPortal = SheetPrimitive.Portal;
function SheetOverlay({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx6(
    SheetPrimitive.Overlay,
    {
      className: cn(
        "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      ),
      ...props
    }
  );
}
function SheetContent({
  className,
  children,
  side = "right",
  ...props
}) {
  return /* @__PURE__ */ jsxs2(SheetPortal, { children: [
    /* @__PURE__ */ jsx6(SheetOverlay, {}),
    /* @__PURE__ */ jsxs2(
      SheetPrimitive.Content,
      {
        className: cn(
          "fixed z-50 flex flex-col gap-4 bg-card p-6 shadow-lg transition data-[state=open]:animate-in data-[state=closed]:animate-out",
          side === "right" && "inset-y-0 right-0 h-full w-full max-w-md border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          side === "left" && "inset-y-0 left-0 h-full w-full max-w-md border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
          side === "top" && "inset-x-0 top-0 w-full border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          side === "bottom" && "inset-x-0 bottom-0 w-full border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className
        ),
        ...props,
        children: [
          children,
          /* @__PURE__ */ jsxs2(SheetPrimitive.Close, { className: "absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:outline-hidden", children: [
            /* @__PURE__ */ jsx6(XIcon2, { className: "size-4" }),
            /* @__PURE__ */ jsx6("span", { className: "sr-only", children: "Close" })
          ] })
        ]
      }
    )
  ] });
}
function SheetHeader({ className, ...props }) {
  return /* @__PURE__ */ jsx6("div", { className: cn("flex flex-col gap-1.5", className), ...props });
}
function SheetFooter({ className, ...props }) {
  return /* @__PURE__ */ jsx6(
    "div",
    {
      className: cn("mt-auto flex flex-col gap-2 sm:flex-row sm:justify-end", className),
      ...props
    }
  );
}
function SheetTitle({ className, ...props }) {
  return /* @__PURE__ */ jsx6(
    SheetPrimitive.Title,
    {
      className: cn("text-foreground font-semibold", className),
      ...props
    }
  );
}
function SheetDescription({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx6(
    SheetPrimitive.Description,
    {
      className: cn("text-muted-foreground text-sm", className),
      ...props
    }
  );
}

// src/input.tsx
import "react";
import { jsx as jsx7 } from "react/jsx-runtime";
function Input({ className, type, ...props }) {
  return /* @__PURE__ */ jsx7(
    "input",
    {
      type,
      className: cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      ...props
    }
  );
}

// src/textarea.tsx
import "react";
import { jsx as jsx8 } from "react/jsx-runtime";
function Textarea({ className, ...props }) {
  return /* @__PURE__ */ jsx8(
    "textarea",
    {
      className: cn(
        "flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      ...props
    }
  );
}

// src/label.tsx
import "react";
import { jsx as jsx9 } from "react/jsx-runtime";
function Label({ className, ...props }) {
  return /* @__PURE__ */ jsx9(
    "label",
    {
      className: cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      ),
      ...props
    }
  );
}

// src/select.tsx
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import "react";
import { jsx as jsx10, jsxs as jsxs3 } from "react/jsx-runtime";
var Select = SelectPrimitive.Root;
var SelectGroup = SelectPrimitive.Group;
var SelectValue = SelectPrimitive.Value;
function SelectTrigger({
  className,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsxs3(
    SelectPrimitive.Trigger,
    {
      className: cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-1 text-sm whitespace-nowrap shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground [&>span]:truncate",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsx10(SelectPrimitive.Icon, { asChild: true, children: /* @__PURE__ */ jsx10(ChevronDown, { className: "size-4 shrink-0 text-muted-foreground" }) })
      ]
    }
  );
}
function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}) {
  return /* @__PURE__ */ jsx10(SelectPrimitive.Portal, { children: /* @__PURE__ */ jsxs3(
    SelectPrimitive.Content,
    {
      position,
      className: cn(
        "relative z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
        className
      ),
      ...props,
      children: [
        /* @__PURE__ */ jsx10(SelectPrimitive.ScrollUpButton, { className: "flex items-center justify-center py-1", children: /* @__PURE__ */ jsx10(ChevronUp, { className: "size-4" }) }),
        /* @__PURE__ */ jsx10(
          SelectPrimitive.Viewport,
          {
            className: cn(
              "p-1",
              position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
            ),
            children
          }
        ),
        /* @__PURE__ */ jsx10(SelectPrimitive.ScrollDownButton, { className: "flex items-center justify-center py-1", children: /* @__PURE__ */ jsx10(ChevronDown, { className: "size-4" }) })
      ]
    }
  ) });
}
function SelectItem({
  className,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsxs3(
    SelectPrimitive.Item,
    {
      className: cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      ),
      ...props,
      children: [
        /* @__PURE__ */ jsx10("span", { className: "absolute right-2 flex size-3.5 items-center justify-center", children: /* @__PURE__ */ jsx10(SelectPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx10(Check, { className: "size-4 text-primary" }) }) }),
        /* @__PURE__ */ jsx10(SelectPrimitive.ItemText, { children })
      ]
    }
  );
}
function SelectLabel({ className, ...props }) {
  return /* @__PURE__ */ jsx10(
    SelectPrimitive.Label,
    {
      className: cn("px-2 py-1.5 font-mono text-xs text-muted-foreground", className),
      ...props
    }
  );
}
function SelectSeparator({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx10(
    SelectPrimitive.Separator,
    {
      className: cn("-mx-1 my-1 h-px bg-border", className),
      ...props
    }
  );
}
var EMPTY_SENTINEL = "__empty__";
function SimpleSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  id,
  "aria-label": ariaLabel
}) {
  const hasEmptyOption = options.some((option) => option.value === "");
  const selectValue = value === "" ? hasEmptyOption ? EMPTY_SENTINEL : void 0 : value;
  return /* @__PURE__ */ jsxs3(
    Select,
    {
      value: selectValue,
      onValueChange: (next) => onValueChange(next === EMPTY_SENTINEL ? "" : next),
      disabled,
      children: [
        /* @__PURE__ */ jsx10(SelectTrigger, { className, id, "aria-label": ariaLabel, children: /* @__PURE__ */ jsx10(SelectValue, { placeholder }) }),
        /* @__PURE__ */ jsx10(SelectContent, { children: options.map((option) => /* @__PURE__ */ jsx10(
          SelectItem,
          {
            value: option.value === "" ? EMPTY_SENTINEL : option.value,
            children: option.label
          },
          option.value || EMPTY_SENTINEL
        )) })
      ]
    }
  );
}

// src/popover.tsx
import * as React11 from "react";
import { jsx as jsx11 } from "react/jsx-runtime";
var PopoverContext = React11.createContext(null);
function usePopover() {
  const ctx = React11.useContext(PopoverContext);
  if (!ctx) throw new Error("Popover subcomponents must be used within <Popover>.");
  return ctx;
}
function Popover({
  open: controlledOpen,
  onOpenChange,
  children
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React11.useState(false);
  const isControlled = controlledOpen !== void 0;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = React11.useCallback(
    (next) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );
  const triggerRef = React11.useRef(null);
  const contentRef = React11.useRef(null);
  React11.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      const target = event.target;
      if (triggerRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);
  return /* @__PURE__ */ jsx11(PopoverContext.Provider, { value: { open, setOpen, triggerRef, contentRef }, children: /* @__PURE__ */ jsx11("div", { className: "relative inline-block", children }) });
}
function PopoverTrigger({
  asChild,
  children
}) {
  const { open, setOpen, triggerRef } = usePopover();
  const props = {
    ref: triggerRef,
    "aria-expanded": open,
    "aria-haspopup": true,
    onClick: (event) => {
      children.props.onClick?.(event);
      setOpen(!open);
    }
  };
  if (asChild) {
    return React11.cloneElement(children, props);
  }
  return /* @__PURE__ */ jsx11("button", { type: "button", ...props, children });
}
function PopoverContent({
  align = "start",
  side = "bottom",
  className,
  children
}) {
  const { open, contentRef } = usePopover();
  if (!open) return null;
  return /* @__PURE__ */ jsx11(
    "div",
    {
      ref: contentRef,
      role: "dialog",
      className: cn(
        "absolute z-50 min-w-56 rounded-md border bg-popover p-3 text-popover-foreground shadow-md",
        "animate-in fade-in-0 zoom-in-95",
        side === "top" ? "bottom-full mb-1" : "top-full mt-1",
        align === "end" ? "right-0" : "left-0",
        className
      ),
      children
    }
  );
}

// src/separator.tsx
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { jsx as jsx12 } from "react/jsx-runtime";
function Separator2({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}) {
  return /* @__PURE__ */ jsx12(
    SeparatorPrimitive.Root,
    {
      "data-slot": "separator-root",
      decorative,
      orientation,
      className: cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      ),
      ...props
    }
  );
}

// src/skeleton.tsx
import { jsx as jsx13 } from "react/jsx-runtime";
function Skeleton({ className, ...props }) {
  return /* @__PURE__ */ jsx13(
    "div",
    {
      "data-slot": "skeleton",
      className: cn("bg-primary/10 animate-pulse rounded-md", className),
      ...props
    }
  );
}

// src/tooltip.tsx
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { jsx as jsx14, jsxs as jsxs4 } from "react/jsx-runtime";
function TooltipProvider({
  delayDuration = 0,
  ...props
}) {
  return /* @__PURE__ */ jsx14(
    TooltipPrimitive.Provider,
    {
      "data-slot": "tooltip-provider",
      delayDuration,
      ...props
    }
  );
}
function Tooltip({ ...props }) {
  return /* @__PURE__ */ jsx14(TooltipPrimitive.Root, { "data-slot": "tooltip", ...props });
}
function TooltipTrigger({ ...props }) {
  return /* @__PURE__ */ jsx14(TooltipPrimitive.Trigger, { "data-slot": "tooltip-trigger", ...props });
}
function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsx14(TooltipPrimitive.Portal, { children: /* @__PURE__ */ jsxs4(
    TooltipPrimitive.Content,
    {
      "data-slot": "tooltip-content",
      sideOffset,
      className: cn(
        "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-w-sm rounded-md px-3 py-1.5 text-xs",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsx14(TooltipPrimitive.Arrow, { className: "bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" })
      ]
    }
  ) });
}

// src/use-mobile.ts
import { useSyncExternalStore } from "react";
var MOBILE_BREAKPOINT = 768;
var mql = typeof window === "undefined" || typeof window.matchMedia !== "function" ? void 0 : window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
function mediaQueryListener(callback) {
  if (!mql) {
    return () => {
    };
  }
  mql.addEventListener("change", callback);
  return () => {
    mql.removeEventListener("change", callback);
  };
}
function isSmallerThanBreakpoint() {
  return mql?.matches ?? false;
}
function getServerSnapshot() {
  return false;
}
function useIsMobile() {
  return useSyncExternalStore(mediaQueryListener, isSmallerThanBreakpoint, getServerSnapshot);
}

// src/sidebar.tsx
import { Slot } from "@radix-ui/react-slot";
import { cva as cva3 } from "class-variance-authority";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import * as React12 from "react";
import { jsx as jsx15, jsxs as jsxs5 } from "react/jsx-runtime";
var SIDEBAR_COOKIE_NAME = "sidebar_state";
var SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
var SIDEBAR_WIDTH = "16rem";
var SIDEBAR_WIDTH_MOBILE = "18rem";
var SIDEBAR_WIDTH_ICON = "3rem";
var SIDEBAR_KEYBOARD_SHORTCUT = "b";
var SidebarContext = React12.createContext(null);
function useSidebar() {
  const context = React12.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}
function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React12.useState(false);
  const [_open, _setOpen] = React12.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React12.useCallback(
    (value) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open]
  );
  const toggleSidebar = React12.useCallback(() => {
    return isMobile ? setOpenMobile((open2) => !open2) : setOpen((open2) => !open2);
  }, [isMobile, setOpen, setOpenMobile]);
  React12.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);
  const state = open ? "expanded" : "collapsed";
  const contextValue = React12.useMemo(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  );
  return /* @__PURE__ */ jsx15(SidebarContext.Provider, { value: contextValue, children: /* @__PURE__ */ jsx15(
    "div",
    {
      "data-slot": "sidebar-wrapper",
      style: {
        "--sidebar-width": SIDEBAR_WIDTH,
        "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
        ...style
      },
      className: cn(
        "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
        className
      ),
      ...props,
      children
    }
  ) });
}
function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
  if (collapsible === "none") {
    return /* @__PURE__ */ jsx15(
      "div",
      {
        "data-slot": "sidebar",
        className: cn(
          "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
          className
        ),
        ...props,
        children
      }
    );
  }
  if (isMobile) {
    return /* @__PURE__ */ jsxs5(Sheet, { open: openMobile, onOpenChange: setOpenMobile, ...props, children: [
      /* @__PURE__ */ jsxs5(SheetHeader, { className: "sr-only", children: [
        /* @__PURE__ */ jsx15(SheetTitle, { children: "Sidebar" }),
        /* @__PURE__ */ jsx15(SheetDescription, { children: "Displays the mobile sidebar." })
      ] }),
      /* @__PURE__ */ jsx15(
        SheetContent,
        {
          "data-sidebar": "sidebar",
          "data-slot": "sidebar",
          "data-mobile": "true",
          className: "bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden",
          style: {
            "--sidebar-width": SIDEBAR_WIDTH_MOBILE
          },
          side,
          children: /* @__PURE__ */ jsx15("div", { className: "flex h-full w-full flex-col", children })
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxs5(
    "div",
    {
      className: "group peer text-sidebar-foreground hidden md:block",
      "data-state": state,
      "data-collapsible": state === "collapsed" ? collapsible : "",
      "data-variant": variant,
      "data-side": side,
      "data-slot": "sidebar",
      children: [
        /* @__PURE__ */ jsx15(
          "div",
          {
            className: cn(
              "relative h-svh w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
              "group-data-[collapsible=offcanvas]:w-0",
              "group-data-[side=right]:rotate-180",
              variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
            )
          }
        ),
        /* @__PURE__ */ jsx15(
          "div",
          {
            className: cn(
              "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
              side === "left" ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]" : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
              // Adjust the padding for floating and inset variants.
              variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
              className
            ),
            ...props,
            children: /* @__PURE__ */ jsx15(
              "div",
              {
                "data-sidebar": "sidebar",
                className: "bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm",
                children
              }
            )
          }
        )
      ]
    }
  );
}
function SidebarTrigger({
  className,
  onClick,
  ...props
}) {
  const { toggleSidebar, isMobile, state } = useSidebar();
  return /* @__PURE__ */ jsxs5(
    Button,
    {
      "data-sidebar": "trigger",
      "data-slot": "sidebar-trigger",
      variant: "ghost",
      size: "icon",
      className: cn("h-7 w-7", className),
      onClick: (event) => {
        onClick?.(event);
        toggleSidebar();
      },
      ...props,
      children: [
        isMobile || state === "collapsed" ? /* @__PURE__ */ jsx15(PanelLeftOpenIcon, {}) : /* @__PURE__ */ jsx15(PanelLeftCloseIcon, {}),
        /* @__PURE__ */ jsx15("span", { className: "sr-only", children: "Toggle sidebar" })
      ]
    }
  );
}
function SidebarRail({ className, ...props }) {
  const { toggleSidebar } = useSidebar();
  return /* @__PURE__ */ jsx15(
    "button",
    {
      "data-sidebar": "rail",
      "data-slot": "sidebar-rail",
      "aria-label": "Toggle sidebar",
      tabIndex: -1,
      onClick: toggleSidebar,
      title: "Toggle sidebar",
      className: cn(
        "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      ),
      ...props
    }
  );
}
function SidebarInset({ className, ...props }) {
  return /* @__PURE__ */ jsx15(
    "main",
    {
      "data-slot": "sidebar-inset",
      className: cn(
        "bg-background relative flex max-w-full min-h-svh flex-1 flex-col",
        "peer-data-[variant=inset]:min-h-[calc(100svh-(--spacing(4)))] md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0",
        className
      ),
      ...props
    }
  );
}
function SidebarInput({ className, ...props }) {
  return /* @__PURE__ */ jsx15(
    Input,
    {
      "data-slot": "sidebar-input",
      "data-sidebar": "input",
      className: cn("bg-background h-8 w-full shadow-none", className),
      ...props
    }
  );
}
function SidebarHeader({ className, ...props }) {
  return /* @__PURE__ */ jsx15(
    "div",
    {
      "data-slot": "sidebar-header",
      "data-sidebar": "header",
      className: cn("flex flex-col gap-2 p-2", className),
      ...props
    }
  );
}
function SidebarFooter({ className, ...props }) {
  return /* @__PURE__ */ jsx15(
    "div",
    {
      "data-slot": "sidebar-footer",
      "data-sidebar": "footer",
      className: cn("flex flex-col gap-2 p-2", className),
      ...props
    }
  );
}
function SidebarSeparator({ className, ...props }) {
  return /* @__PURE__ */ jsx15(
    Separator2,
    {
      "data-slot": "sidebar-separator",
      "data-sidebar": "separator",
      className: cn("bg-sidebar-border mx-2 w-auto", className),
      ...props
    }
  );
}
function SidebarContent({ className, ...props }) {
  return /* @__PURE__ */ jsx15(
    "div",
    {
      "data-slot": "sidebar-content",
      "data-sidebar": "content",
      className: cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      ),
      ...props
    }
  );
}
function SidebarGroup({ className, ...props }) {
  return /* @__PURE__ */ jsx15(
    "div",
    {
      "data-slot": "sidebar-group",
      "data-sidebar": "group",
      className: cn("relative flex w-full min-w-0 flex-col p-2", className),
      ...props
    }
  );
}
function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "div";
  return /* @__PURE__ */ jsx15(
    Comp,
    {
      "data-slot": "sidebar-group-label",
      "data-sidebar": "group-label",
      className: cn(
        "text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:select-none group-data-[collapsible=icon]:pointer-events-none",
        className
      ),
      ...props
    }
  );
}
function SidebarGroupAction({
  className,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsx15(
    Comp,
    {
      "data-slot": "sidebar-group-action",
      "data-sidebar": "group-action",
      className: cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "group-data-[collapsible=icon]:hidden",
        className
      ),
      ...props
    }
  );
}
function SidebarGroupContent({ className, ...props }) {
  return /* @__PURE__ */ jsx15(
    "div",
    {
      "data-slot": "sidebar-group-content",
      "data-sidebar": "group-content",
      className: cn("w-full text-sm", className),
      ...props
    }
  );
}
function SidebarMenu({ className, ...props }) {
  return /* @__PURE__ */ jsx15(
    "ul",
    {
      "data-slot": "sidebar-menu",
      "data-sidebar": "menu",
      className: cn("flex w-full min-w-0 flex-col gap-1", className),
      ...props
    }
  );
}
function SidebarMenuItem({ className, ...props }) {
  return /* @__PURE__ */ jsx15(
    "li",
    {
      "data-slot": "sidebar-menu-item",
      "data-sidebar": "menu-item",
      className: cn("group/menu-item relative", className),
      ...props
    }
  );
}
var sidebarMenuButtonVariants = cva3(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline: "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]"
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}) {
  const Comp = asChild ? Slot : "button";
  const { isMobile, state } = useSidebar();
  const button = /* @__PURE__ */ jsx15(
    Comp,
    {
      "data-slot": "sidebar-menu-button",
      "data-sidebar": "menu-button",
      "data-size": size,
      "data-active": isActive,
      className: cn(sidebarMenuButtonVariants({ variant, size }), className),
      ...props
    }
  );
  if (!tooltip) {
    return button;
  }
  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip
    };
  }
  return /* @__PURE__ */ jsxs5(Tooltip, { children: [
    /* @__PURE__ */ jsx15(TooltipTrigger, { asChild: true, children: button }),
    /* @__PURE__ */ jsx15(
      TooltipContent,
      {
        side: "right",
        align: "center",
        hidden: state !== "collapsed" || isMobile,
        ...tooltip
      }
    )
  ] });
}
function SidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsx15(
    Comp,
    {
      "data-slot": "sidebar-menu-action",
      "data-sidebar": "menu-action",
      className: cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover && "peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0",
        className
      ),
      ...props
    }
  );
}
function SidebarMenuBadge({ className, ...props }) {
  return /* @__PURE__ */ jsx15(
    "div",
    {
      "data-slot": "sidebar-menu-badge",
      "data-sidebar": "menu-badge",
      className: cn(
        "text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className
      ),
      ...props
    }
  );
}
function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}) {
  const [skeletonStyle] = React12.useState(
    () => ({
      "--skeleton-width": `${Math.floor(Math.random() * 40) + 50}%`
      // Random width between 50 to 90%.
    })
  );
  return /* @__PURE__ */ jsxs5(
    "div",
    {
      "data-slot": "sidebar-menu-skeleton",
      "data-sidebar": "menu-skeleton",
      className: cn("flex h-8 items-center gap-2 rounded-md px-2", className),
      ...props,
      children: [
        showIcon && /* @__PURE__ */ jsx15(Skeleton, { className: "size-4 rounded-md", "data-sidebar": "menu-skeleton-icon" }),
        /* @__PURE__ */ jsx15(
          Skeleton,
          {
            className: "h-4 max-w-(--skeleton-width) flex-1",
            "data-sidebar": "menu-skeleton-text",
            style: skeletonStyle
          }
        )
      ]
    }
  );
}
function SidebarMenuSub({ className, ...props }) {
  return /* @__PURE__ */ jsx15(
    "ul",
    {
      "data-slot": "sidebar-menu-sub",
      "data-sidebar": "menu-sub",
      className: cn(
        "border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className
      ),
      ...props
    }
  );
}
function SidebarMenuSubItem({ className, ...props }) {
  return /* @__PURE__ */ jsx15(
    "li",
    {
      "data-slot": "sidebar-menu-sub-item",
      "data-sidebar": "menu-sub-item",
      className: cn("group/menu-sub-item relative", className),
      ...props
    }
  );
}
function SidebarMenuSubButton({
  asChild = false,
  size = "md",
  isActive = false,
  className,
  ...props
}) {
  const Comp = asChild ? Slot : "a";
  return /* @__PURE__ */ jsx15(
    Comp,
    {
      "data-slot": "sidebar-menu-sub-button",
      "data-sidebar": "menu-sub-button",
      "data-size": size,
      "data-active": isActive,
      className: cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      ),
      ...props
    }
  );
}

// src/DataTable.tsx
import {
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { useId, useMemo as useMemo2, useState as useState3 } from "react";
import { Fragment, jsx as jsx16, jsxs as jsxs6 } from "react/jsx-runtime";
function compareSortValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const av = a instanceof Date ? a.getTime() : a;
  const bv = b instanceof Date ? b.getTime() : b;
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  return String(av).localeCompare(String(bv));
}
function clientSortRows(rows, sort, columns) {
  const keys = parseSort(sort);
  if (keys.length === 0) return rows;
  const accessors = /* @__PURE__ */ new Map();
  for (const column of columns) {
    const field = column.meta?.sortField;
    if (field) {
      accessors.set(
        field,
        column.meta?.sortAccessor ?? ((row) => row[field])
      );
    }
  }
  const active = [...accessors.keys()].map((field) => ({ field, state: sortStateFor(keys, field) })).filter((entry) => entry.state.active).sort((a, b) => a.state.index - b.state.index);
  if (active.length === 0) return rows;
  return [...rows].sort((ra, rb) => {
    for (const { field, state } of active) {
      const accessor = accessors.get(field);
      const cmp = compareSortValues(accessor(ra), accessor(rb));
      if (cmp !== 0) return state.desc ? -cmp : cmp;
    }
    return 0;
  });
}
function DataTable({
  columns,
  data,
  pagination,
  onRowClick,
  rowClassName,
  emptyMessage = "Nothing here yet.",
  loading = false,
  skeletonRows = 5,
  className,
  sorting,
  clientSort,
  clientPageSize,
  stackOnMobile = false
}) {
  const isMobile = useIsMobile();
  const uid = useId();
  const stacked = stackOnMobile && isMobile;
  const headerSort = sorting ?? clientSort;
  const sortedData = useMemo2(
    () => clientSort ? clientSortRows(data, clientSort.sort, columns) : data,
    [clientSort, data, columns]
  );
  const [clientPage, setClientPage] = useState3(1);
  const clientLastPage = clientPageSize ? Math.max(1, Math.ceil(sortedData.length / clientPageSize)) : 1;
  const safeClientPage = Math.min(clientPage, clientLastPage);
  const displayData = clientPageSize && clientLastPage > 1 ? sortedData.slice(
    (safeClientPage - 1) * clientPageSize,
    safeClientPage * clientPageSize
  ) : sortedData;
  const effectivePagination = pagination ?? (clientPageSize ? { page: safeClientPage, lastPage: clientLastPage, onPageChange: setClientPage } : void 0);
  const showSkeleton = loading && data.length === 0;
  const refetching = loading && data.length > 0;
  const table = useReactTable({
    data: displayData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    // A row's own `id` (when it has one) keys it, so a stacked card is `stacked-row-<id>` as ResponsiveRoster's was.
    getRowId: (row, index) => {
      const id = row?.id;
      return typeof id === "string" || typeof id === "number" ? String(id) : String(index);
    }
  });
  const footer = /* @__PURE__ */ jsx16(Fragment, { children: effectivePagination && effectivePagination.lastPage > 1 && /* @__PURE__ */ jsxs6("div", { className: "flex items-center justify-end gap-2 text-sm text-muted-foreground", children: [
    /* @__PURE__ */ jsxs6("span", { children: [
      "Page ",
      effectivePagination.page,
      " of ",
      effectivePagination.lastPage
    ] }),
    /* @__PURE__ */ jsx16(
      Button,
      {
        variant: "outline",
        size: "icon",
        disabled: effectivePagination.page <= 1,
        onClick: () => effectivePagination.onPageChange(effectivePagination.page - 1),
        children: /* @__PURE__ */ jsx16(ChevronLeft, {})
      }
    ),
    /* @__PURE__ */ jsx16(
      Button,
      {
        variant: "outline",
        size: "icon",
        disabled: effectivePagination.page >= effectivePagination.lastPage,
        onClick: () => effectivePagination.onPageChange(effectivePagination.page + 1),
        children: /* @__PURE__ */ jsx16(ChevronRight, {})
      }
    )
  ] }) });
  if (stacked) {
    const rows = table.getRowModel().rows;
    const sortHeaders = (table.getHeaderGroups()[0]?.headers ?? []).filter(
      (header) => !header.isPlaceholder && sortFieldOf(header, headerSort) !== null
    );
    return /* @__PURE__ */ jsxs6("div", { className: cn("space-y-2", className), children: [
      headerSort && sortHeaders.length > 0 && /* @__PURE__ */ jsxs6(
        "div",
        {
          role: "group",
          "aria-labelledby": `${uid}-sort`,
          className: "flex flex-wrap items-center gap-2 text-sm text-muted-foreground",
          children: [
            /* @__PURE__ */ jsx16("span", { id: `${uid}-sort`, children: "Sort" }),
            sortHeaders.map((header) => /* @__PURE__ */ jsx16(
              SortButton,
              {
                label: flexRender(header.column.columnDef.header, header.getContext()),
                sortField: sortFieldOf(header, headerSort),
                sorting: headerSort,
                stacked: true
              },
              header.id
            ))
          ]
        }
      ),
      showSkeleton ? /* @__PURE__ */ jsx16("div", { className: "space-y-2", "aria-busy": "true", children: Array.from({ length: Math.min(skeletonRows, 3) }).map((_, i) => /* @__PURE__ */ jsx16("div", { "data-testid": "skeleton-row", className: "h-24 animate-pulse rounded-lg border bg-muted/40" }, i)) }) : rows.length === 0 ? /* @__PURE__ */ jsx16("p", { className: "py-8 text-center text-sm text-muted-foreground", children: emptyMessage }) : /* @__PURE__ */ jsx16("ul", { className: cn("list-cross-fade space-y-2", refetching && "opacity-40"), "aria-busy": loading || void 0, children: rows.map((row) => {
        const [heading, ...rest] = row.getVisibleCells();
        const actions = rest.find((cell) => cell.column.id === "actions");
        const fields = rest.filter((cell) => cell.column.id !== "actions");
        return /* @__PURE__ */ jsxs6(
          "li",
          {
            "data-testid": `stacked-row-${row.id}`,
            className: cn(
              "min-w-0 space-y-2.5 rounded-lg border bg-card p-3",
              onRowClick && "cursor-pointer transition-colors hover:bg-accent/50",
              rowClassName?.(row.original)
            ),
            onClick: () => onRowClick?.(row.original),
            children: [
              heading && /* @__PURE__ */ jsx16("div", { id: `${uid}-row-${row.id}`, className: "min-w-0", children: flexRender(heading.column.columnDef.cell, heading.getContext()) }),
              fields.length > 0 && /* @__PURE__ */ jsx16("dl", { className: "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-[12.5px]", children: fields.map((cell) => {
                const header = cell.column.columnDef.header;
                return /* @__PURE__ */ jsxs6("div", { className: "contents", children: [
                  /* @__PURE__ */ jsx16("dt", { className: "text-muted-foreground", children: cell.column.columnDef.meta?.label ?? (typeof header === "string" ? header : cell.column.id) }),
                  /* @__PURE__ */ jsx16("dd", { className: "min-w-0", children: flexRender(cell.column.columnDef.cell, cell.getContext()) })
                ] }, cell.id);
              }) }),
              (onRowClick || actions) && /* @__PURE__ */ jsxs6("div", { className: "flex flex-wrap items-center justify-end gap-1.5 border-t pt-2", children: [
                onRowClick && // The row's own open control: a native button named "Open <heading>", a
                // sibling of the row's actions, never wrapping them.
                /* @__PURE__ */ jsx16(
                  Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: "mr-auto",
                    id: `${uid}-open-${row.id}`,
                    "aria-labelledby": `${uid}-open-${row.id} ${uid}-row-${row.id}`,
                    onClick: (event) => {
                      event.stopPropagation();
                      onRowClick(row.original);
                    },
                    children: "Open"
                  }
                ),
                actions && // The row's actions act on their own: a click here never also opens the row.
                /* @__PURE__ */ jsx16(
                  "div",
                  {
                    className: "flex flex-wrap items-center gap-1.5",
                    onClick: (event) => event.stopPropagation(),
                    children: flexRender(actions.column.columnDef.cell, actions.getContext())
                  }
                )
              ] })
            ]
          },
          row.id
        );
      }) }),
      footer
    ] });
  }
  return /* @__PURE__ */ jsxs6("div", { className: cn("space-y-2", className), children: [
    /* @__PURE__ */ jsx16("div", { className: "overflow-x-auto rounded-md border bg-card", children: /* @__PURE__ */ jsxs6("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsx16("thead", { className: "border-b bg-muted/40", children: table.getHeaderGroups().map((headerGroup) => /* @__PURE__ */ jsx16("tr", { children: headerGroup.headers.map((header) => /* @__PURE__ */ jsx16(
        SortableHeaderCell,
        {
          header,
          sorting: headerSort
        },
        header.id
      )) }, headerGroup.id)) }),
      /* @__PURE__ */ jsxs6(
        "tbody",
        {
          className: cn(
            // Keep-previous cross-fade on re-filter/re-sort, tuned by
            // the shared motion token (UI-18) — one place to change the
            // feel, and suppressed under prefers-reduced-motion.
            "list-cross-fade",
            refetching && "opacity-40"
          ),
          "aria-busy": loading || void 0,
          children: [
            showSkeleton && Array.from({ length: skeletonRows }).map((_, rowIndex) => /* @__PURE__ */ jsx16(
              "tr",
              {
                className: "border-b last:border-0",
                "data-testid": "skeleton-row",
                children: columns.map((_column, colIndex) => /* @__PURE__ */ jsx16("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsx16(
                  "div",
                  {
                    className: "h-4 animate-pulse rounded bg-muted",
                    style: {
                      width: `${[70, 55, 40, 60][colIndex % 4]}%`
                    }
                  }
                ) }, colIndex))
              },
              `skeleton-${rowIndex}`
            )),
            !showSkeleton && table.getRowModel().rows.length === 0 && /* @__PURE__ */ jsx16("tr", { children: /* @__PURE__ */ jsx16(
              "td",
              {
                colSpan: columns.length,
                className: "px-3 py-8 text-center text-muted-foreground",
                children: emptyMessage
              }
            ) }),
            !showSkeleton && table.getRowModel().rows.map((row) => /* @__PURE__ */ jsx16(
              "tr",
              {
                className: cn(
                  "border-b last:border-0",
                  onRowClick && "cursor-pointer transition-colors hover:bg-accent/50",
                  rowClassName?.(row.original)
                ),
                onClick: () => onRowClick?.(row.original),
                children: row.getVisibleCells().map((cell, index) => /* @__PURE__ */ jsxs6(
                  "td",
                  {
                    className: cn(
                      "px-3 py-2",
                      index === 0 && onRowClick && "relative"
                    ),
                    onClick: cell.column.id === "actions" ? (event) => event.stopPropagation() : void 0,
                    children: [
                      index === 0 && onRowClick && // Keyboard-reachable row opener, named "Open <heading>" the
                      // same way the stacked card's Open control is (aria-labelledby
                      // = this button + the heading cell). A sibling of the cells'
                      // own controls, never a wrapper, so no interactive element is
                      // wrongly nested and the <tr> stays a plain row (a pointer
                      // convenience) rather than a button that would swallow them.
                      // Hidden until focused, then shown in place so the visible
                      // table layout is unchanged for every consumer.
                      /* @__PURE__ */ jsx16(
                        "button",
                        {
                          type: "button",
                          id: `${uid}-open-${row.id}`,
                          "aria-labelledby": `${uid}-open-${row.id} ${uid}-row-${row.id}`,
                          onClick: (event) => {
                            event.stopPropagation();
                            onRowClick(row.original);
                          },
                          className: "sr-only rounded-md bg-card px-2 py-1 text-xs font-medium text-primary underline focus:not-sr-only focus:absolute focus:left-1 focus:top-1 focus:z-10 focus:no-underline focus:shadow focus:outline-none focus:ring-2 focus:ring-ring",
                          children: "Open"
                        }
                      ),
                      index === 0 ? /* @__PURE__ */ jsx16(
                        "span",
                        {
                          id: `${uid}-row-${row.id}`,
                          className: "contents",
                          children: flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )
                        }
                      ) : flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )
                    ]
                  },
                  cell.id
                ))
              },
              row.id
            ))
          ]
        }
      )
    ] }) }),
    footer
  ] });
}
function SortableHeaderCell({
  header,
  sorting
}) {
  const label = header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext());
  const sortField = sortFieldOf(header, sorting);
  if (!sortField || !sorting) {
    return /* @__PURE__ */ jsx16("th", { className: "px-3 py-2 text-left font-medium text-muted-foreground", children: label });
  }
  const state = sortStateFor(parseSort(sorting.sort), sortField);
  return /* @__PURE__ */ jsx16(
    "th",
    {
      className: "px-3 py-2 text-left font-medium text-muted-foreground",
      "aria-sort": state.active ? state.desc ? "descending" : "ascending" : "none",
      children: /* @__PURE__ */ jsx16(SortButton, { label, sortField, sorting })
    }
  );
}
function sortFieldOf(header, sorting) {
  const sortField = header.column.columnDef.meta?.sortField;
  return sorting && sortField && sorting.sortableFields.has(sortField) ? sortField : null;
}
function SortButton({
  label,
  sortField,
  sorting,
  stacked = false
}) {
  const keys = parseSort(sorting.sort);
  const state = sortStateFor(keys, sortField);
  const multi = keys.length > 1;
  const onClick = (event) => {
    const next = toggleSortKey(keys, sortField, event.shiftKey);
    sorting.onSortChange(serializeSort(next));
  };
  return /* @__PURE__ */ jsxs6(
    "button",
    {
      type: "button",
      onClick,
      "aria-pressed": stacked ? state.active : void 0,
      className: cn(
        "group -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent",
        state.active && "text-foreground"
      ),
      title: "Click to sort; shift-click to add a secondary sort",
      children: [
        /* @__PURE__ */ jsxs6("span", { children: [
          label,
          stacked && state.active && /* @__PURE__ */ jsxs6("span", { className: "sr-only", children: [
            ", sorted ",
            state.desc ? "descending" : "ascending"
          ] })
        ] }),
        state.active ? state.desc ? /* @__PURE__ */ jsx16(ArrowDown, { className: "size-3.5" }) : /* @__PURE__ */ jsx16(ArrowUp, { className: "size-3.5" }) : /* @__PURE__ */ jsx16(ChevronsUpDown, { className: "size-3.5 opacity-0 transition-opacity group-hover:opacity-60" }),
        state.active && multi && /* @__PURE__ */ jsx16("span", { className: "rounded bg-muted px-1 text-[10px] leading-4 tabular-nums text-muted-foreground", children: state.index + 1 })
      ]
    }
  );
}

// src/side-panel.tsx
import * as DialogPrimitive2 from "@radix-ui/react-dialog";
import { XIcon as XIcon3 } from "lucide-react";
import "react";
import { jsx as jsx17, jsxs as jsxs7 } from "react/jsx-runtime";
function SidePanel({
  open,
  onOpenChange,
  title,
  description,
  children,
  headerActions,
  onSave,
  onCancel,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  saveDisabled = false,
  saving = false,
  hideFooter = false,
  className
}) {
  const handleCancel = () => {
    if (onCancel) onCancel();
    else onOpenChange(false);
  };
  return /* @__PURE__ */ jsx17(DialogPrimitive2.Root, { open, onOpenChange, modal: false, children: /* @__PURE__ */ jsx17(DialogPrimitive2.Portal, { children: /* @__PURE__ */ jsxs7(
    DialogPrimitive2.Content,
    {
      onInteractOutside: (e) => e.preventDefault(),
      className: cn(
        "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-card shadow-xl",
        "border-l border-[var(--splice-ink-12)]",
        // Slide in/out on the shared motion standard (UI-18) — the
        // `motion-standard` utility binds tw-animate's duration/ease to
        // the app tokens; the global reduced-motion guard collapses it.
        "motion-standard transition data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        className
      ),
      children: [
        /* @__PURE__ */ jsxs7("header", { className: "flex flex-none items-start gap-3 border-b border-[var(--splice-ink-10)] px-6 py-4", children: [
          /* @__PURE__ */ jsxs7("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsx17(DialogPrimitive2.Title, { className: "truncate font-semibold text-foreground", children: title }),
            description && /* @__PURE__ */ jsx17(DialogPrimitive2.Description, { className: "mt-0.5 truncate text-sm text-muted-foreground", children: description })
          ] }),
          headerActions && /* @__PURE__ */ jsx17("div", { className: "flex flex-none items-center gap-1", children: headerActions }),
          /* @__PURE__ */ jsx17(
            DialogPrimitive2.Close,
            {
              className: "rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:outline-hidden",
              "aria-label": "Close panel",
              children: /* @__PURE__ */ jsx17(XIcon3, { className: "size-4" })
            }
          )
        ] }),
        /* @__PURE__ */ jsx17("div", { className: "min-h-0 flex-1 overflow-y-auto px-6 py-5", children }),
        !hideFooter && /* @__PURE__ */ jsxs7("footer", { className: "flex flex-none items-center justify-end gap-2 border-t border-[var(--splice-ink-10)] px-6 py-4", children: [
          /* @__PURE__ */ jsx17(
            "button",
            {
              type: "button",
              onClick: handleCancel,
              className: "inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
              children: cancelLabel
            }
          ),
          /* @__PURE__ */ jsx17(
            "button",
            {
              type: "button",
              onClick: onSave,
              disabled: saveDisabled || saving,
              className: "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50",
              children: saving ? "Saving\u2026" : saveLabel
            }
          )
        ] })
      ]
    }
  ) }) });
}

// src/list-state.tsx
import { jsx as jsx18, jsxs as jsxs8 } from "react/jsx-runtime";
function ListState({
  isPending,
  hasItems,
  skeleton,
  children,
  className
}) {
  const showSkeleton = isPending && !hasItems;
  const refetching = isPending && hasItems;
  if (showSkeleton) {
    return /* @__PURE__ */ jsx18("div", { className, "aria-busy": true, children: skeleton ?? /* @__PURE__ */ jsx18(ListSkeleton, {}) });
  }
  return /* @__PURE__ */ jsx18(
    "div",
    {
      className: cn("list-cross-fade", refetching && "opacity-40", className),
      "aria-busy": refetching || void 0,
      children
    }
  );
}
function ListSkeleton({
  rows = 6,
  variant = "grid",
  className
}) {
  return /* @__PURE__ */ jsx18(
    "div",
    {
      className: cn(
        variant === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2",
        className
      ),
      "data-testid": "list-skeleton",
      children: Array.from({ length: rows }).map((_, i) => /* @__PURE__ */ jsxs8(
        "div",
        {
          className: "space-y-3 rounded-md border bg-card p-4",
          "data-testid": "skeleton-card",
          children: [
            /* @__PURE__ */ jsx18(
              "div",
              {
                className: "h-4 animate-pulse rounded bg-muted",
                style: { width: `${[70, 55, 62, 48][i % 4]}%` }
              }
            ),
            /* @__PURE__ */ jsx18("div", { className: "h-3 w-2/5 animate-pulse rounded bg-muted" })
          ]
        },
        i
      ))
    }
  );
}

// src/stat-tile.tsx
import { jsx as jsx19, jsxs as jsxs9 } from "react/jsx-runtime";
var TONE_CLASS = {
  default: "text-muted-foreground",
  active: "text-signal",
  busy: "text-info",
  warn: "text-warning",
  danger: "text-destructive"
};
function StatTile({ label, value, icon: Icon2, tone = "default", className }) {
  return /* @__PURE__ */ jsxs9(
    "div",
    {
      "data-stat-tile": true,
      "data-tone": tone,
      className: cn(
        "flex items-center gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm",
        className
      ),
      children: [
        Icon2 ? /* @__PURE__ */ jsx19(
          "div",
          {
            className: cn(
              "grid size-9 flex-none place-items-center rounded-md bg-muted/60",
              TONE_CLASS[tone]
            ),
            children: /* @__PURE__ */ jsx19(Icon2, { className: "size-4" })
          }
        ) : null,
        /* @__PURE__ */ jsxs9("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsx19("div", { className: "text-2xl font-semibold leading-none tabular-nums", children: value }),
          /* @__PURE__ */ jsx19("div", { className: "mt-1 truncate text-xs text-muted-foreground", children: label })
        ] })
      ]
    }
  );
}
export {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DataTable,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  ListSkeleton,
  ListState,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Separator2 as Separator,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
  SidePanel,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  SimpleSelect,
  Skeleton,
  StatTile,
  Switch,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  badgeVariants,
  buttonVariants,
  cn,
  hitTargetFloor,
  parseSort,
  serializeSort,
  sortStateFor,
  toggleSortKey,
  useIsMobile,
  useSidebar
};
//# sourceMappingURL=index.js.map