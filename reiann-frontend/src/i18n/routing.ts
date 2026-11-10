import { defineRouting } from "next-intl/routing";

/**
 * Thai is the only locale switched on for the MVP. English is wired up
 * (messages/en.json) and is enabled by adding "en" here once the copy is
 * reviewed. Thai URLs carry no prefix; English will live under /en.
 */
export const routing = defineRouting({
  locales: ["th"],
  defaultLocale: "th",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
