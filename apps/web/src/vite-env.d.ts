/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_WAITLIST_URL?: string;
  readonly VITE_GIT_SHA?: string;
  readonly VITE_GIT_BRANCH?: string;
  readonly VITE_BUILT_AT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
