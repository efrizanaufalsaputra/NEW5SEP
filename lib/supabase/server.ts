import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

function createMockClient() {
  return {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: null }),
      signUp: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      unsubscribe: () => {},
    }),
  }
}

export function createClient() {
  const cookieStore = cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log("[v0] Server - Supabase URL:", supabaseUrl ? "✓ Found" : "✗ Missing")
  console.log("[v0] Server - Supabase Anon Key:", supabaseAnonKey ? "✓ Found" : "✗ Missing")

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[v0] Server - Supabase environment variables not found. Using mock client.")
    return createMockClient()
  }

  console.log("[v0] Creating real server Supabase client connection")
  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

export function createServerClient(cookieStore: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[v0] Supabase environment variables not found. Using mock client.")
    return createMockClient()
  }

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log("[v0] Service - Supabase URL:", supabaseUrl ? "✓ Found" : "✗ Missing")
  console.log("[v0] Service - Service Role Key:", serviceRoleKey ? "✓ Found" : "✗ Missing")

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("[v0] Supabase service environment variables not found. Using mock client.")
    return createMockClient()
  }

  console.log("[v0] Creating real service role Supabase client connection")
  return createSupabaseServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {
        // No-op for service role client
      },
    },
  })
}
