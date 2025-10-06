import { supabaseInterface } from "../backend/supabase/supabase-interface";
import { backendProvider } from "../backend/backend-provider";

const db = backendProvider.backend;

const userHelpers = {

    getUsers: db.getUsers,
    getUserProfile: db.getUserProfile,
    updateUserProfile: db.updateUserProfile,
    updateUserRole: db.updateUserRole,
    deactivateUser: db.deactivateUser,
    getUserStats: db.getUserStats,

}

const ticketHelpers = {
    getTicketsWithRelations: db.getTicketsWithRelations,
    getTicketActivities: db.getTicketActivities,
    getTicketMedia: db.getTicketMedia,
    createTicket: db.createTicket,
    deleteTicket: db.deleteTicket,
    updateTicket: db.updateTicket,
    addTicketComment: db.addTicketComment,
    addTicketNote: db.addTicketNote,

}

const notificationHelpers = {
    getUserNotifications: db.getUserNotifications,
    // markNotificationAsRead: db.markNotificationAsRead,
}

// Database helper functions
export const dbHelpers = {

    ...userHelpers,
    ...ticketHelpers,
    ...notificationHelpers,

    getDashboardStats: db.getDashboardStats,
    getEquipment: db.getEquipment,

    subscribeToTickets: db.subscribeToTickets,
    subscribeToNotifications: db.subscribeToNotifications,
    uploadFile: db.uploadFile,
    getFileUrl: db.getFileUrl,
    getCurrentUserProfile: db.getCurrentUserProfile,
    deleteFile: db.deleteFile,
    checkUserRole: db.checkUserRole,

};
