import { useState, useEffect } from 'react';
import { dbHelpers as db } from '../lib/dbhelper';
import { useAuth } from './useAuth';
import { useNotificationSystem } from '../hooks/useNotificationSystem';
import { toast } from '../components/ui/use-toast';
import { Ticket, TicketPriority, TicketStatus, TicketType } from '../models/Ticket';

interface TicketStats {
  totalTickets: number,
  createdTickets: number,
  assignedTickets: number,
  openTickets: number,
  inProgressTickets: number,
  resolvedTickets: number,
  overdueTickets: number
}

export const useTickets = () => {

  const { user, profile } = useAuth();
  const { notifyTicketCreated, notifyTicketResolved, notifyTicketAssigned } = useNotificationSystem();
  const [ tickets, setTickets ] = useState<Ticket[]>( [] );
  const [ stats, setStats ] = useState<TicketStats>( null );
  const [ loading, setLoading ] = useState( true );
  const [ error, setError ] = useState<string | null>( null );

  // Load tickets on mount and when user changes
  useEffect( () => {

    if ( user ) {

      loadTickets();

      loadTicketStats();

    } else {

      setTickets( [] );
      setStats( null )
      setLoading( false );

    }

  }, [ user, profile ] );

  // Subscribe to real-time ticket updates
  useEffect( () => {

    if ( !user ) return;

    const subscription = db.subscribeToTickets( ( payload ) => loadTickets(), user.id );

    return () => {

      subscription.unsubscribe();

    };

  }, [ user ] );

  const loadTickets = async () => {

    if ( !user ) return;

    try {

      setLoading( true );
      setError( null );

      const { data, error } = await db.getTicketsWithRelations( user.id, user.role );

      if ( error ) throw error;

      // Transform database format to frontend format
      const transformedTickets: Ticket[] = data.map( ticket => ( new Ticket( {

        createdBy: ticket.created_by,
        assignedTo: ticket.assigned_to || null,
        verifiedBy: ticket.verified_by || null,
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        type: ticket.type as TicketType,
        priority: ticket.priority as TicketPriority,
        status: ticket.status as TicketStatus,
        locationName: ticket.location_name || '',
        geoLocation: ticket.latitude && ticket.longitude ? {
          latitude: ticket.latitude,
          longitude: ticket.longitude
        } : null,
        estimatedHours: ticket.estimated_hours || null,
        actualHours: ticket.actual_hours || null,
        createdAt: new Date( ticket.created_at ),
        updatedAt: new Date( ticket.updated_at ),
        assignedAt: ticket.assigned_at ? new Date( ticket.assigned_at ) : undefined,
        resolvedAt: ticket.resolved_at ? new Date( ticket.resolved_at ) : undefined,
        verifiedAt: ticket.verified_at ? new Date( ticket.verified_at ) : undefined,
        dueDate: ticket.due_date ? new Date( ticket.due_date ) : undefined,

      } ) ) );

      setTickets( transformedTickets );

    } catch ( err: any ) {

      console.error( 'Error loading tickets:', {
        message: err instanceof Error ? err.message : String( err ),
        stack: err instanceof Error ? err.stack : undefined,
        userId: user?.id,
        error: err
      } );

      setError( err.message );

      toast( {
        title: 'Error loading tickets',
        description: err.message || 'Failed to load tickets',
        variant: 'destructive'
      } );

    } finally {

      setLoading( false );

    }

  };

  const loadTicketStats = async () => {

    const ticketStats = await db.getDashboardStats( user.id, user.role );

    setStats( ticketStats );

  }

  const createTicket = async ( ticketData: Partial<Ticket> ) => {

    if ( !user ) throw new Error( 'User not authenticated' );

    try {

      let transformedTicket: Ticket;

      try {

        const dbTicketData: any = {
          title: ticketData.title,
          description: ticketData.description,
          type: ticketData.type as TicketType,
          priority: ticketData.priority as TicketPriority,
          location_name: ticketData.locationName,
          latitude: ticketData.geoLocation?.latitude || null,
          longitude: ticketData.geoLocation?.longitude || null,
          due_date: ticketData.dueDate ? ticketData.dueDate.toISOString() : null,
          status: 'open',
        };

        const { data, error } = await db.createTicket( user.id, dbTicketData );

        if ( error ) throw error;

        transformedTicket = new Ticket( {
          title: ticketData.title!,
          description: ticketData.description!,
          type: ticketData.type!,
          priority: ticketData.priority!,
          locationName: ticketData.locationName!,
          geoLocation: ticketData.geoLocation || null,
          createdBy: user.id,
          status: 'open',
          createdAt: new Date( data.createdAt ),
          updatedAt: new Date( data.updatedAt ),
          dueDate: ticketData.dueDate || null,
          assignedAt: null,
          resolvedAt: null,
          verifiedAt: null,
          estimatedHours: ticketData.estimatedHours || null,
          id: data.id,
          // ticketNumber: Ticket.ticketCount, // Assign current ticket count as ticket number
        } )

      } catch ( error ) {

        throw error

      }

      setTickets( prev => [ transformedTicket, ...prev ] );

      // Send notifications to supervisors about new ticket

      try {

        await notifyTicketCreated( transformedTicket );

      } catch ( notificationError ) {

        console.warn( 'Failed to send ticket creation notifications:', notificationError );

      }

      toast( {
        title: 'Ticket created',
        description: 'Your ticket has been created successfully.',
      } );

      return transformedTicket;

    } catch ( error: any ) {

      console.error( 'Error creating ticket:', {
        message: error instanceof Error ? error.message : String( error ),
        stack: error instanceof Error ? error.stack : undefined,
        ticketData: ticketData,
        userId: user?.id,
        error: error
      } );

      toast( {
        title: 'Failed to create ticket',
        description: error.message || 'An error occurred while creating the ticket.',
        variant: 'destructive'
      } );

      throw error;

    }

  };

  const updateTicket = async ( ticketId: string, updates: Partial<Ticket> ) => {

    if ( !user ) throw new Error( 'User not authenticated' );

    try {

      // Transform dates to ISO strings for database
      const dbUpdates: any = { ...updates };

      if ( dbUpdates.dueDate ) dbUpdates.dueDate = dbUpdates.dueDate.toISOString();

      if ( dbUpdates.assignedAt ) dbUpdates.assignedAt = dbUpdates.assignedAt.toISOString();

      if ( dbUpdates.resolvedAt ) dbUpdates.resolvedAt = dbUpdates.resolvedAt.toISOString();

      if ( dbUpdates.verifiedAt ) dbUpdates.verifiedAt = dbUpdates.verifiedAt.toISOString();


      // Set timestamps for status changes
      if ( updates.status === 'assigned' && !updates.assignedAt ) dbUpdates.assignedAt = new Date().toISOString();

      if ( updates.status === 'resolved' && !updates.resolvedAt ) dbUpdates.resolvedAt = new Date().toISOString();

      if ( updates.status === 'verified' && !updates.verifiedAt ) {

        dbUpdates.verifiedAt = new Date().toISOString();
        dbUpdates.verifiedBy = user.id;

      }

      let ticketData: any;

      try {

        const { data, error } = await db.updateTicket( ticketId, dbUpdates );

        if ( error ) throw error

        ticketData = data;

      } catch ( error ) {

        throw error

      }

      const transformedTicket = new Ticket( {
        ...ticketData,
        createdAt: new Date( ticketData.createdAt ),
        updatedAt: new Date( ticketData.updatedAt ),
        assignedAt: ticketData.assignedAt ? new Date( ticketData.assignedAt ) : undefined,
        resolvedAt: ticketData.resolvedAt ? new Date( ticketData.resolvedAt ) : undefined,
        verifiedAt: ticketData.verifiedAt ? new Date( ticketData.verifiedAt ) : undefined,
        dueDate: ticketData.dueDate ? new Date( ticketData.dueDate ) : undefined,
      } )

      setTickets( prev => prev.map( t => t.id === ticketId ? transformedTicket : t ) );

      // Send notifications based on the type of update
      try {

        if ( updates.status === 'resolved' ) await notifyTicketResolved( transformedTicket, user.id );

        if ( updates.assignedTo && updates.assignedTo !== transformedTicket.createdBy ) await notifyTicketAssigned( transformedTicket, updates.assignedTo, user.id );

      } catch ( notificationError ) {

        console.warn( 'Failed to send ticket update notifications:', notificationError );

      }

      toast( {

        title: 'Ticket updated',
        description: 'The ticket has been updated successfully.',

      } );

      return transformedTicket;

    } catch ( error: any ) {

      console.log( error )

      toast( {

        title: 'Failed to update ticket',
        description: error.message || 'An error occurred while updating the ticket.',
        variant: 'destructive'

      } );

      throw error;

    }

  };

  const deleteTicket = async ( ticketId: string ) => {

    if ( !user ) throw new Error( 'User not authenticated' );

    try {

      try {

        const { error } = await db.deleteTicket( ticketId )

        if ( error ) throw error;

      } catch ( error ) {

        console.log( error )

      }

      setTickets( prev => prev.filter( t => t.id !== ticketId ) );

      toast( {

        title: 'Ticket deleted',
        description: 'The ticket has been deleted successfully.',

      } );

    } catch ( error: any ) {

      console.error( 'Error deleting ticket:', {
        message: error instanceof Error ? error.message : String( error ),
        stack: error instanceof Error ? error.stack : undefined,
        ticketId: ticketId,
        userId: user?.id,
        error: error
      } );

      toast( {
        title: 'Failed to delete ticket',
        description: error.message || 'An error occurred while deleting the ticket.',
        variant: 'destructive'
      } );

      throw error;

    }

  };

  const assignTicket = async ( ticketId: string, assignedTo: string | null ) => {

    return updateTicket( ticketId, {
      assignedTo: assignedTo,
      status: assignedTo ? 'assigned' : 'open',
      assignedAt: assignedTo ? new Date() : undefined
    } );

  };

  const addComment = async ( ticketId: string, comment: string ) => {

    if ( !user ) throw new Error( 'User not authenticated' );

    try {

      const { error } = await db.addTicketComment( user.id, ticketId, comment );

      if ( error ) throw error;

      toast( {

        title: 'Comment added',
        description: 'Your comment has been added to the ticket.',

      } );

    } catch ( error: any ) {

      console.error( 'Error adding comment:', {
        message: error instanceof Error ? error.message : String( error ),
        stack: error instanceof Error ? error.stack : undefined,
        ticketId: ticketId,
        comment: comment,
        userId: user?.id,
        error: error
      } );

      toast( {
        title: 'Failed to add comment',
        description: error.message || 'An error occurred while adding the comment.',
        variant: 'destructive'
      } );

      throw error;

    }

  };

  const getTicketActivities = async ( ticketId: string ): Promise<any[]> => {

    try {

      let data: any[];

      try {

        data = await db.getTicketActivities( ticketId );

      } catch ( error ) {

        console.log( error )

        toast( {
          title: 'Failed to load activities',
          description: error.message || 'An error occurred while loading ticket activities.',
          variant: 'destructive'
        } );

      }

      return data.map( ( activity: any ) => ( {
        ...activity,
        createdAt: new Date( activity.createdAt ),
      } ) );

    } catch ( error: any ) {

      console.error( 'Error loading ticket activities:', {
        message: error instanceof Error ? error.message : String( error ),
        stack: error instanceof Error ? error.stack : undefined,
        ticketId: ticketId,
        error: error
      } );

      toast( {
        title: 'Failed to load activities',
        description: error.message || 'An error occurred while loading ticket activities.',
        variant: 'destructive'
      } );

      return [];

    }

  };

  const getTicketMedia = async ( ticketId: string ): Promise<any[]> => {

    try {

      const data = await db.getTicketMedia( ticketId );

      return data.map( media => ( {
        ...media,
        createdAt: new Date( media.created_at ),
      } ) );

    } catch ( error: any ) {

      console.error( 'Error loading ticket media:', {
        message: error instanceof Error ? error.message : String( error ),
        stack: error instanceof Error ? error.stack : undefined,
        ticketId: ticketId,
        error: error
      } );

      toast( {
        title: 'Failed to load media',
        description: error.message || 'An error occurred while loading ticket media.',
        variant: 'destructive'
      } );

      return [];

    }

  };

  const updateTicketStatus = async ( ticketId: string, status: TicketStatus ) => {

    return updateTicket( ticketId, { status } );

  };

  const addNote = async ( ticketId: string, note: string ) => {

    if ( !user ) throw new Error( 'User not authenticated' );

    try {

      const { error } = await db.addTicketNote( user.id, ticketId, note );

      if ( error ) throw error;

      toast( {

        title: 'Note added',
        description: 'Your note has been added to the ticket.',

      } );

    } catch ( error: any ) {

      console.error( 'Error adding note:', {
        message: error instanceof Error ? error.message : String( error ),
        stack: error instanceof Error ? error.stack : undefined,
        ticketId,
        note,
        userId: user?.id,
        error: error
      } );

      toast( {
        title: 'Failed to add note',
        description: error.message || 'An error occurred while adding the note.',
        variant: 'destructive'
      } );

      throw error;

    }

  };

  // Helper functions for role-based filtering
  const getMyTickets = () => {

    if ( !user ) return [];

    return tickets.filter( ticket => ticket.createdBy === user.id );

  };

  const getAssignedTickets = () => {

    if ( !user ) return [];

    return tickets.filter( ticket => ticket.assignedTo === user.id );

  };

  const getUnassignedTickets = () => {

    return tickets.filter( ticket => !ticket.assignedTo && ticket.status === 'open' );

  };

  const getTicketsByStatus = ( status: string ) => {

    return tickets.filter( ticket => ticket.status === status );

  };

  const getTicketsByPriority = ( priority: string ) => {

    return tickets.filter( ticket => ticket.priority === priority );

  };

  const getOverdueTickets = () => {

    const now = new Date();

    return tickets.filter( ticket =>
      ticket.dueDate &&
      ticket.dueDate < now &&
      ![ 'resolved', 'verified', 'closed' ].includes( ticket.status )
    );

  };

  return {

    tickets,
    stats,
    loading: false,
    error,
    createTicket,
    updateTicket,
    updateTicketStatus,
    deleteTicket,
    assignTicket,
    addComment,
    addNote,
    getTicketActivities,
    getTicketMedia,
    loadTickets,

    // Helper functions
    getMyTickets,
    getAssignedTickets,
    getUnassignedTickets,
    getTicketsByStatus,
    getTicketsByPriority,
    getOverdueTickets,

  };

};
