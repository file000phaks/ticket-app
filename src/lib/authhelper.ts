import { supabaseInterface } from "../backend/supabase/supabase-interface"
import { backendProvider } from "../backend/backend-provider";

const auth = backendProvider.auth;

export const authHelper = {
  signIn: auth.signIn,
  signOut: auth.signOut,
  signUp: auth.signUp,
  getCurrentUserProfile: auth.getCurrentUserProfile,
  updateProfile: auth.updateProfile,
  getSession: auth.getSession,
  onAuthStateChange: auth.onAuthStateChange,
};
