// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      // The site currently publishes English UI.
      locale: import('#lib/locale.js').Locale;
    }
    interface PageData {
      // The locale set by the root layout for SSR and client navigation.
      locale: import('#lib/locale.js').Locale;
    }
    // interface Platform {}
  }
}

export {};
