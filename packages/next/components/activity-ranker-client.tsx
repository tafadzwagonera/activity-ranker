"use client";

import type {
  LocationSuggestion,
  RankedActivitiesResponse,
  TransportMode,
} from "@activity-ranker/shared";
import { useEffect, useState } from "react";

import { fetchRankings, fetchSearchResults } from "../utils/api-client";
import { selectLocation } from "../utils/location-selection";
import { getRuntimeLabel } from "../utils/runtime-label";

const STORAGE_KEYS = {
  theme: "activity-ranker-next-theme",
  transport: "activity-ranker-next-transport",
} as const;

export const ActivityRankerClient = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSuggestion | null>(null);
  const [selectedTransport, setSelectedTransport] =
    useState<TransportMode>("rest");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [searching, setSearching] = useState(false);
  const [loadingRankings, setLoadingRankings] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [rankings, setRankings] = useState<RankedActivitiesResponse | null>(
    null,
  );

  useEffect(() => {
    const storedTransport = window.localStorage.getItem(STORAGE_KEYS.transport);
    const storedTheme = window.localStorage.getItem(STORAGE_KEYS.theme);

    if (storedTransport === "rest" || storedTransport === "graphql") {
      setSelectedTransport(storedTransport);
    }

    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      document.documentElement.dataset.theme = storedTheme;
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.transport, selectedTransport);
  }, [selectedTransport]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);

      try {
        const nextResults = await fetchSearchResults({
          fetcher: (input, init) =>
            fetch(input, { ...init, signal: controller.signal }),
          query: query.trim(),
          transport: selectedTransport,
        });
        setResults(nextResults);
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setSearchError("Unable to search for this location.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [query, selectedTransport]);

  useEffect(() => {
    if (!selectedLocation) {
      setRankings(null);
      return;
    }

    const load = async () => {
      setLoadingRankings(true);
      setRankingError(null);

      try {
        const nextRankings = await fetchRankings({
          fetcher: fetch,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          transport: selectedTransport,
        });
        setRankings(nextRankings);
      } catch {
        setRankings(null);
        setRankingError("Unable to load activity rankings.");
      } finally {
        setLoadingRankings(false);
      }
    };

    void load();
  }, [selectedLocation, selectedTransport]);

  const onSelectLocation = (location: LocationSuggestion) => {
    const selection = selectLocation(selectedLocation, location, false);
    setSelectedLocation(selection.selected);
    setSelectionError(selection.error);
  };

  const clearSelection = () => {
    setSelectedLocation(null);
    setSelectionError(null);
  };

  return (
    <main className="page-shell">
      <header className="hero">
        <button
          aria-label={
            theme === "light" ? "Switch to dark theme" : "Switch to light theme"
          }
          className="theme-toggle focus-ring"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          type="button"
        >
          {theme === "light" ? "Moon" : "Sun"}
        </button>

        <div className="wordmark">
          <p className="eyebrow">Activity Forecast · Next 7 Days</p>
          <h1>Venture</h1>
          <p className="lede">
            Search a city or town to rank what it will be most desirable to do
            over the next seven days.
          </p>
        </div>

        <div className="search-panel">
          <div
            aria-label="Transport mode"
            className="transport-switch"
            role="tablist"
          >
            <button
              className={`transport-switch__button focus-ring ${selectedTransport === "rest" ? "is-active" : ""}`}
              onClick={() => setSelectedTransport("rest")}
              type="button"
            >
              REST
            </button>
            <button
              className={`transport-switch__button focus-ring ${selectedTransport === "graphql" ? "is-active" : ""}`}
              onClick={() => setSelectedTransport("graphql")}
              type="button"
            >
              GraphQL
            </button>
          </div>

          <p className="transport-copy">{getRuntimeLabel(selectedTransport)}</p>

          <div aria-live="polite" className="selection-row">
            {selectedLocation ? (
              <span className="city-tag">
                {selectedLocation.name}
                <button
                  className="city-tag__remove focus-ring"
                  onClick={clearSelection}
                  type="button"
                >
                  ×
                </button>
              </span>
            ) : null}
          </div>

          <label className="sr-only" htmlFor="city-search">
            Search for a city or town
          </label>
          <input
            autoComplete="off"
            className="search-input focus-ring"
            id="city-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for a city or town"
            type="search"
            value={query}
          />

          {searching ? (
            <p className="status-copy">Searching destinations…</p>
          ) : null}
          {!searching && searchError ? (
            <p className="status-copy is-error">{searchError}</p>
          ) : null}
          {!searching && !searchError && selectionError ? (
            <p className="status-copy is-error">{selectionError}</p>
          ) : null}
          {!searching && !searchError && !selectionError ? (
            <p className="status-copy">
              Suggestions appear after three characters.
            </p>
          ) : null}

          {results.length ? (
            <ul className="suggestions" role="listbox">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    className="suggestion focus-ring"
                    onClick={() => onSelectLocation(result)}
                    type="button"
                  >
                    <span className="suggestion__name">{result.name}</span>
                    <span className="suggestion__meta">
                      {result.admin1}
                      {result.admin1 && result.country ? ", " : ""}
                      {result.country}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      {selectedLocation ? (
        <section className="results">
          <div className="results__header">
            <div>
              <p className="eyebrow">Selected destination</p>
              <h2>{selectedLocation.name}</h2>
              <p className="meta-copy">
                {selectedLocation.latitude.toFixed(4)},{" "}
                {selectedLocation.longitude.toFixed(4)}
              </p>
            </div>
          </div>

          {loadingRankings ? (
            <div aria-live="polite" className="loading-grid">
              {[1, 2, 3].map((card) => (
                <div className="loading-card" key={card} />
              ))}
            </div>
          ) : null}

          {!loadingRankings && rankingError ? (
            <p className="status-copy is-error">{rankingError}</p>
          ) : null}

          {!loadingRankings && !rankingError && rankings ? (
            <div className="days-grid">
              {rankings.days.map((day) => (
                <article className="day-card" key={day.date}>
                  <div className="day-card__header">
                    <p className="eyebrow">{day.date}</p>
                    <h3>Best activities</h3>
                  </div>
                  <ol className="activity-list">
                    {day.activities.map((activity) => (
                      <li className="activity-row" key={activity.activity}>
                        <div>
                          <p className="activity-row__title">
                            {activity.activity}
                          </p>
                          <p className="activity-row__reason">
                            {activity.reasons[0]}
                          </p>
                        </div>
                        <div className="activity-row__metrics">
                          <span className="pill">
                            {activity.score.toFixed(2)}
                          </span>
                          <span className="confidence">
                            Confidence {activity.confidence.toFixed(2)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
};
