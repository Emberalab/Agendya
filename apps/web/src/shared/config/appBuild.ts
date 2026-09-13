export type AppBuildInfo = {
  sha: string;
  branch: string;
  builtAt: string;
};

declare global {
  interface Window {
    __AGENDYA_BUILD__?: AppBuildInfo;
  }
}

/** Git SHA, branch and ISO build time injected by Vite at bundle time. */
export function appBuild(): AppBuildInfo {
  return {
    sha: import.meta.env.VITE_GIT_SHA ?? 'unknown',
    branch: import.meta.env.VITE_GIT_BRANCH ?? 'unknown',
    builtAt: import.meta.env.VITE_BUILT_AT ?? 'unknown',
  };
}

export function logAppBuild(): void {
  const build = appBuild();
  window.__AGENDYA_BUILD__ = build;
  console.info(
    `[Agendya] ${build.branch} @ ${build.sha} · ${build.builtAt}`,
  );
}
