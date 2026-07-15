/**
 * Browser-safe environment access. Only `NEXT_PUBLIC_*` values are exposed;
 * these are statically inlined by Next.js at build time. Server secrets are
 * never reachable from here.
 */
export const clientEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
} as const;

export const isSupabaseConfiguredClient = Boolean(
  clientEnv.supabaseUrl && clientEnv.supabaseAnonKey,
);

export const isMapboxConfiguredClient = Boolean(clientEnv.mapboxToken);
