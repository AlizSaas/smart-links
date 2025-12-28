
import { ActiveAreasMap } from "@/components/dashboard/active-areas-map";
import { ActiveLinksTable } from "@/components/dashboard/active-links-table";
import { ActiveRegionMap } from "@/components/dashboard/active-region-map";
import { MetricsCards } from "@/components/dashboard/metrics-cards";
import { ProblematicLinksTable } from "@/components/dashboard/ProblematicLinksTable";
import { TopCountriesTable } from "@/components/dashboard/top-countries-table";
import { problematicDestinationsQueryOptions } from "@/data/evaluations/evaluations-fetch-query";
import { activeLinksQueryOptions, clicksByCountryQueryOptions, last24HourClicksQueryOptions, last30DaysClicksQueryOptions, totalClicksLastHourQueryOptions } from "@/data/links/links-fetch-query";
import { useClickSocket } from "@/hooks/clicks-socket";
import { createFileRoute } from "@tanstack/react-router";


export const Route = createFileRoute("/app/_authed/")({
  component: RouteComponent,
  loader: async ({context}) =>{
    await Promise.all([
      context.queryClient.ensureQueryData(activeLinksQueryOptions()),
      context.queryClient.ensureQueryData(totalClicksLastHourQueryOptions()),
      context.queryClient.ensureQueryData(last24HourClicksQueryOptions()),
      context.queryClient.ensureQueryData(last30DaysClicksQueryOptions()),
      context.queryClient.ensureQueryData(clicksByCountryQueryOptions()),
context.queryClient.ensureQueryData(problematicDestinationsQueryOptions())


      
    ])
  }
});

function RouteComponent() {
    const  {isConnected} = useClickSocket();
 

  return (
  <div className="flex w-full min-w-0">
      <main className="flex-1 min-w-0">
        <div className="container mx-auto p-6 space-y-6 max-w-full">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? `bg-green-500` : `bg-red-500`}`}
              />
              <span className="text-sm text-muted-foreground">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          {/* Metrics Cards */}
          <MetricsCards />

          {/* Map and Geography Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ActiveRegionMap />
            <ActiveAreasMap />
          </div>

          {/* Cities and Issues Section */}
          <div className="grid gap-6 lg:grid-cols-2 ">
            <div className="min-w-0">
              <TopCountriesTable />
            </div>
            <div className="min-w-0">
              <ProblematicLinksTable />
            </div>
          </div>

          {/* Active Links Table */}
          <ActiveLinksTable />
        </div>
      </main>
    </div>
  );
}