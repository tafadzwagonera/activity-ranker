import type {
  LocationSuggestion,
  TransportMode,
} from "@activity-ranker/shared";
import type { Ref } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { ref, watch } from "vue";

import { fetchSearchResults } from "../utils/api-client";

export const useLocationSearch = (transport: Ref<TransportMode>) => {
  const error = ref<string | null>(null);
  const loading = ref(false);
  const query = ref("");
  const results = ref<LocationSuggestion[]>([]);

  const search = useDebounceFn(async () => {
    const trimmedQuery = query.value.trim();

    if (trimmedQuery.length < 3) {
      results.value = [];
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      results.value = await fetchSearchResults({
        query: trimmedQuery,
        transport: transport.value,
      });
    } catch {
      error.value = "Unable to search for this location.";
      results.value = [];
    } finally {
      loading.value = false;
    }
  }, 350);

  watch([query, transport], () => {
    void search();
  });

  return {
    error,
    loading,
    query,
    results,
  };
};
