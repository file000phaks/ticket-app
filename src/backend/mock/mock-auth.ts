import { UserProfile } from "../../models/User";
import { mockUsers } from "./mock-data";

const users = mockUsers;

// usersMap database (using lowercase keys for case-insensitive lookup)
const usersMap = new Map<string, { user: UserProfile; password: string }>( [
    [ 'admin@test.com',
        {
            user: users.find( user => user.email === "admin@test.com" ),
            password: 'admin123'
        }
    ],
    [ 'supervisor@test.com',
        {
            user: users.find( user => user.email === "supervisor@test.com" ),
            password: 'supervisor123'
        }
    ],
    [ 'engineer@test.com',
        {
            user: users.find( user => user.email === "engineer@test.com" ),
            password: 'engineer123'
        }
    ]
] );

// Mock session storage
let currentSession: { user: UserProfile; access_token: string } | null = null;

// Store auth change listeners
let authChangeListeners: ( ( event: string, session: any ) => void )[] = [];

const signIn = async ( email: string, password: string ) => {

    // Simulate network delay
    await new Promise( resolve => setTimeout( resolve, 500 ) );

    // Make email lookup case-insensitive
    email = email.toLowerCase().trim();

    // Find user with case-insensitive email matching
    let mockUser = null;

    for ( const [ key, user ] of usersMap.entries() ) {

        if ( key.toLowerCase() === email ) {
            mockUser = user;
            break;
        }

    }

    if ( !mockUser ) {

        console.log( 'Available test accounts:', Array.from( usersMap.keys() ) );
        throw new Error( `Invalid email. Available test accounts: ${Array.from( usersMap.keys() ).join( ', ' )}` );

    }

    if ( mockUser.password !== password ) {
        console.log( 'Password mismatch for', email, 'expected:', mockUser.password );
        throw new Error( 'Invalid password' );
    }

    if ( !mockUser.user.isActive ) {
        throw new Error( 'Account is deactivated' );
    }

    const session = {
        user: mockUser.user,
        access_token: `token_${Date.now()}`
    };

    currentSession = session;
    localStorage.setItem( 'ticket_app_session', JSON.stringify( session ) );

    // Trigger auth state change listeners
    authChangeListeners.forEach( callback => {

        try {

            callback( 'SIGNED_IN', session );

        } catch ( error ) {

            console.error( 'Error in auth change listener:', error );

        }

    } );

    return {
        data: {
            user: mockUser.user,
            session
        },
        error: null
    };

};

const signUp = async ( email: string, password: string, fullName?: string ) => {

    let error: Error;

    let user: UserProfile;

    try {

        user = new UserProfile( {
            id: String( Date.now() ),
            email,
            fullName,
            role: "field_engineer",
            department: "field",
            phone: "263780000001",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        } )

    } catch (err) {

        error = new Error(`Error creating user: ${err}`)

    }

    return { data: user, error }

};

const signOut = async () => {

    currentSession = null;

    localStorage.removeItem( 'ticket_app_session' );

    // Trigger auth state change listeners
    authChangeListeners.forEach( callback => {

        try {

            callback( 'SIGNED_OUT', null );

        } catch ( error ) {

            console.error( 'Error in auth change listener:', error );

        }

    } );

    return { error: null };

};

const getSession = async () => {

    if ( currentSession ) {

        return { data: { session: currentSession }, error: null };

    }

    const stored = localStorage.getItem( 'ticket_app_session' );

    if ( stored ) {

        currentSession = JSON.parse( stored );
        return { data: { session: currentSession }, error: null };

    }

    return { data: { session: null }, error: null };

};

const getUser = async () => {

    const session = await getSession();

    return {
        data: { user: session.data.session?.user || null },
        error: null
    };

};

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

const getCurrentUserProfile = async ( existingUser?: UserProfile ) => {

    const user = existingUser || currentSession?.user;

    if ( !user ) return null;

    const mockUser = usersMap.get( user.email );

    return mockUser?.user || null;

};

const updateProfile = async ( userId: string, updates: Partial<UserProfile> ) => {

    let error: Error;

    const profile = Array.from(usersMap.values()).find(profile => profile.user.id === userId)

    Object.assign(profile.user, updates);

    return { data: profile.user, error }

}

export const mockAuthInterface = {

    signIn,
    signOut,
    signUp,
    getUser,
    onAuthStateChange,
    getCurrentUserProfile,
    updateProfile,
    getSession,

}