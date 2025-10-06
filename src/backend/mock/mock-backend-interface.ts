import { UserRole } from "../../models/User";
import { Ticket } from "../../models/Ticket";
import { mockAuthInterface } from "./mock-auth";
import { mockTickets, mockUsers, mockDashboardStats } from "./mock-data";

// Store tickets in memory for mock operations
let currentMockTickets = [ ...mockTickets ];
let nextTicketId = 4;

// Mock data helper functions
export const mockDbHelpers = {

  async getTicketsWithRelations( userId?: string, role?: string ) {

    // Simulate network delay
    await new Promise( resolve => setTimeout( resolve, 300 ) );

    // Filter tickets based on role
    if ( role === 'field_engineer' && userId )
      return { data: currentMockTickets.filter( t => t.created_by === userId || t.assigned_to === userId ), error: null };

    return { data: currentMockTickets, error: null };

  },

  async createTicket( userId: string, ticketData: any ) {

    // Simulate network delay
    await new Promise( resolve => setTimeout( resolve, 400 ) );

    const currentUser = mockUsers.find( u => u.id === userId );

    let error: Error;

    if ( !currentUser ) error = new Error( 'User not found' )

    const newTicketData = {
      id: String( nextTicketId++ ),
      // ticketNumber: `TKT-${String( nextTicketId - 1 ).padStart( 3, '0' )}`,
      title: ticketData.title,
      description: ticketData.description,
      type: ticketData.type || 'maintenance',
      priority: ticketData.priority || 'medium',
      status: 'open' as const,
      createdBy: userId,
      assignedTo: null,
      equipmentId: ticketData.equipment_id || null,
      locationName: ticketData.location,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedAt: null,
      dueDate: ticketData.due_date || null,
      estimatedHours: ticketData.estimated_hours || null,
      actualHours: 0,
      notes: null,
      createdByProfile: currentUser,
      assignedToProfile: null,
      verifiedByProfile: null,
      // equipment: {
      //   id: ticketData.equipment_id,
      //   name: 'Mock Equipment',
      //   type: 'general',
      //   model: 'Generic Model',
      //   serialNumber: 'MOCK-001',
      //   location: ticketData.location,
      //   isActive: true,
      //   createdAt: new Date(),
      //   updatedAt: new Date()
      // },
    }

    const newTicket = new Ticket( newTicketData )

    currentMockTickets.unshift( newTicket );

    return { data: newTicket, error };

  },

  async getTicketActivities( ticketId: string ) {

    // Simulate network delay
    await new Promise( resolve => setTimeout( resolve, 200 ) );

    // Mock activities for tickets
    const activities = [
      {
        id: `act-${ticketId}-1`,
        ticket_id: ticketId,
        user_id: '1',
        type: 'created' as const,
        description: 'Ticket created',
        created_at: new Date( Date.now() - 24 * 60 * 60 * 1000 ), // 1 day ago
        user_profile: mockUsers[ 0 ]
      },
      {
        id: `act-${ticketId}-2`,
        ticket_id: ticketId,
        user_id: '2',
        type: 'assigned' as const,
        description: 'Ticket assigned to Field Engineer',
        created_at: new Date( Date.now() - 23 * 60 * 60 * 1000 ), // 23 hours ago
        user_profile: mockUsers[ 1 ]
      },
      {
        id: `act-${ticketId}-3`,
        ticket_id: ticketId,
        user_id: '3',
        type: 'comment' as const,
        description: 'Started investigating the issue',
        created_at: new Date( Date.now() - 2 * 60 * 60 * 1000 ), // 2 hours ago
        user_profile: mockUsers[ 2 ]
      }
    ];

    return activities;
  },

  async deleteTicket( ticketId: string ) {
    // Simulate network delay
    await new Promise( resolve => setTimeout( resolve, 300 ) );

    const initialLength = currentMockTickets.length;
    currentMockTickets = currentMockTickets.filter( t => t.id !== ticketId );

    let error: Error;

    if ( currentMockTickets.length === initialLength ) error = new Error( 'Ticket not found' );

    return { success: true, error };

  },

  async updateTicket( ticketId: string, updates: any ) {

    // Simulate network delay
    await new Promise( resolve => setTimeout( resolve, 200 ) );

    const ticketIndex = currentMockTickets.findIndex( t => t.id === ticketId );

    let error: Error;

    if ( ticketIndex === -1 ) error = new Error( 'Ticket not found' );

    // Update the ticket
    const updatedTicket = {
      ...currentMockTickets[ ticketIndex ],
      ...updates,
      updated_at: new Date()
    };

    // If assigning to someone, fetch the profile
    if ( updates.assigned_to ) {

      const assignedProfile = mockUsers.find( u => u.id === updates.assigned_to );

      if ( assignedProfile ) updatedTicket.assigned_to_profile = assignedProfile;

    }

    currentMockTickets[ ticketIndex ] = updatedTicket;

    return { data: updatedTicket, error };

  },

  async assignTicket( ticketId: string, assignedTo: string | null ) {

    return this.updateTicket( ticketId, {
      assigned_to: assignedTo,
      status: assignedTo ? 'assigned' : 'open',
      assigned_at: assignedTo ? new Date() : null
    } );

  },

  async getDashboardStats( userId: string, role: UserRole ) {

    await new Promise( resolve => setTimeout( resolve, 200 ) );

    let tickets = [];

    if ( role === 'field_engineer' && userId ) tickets = currentMockTickets.filter( t => t.created_by === userId || t.assigned_to === userId )

    tickets = currentMockTickets;

    const dashboardStats = {
      totalTickets: tickets.length,
      openTickets: tickets.filter( t => t.status === 'open' ).length,
      inProgressTickets: tickets.filter( t => t.status === 'in_progress' ).length,
      resolvedTickets: tickets.filter( t => t.status === 'resolved' ).length,
      overdueTickets: tickets.filter( t => t.due_date && new Date( t.due_date ) < new Date() && ![ 'resolved', 'verified', 'closed' ].includes( t.status ) ).length,
      assignedTickets: tickets.filter(t => t.assigned_to === userId).length,
      createdTickets: tickets.filter(t => t.created_by === userId).length

    }

    return dashboardStats;

  },

  async getUsers( role?: UserRole ) {

    await new Promise( resolve => setTimeout( resolve, 200 ) );

    if ( role ) return mockUsers.filter( u => u.role === role );

    return mockUsers;

  },

  async getEquipment() {
    await new Promise( resolve => setTimeout( resolve, 200 ) );
    return mockTickets.map( t => t.equipment ).filter( e => e );
  },

  async getUserProfile( userId: string ) {
    await new Promise( resolve => setTimeout( resolve, 200 ) );
    return mockUsers.find( u => u.id === userId ) || null;
  },

  async updateUserProfile( userId: string, updates: Partial<any> ) {

    await new Promise( resolve => setTimeout( resolve, 200 ) );

    const userIndex = mockUsers.findIndex( u => u.id === userId );

    if ( userIndex >= 0 ) {

      mockUsers[ userIndex ] = { ...mockUsers[ userIndex ], ...updates };

      return mockUsers[ userIndex ];

    }

    return null;

  },

  async getUserStats( userId: string ) {
    // Simulate network delay
    await new Promise( resolve => setTimeout( resolve, 200 ) );

    // Filter tickets for this user
    const userTickets = currentMockTickets.filter( t =>
      t.created_by === userId || t.assigned_to === userId
    );

    const totalTickets = userTickets.length;
    const completedTickets = userTickets.filter( t =>
      [ 'resolved', 'verified', 'closed' ].includes( t.status )
    ).length;

    // Calculate average resolution time
    const resolvedTickets = userTickets.filter( t => t.status === 'resolved' || t.status === 'verified' || t.status === 'closed' );
    const avgResolutionTime = resolvedTickets.length > 0
      ? resolvedTickets.reduce( ( acc, ticket ) => {
        // Mock resolution time calculation (2-24 hours)
        const mockResolutionHours = Math.random() * 22 + 2;
        return acc + mockResolutionHours;
      }, 0 ) / resolvedTickets.length
      : 0;

    const lastActivity = new Date().toISOString();

    return {
      totalTickets,
      completedTickets,
      avgResolutionTime,
      lastActivity
    };
  },

  async getTicketMedia( ticketId: string ) {

    return []

  },

  async getUserNotifications( userId: string, limit = 50 ) {

    return { data: [], error: new Error() }

  },

  async updateUserRole( userId: string, role: 'admin' | 'supervisor' | 'field_engineer' ) {

    let error: Error;

    const user = mockUsers.find( user => user.id === userId );

    if ( !user ) {

      error = new Error( "User not found" );

      return { data: null, error }

    }

    user.role = role;

    return { data: user, error };

  },

  async deactivateUser( userId: string ) {

    let error: Error;

    const user = mockUsers.find( user => user.id === userId );

    if ( !user ) {

      error = new Error( "User not found" );

      return { data: null, error }

    }

    user.isActive = false;

    return { data: user, error };

  },

  async getTimeEntries( ticketId: string ) { },

  async createTimeEntry( timeEntry: any ) { },

  async updateTimeEntry( entryId: string, updates: any ) { },

  async deleteTimeEntry( entryId: string ) { },

  async getUserTimeEntries( userId: string, limit = 50 ) { }

};

const subscribeToNotifications = async ( callback: ( payload: any ) => void, userId?: string ) => { return { unsubscribe: () => { } } }
const deleteFile = async () => { }

/**
 * Returns a query with a subscribe method
 */
const subscribeToTickets = ( callback: ( payload: any ) => void, userId?: string ) => { return { unsubscribe: () => { } } }
const uploadFile = async () => { }
const getFileUrl = async () => { }
const getCurrentUserProfile = async () => { }
const checkUserRole = async () => { }

const addTicketComment = async ( userId: string, ticketId: string, comment: string ) => {

  let error: Error;

  return { error }

}

const addTicketNote = async ( userId: string, ticketId: string, note: string ) => {

  let error: Error;

  return { error }

}

const notifications = {
  loadNotifications: mockDbHelpers.getUserNotifications,
  // markNotificationAsRead: 
}

const tickets = {

  addTicketComment,
  addTicketNote,

}

export const mockBackendInterface = {

  ...mockDbHelpers,
  ...notifications,
  ...tickets,

  subscribeToNotifications,
  subscribeToTickets,
  deleteFile,
  uploadFile,
  getFileUrl,
  getCurrentUserProfile,
  checkUserRole,

  auth: mockAuthInterface,

}
