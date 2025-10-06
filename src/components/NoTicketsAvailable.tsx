import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"

const NoTicketsAvailable = ( { searchTerm, statusFilter, priorityFilter } ) => {

    const navigate = useNavigate();

    return (
        <div className="col-span-full">

            <Card className="p-8 text-center">

                <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                    📋
                </div>

                <h3 className="text-lg font-medium mb-2">No tickets found</h3>

                <p className="text-muted-foreground mb-4">

                    {
                        searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Create your first ticket to get started'
                    }

                </p>

                <Button onClick={() => navigate( '/create' )}>

                    <Plus className="w-4 h-4 mr-2" />
                    Create Ticket
                </Button>

            </Card>

        </div>
    )

}

export default NoTicketsAvailable;