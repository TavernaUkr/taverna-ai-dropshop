// Ambient declaration so tool files (which run in Deno at runtime) type-check in the Vite build.
declare const process: { env: Record<string, string | undefined> };
