// PRD F12: favorite videos saved in this browser (no account). Shared across
// components with useSyncExternalStore so every heart updates together.

import { useSyncExternalStore } from "react";
import type { Video } from "./types";

const KEY = "fpc:favorites";
const listeners = new Set<() => void>();
let cache: Video[] | null = null;

function read(): Video[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Video[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: favorites last for this visit only */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage); // keep other tabs in sync
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFavorites(): Video[] {
  return useSyncExternalStore(subscribe, read, () => []);
}

export function isFavorite(list: Video[], id: string): boolean {
  return list.some((v) => v.id === id);
}

export function toggleFavorite(video: Video) {
  const list = read();
  write(isFavorite(list, video.id) ? list.filter((v) => v.id !== video.id) : [video, ...list]);
}
