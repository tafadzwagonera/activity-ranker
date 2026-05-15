import { cookies } from "next/headers";
import type { Metadata } from "next";

import {
  preferenceCookieNames,
  resolveThemePreference,
} from "../utils/preferences";
import "./globals.css";

export const metadata: Metadata = {
  title: "Venture Activity Forecast",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function RootLayout({ children }: RootLayoutProps) {
  const cookieStore = await cookies();
  const initialTheme = resolveThemePreference(
    cookieStore.get(preferenceCookieNames.theme)?.value,
  );

  return (
    <html data-theme={initialTheme} lang="en">
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link
          crossOrigin=""
          href="https://fonts.gstatic.com"
          rel="preconnect"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
