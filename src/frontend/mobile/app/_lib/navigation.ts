import type { Router } from "expo-router";

/** Use when leaving a pushed screen; falls back to home if there is nothing to pop. */
export function goBackOrHome(router: Router) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/(tabs)");
  }
}
