import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTickets } from '../../hooks/useTickets';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  Users,
  Settings,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Shield,
  Database,
  UserCog,
  Building,
  Activity,
  Calendar,
  Clock,
  CheckCircle,
  Archive
} from 'lucide-react';
import { dbHelpers as db } from '../../lib/dbhelper';
import { UserProfile } from '../../models/User';
import { cn } from '../../lib/utils';
import EngineersOverview from '../EngineersOverview';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTickets: number;
  ticketsThisMonth: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  systemUptime: number;
}

interface DepartmentStats {
  department: string;
  userCount: number;
  activeTickets: number;
  completionRate: number;
}

export default function AdminDashboard() {

  const navigate = useNavigate();
  const { user } = useAuth();
  const { tickets } = useTickets();
  const [ systemStats, setSystemStats ] = useState<SystemStats | null>( null );
  const [ departmentStats, setDepartmentStats ] = useState<DepartmentStats[]>( [] );
  const [ users, setUsers ] = useState<UserProfile[]>( [] );
  const [ loading, setLoading ] = useState( true );

  useEffect( () => {

    loadSystemData();

  }, [ user ] );

  const loadSystemData = async () => {

    if ( !user ) return;

    try {

      let allUsers: UserProfile[];

      try {

        allUsers = await db.getUsers();

      } catch ( error ) {

        console.log( "failed to get users", error )

      }

      setUsers( allUsers || [] );

      // Load dashboard stats with fallback to mock data
      let dashboardData;

      try {

        dashboardData = await db.getDashboardStats( user.id, user.role );

      } catch ( error ) {

        console.log( "Failed to fetch dashboard stats", error )

      }

      // Calculate system statistics

      const thisMonth = new Date();

      thisMonth.setDate( 1 );

      const ticketsThisMonth = tickets.filter( t => new Date( t.createdAt ) >= thisMonth ).length;
      const resolvedTickets = tickets.filter( t => [ 'resolved', 'verified', 'closed' ].includes( t.status ) ).length;

      // Calculate average resolution time
      const resolvedWithTime = tickets.filter( t => t.resolvedAt );
      const avgResolutionTime = resolvedWithTime.length > 0
        ? resolvedWithTime.reduce( ( acc, ticket ) => {
          const resolutionTime = new Date( ticket.resolvedAt! ).getTime() - new Date( ticket.createdAt ).getTime();
          return acc + ( resolutionTime / ( 1000 * 60 * 60 ) ); // Convert to hours
        }, 0 ) / resolvedWithTime.length
        : 0;

      setSystemStats( {
        totalUsers: allUsers?.length || 0,
        activeUsers: allUsers?.filter( u => u.isActive ).length || 0,
        totalTickets: tickets.length,
        ticketsThisMonth: ticketsThisMonth,
        resolvedTickets: resolvedTickets,
        avgResolutionTime: avgResolutionTime,
        systemUptime: 99.9 // Mock uptime
      } );

      // Calculate department statistics
      const departments = [ ...new Set( allUsers?.map( u => u.department ).filter( Boolean ) ) ];

      const deptStats: DepartmentStats[] = departments.map( dept => {

        const deptUsers = allUsers?.filter( u => u.department === dept ) || [];

        const deptTickets = tickets.filter( t =>
          deptUsers.some( u => u.id === t.assignedTo || u.id === t.createdBy )
        );

        const completedDeptTickets = deptTickets.filter( t =>
          [ 'resolved', 'verified', 'closed' ].includes( t.status )
        );

        return {
          department: dept,
          userCount: deptUsers.length,
          activeTickets: deptTickets.filter( t => ![ 'resolved', 'verified', 'closed' ].includes( t.status ) ).length,
          completionRate: deptTickets.length > 0 ? ( completedDeptTickets.length / deptTickets.length ) * 100 : 0
        };

      } );

      setDepartmentStats( deptStats );

    } catch ( error ) {

      console.error( 'Error loading system data:', {
        message: error instanceof Error ? error.message : String( error ),
        stack: error instanceof Error ? error.stack : undefined,
        component: 'AdminDashboard',
        operation: 'loadSystemData',
        error: error
      } );
    } finally {

      setLoading( false );

    }

  };

  const usersByRole = {

    admin: users.filter( u => u.role === 'admin' ).length,
    supervisor: users.filter( u => u.role === 'supervisor' ).length,
    field_engineer: users.filter( u => u.role === 'field_engineer' ).length

  };

  const recentUsers = users
    .sort( ( a, b ) => new Date( b.createdAt ).getTime() - new Date( a.createdAt ).getTime() )
    .slice( 0, 5 );

  const criticalTickets = tickets.filter( t => t.priority === 'critical' ).length;

  const overdueTickets = tickets.filter( t =>
    t.dueDate &&
    new Date( t.dueDate ) < new Date() &&
    ![ 'resolved', 'verified', 'closed' ].includes( t.status )
  ).length;

  if ( loading ) return <DashboardLoading />

  return (

    <div className="space-y-6 pb-10">

      {/* Header */}

      <div className="space-y-2">

        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6" />
          System Overview
        </h1>

      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

        <Card className="hover:shadow-md transition-shadow">

          <CardContent className="p-4">

            <div className="flex items-center space-x-2">

              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{systemStats?.totalUsers || 0}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>

            </div>

          </CardContent>

        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{systemStats?.totalTickets || 0}</p>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold">{systemStats?.resolvedTickets || 0}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "hover:shadow-md transition-shadow",
          criticalTickets > 0 && "border-red-200 dark:border-red-800"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className={cn(
                "w-5 h-5",
                criticalTickets > 0 ? "text-red-600" : "text-gray-400"
              )} />
              <div>
                <p className="text-2xl font-bold">{criticalTickets}</p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "hover:shadow-md transition-shadow",
          overdueTickets > 0 && "border-orange-200 dark:border-orange-800"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className={cn(
                "w-5 h-5",
                overdueTickets > 0 ? "text-orange-600" : "text-gray-400"
              )} />
              <div>
                <p className="text-2xl font-bold">{overdueTickets}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* User Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            User Role Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-red-600">{usersByRole.admin}</div>
                <div className="text-sm text-muted-foreground">Admins</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{usersByRole.supervisor}</div>
                <div className="text-sm text-muted-foreground">Supervisors</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{usersByRole.field_engineer}</div>
                <div className="text-sm text-muted-foreground">Engineers</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Admins</span>
                  <span>{usersByRole.admin}/{systemStats?.totalUsers}</span>
                </div>
                <Progress value={( usersByRole.admin / ( systemStats?.totalUsers || 1 ) ) * 100} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Supervisors</span>
                  <span>{usersByRole.supervisor}/{systemStats?.totalUsers}</span>
                </div>
                <Progress value={( usersByRole.supervisor / ( systemStats?.totalUsers || 1 ) ) * 100} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Field Engineers</span>
                  <span>{usersByRole.field_engineer}/{systemStats?.totalUsers}</span>
                </div>
                <Progress value={( usersByRole.field_engineer / ( systemStats?.totalUsers || 1 ) ) * 100} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick System Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => navigate( '/engineers' )}
              variant="outline"
              className="w-full justify-start h-10"
            >
              <Users className="w-4 h-4 mr-3" />
              Field Engineers ({usersByRole.field_engineer})
            </Button>
            <Button
              onClick={() => navigate( '/admin/supervisors' )}
              variant="outline"
              className="w-full justify-start h-10"
            >
              <Shield className="w-4 h-4 mr-3" />
              Supervisors ({usersByRole.supervisor})
            </Button>
            <Button
              onClick={() => navigate( '/admin/users' )}
              className="w-full justify-start h-10"
            >
              <UserCog className="w-4 h-4 mr-3" />
              All Users & Roles
            </Button>
          </CardContent>
        </Card>

        {/* System Operations */}
        <Card>
       
          <CardHeader>
       
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              System Operations
            </CardTitle>
       
          </CardHeader>
       
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              onClick={() => navigate( '/tickets' )}
              className="w-full justify-start h-10"
            >
              <Database className="w-4 h-4 mr-3" />
              All Tickets ({systemStats?.totalTickets || 0})
       
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate( '/admin/settings' )}
              className="w-full justify-start h-10"
            >
              <Settings className="w-4 h-4 mr-3" />
              System Settings
       
            </Button>
       
          </CardContent>
       
        </Card>
      
      </div>

      {/* Engineers Overview */}
      {/* <EngineersOverview /> */}

    </div>
  );
}

function DashboardLoading() {

  return (

    <div className="p-4 space-y-4">

      <div className="grid grid-cols-2 gap-4">

        {[ ...Array( 6 ) ].map( ( _, i ) => (

          <Card key={i} className="animate-pulse">

            <CardContent className="p-4">
              <div className="h-8 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardContent>

          </Card>

        ) )}

      </div>
    </div>
  );

}

// LEGACY

{/*
      {departmentStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="w-5 h-5" />
              Department Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentStats.map( ( dept ) => (
                <div key={dept.department} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{dept.department}</p>
                    <p className="text-sm text-muted-foreground">
                      {dept.userCount} users • {dept.activeTickets} active tickets
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold">{dept.completionRate.toFixed( 0 )}%</p>
                    <p className="text-xs text-muted-foreground">Completion Rate</p>
                  </div>
                </div>
              ) )}
            </div>
          </CardContent>
        </Card>
      )}
   */
}

{/*
      {/* Analytics & Reports *//*}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Analytics & Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              onClick={() => navigate( '/admin/resolved-tickets' )}
              className="h-20 flex-col gap-2"
            >
              <Archive className="w-6 h-6" />
              <span className="text-sm">Resolved Tickets</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate( '/?view=analytics' )}
              className="h-20 flex-col gap-2"
            >
              <TrendingUp className="w-6 h-6" />
              <span className="text-sm">Performance</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate( '/tickets?priority=critical' )}
              className="h-20 flex-col gap-2"
            >
              <AlertTriangle className="w-6 h-6" />
              <span className="text-sm">Critical Issues</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate( '/map' )}
              className="h-20 flex-col gap-2"
            >
              <Activity className="w-6 h-6" />
              <span className="text-sm">Field Activity</span>
            </Button>
          </div>
        </CardContent>
      </Card>

*/}

{/*
        {/* Recent User Activity *//*}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Recent User Registrations</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate( '/admin/users' )}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentUsers.length > 0 ? recentUsers.map( ( user ) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{user.fullName || user.email}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date( user.createdAt ).toLocaleDateString()}</span>
                    {user.department && (
                      <>
                        <span>•</span>
                        <span>{user.department}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={user.role === 'admin' ? 'destructive' : user.role === 'supervisor' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {user.role.replace( '_', ' ' )}
                  </Badge>
                  <Badge
                    variant={user.isActive ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ) ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent users</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
*/}