/**
 * @fileoverview Supabase client configuration and database helpers
 * @author Field Engineer Portal Team
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../../models/Database';
import { config, envLog, isFeatureEnabled } from '../../config/environment';
import { tickets } from "./supabase-tickets";
import { notifications } from "./supabase-notifications"
import { auth } from "./supabase-auth";
import { UserRole } from '../../models/User';
import { users } from './supabase-users';

// Global flag to track if Supabase is available
let supabaseAvailable = config.supabase.isConfigured && Boolean( config.supabase.url && config.supabase.anonKey );

// Validate Supabase configuration
if ( !supabaseAvailable ) {

    if ( config.isProduction ) {

        throw new Error( 'Supabase configuration is required for production deployment. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.' );

    } else {

        envLog( 'warn', 'Supabase not configured' );

    }

}

/**
 * Function to check Supabase connectivity
 * @returns {Promise<boolean>} Whether Supabase is available
 */
const checkSupabaseConnection = async (): Promise<boolean> => {

    if ( !supabaseAvailable ) {

        envLog( 'warn', 'Skipping Supabase connection check - not configured' );
        return false;

    }

    try {

        const { data, error } = await supabase.auth.getSession();

        if ( error ) throw error;

        envLog( 'log', 'Supabase connection verified' );

        return true;

    } catch ( error ) {

        envLog( 'warn', 'Supabase connection failed, switching to fallback mode:', error );
        supabaseAvailable = false;
        return false;

    }

};

// Create Supabase clients only if configured
export const authClient = supabaseAvailable ? createClient( config.supabase.url, config.supabase.anonKey, {

    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    },
    global: {
        headers: {
            'X-Client-Info': 'field-engineer-portal-auth'
        }
    }
} ) : null;

export const supabase = supabaseAvailable ? createClient<Database>( config.supabase.url, config.supabase.anonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    }
} ) : null;

// Check connection on module load only if configured
if ( supabaseAvailable ) checkSupabaseConnection();
else envLog( 'warn', 'Supabase client not initialized - configuration missing' );

/**
 * Helper function to get current user profile
 * @param {any} [existingUser] - Existing user object to avoid redundant API calls
 * @returns {Promise<any|null>} User profile or null
 */
const getCurrentUserProfile = async ( existingUser?: any ): Promise<any | null> => {

    if ( !supabase ) {
        envLog( 'warn', 'getCurrentUserProfile called but Supabase not configured' );
        return null;
    }

    try {
        // Use existing user if provided to avoid redundant API calls
        let user = existingUser;

        if ( !user ) {

            const { data: { user: fetchedUser }, error } = await supabase.auth.getUser();

            if ( error ) {

                envLog( 'warn', 'Error fetching user:', error.message );
                return null;

            }

            user = fetchedUser;

        }

        if ( !user ) return null;

        const { data: profile, error } = await supabase
            .from( 'user_profiles' )
            .select( '*' )
            .eq( 'id', user.id )
            .single();

        if ( error ) {
            envLog( 'warn', 'Error fetching profile:', error.message );
            return null;
        }

        return profile;
    } catch ( error ) {

        envLog( 'warn', 'Error in getCurrentUserProfile:', error );
        return null;

    }

};

/**
 * Helper function to check if user has required role
 * @param {string[]} requiredRoles - Array of required roles
 * @returns {Promise<boolean>} Whether user has required role
 */
const checkUserRole = async ( requiredRoles: string[] ): Promise<boolean> => {
    const profile = await getCurrentUserProfile();
    return profile && requiredRoles.includes( profile.role );
};

// Upload file to Supabase Storage
export const uploadFile = async (
    bucket: string,
    path: string,
    file: File,
    options?: { upsert?: boolean }
) => {

    const { data, error } = await supabase.storage
        .from( bucket )
        .upload( path, file, {
            cacheControl: '3600',
            upsert: options?.upsert || false,
        } );

    if ( error ) throw error;
    return data;

};

// Get public URL for file
export const getFileUrl = ( bucket: string, path: string ) => {
    const { data } = supabase.storage
        .from( bucket )
        .getPublicUrl( path );

    return data.publicUrl;
};

// Delete file from storage
const deleteFile = async ( bucket: string, path: string ) => {

    const { error } = await supabase.storage
        .from( bucket )
        .remove( [ path ] );

    if ( error ) throw error;

};


// Get dashboard stats
const getDashboardStats = async ( userId: string ) => {

    const { data, error } = await supabase
        .rpc( 'get_dashboard_stats', { user_uuid: userId } );

    if ( error ) throw error;

    return data?.[ 0 ];

};

// Get equipment list
const getEquipment = async () => {

    const { data, error } = await supabase
        .from( 'equipment' )
        .select( '*' )
        .eq( 'is_active', true )
        .order( 'name' );

    if ( error ) throw error;
    return data;

};

export const supabaseInterface = {

    getDashboardStats,
    getEquipment,

    deleteFile,
    uploadFile,
    getFileUrl,
    getCurrentUserProfile,
    checkUserRole,

    supabase,
    authClient,

    ...tickets,
    ...notifications,
    ...users,

    auth,

}