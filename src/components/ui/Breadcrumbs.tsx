"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { clsx } from "clsx";
import { Skeleton } from "./Skeleton";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  maxItems?: number;
  loading?: boolean;
  separator?: React.ReactNode;
}

function Breadcrumbs({
  items,
  maxItems = 4,
  loading = false,
  separator,
  className,
  ...props
}: BreadcrumbsProps) {
  if (loading) {
    return (
      <nav className={clsx("flex items-center gap-1.5", className)} {...props}>
        <Skeleton className="h-4 w-20" />
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <Skeleton className="h-4 w-24" />
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <Skeleton className="h-4 w-16" />
      </nav>
    );
  }

  if (items.length === 0) return null;

  const separatorElement = separator || (
    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
  );

  // Collapse middle items if there are too many
  const shouldCollapse = items.length > maxItems;
  let displayItems = items;

  if (shouldCollapse) {
    const firstItem = items[0];
    const lastItems = items.slice(-2);
    displayItems = [
      firstItem,
      { label: "...", href: undefined },
      ...lastItems,
    ];
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={clsx("flex items-center gap-1.5 text-sm", className)}
      {...props}
    >
      <ol className="flex items-center gap-1.5">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === "...";

          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && separatorElement}

              {isEllipsis ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted cursor-default">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </span>
              ) : isLast ? (
                <span
                  className={clsx(
                    "flex items-center gap-1.5 font-medium text-foreground truncate max-w-[200px]",
                    item.icon && "gap-1.5"
                  )}
                  aria-current="page"
                >
                  {item.icon}
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px]",
                    item.icon && "gap-1.5"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ) : (
                <span
                  className={clsx(
                    "flex items-center gap-1.5 text-muted-foreground truncate max-w-[150px]",
                    item.icon && "gap-1.5"
                  )}
                >
                  {item.icon}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { Breadcrumbs, type BreadcrumbItem };
