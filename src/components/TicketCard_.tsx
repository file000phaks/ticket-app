import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, MapPin, AlertTriangle, User, Calendar } from 'lucide-react';
import { Ticket } from '../models/Ticket'
import { cn } from '../lib/utils';
import { getStatusColor, getPriorityColor, getStatusIcon } from '../lib/ticket-utils';
import { useNavigate } from 'react-router-dom';

const TicketCard = ( { ticket } ) => {

    const navigate = useNavigate();

    const StatusIcon = getStatusIcon( ticket.status );

    const isPriority = ticket.priority === 'critical' || ticket.priority === 'high';

    const isOverdue = ticket.dueDate &&
        new Date( ticket.dueDate ) < new Date() &&
        ![ 'resolved', 'verified', 'closed' ].includes( ticket.status );

    return (

        <Card
            key={ticket.id}
            className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isPriority && "border-l-4 border-l-red-500",
                isOverdue && "border-l-4 border-l-orange-500"
            )}
            onClick={() => navigate( `/tickets/${ticket.id}` )}
        >

            <CardHeader className="pb-3">

                <div className="flex justify-between items-start gap-2">

                    <CardTitle className="text-sm leading-tight flex-1">
                        {ticket.title}
                    </CardTitle>

                    <div className="flex gap-1 flex-shrink-0">

                        <Badge className={cn( "text-xs", getPriorityColor( ticket.priority ) )}>
                            {ticket.priority}
                        </Badge>

                        <Badge className={cn( "text-xs", getStatusColor( ticket.status ) )}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {ticket.status.replace( '_', ' ' )}

                        </Badge>

                    </div>

                </div>

            </CardHeader>

            <CardContent className="pt-0 space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                    {ticket.description}
                </p>

                <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{ticket.locationName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date( ticket.createdAt ).toLocaleDateString()}</span>
                        </div>

                        {ticket.dueDate && (
                            <div className={cn(
                                "flex items-center gap-1",
                                isOverdue && "text-red-600"
                            )}>
                                <Clock className="w-3 h-3" />
                                <span>Due {new Date( ticket.dueDate ).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>

                    {ticket.assignedToProfile && (
                        <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>Assigned to {ticket.assignedToProfile.fullName || ticket.assignedToProfile.email}</span>
                        </div>
                    )}

                    {ticket.createdByProfile && (
                        <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>Created by {ticket.createdByProfile.fullName || ticket.createdByProfile.email}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )

}

export default TicketCard