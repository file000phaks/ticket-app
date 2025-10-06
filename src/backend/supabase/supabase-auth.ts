import { supabase } from "./supabase-interface"
import { UserProfile } from "../../models/User"
import { Session } from "@supabase/supabase-js";

// Store auth change listeners
let authChangeListeners: ( ( event: string, session: any ) => void )[] = [];

const signIn = async ( email: string, password: string ) => {

    const { data, error } = await supabase.auth.signInWithPassword( {
        email,
        password,
    } )

    return { data, error }

}

const signUp = async ( email: string, password: string, fullName?: string ) => {

    const { data, error } = await supabase.auth.signUp( {
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
        },
    } )

    return { data, error }

}

const signOut = async () => {

    const { error } = await supabase.auth.signOut()

    return { error }

}

const updateProfile = async ( userId: string, updates: Partial<UserProfile> ) => {

    const { data, error } = await supabase
        .from( 'user_profiles' )
        .update( updates )
        .eq( 'id', userId )
        .select()
        .single();

    return { data, error }

}

const getSession = async () => {

    // let data: any, session: any = null, error: Error | null = null

    // return { data: { session }, error };

    const { data: { session }, error } = await supabase.auth.getSession();

    return { data: { session }, error };

}

const onAuthStateChange = ( callback: ( event: string, session: any ) => void ) => {

    // Add listener to the array
    authChangeListeners.push( callback );

    return {
        data: {
            subscription: {
                unsubscribe: () => {
                    // Remove listener when unsubscribing
                    const index = authChangeListeners.indexOf( callback );

                    if ( index > -1 ) {
                        authChangeListeners.splice( index, 1 );
                    }

                }
            }
        }
    };

}

const getCurrentUserProfile = async ( user: Session["user"] ) => {
  
    if ( !user?.id ) {
  
        return null; // no user logged in
  
    }

    const userId = user.id;

    const { data, error } = await supabase
        .from( 'profiles' )
        .select( '*' )
        .eq( 'id', userId )
        .single(); // expects only one row

    if ( error ) {
    
        console.error( 'Error fetching profile:', error.message );
        return null;
    
    }

    return data;
}

export const auth = {

    signIn,
    signOut,
    signUp,
    updateProfile,
    getSession,
    onAuthStateChange,
    getCurrentUserProfile

}