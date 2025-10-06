import { Session, User } from "@supabase/supabase-js";
import { UserProfile } from "../models/User";

interface SupabaseProfile {
    id: string;
    full_name: string | null;
    role: 'admin' | 'supervisor' | 'field_engineer' | null;
    department?: string | null;
    phone: string | null;
    is_active: boolean | null;
    created_at: string;
    updated_at: string;
    email: string;
}

const UserFromSupabaseSession = ( user: Session[ "user" ] ): UserProfile | null => {

    if ( !user ) return null;

    return new UserProfile( {
        id: user.id,
        email: user.email || "",
        phone: user.phone || "",
        role: user.user_metadata.role || "engineer",
        fullName: user.user_metadata.full_name || "",
        createdAt: new Date( user.created_at ),
        updatedAt: new Date( user.last_sign_in_at || user.created_at ),
        isActive: user.user_metadata.is_active ?? true,
    } )

}

const UserFromSupabaseProfile = ( profile: any ): UserProfile | null => {

    if ( !profile ) return null;

    return new UserProfile( {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        department: profile.department || "",
        phone: profile.phone,
        isActive: profile.is_active ?? true,
        createdAt: new Date( profile.created_at ),
        updatedAt: new Date( profile.updated_at ),
    } )

}

export {

    UserFromSupabaseSession,
    UserFromSupabaseProfile,

}