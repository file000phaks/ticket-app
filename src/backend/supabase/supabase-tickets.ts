import { supabase } from "./supabase-interface";

const sanitize = ( obj: Record<string, any> ) =>
    Object.fromEntries(
        Object.entries( obj ).map( ( [ k, v ] ) => [ k, v === "" ? null : v ] )
    );

const createTicket = async ( userId: string, ticketData: any ) => {

    // const { ticket_number, ...rest } = ticketData; // strip ticket_number;

    const cleanData = sanitize( ticketData ) as any;

    try {

        const { data, error } = await supabase
            .from( 'tickets' )
            .insert( {
                ...cleanData,
                created_by: userId,
                due_date: cleanData.due_date?.toISOString(),
            } )
            .select( `
              *,
              created_by_profile:profiles!fk_tickets_created_by(*),
              assigned_to_profile:profiles!fk_tickets_assigned_to(*),
              assigned_by_profile:profiles!fk_tickets_assigned_by(*)
            `)
            .single();

        return { data, error };

    }

    catch ( error ) {

        throw error;

    }

}

const updateTicket = async ( ticketId: string, updates: any ) => {

    const { data, error } = await supabase
        .from( 'tickets' )
        .update( updates )
        .eq( 'id', ticketId )
        .select( `
                *,
                equipment(*),
                created_by_profile:user_profiles!fk_tickets_created_by(*),
                assigned_to_profile:user_profiles!fk_tickets_assigned_to(*),
                assigned_by_profile:user_profiles!fk_tickets_assigned_by(*)
              `)
        .single();

    return { data, error }

}

const deleteTicket = async ( ticketId: string ) => {

    const { error } = await supabase
        .from( 'tickets' )
        .delete()
        .eq( 'id', ticketId );

    return { error }

}

const addTicketComment = async ( userId: string, ticketId: string, comment: string ) => {

    const { error } = await supabase
        .from( 'ticket_activities' )
        .insert( {
            ticket_id: ticketId,
            user_id: userId,
            type: 'comment',
            description: comment,
        } );

    return { error }
}

const addTicketNote = async ( userId: string, ticketId: string, note: string ) => {

    const { error } = await supabase
        .from( 'ticket_activities' )
        .insert( {
            ticket_id: ticketId,
            user_id: userId,
            type: 'note',
            description: note,
        } );

    return { error }
}


// Get tickets with full relations
const getTicketsWithRelations = async ( userId?: string, role?: string ) => {

    let query = supabase
        .from( 'tickets' )
        .select( `
            *,
            created_by_profile:profiles!fk_tickets_created_by(*),
            assigned_to_profile:profiles!fk_tickets_assigned_to(*),
            assigned_by_profile:profiles!fk_tickets_assigned_by(*)
          `)
        .order( 'created_at', { ascending: false } );

    if ( role === 'field_engineer' && userId ) {

        query = query.or( `created_by.eq.${userId},assigned_to.eq.${userId}` );

    }

    const { data, error } = await query;

    return { data, error };

};

// Get ticket activities
const getTicketActivities = async ( ticketId: string ) => {

    const { data, error } = await supabase
        .from( 'ticket_activities' )
        .select( `
        *,
        profile:profiles(*)
      `)
        .eq( 'ticket_id', ticketId )
        .order( 'created_at', { ascending: false } );

    if ( error ) throw error;

    return data;

};

// Get ticket media
const getTicketMedia = async ( ticketId: string ) => {

    const { data, error } = await supabase
        .from( 'ticket_media' )
        .select( '*' )
        .eq( 'ticket_id', ticketId )
        .order( 'created_at', { ascending: false } );

    if ( error ) throw error;

    return data;

};

// Subscribe to real-time changes
const subscribeToTickets = (
    callback: ( payload: any ) => void,
    userId?: string
) => {
   
    // Return a no-op subscription if Supabase is not available
   
    if ( !supabase ) {
   
        console.warn( 'Supabase not available - real-time subscriptions disabled' );
   
        return {
            unsubscribe: () => { },
            channel: null
        };
   
    }

    let query = supabase
        .channel( 'tickets' )
        .on( 'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'tickets'
            },
            callback
        );

    return query.subscribe();

};

export const tickets = {

    createTicket,
    updateTicket,
    deleteTicket,
    addTicketComment,
    addTicketNote,
    getTicketsWithRelations,
    getTicketActivities,
    getTicketMedia,
    subscribeToTickets

}
