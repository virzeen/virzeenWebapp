import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "../lib/cn";

const alertVariants = cva("gap-3 px-4 py-3 flex items-start rounded-md border text-body", {
  variants: {
    variant: {
      info: "border-line bg-surface text-ink",
      success: "border-success/30 bg-canvas text-ink",
      warning: "border-warning/40 bg-canvas text-ink",
      danger: "border-danger/40 bg-canvas text-ink",
    },
  },
  defaultVariants: { variant: "info" },
});

const icons = {
  info: { Icon: Info, className: "text-ink-muted" },
  success: { Icon: CheckCircle2, className: "text-success" },
  warning: { Icon: AlertTriangle, className: "text-warning" },
  danger: { Icon: XCircle, className: "text-danger" },
} as const;

export type AlertProps = React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & {
    title?: React.ReactNode;
    /** Optional action (e.g. a "Try again" Button) shown under the message. */
    action?: React.ReactNode;
  };

/**
 * Persistent message for a page or form section (form-level error, "We're confirming your payment").
 * Temporary feedback uses `Toast`. `danger` alerts are announced immediately (role="alert").
 */
export function Alert({ className, variant, title, action, children, ...props }: AlertProps) {
  const { Icon, className: iconClass } = icons[variant ?? "info"];
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", iconClass)} strokeWidth={1.5} aria-hidden />
      <div className="gap-2 flex flex-col">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-ink">{children}</div>}
        {action && <div className="pt-1">{action}</div>}
      </div>
    </div>
  );
}
