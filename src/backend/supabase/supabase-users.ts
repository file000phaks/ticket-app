import { supabase } from './supabase-interface';
import { UserProfile, UserRole } from '../../models/User';

// Get users for assignment
const getUsers = async ( role?: UserRole ) => {

    let query = supabase.from( 'user_profiles' )
        .select( '*' )
        .eq( 'is_active', true )
        .order( 'full_name' );

    if ( role ) query = query.eq( 'role', role );

    const { data, error } = await query;

    return { data, error };

};

// Get user profile by ID
const getUserProfile = async ( userId: string ) => {

    const { data, error } = await supabase
        .from( 'user_profiles' )
        .select( '*' )
        .eq( 'id', userId )
        .single();

    return { data, error };

};

// Update user profile
const updateUserProfile = async ( userId: string, updates: Partial<UserProfile> ) => {

    const { data, error } = await supabase
        .from( 'user_profiles' )
        .update( updates )
        .eq( 'id', userId )
        .select()
        .single();

    return { data, error };

};

// Update user role
const updateUserRole = async ( userId: string, role: UserRole ) => {

    const { data, error } = await supabase
        .from( 'user_profiles' )
        .update( { role, updated_at: new Date().toISOString() } )
        .eq( 'id', userId )
        .select()
        .single();

    return { data, error };

};

// Deactivate user
const deactivateUser = async ( userId: string ) => {

    const { data, error } = await supabase
        .from( 'user_profiles' )
        .update( {
            is_active: false,
            updated_at: new Date().toISOString()
        } )
        .eq( 'id', userId )
        .select()
        .single();


    return { data, error };

};

// Get user statistics
const getUserStats = async ( userId: string ) => {

    // Get tickets data
    const { data: ticketsData, error: ticketsError } = await supabase
        .from( 'tickets' )
        .select( '*' )
        .or( `created_by.eq.${userId},assigned_to.eq.${userId}` );

    if ( ticketsError ) {

        console.error( 'Tickets query error:', {
            message: ticketsError instanceof Error ? ticketsError.message : String( ticketsError ),
            stack: ticketsError instanceof Error ? ticketsError.stack : undefined,
            code: ticketsError?.code,
            details: ticketsError?.details,
            hint: ticketsError?.hint,
            userId: userId,
            error: ticketsError
        } );

        throw ticketsError;

    }

    const tickets = ticketsData || [];

    const totalTickets = tickets.length;
    const completedTickets = tickets.filter( t =>
        [ 'resolved', 'verified', 'closed' ].includes( t.status )
    ).length;

    // Calculate average resolution time
    const resolvedTickets = tickets.filter( t => t.resolved_at );
    const avgResolutionTime = resolvedTickets.length > 0
        ? resolvedTickets.reduce( ( acc, ticket ) => {
            const resolutionTime = new Date( ticket.resolved_at! ).getTime() - new Date( ticket.created_at ).getTime();
            return acc + ( resolutionTime / ( 1000 * 60 * 60 ) ); // Convert to hours
        }, 0 ) / resolvedTickets.length
        : 0;

    // Get last activity
    let lastActivity = new Date().toISOString();

    try {

        const { data: activities, error: activitiesError } = await supabase
            .from( 'ticket_activities' )
            .select( 'created_at' )
            .eq( 'user_id', userId )
            .order( 'created_at', { ascending: false } )
            .limit( 1 );

        if ( !activitiesError && activities?.[ 0 ] ) {

            lastActivity = activities[ 0 ].created_at;

        }
    } catch ( activitiesError ) {

        console.log( 'Activities query failed, using current time' );

    }

    return {
        totalTickets,
        completedTickets,
        avgResolutionTime,
        lastActivity
    };

};


export const users = {

    getUsers,
    getUserProfile,
    updateUserProfile,
    updateUserRole,
    deactivateUser,
    getUserStats

}