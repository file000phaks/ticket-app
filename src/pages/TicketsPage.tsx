import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../hooks/useAuth';
import { UserProfile } from '../models/User';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Search,
  SortAsc,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Ticket } from '../models/Ticket';
import TicketCard from '../components/TicketCard_';
import NoTicketsAvailable from '../components/NoTicketsAvailable';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function TicketsPage() {

  const { user, getUsers } = useAuth();
  const { tickets, loading } = useTickets();

  const [ engineers, setEngineers ] = useState<UserProfile[]>( [] );

  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';
  const isFieldEngineer = user?.role === 'field_engineer';
  const canViewAllTickets = isAdmin || isSupervisor;

  const [ searchParams, setSearchParams ] = useSearchParams();

  const [ searchTerm, setSearchTerm ] = useState( searchParams.get( 'search' ) || '' );
  const [ statusFilter, setStatusFilter ] = useState( searchParams.get( 'status' ) || 'all' );
  const [ priorityFilter, setPriorityFilter ] = useState( searchParams.get( 'priority' ) || 'all' );
  const [ assignedFilter, setAssignedFilter ] = useState( searchParams.get( 'assignedTo' ) || 'all' );
  const [ createdByFilter, setCreatedByFilter ] = useState( searchParams.get( 'created' ) || 'all' );
  const [ sortBy, setSortBy ] = useState<'created' | 'updated' | 'priority' | 'due_date'>( 'created' );

  const [ tabValue, setTabValue ] = useState( 'all' );

  useEffect( () => {

    if ( canViewAllTickets ) loadEngineers();

  }, [ canViewAllTickets ] );

  useEffect( () => {

    // Update URL parameters when filters change 
    const params = new URLSearchParams( searchParams.toString() );

    // console.log( searchParams.toString() );

    // console.log( "searchTerm:", searchTerm, searchParams.get( "search" ) )
    // console.log( "status:", statusFilter, searchParams.get( "status" ) )
    // console.log( "priority:", priorityFilter, searchParams.get( "priority" ) )
    // console.log( "assignedTo:", assignedFilter, searchParams.get( "assignedTo" ) )
    // console.log( "created:", createdByFilter, searchParams.get( "created" ) )

    // if ( searchTerm ) params.set( 'search', searchTerm );
    // if ( statusFilter !== 'all' ) params.set( 'status', statusFilter );
    // if ( priorityFilter !== 'all' ) params.set( 'priority', priorityFilter );
    // if ( assignedFilter !== 'all' ) params.set( 'assignedTo', assignedFilter );
    // if ( createdByFilter !== 'all' ) params.set( 'created', createdByFilter );

    if ( searchTerm ) params.set( 'search', searchTerm );

    params.set( 'status', statusFilter );
    params.set( 'priority', priorityFilter );
    params.set( 'assignedTo', assignedFilter );
    params.set( 'created', createdByFilter );

    const filtersChanged = searchParams.get( "search" ) !== searchTerm ||
      searchParams.get( "status" ) !== statusFilter ||
      searchParams.get( "priority" ) !== priorityFilter ||
      searchParams.get( "assignedTo" ) !== assignedFilter ||
      searchParams.get( "created" ) !== createdByFilter

    if ( filtersChanged ) params.set( "page", '1' );

    setSearchParams( params );

  }, [ searchTerm, statusFilter, priorityFilter, assignedFilter, createdByFilter ] );

  const loadEngineers = async () => {

    try {

      let engineersData: UserProfile[];

      try {

        engineersData = await getUsers( 'field_engineer' );

      } catch ( error ) {

        console.log( "Failed to load engineers", error );

      }

      setEngineers( engineersData || [] );

    } catch ( error ) {

      console.error( 'Error loading engineers:', {
        message: error instanceof Error ? error.message : String( error ),
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      } );

    }

  };

  // Filter tickets based on user role
  const getFilteredTickets = () => {

    let userTickets: Ticket[] = [];

    if ( canViewAllTickets ) userTickets = tickets;

    else userTickets = tickets.filter( ticket =>
      ticket.createdBy === user?.id || ticket.assignedTo === user?.id
    );

    return userTickets.filter( ticket => {

      const matchesSearch = ticket.title.toLowerCase().includes( searchTerm.toLowerCase() ) ||
        ticket.description.toLowerCase().includes( searchTerm.toLowerCase() ) ||
        ticket.locationName.toLowerCase().includes( searchTerm.toLowerCase() );

      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;

      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

      const matchesAssigned = assignedFilter === 'all' ||
        ( assignedFilter === 'unassigned' && !ticket.assignedTo ) ||
        ticket.assignedTo === assignedFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssigned;

    } );

  };

  const filteredTickets = getFilteredTickets();

  // Sort tickets
  const sortedTickets = [ ...filteredTickets ].sort( ( a, b ) => {

    switch ( sortBy ) {

      case 'priority':
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return ( priorityOrder[ b.priority ] || 0 ) - ( priorityOrder[ a.priority ] || 0 );

      case 'updated':
        return new Date( b.updatedAt ).getTime() - new Date( a.updatedAt ).getTime();

      case 'due_date':

        if ( !a.dueDate && !b.dueDate ) return 0;
        if ( !a.dueDate ) return 1;
        if ( !b.dueDate ) return -1;

        return new Date( a.dueDate ).getTime() - new Date( b.dueDate ).getTime();

      case 'created':

      default:
        return new Date( b.createdAt ).getTime() - new Date( a.createdAt ).getTime();
    }

  } );

  // Get ticket counts for tabs
  const getTicketCounts = () => {

    const allUserTickets = canViewAllTickets ? tickets : tickets.filter( ticket =>
      ticket.createdBy === user?.id || ticket.assignedTo === user?.id
    );

    return {
      all: allUserTickets.length,
      assigned: allUserTickets.filter( t => t.assignedTo === user?.id ).length,
      created: allUserTickets.filter( t => t.createdBy === user?.id ).length,
      unassigned: canViewAllTickets ? allUserTickets.filter( t => !t.assignedTo ).length : 0,
      overdue: allUserTickets.filter( t =>
        t.dueDate &&
        new Date( t.dueDate ) < new Date() &&
        ![ 'resolved', 'verified', 'closed' ].includes( t.status )
      ).length
    };

  };

  const counts = getTicketCounts();

  const handleTabChange = ( value: string ) => {

    switch ( value ) {

      case 'all':
        setStatusFilter( 'all' );
        setAssignedFilter( 'all' );
        setTabValue( 'all' );
        break;
      case 'assigned':
        setAssignedFilter( user?.id || '' );
        setStatusFilter( 'all' );
        setTabValue( 'assigned' );
        break;
      case 'created':
        setAssignedFilter( 'all' );
        setStatusFilter( 'all' );
        setTabValue( 'created' );
        // This would need additional filtering logic based on createdBy
        break;
      case 'unassigned':
        setAssignedFilter( 'unassigned' );
        setStatusFilter( 'all' );
        setTabValue( 'unassigned' );
        break;
      case 'overdue':
        setAssignedFilter( 'all' );
        setStatusFilter( 'all' );
        setTabValue( 'overdue' );
        // This would need additional filtering logic for overdue
        break;
    }

  };

  const tabItems = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'assigned', label: 'Assigned', count: counts.assigned },
    { value: 'created', label: 'Created', count: counts.created },
    { value: 'overdue', label: 'Overdue', count: counts.overdue }
  ];

  if ( canViewAllTickets ) {
    tabItems.push( { value: 'unassigned', label: 'Unassigned', count: counts.unassigned } );
  }

  if ( loading ) {

    return <TicketsPageLoading />;

  }

  return (

    <div className="h-full p-4 md:p-6 overflow-auto">

      <div className="max-w-6xl mx-auto space-y-6">

        <TicketsPageHeader canViewAllTickets={canViewAllTickets} />

        {/* Ticket Tabs */}

        <Tabs defaultValue="all" onValueChange={handleTabChange}>

          <TicketsPageTabList counts={counts} canViewAllTickets={canViewAllTickets} />

          <TabsContent value={tabValue} className="space-y-4">

            {/* Search and Filters */}

            <TicketsPageSearchAndFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
              assignedFilter={assignedFilter}
              setAssignedFilter={setAssignedFilter}
              canViewAllTickets={canViewAllTickets}
              engineers={engineers}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />

            {/* Results Summary */}
            <div className="text-sm text-muted-foreground"> Showing {sortedTickets.length} of {filteredTickets.length} tickets </div>

            {/* Tickets List */}

            <TicketsPageTicketList
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              priorityFilter={priorityFilter}
              tickets={sortedTickets}
            />

          </TabsContent>

        </Tabs>

      </div>

    </div >

  );

}

function TicketsPageHeader( { canViewAllTickets } ) {

  const navigate = useNavigate();

  return (

    <div className="flex justify-between items-center">

      <div>

        <h1 className="text-2xl font-bold">Tickets</h1>
        <p className="text-muted-foreground">
          {canViewAllTickets ? 'All system tickets' : 'Your tickets and assignments'}
        </p>

      </div>

      <Button onClick={() => navigate( '/create' )}>
        <Plus className="w-4 h-4 mr-2" />
        Create Ticket
      </Button>

    </div>

  )

}

function TicketsPageTabList( { counts, canViewAllTickets } ) {

  return (
    <TabsList className="grid w-full grid-cols-6">

      <TabsTrigger value="all" className="text-xs">
        All ({counts.all})
      </TabsTrigger>

      {
        canViewAllTickets && (

          <TabsTrigger value="unassigned" className="text-xs">
            Unassigned ({counts.unassigned})
          </TabsTrigger>

        )
      }

      {

        canViewAllTickets && (

            <TabsTrigger value="created" className="text-xs">
              Assigned By Me ({counts.created})
            </TabsTrigger>

        )

      }

      <TabsTrigger value="assigned" className="text-xs">
        Assigned To Me({counts.assigned})
      </TabsTrigger>

      <TabsTrigger value="created" className="text-xs">
        Created ({counts.created})
      </TabsTrigger>

      <TabsTrigger value="overdue" className="text-xs">
        Overdue ({counts.overdue})
      </TabsTrigger>

    </TabsList>
  )

}

function TicketsPageSearchAndFilters( { searchTerm, setSearchTerm, statusFilter, setStatusFilter, priorityFilter, setPriorityFilter, assignedFilter, setAssignedFilter, canViewAllTickets, engineers, sortBy, setSortBy } ) {

  return (
    <Card>

      <CardContent className="p-4 space-y-3">

        <div className="relative">

          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={( e ) => setSearchTerm( e.target.value )}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          <Select value={statusFilter} onValueChange={setStatusFilter}>

            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>

            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>

          </Select>

          {

            canViewAllTickets && (

              <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>

                  {

                    engineers.map( ( engineer ) => (
                      <SelectItem key={engineer.id} value={engineer.id}>
                        {engineer.fullName || engineer.email}
                      </SelectItem>
                    ) )

                  }

                </SelectContent>

              </Select>
            )

          }

          <Select value={sortBy} onValueChange={setSortBy}>

            <SelectTrigger className="text-xs">
              <SortAsc className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="created">Created Date</SelectItem>
              <SelectItem value="updated">Updated Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="due_date">Due Date</SelectItem>
            </SelectContent>
          </Select>

        </div>

      </CardContent>

    </Card>
  )

}

function TicketsPageLoading() {

  return (

    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="animate-pulse space-y-4">

        {[ ...Array( 5 ) ].map( ( _, i ) => (
          <Card key={i} className="p-4">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </Card>
        ) )}

      </div>

    </div>

  )

}

function TicketsPageTicketList( { tickets, searchTerm, statusFilter, priorityFilter } ) {

  const [ searchParams, setSearchParams ] = useSearchParams();

  const page = parseInt( searchParams.get( 'page' ) || '1', 10 );
  const pageSize = 4;

  const start = ( page - 1 ) * pageSize;
  const end = start + pageSize;

  const paginatedTickets = tickets.length > 0 ? tickets.slice( start, end ) : [];

  const totalPages = Math.ceil( tickets.length / pageSize );

  const goToPage = ( newPage: number ) => {

    if ( newPage < 1 || newPage > totalPages ) return;

    setSearchParams( ( prev ) => {

      prev.set( 'page', newPage.toString() );

      return prev;

    } )

  }

  return (
    <div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {
          paginatedTickets.length === 0 ?

            <NoTicketsAvailable
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              priorityFilter={priorityFilter}
            />
            :
            paginatedTickets.map( ( ticket ) => ( <TicketCard ticket={ticket} key={ticket.id} /> ) )

        }

      </div>

      {
        totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            goToPage={goToPage}
          />
        )
      }

    </div>
  )

}

function Pagination( { currentPage, totalPages, goToPage } ) {

  return (

    <div className='flex items-center justify-center gap-2 mt-6'>

      {/* First Page */}
      <button
        onClick={() => goToPage( 1 )}
        disabled={currentPage === 1}
        className='p-2 disabled:opacity-50'
      >
        <ChevronLeft size={20} />
      </button>

      {/* Previous Page */}
      <button
        onClick={() => goToPage( currentPage - 1 )}
        disabled={currentPage === 1}
        className='p-2 disabled:opacity-50'
      >
        <ChevronLeft size={20} />
      </button>

      {/* Page Numbers */}
      <span className='text-sm font-medium'>
        Page {currentPage} of {totalPages}
      </span>

      {/* Next Page */}
      <button
        onClick={() => goToPage( currentPage + 1 )}
        disabled={currentPage >= totalPages}
        className='p-2 disabled:opacity-50'
      >
        <ChevronRight size={20} />
      </button>

      {/* Last Page */}
      <button
        onClick={() => goToPage( totalPages )}
        disabled={currentPage >= totalPages}
        className='p-2 disabled:opacity-50'
      >
        <ChevronRight size={20} />
      </button>

    </div>

  )

}