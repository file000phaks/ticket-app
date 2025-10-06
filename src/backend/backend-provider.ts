import { config } from "../config/environment";
import { supabaseInterface } from "./supabase/supabase-interface";
import { mockBackendInterface } from "./mock/mock-backend-interface";

const backend = config.supabase.isConfigured ? supabaseInterface : mockBackendInterface;

const auth = backend.auth;

export const backendProvider = {
  backend,
  auth,
  isSupabaseEnabled: config.supabase.isConfigured,
};

export type BackendClient = typeof backend;
export type AuthClient = typeof auth;
