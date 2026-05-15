import { cookies } from "next/headers";

import { ActivityRankerClient } from "../components/activity-ranker-client";
import {
  preferenceCookieNames,
  resolveThemePreference,
  resolveTransportPreference,
} from "../utils/preferences";

export default async function Page() {
  const cookieStore = await cookies();
  const initialTheme = resolveThemePreference(
    cookieStore.get(preferenceCookieNames.theme)?.value,
  );
  const initialTransport = resolveTransportPreference(
    cookieStore.get(preferenceCookieNames.transport)?.value,
  );

  return (
    <ActivityRankerClient
      initialTheme={initialTheme}
      initialTransport={initialTransport}
    />
  );
}
