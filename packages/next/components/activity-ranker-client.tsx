"use client";

import type {
  LocationSuggestion,
  RankedActivitiesResponse,
  TransportMode,
} from "@activity-ranker/shared";
import { useEffect, useState } from "react";

import { fetchRankings, fetchSearchResults } from "../utils/api-client";
import { selectLocation } from "../utils/location-selection";
import {
  buildPreferenceCookie,
  preferenceCookieNames,
  preferenceStorageKeys,
  type ThemeMode,
} from "../utils/preferences";
import { getRuntimeLabel } from "../utils/runtime-label";

const SunIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="16"
    stroke="currentColor"
    strokeWidth="2"
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
);

const MoonIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="16"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="16"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

type ActivityRankerClientProps = {
  initialTheme: ThemeMode;
  initialTransport: TransportMode;
};

export const ActivityRankerClient = ({
  initialTheme,
  initialTransport,
}: ActivityRankerClientProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSuggestion | null>(null);
  const [selectedTransport, setSelectedTransport] =
    useState<TransportMode>(initialTransport);
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [searching, setSearching] = useState(false);
  const [loadingRankings, setLoadingRankings] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [rankings, setRankings] = useState<RankedActivitiesResponse | null>(
    null,
  );

  useEffect(() => {
    window.localStorage.setItem(
      preferenceStorageKeys.transport,
      selectedTransport,
    );
    document.cookie = buildPreferenceCookie({
      name: preferenceCookieNames.transport,
      value: selectedTransport,
    });
  }, [selectedTransport]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(preferenceStorageKeys.theme, theme);
    document.cookie = buildPreferenceCookie({
      name: preferenceCookieNames.theme,
      value: theme,
    });
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
    <main className="w-[min(1120px,calc(100%-2rem))] mx-auto py-8 pb-16">
      <header className="relative min-h-[46vh] pt-4 pb-10 max-[720px]:min-h-0 max-[720px]:pt-14">
        <button
          aria-label={
            theme === "light" ? "Switch to dark theme" : "Switch to light theme"
          }
          className="absolute top-0 right-0 max-[720px]:top-2 border border-border rounded-full bg-surface-2 text-text-1 py-3 px-4 cursor-pointer focus-ring"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          type="button"
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>

        <div className="max-w-[42rem] pt-16">
          <p className="m-0 mb-2 text-text-3 text-xs font-bold tracking-[0.2em] uppercase">
            Activity Forecast · Next 7 Days
          </p>
          <h1 className="m-0 text-text-1 font-serif text-[clamp(3.5rem,7vw,5rem)] leading-[0.95]">
            Venture
          </h1>
          <p className="max-w-[34rem] text-text-2 text-[1.05rem] leading-[1.7]">
            Search a city or town to rank what it will be most desirable to do
            over the next seven days.
          </p>
        </div>

        <div className="mt-8 p-[1.4rem] border border-border rounded-lg bg-[color-mix(in_srgb,var(--surface-1)_92%,transparent)] shadow backdrop-blur-[18px]">
          <div
            aria-label="Transport mode"
            className="inline-flex gap-2 p-[0.35rem] rounded-full bg-surface-2"
            role="tablist"
          >
            <button
              className={`border-none rounded-full bg-transparent text-text-2 cursor-pointer font-semibold py-[0.65rem] px-4 focus-ring${selectedTransport === "rest" ? " is-active" : ""}`}
              onClick={() => setSelectedTransport("rest")}
              type="button"
            >
              REST
            </button>
            <button
              className={`border-none rounded-full bg-transparent text-text-2 cursor-pointer font-semibold py-[0.65rem] px-4 focus-ring${selectedTransport === "graphql" ? " is-active" : ""}`}
              onClick={() => setSelectedTransport("graphql")}
              type="button"
            >
              GraphQL
            </button>
          </div>

          <p className="mt-3 mb-4 text-[0.9rem] text-text-2">
            {getRuntimeLabel(selectedTransport)}
          </p>

          <div aria-live="polite" className="min-h-[2rem] mb-3">
            {selectedLocation ? (
              <span className="inline-flex items-center gap-3 py-[0.35rem] pr-2 pl-[0.9rem] border border-gold-ring rounded-full bg-gold-dim text-gold text-sm font-semibold animate-[tagIn_0.18s_ease-out]">
                {selectedLocation.name}
                <button
                  className="border-none rounded-full bg-transparent text-inherit cursor-pointer text-base focus-ring"
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
            className="search-input w-full py-4 px-[1.1rem] border-[1.5px] border-border rounded-lg bg-surface-1 text-text-1 shadow focus-ring"
            id="city-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for a city or town"
            type="search"
            value={query}
          />

          {searching ? (
            <p className="text-text-2">Searching destinations…</p>
          ) : null}
          {!searching && searchError ? (
            <p className="text-text-2 is-error">{searchError}</p>
          ) : null}
          {!searching && !searchError && selectionError ? (
            <p className="text-text-2 is-error">{selectionError}</p>
          ) : null}
          {!searching && !searchError && !selectionError ? (
            <p className="text-text-2">
              Suggestions appear after three characters.
            </p>
          ) : null}

          {results.length ? (
            <ul
              className="list-none mt-4 p-0 grid gap-[0.65rem] animate-[dropIn_0.14s_ease-out]"
              role="listbox"
            >
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    className="w-full flex flex-col items-start gap-1 py-[0.95rem] px-4 border border-border rounded bg-surface-1 cursor-pointer text-left transition-[transform,border-color,background] duration-[0.18s] ease-in-out hover:-translate-y-px hover:border-border-h hover:bg-sky-dim focus-ring"
                    onClick={() => onSelectLocation(result)}
                    type="button"
                  >
                    <span className="text-text-1 font-semibold">
                      {result.name}
                    </span>
                    <span className="text-text-3 font-mono text-[0.8rem]">
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
        <section className="mt-8 p-6 border border-border rounded-lg bg-[color-mix(in_srgb,var(--surface-1)_92%,transparent)] shadow">
          <div>
            <div>
              <p className="m-0 mb-2 text-text-3 text-xs font-bold tracking-[0.2em] uppercase">
                Selected destination
              </p>
              <h2 className="m-0 font-serif text-[2rem]">
                {selectedLocation.name}
              </h2>
              <p className="my-2 text-text-2">
                {selectedLocation.latitude.toFixed(4)},{" "}
                {selectedLocation.longitude.toFixed(4)}
              </p>
            </div>
          </div>

          {loadingRankings ? (
            <div
              aria-live="polite"
              className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
            >
              {[1, 2, 3].map((card) => (
                <div
                  className="min-h-[16rem] rounded-lg bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2 [background-size:200%_100%] animate-[shimmer_1.4s_linear_infinite]"
                  key={card}
                />
              ))}
            </div>
          ) : null}

          {!loadingRankings && rankingError ? (
            <p className="text-text-2 is-error">{rankingError}</p>
          ) : null}

          {!loadingRankings && !rankingError && rankings ? (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
              {rankings.days.map((day, index) => (
                <article
                  className="p-[1.15rem] border border-border rounded-lg bg-[color-mix(in_srgb,var(--surface-1)_92%,transparent)] shadow animate-[fadeUp_0.35s_ease-out]"
                  key={day.date}
                  style={
                    index === 1
                      ? { animationDelay: "0.08s" }
                      : index === 2
                        ? { animationDelay: "0.16s" }
                        : undefined
                  }
                >
                  <div>
                    <p className="m-0 mb-2 text-text-3 text-xs font-bold tracking-[0.2em] uppercase">
                      {day.date}
                    </p>
                    <h3 className="m-0 font-serif text-[2rem]">
                      Best activities
                    </h3>
                  </div>
                  <ol className="list-none mt-4 p-0 grid gap-[0.85rem]">
                    {day.activities.map((activity) => (
                      <li
                        className="activity-row flex justify-between gap-4 items-start pt-[0.85rem] border-t border-border first:pt-0 first:border-t-0"
                        key={activity.activity}
                      >
                        <div>
                          <p className="m-0 capitalize font-bold">
                            {activity.activity}
                          </p>
                          <p className="mt-1 text-text-2 text-[0.9rem] leading-[1.5]">
                            {activity.reasons[0]}
                          </p>
                        </div>
                        <div className="activity-row__metrics text-right">
                          <span className="inline-flex py-[0.3rem] px-[0.6rem] rounded-full bg-gold-dim text-gold font-mono text-[0.8rem]">
                            {activity.score.toFixed(2)}
                          </span>
                          <span className="block mt-[0.35rem] text-text-3 text-[0.8rem]">
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
