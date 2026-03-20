import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

function requireServerEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

export function createAdminClient() {
  const serviceRoleKey = requireServerEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY",
  );

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
