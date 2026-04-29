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
  <main class="page-shell">
    <header class="hero">
      <button
        class="theme-toggle focus-ring"
        :aria-label="
          theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
        "
        @click="applyTheme(theme === 'light' ? 'dark' : 'light')"
      >
        {{ theme === "light" ? "Moon" : "Sun" }}
      </button>

      <div class="wordmark">
        <p class="eyebrow">Activity Forecast · Next 7 Days</p>
        <h1>Venture</h1>
        <p class="lede">
          Search a city or town to rank what it will be most desirable to do
          over the next seven days.
        </p>
      </div>

      <div class="search-panel">
        <div
          class="transport-switch"
          role="tablist"
          aria-label="Transport mode"
        >
          <button
            class="transport-switch__button focus-ring"
            :class="{ 'is-active': selectedTransport === 'rest' }"
            @click="selectedTransport = 'rest'"
          >
            REST
          </button>
          <button
            class="transport-switch__button focus-ring"
            :class="{ 'is-active': selectedTransport === 'graphql' }"
            @click="selectedTransport = 'graphql'"
          >
            GraphQL
          </button>
        </div>

        <p class="transport-copy">{{ runtimeLabel }}</p>

        <div class="selection-row" aria-live="polite">
          <span v-if="selectedLocation" class="city-tag">
            {{ selectedLocation.name }}
            <button class="city-tag__remove focus-ring" @click="clearSelection">
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
          class="search-input focus-ring"
          type="search"
          autocomplete="off"
          placeholder="Search for a city or town"
        />

        <p v-if="searching" class="status-copy">Searching destinations…</p>
        <p v-else-if="searchError" class="status-copy is-error">
          {{ searchError }}
        </p>
        <p v-else-if="selectionError" class="status-copy is-error">
          {{ selectionError }}
        </p>
        <p v-else class="status-copy">
          Suggestions appear after three characters.
        </p>

        <ul v-if="results.length" class="suggestions" role="listbox">
          <li v-for="result in results" :key="result.id">
            <button
              class="suggestion focus-ring"
              @click="onSelectLocation(result)"
            >
              <span class="suggestion__name">{{ result.name }}</span>
              <span class="suggestion__meta">
                {{ result.admin1
                }}<span v-if="result.admin1 && result.country">, </span
                >{{ result.country }}
              </span>
            </button>
          </li>
        </ul>
      </div>
    </header>

    <section v-if="selectedLocation" class="results">
      <div class="results__header">
        <div>
          <p class="eyebrow">Selected destination</p>
          <h2>{{ selectedLocation.name }}</h2>
          <p class="meta-copy">
            {{ selectedLocation.latitude.toFixed(4) }},
            {{ selectedLocation.longitude.toFixed(4) }}
          </p>
        </div>
      </div>

      <div v-if="loadingRankings" class="loading-grid" aria-live="polite">
        <div v-for="card in 3" :key="card" class="loading-card" />
      </div>

      <p v-else-if="rankingError" class="status-copy is-error">
        {{ rankingError }}
      </p>

      <div v-else-if="rankings" class="days-grid">
        <article v-for="day in rankings.days" :key="day.date" class="day-card">
          <div class="day-card__header">
            <p class="eyebrow">{{ day.date }}</p>
            <h3>Best activities</h3>
          </div>

          <ol class="activity-list">
            <li
              v-for="activity in day.activities"
              :key="activity.activity"
              class="activity-row"
            >
              <div>
                <p class="activity-row__title">{{ activity.activity }}</p>
                <p class="activity-row__reason">{{ activity.reasons[0] }}</p>
              </div>

              <div class="activity-row__metrics">
                <span class="pill">{{ activity.score.toFixed(2) }}</span>
                <span class="confidence"
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

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.page-shell {
  width: min(1120px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2rem 0 4rem;
}

.hero {
  position: relative;
  min-height: 46vh;
  padding: 1rem 0 2.5rem;
}

.theme-toggle {
  position: absolute;
  top: 0;
  right: 0;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-1);
  padding: 0.7rem 1rem;
  cursor: pointer;
}

.wordmark {
  max-width: 42rem;
  padding-top: 4rem;
}

.eyebrow {
  margin: 0 0 0.5rem;
  color: var(--text-3);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.wordmark h1 {
  margin: 0;
  color: var(--text-1);
  font-family: Cormorant, Georgia, serif;
  font-size: clamp(3.5rem, 7vw, 5rem);
  line-height: 0.95;
}

.lede {
  max-width: 34rem;
  color: var(--text-2);
  font-size: 1.05rem;
  line-height: 1.7;
}

.search-panel,
.results,
.day-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--surface-1) 92%, transparent);
  box-shadow: var(--shadow);
}

.search-panel {
  margin-top: 2rem;
  padding: 1.4rem;
  backdrop-filter: blur(18px);
}

.transport-switch {
  display: inline-flex;
  gap: 0.5rem;
  padding: 0.35rem;
  border-radius: 999px;
  background: var(--surface-2);
}

.transport-switch__button {
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  font-weight: 600;
  padding: 0.65rem 1rem;
}

.transport-switch__button.is-active {
  background: var(--surface-1);
  color: var(--sky);
  box-shadow: var(--shadow);
}

.transport-copy,
.status-copy,
.meta-copy {
  color: var(--text-2);
}

.transport-copy {
  margin: 0.75rem 0 1rem;
  font-size: 0.9rem;
}

.status-copy.is-error {
  color: var(--danger);
}

.selection-row {
  min-height: 2rem;
  margin-bottom: 0.75rem;
}

.city-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.35rem 0.5rem 0.35rem 0.9rem;
  border: 1px solid var(--gold-ring);
  border-radius: 999px;
  background: var(--gold-dim);
  color: var(--gold);
  font-size: 0.875rem;
  font-weight: 600;
}

.city-tag__remove {
  border: none;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 1rem;
}

.search-input {
  width: 100%;
  padding: 1rem 1.1rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface-1);
  color: var(--text-1);
  box-shadow: var(--shadow);
}

.search-input:focus {
  border-color: var(--sky);
  box-shadow:
    0 0 0 3px var(--sky-ring),
    var(--shadow);
  outline: none;
}

.suggestions {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}

.suggestion {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  padding: 0.95rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-1);
  cursor: pointer;
  text-align: left;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.suggestion:hover {
  transform: translateY(-1px);
  border-color: var(--border-h);
  background: var(--sky-dim);
}

.suggestion__name {
  color: var(--text-1);
  font-weight: 600;
}

.suggestion__meta {
  color: var(--text-3);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.8rem;
}

.results {
  margin-top: 2rem;
  padding: 1.5rem;
}

.results__header h2,
.day-card h3 {
  margin: 0;
  font-family: Cormorant, Georgia, serif;
  font-size: 2rem;
}

.loading-grid,
.days-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.loading-card {
  min-height: 16rem;
  border-radius: var(--radius-lg);
  background: linear-gradient(
    90deg,
    var(--surface-2) 0%,
    var(--surface-3) 50%,
    var(--surface-2) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.day-card {
  padding: 1.15rem;
}

.activity-list {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.85rem;
}

.activity-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  padding-top: 0.85rem;
  border-top: 1px solid var(--border);
}

.activity-row:first-child {
  padding-top: 0;
  border-top: none;
}

.activity-row__title {
  margin: 0;
  text-transform: capitalize;
  font-weight: 700;
}

.activity-row__reason {
  margin: 0.2rem 0 0;
  color: var(--text-2);
  font-size: 0.9rem;
  line-height: 1.5;
}

.activity-row__metrics {
  text-align: right;
}

.pill {
  display: inline-flex;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  background: var(--gold-dim);
  color: var(--gold);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.8rem;
}

.confidence {
  display: block;
  margin-top: 0.35rem;
  color: var(--text-3);
  font-size: 0.8rem;
}

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
}

@media (max-width: 720px) {
  .page-shell {
    width: min(100% - 1rem, 1120px);
  }

  .hero {
    min-height: auto;
    padding-top: 3.5rem;
  }

  .theme-toggle {
    top: 0.5rem;
  }

  .activity-row {
    flex-direction: column;
  }

  .activity-row__metrics {
    text-align: left;
  }
}
</style>
