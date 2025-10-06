// Time tracking functions
const getTimeEntries = async ( ticketId: string ) => {

    const { data, error } = await supabase
        .from( 'time_entries' )
        .select( `
        *,
        user_profile:user_profiles(*)
      `)
        .eq( 'ticket_id', ticketId )
        .order( 'start_time', { ascending: false } );

    if ( error ) throw error;
    return data;
};

const createTimeEntry = async ( timeEntry: any ) => {

    const { data, error } = await supabase
        .from( 'time_entries' )
        .insert( timeEntry )
        .select()
        .single();

    if ( error ) throw error;
    return data;

};

const updateTimeEntry = async ( entryId: string, updates: any ) => {

    const { data, error } = await supabase
        .from( 'time_entries' )
        .update( { ...updates, updated_at: new Date().toISOString() } )
        .eq( 'id', entryId )
        .select()
        .single();

    if ( error ) throw error;
    return data;

};

const deleteTimeEntry = async ( entryId: string ) => {

    const { error } = await supabase
        .from( 'time_entries' )
        .delete()
        .eq( 'id', entryId );

    if ( error ) throw error;
    return true;

};

const getUserTimeEntries = async ( userId: string, limit = 50 ) => {

    const { data, error } = await supabase
        .from( 'time_entries' )
        .select( `
        *,
        ticket:tickets(title, status)
      `)
        .eq( 'user_id', userId )
        .order( 'start_time', { ascending: false } )
        .limit( limit );

    if ( error ) throw error;

    return data;

}