import { env } from "node:process";
import { defineNuxtConfig } from "nuxt/config";

import { loadFrontendRuntimeEnv } from "./utils/load-runtime-env";
import { resolveFrontendRuntimeConfig } from "./utils/dev-runtime-config";

loadFrontendRuntimeEnv();
const runtimeConfig = resolveFrontendRuntimeConfig(env);

export default defineNuxtConfig({
  app: {
    head: {
      link: [
        { href: "https://fonts.googleapis.com", rel: "preconnect" },
        {
          crossorigin: "",
          href: "https://fonts.gstatic.com",
          rel: "preconnect",
        },
        {
          href: "https://fonts.googleapis.com/css2?family=Cormorant:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700&display=swap",
          rel: "stylesheet",
        },
      ],
      title: "Venture Activity Forecast",
    },
  },
  compatibilityDate: "2026-04-28",
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },
  modules: ["@vueuse/nuxt", "@nuxtjs/tailwindcss"],
  runtimeConfig: {
    apiBaseUrl: runtimeConfig.apiBaseUrl,
    apiInternalKey: runtimeConfig.apiInternalKey,
    public: {},
  },
  ssr: false,
});
