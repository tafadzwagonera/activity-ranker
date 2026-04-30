<script setup lang="ts">
import type {
  LocationSuggestion,
  TransportMode,
} from "@activity-ranker/shared";
import { computed, ref, watch } from "vue";

import { useActivityRankings } from "../../composables/useActivityRankings";
import { useLocationSearch } from "../../composables/useLocationSearch";
import { selectLocation } from "../../utils/location-selection";
import { getRuntimeLabel } from "../../utils/runtime-label";

const selectedTransport = ref<TransportMode>("rest");
const selectedLocation = ref<LocationSuggestion | null>(null);
const selectionError = ref<string | null>(null);
const theme = ref<"light" | "dark">("light");

if (import.meta.client) {
  const storedTransport = localStorage.getItem("activity-ranker-transport");
  const storedTheme = localStorage.getItem("activity-ranker-theme");

  if (storedTransport === "rest" || storedTransport === "graphql") {
    selectedTransport.value = storedTransport;
  }

  if (storedTheme === "light" || storedTheme === "dark") {
    theme.value = storedTheme;
    document.documentElement.setAttribute("data-theme", storedTheme);
  }
}

const {
  error: searchError,
  loading: searching,
  query,
  results,
} = useLocationSearch(selectedTransport);
const {
  data: rankings,
  error: rankingError,
  loading: loadingRankings,
  loadRankings,
} = useActivityRankings(selectedTransport);

watch(selectedTransport, (value) => {
  if (import.meta.client) {
    localStorage.setItem("activity-ranker-transport", value);
  }

  if (selectedLocation.value) {
    void loadRankings(selectedLocation.value);
  }
});

const applyTheme = (nextTheme: "light" | "dark") => {
  theme.value = nextTheme;

  if (import.meta.client) {
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("activity-ranker-theme", nextTheme);
  }
};

const onSelectLocation = async (location: LocationSuggestion) => {
  const selection = selectLocation(selectedLocation.value, location, false);
  selectedLocation.value = selection.selected;
  selectionError.value = selection.error;

  if (!selection.error && selection.selected) {
    await loadRankings(selection.selected);
  }
};

const clearSelection = () => {
  selectedLocation.value = null;
  selectionError.value = null;
};

const runtimeLabel = computed(() => getRuntimeLabel(selectedTransport.value));
</script>

<template>
  <main class="w-[min(1120px,calc(100%-2rem))] mx-auto py-8 pb-16">
    <header
      class="relative min-h-[46vh] pt-4 pb-10 max-[720px]:min-h-0 max-[720px]:pt-14"
    >
      <button
        class="absolute top-0 right-0 max-[720px]:top-2 border border-border rounded-full bg-surface-2 text-text-1 py-3 px-4 cursor-pointer focus-ring"
        :aria-label="
          theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
        "
        @click="applyTheme(theme === 'light' ? 'dark' : 'light')"
      >
        <svg
          v-if="theme === 'light'"
          aria-hidden="true"
          fill="none"
          height="16"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="16"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        <svg
          v-else
          aria-hidden="true"
          fill="none"
          height="16"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="16"
        >
          <circle cx="12" cy="12" r="4" />
          <line x1="12" x2="12" y1="2" y2="6" />
          <line x1="12" x2="12" y1="18" y2="22" />
          <line x1="4.22" x2="7.05" y1="4.22" y2="7.05" />
          <line x1="16.95" x2="19.78" y1="16.95" y2="19.78" />
          <line x1="2" x2="6" y1="12" y2="12" />
          <line x1="18" x2="22" y1="12" y2="12" />
          <line x1="4.22" x2="7.05" y1="19.78" y2="16.95" />
          <line x1="16.95" x2="19.78" y1="7.05" y2="4.22" />
        </svg>
      </button>

      <div class="max-w-[42rem] pt-16">
        <p
          class="m-0 mb-2 text-text-3 text-xs font-bold tracking-[0.2em] uppercase"
        >
          Activity Forecast · Next 7 Days
        </p>
        <h1
          class="m-0 text-text-1 font-serif text-[clamp(3.5rem,7vw,5rem)] leading-[0.95]"
        >
          Venture
        </h1>
        <p class="max-w-[34rem] text-text-2 text-[1.05rem] leading-[1.7]">
          Search a city or town to rank what it will be most desirable to do
          over the next seven days.
        </p>
      </div>

      <div
        class="mt-8 p-[1.4rem] border border-border rounded-lg bg-[color-mix(in_srgb,var(--surface-1)_92%,transparent)] shadow backdrop-blur-[18px]"
      >
        <div
          class="inline-flex gap-2 p-[0.35rem] rounded-full bg-surface-2"
          role="tablist"
          aria-label="Transport mode"
        >
          <button
            class="border-none rounded-full bg-transparent text-text-2 cursor-pointer font-semibold py-[0.65rem] px-4 focus-ring"
            :class="{ 'is-active': selectedTransport === 'rest' }"
            @click="selectedTransport = 'rest'"
          >
            REST
          </button>
          <button
            class="border-none rounded-full bg-transparent text-text-2 cursor-pointer font-semibold py-[0.65rem] px-4 focus-ring"
            :class="{ 'is-active': selectedTransport === 'graphql' }"
            @click="selectedTransport = 'graphql'"
          >
            GraphQL
          </button>
        </div>

        <p class="mt-3 mb-4 text-[0.9rem] text-text-2">{{ runtimeLabel }}</p>

        <div class="min-h-[2rem] mb-3" aria-live="polite">
          <span
            v-if="selectedLocation"
            class="inline-flex items-center gap-3 py-[0.35rem] pr-2 pl-[0.9rem] border border-gold-ring rounded-full bg-gold-dim text-gold text-sm font-semibold animate-[tagIn_0.18s_ease-out]"
          >
            {{ selectedLocation.name }}
            <button
              class="border-none rounded-full bg-transparent text-inherit cursor-pointer text-base focus-ring"
              @click="clearSelection"
            >
              ×
            </button>
          </span>
        </div>

        <label class="sr-only" for="city-search"
          >Search for a city or town</label
        >
        <input
          id="city-search"
          v-model="query"
          class="search-input w-full py-4 px-[1.1rem] border-[1.5px] border-border rounded-lg bg-surface-1 text-text-1 shadow focus-ring"
          type="search"
          autocomplete="off"
          placeholder="Search for a city or town"
        />

        <p v-if="searching" class="text-text-2">Searching destinations…</p>
        <p v-else-if="searchError" class="text-text-2 is-error">
          {{ searchError }}
        </p>
        <p v-else-if="selectionError" class="text-text-2 is-error">
          {{ selectionError }}
        </p>
        <p v-else class="text-text-2">
          Suggestions appear after three characters.
        </p>

        <ul
          v-if="results.length"
          class="list-none mt-4 p-0 grid gap-[0.65rem] animate-[dropIn_0.14s_ease-out]"
          role="listbox"
        >
          <li v-for="result in results" :key="result.id">
            <button
              class="w-full flex flex-col items-start gap-1 py-[0.95rem] px-4 border border-border rounded bg-surface-1 cursor-pointer text-left transition-[transform,border-color,background] duration-[0.18s] ease-in-out hover:-translate-y-px hover:border-border-h hover:bg-sky-dim focus-ring"
              @click="onSelectLocation(result)"
            >
              <span class="text-text-1 font-semibold">{{ result.name }}</span>
              <span class="text-text-3 font-mono text-[0.8rem]">
                {{ result.admin1
                }}<span v-if="result.admin1 && result.country">, </span
                >{{ result.country }}
              </span>
            </button>
          </li>
        </ul>
      </div>
    </header>

    <section
      v-if="selectedLocation"
      class="mt-8 p-6 border border-border rounded-lg bg-[color-mix(in_srgb,var(--surface-1)_92%,transparent)] shadow"
    >
      <div>
        <div>
          <p
            class="m-0 mb-2 text-text-3 text-xs font-bold tracking-[0.2em] uppercase"
          >
            Selected destination
          </p>
          <h2 class="m-0 font-serif text-[2rem]">
            {{ selectedLocation.name }}
          </h2>
          <p class="my-2 text-text-2">
            {{ selectedLocation.latitude.toFixed(4) }},
            {{ selectedLocation.longitude.toFixed(4) }}
          </p>
        </div>
      </div>

      <div
        v-if="loadingRankings"
        class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
        aria-live="polite"
      >
        <div
          v-for="card in 3"
          :key="card"
          class="loading-card min-h-[16rem] rounded-lg bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2 [background-size:200%_100%] animate-[shimmer_1.4s_linear_infinite]"
        />
      </div>

      <p v-else-if="rankingError" class="text-text-2 is-error">
        {{ rankingError }}
      </p>

      <div
        v-else-if="rankings"
        class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
      >
        <article
          v-for="(day, index) in rankings.days"
          :key="day.date"
          class="p-[1.15rem] border border-border rounded-lg bg-[color-mix(in_srgb,var(--surface-1)_92%,transparent)] shadow animate-[fadeUp_0.35s_ease-out]"
          :style="
            index === 1
              ? { animationDelay: '0.08s' }
              : index === 2
                ? { animationDelay: '0.16s' }
                : undefined
          "
        >
          <div>
            <p
              class="m-0 mb-2 text-text-3 text-xs font-bold tracking-[0.2em] uppercase"
            >
              {{ day.date }}
            </p>
            <h3 class="m-0 font-serif text-[2rem]">Best activities</h3>
          </div>

          <ol class="list-none mt-4 p-0 grid gap-[0.85rem]">
            <li
              v-for="activity in day.activities"
              :key="activity.activity"
              class="activity-row flex justify-between gap-4 items-start pt-[0.85rem] border-t border-border first:pt-0 first:border-t-0"
            >
              <div>
                <p class="m-0 capitalize font-bold">
                  {{ activity.activity }}
                </p>
                <p class="mt-1 text-text-2 text-[0.9rem] leading-[1.5]">
                  {{ activity.reasons[0] }}
                </p>
              </div>

              <div class="activity-row__metrics text-right">
                <span
                  class="inline-flex py-[0.3rem] px-[0.6rem] rounded-full bg-gold-dim text-gold font-mono text-[0.8rem]"
                  >{{ activity.score.toFixed(2) }}</span
                >
                <span class="block mt-[0.35rem] text-text-3 text-[0.8rem]"
                  >Confidence {{ activity.confidence.toFixed(2) }}</span
                >
              </div>
            </li>
          </ol>
        </article>
      </div>
    </section>
  </main>
</template>
