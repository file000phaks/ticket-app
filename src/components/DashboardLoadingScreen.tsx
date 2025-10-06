import { Card, CardContent } from "./ui/card"

const DashboardLoadingScreen = () => {

    return (

        <div className="p-4 space-y-4">

            <div className="grid grid-cols-2 gap-4">

                {[ ...Array( 4 ) ].map( ( _, i ) => (

                    <Card key={i} className="animate-pulse">

                        <CardContent className="p-4">
                            <div className="h-8 bg-muted rounded mb-2"></div>
                            <div className="h-4 bg-muted rounded w-1/2"></div>
                        </CardContent>

                    </Card>

                ) )}

            </div>

        </div>

    )

}

export default DashboardLoadingScreen