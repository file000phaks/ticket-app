import { supabase } from "./supabase-interface";

const loadNotifications = async ( userId: string ) => {

    const { data, error } = await supabase
        .from( 'notifications' )
        .select( '*' )
        .eq( 'user_id', userId )
        .order( 'created_at', { ascending: false } )
        .limit( 50 );

    return { data, error }

}

const markAsRead = async ( notificationId ) => {

    const { error } = await supabase
        .from( 'notifications' )
        .update( { is_read: true, read_at: new Date().toISOString() } )
        .eq( 'id', notificationId );

    return { error }

}


// Subscribe to notifications
const subscribeToNotifications = (
    userId: string,
    callback: ( payload: any ) => void
) => {

    // Return a no-op subscription if Supabase is not available
    if ( !supabase ) {
        console.warn( 'Supabase not available - notification subscriptions disabled' );
        return {
            unsubscribe: () => { },
            channel: null
        };
    }

    return supabase
        .channel( 'notifications' )
        .on( 'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            },
            callback
        )
        .subscribe();
};

// Get user notifications
const getUserNotifications = async ( userId: string, limit = 50 ) => {

    const { data, error } = await supabase
        .from( 'notifications' )
        .select( `
        *,
        ticket:tickets(*)
      `)
        .eq( 'user_id', userId )
        .order( 'created_at', { ascending: false } )
        .limit( limit );

    return { data, error };

};

export const notifications = {

    loadNotifications,
    markNotificationAsRead: markAsRead,
    subscribeToNotifications,
    getUserNotifications

}