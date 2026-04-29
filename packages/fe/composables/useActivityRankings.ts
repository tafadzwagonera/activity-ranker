import type {
  LocationSuggestion,
  RankedActivitiesResponse,
  TransportMode,
} from "@activity-ranker/shared";
import type { Ref } from "vue";
import { ref } from "vue";

import { fetchRankings } from "../utils/api-client";

export const useActivityRankings = (transport: Ref<TransportMode>) => {
  const data = ref<RankedActivitiesResponse | null>(null);
  const error = ref<string | null>(null);
  const loading = ref(false);

  const loadRankings = async (location: LocationSuggestion) => {
    loading.value = true;
    error.value = null;

    try {
      data.value = await fetchRankings({
        latitude: location.latitude,
        longitude: location.longitude,
        transport: transport.value,
      });
    } catch {
      error.value = "Unable to load activity rankings.";
      data.value = null;
    } finally {
      loading.value = false;
    }
  };

  return {
    data,
    error,
    loading,
    loadRankings,
  };
};
