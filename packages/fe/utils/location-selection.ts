import type { LocationSuggestion } from "@activity-ranker/shared";

export const selectLocation = (
  current: LocationSuggestion | null,
  next: LocationSuggestion,
  allowMultiple = false,
) => {
  if (current && !allowMultiple && current.id !== next.id) {
    return {
      error:
        "Selecting multiple cities or towns is not supported yet. Clear the current destination first.",
      selected: current,
    };
  }

  return {
    error: null,
    selected: next,
  };
};
