export function frontendWebUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.WEB_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
}
