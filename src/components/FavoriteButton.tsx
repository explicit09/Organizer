"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { clsx } from "clsx";

interface FavoriteButtonProps {
  itemType: "item" | "project" | "note" | "view";
  itemId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function FavoriteButton({
  itemType,
  itemId,
  className,
  size = "md",
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already favorited
    fetch(`/api/favorites?type=${itemType}`)
      .then((res) => res.json())
      .then((data) => {
        const favorites = data.favorites || [];
        setIsFavorite(favorites.some((f: { itemId: string }) => f.itemId === itemId));
      })
      .catch(console.error);
  }, [itemType, itemId]);

  async function toggleFavorite() {
    setLoading(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId, toggle: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsFavorite(data.favorited);
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    } finally {
      setLoading(false);
    }
  }

  const sizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={clsx(
        "rounded-md p-1.5 transition-colors",
        isFavorite
          ? "text-amber-500 hover:bg-amber-500/10"
          : "text-muted-foreground hover:text-amber-500 hover:bg-muted",
        loading && "opacity-50 pointer-events-none",
        className
      )}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        size={sizes[size]}
        className={clsx(isFavorite && "fill-current")}
      />
    </button>
  );
}
