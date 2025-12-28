import { DefaultUrlEditor, GeoRoutingSection, GeoRoutingToggle, LinkNameEditor } from '@/components/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { linkQueryOptions } from '@/data/links/links-fetch-query'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react';

export const Route = createFileRoute('/app/_authed/link/$id')({
  component: RouteComponent,
   loader: async ({ context, params }) => {
      await context.queryClient.ensureQueryData(linkQueryOptions(params.id))
    },
})

function RouteComponent() {
    const {id} = Route.useParams();
      const queryClient = useQueryClient();

      const {data:linkInfo} = useSuspenseQuery(linkQueryOptions(id));
      console.log('linkInfo:', linkInfo);

  const [geoToggle, setGeoToggle] = useState(
    linkInfo ? Object.keys(linkInfo.destinations).length > 1 : false,
  ); // Enable geo-routing if multiple destinations exist
    if (!linkInfo) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-muted to-muted/50 p-6">
        <div className="w-full space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Link Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Loading link information...
            </p>
          </div>
        </div>
      </div>
    );
  }

 return (
    <div className="min-h-screen  via-muted to-muted/50 p-6">
      <div className="w-full space-y-8">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Link Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage your smart link performance
          </p>
        </div>

        {/* Link Configuration */}
        <Card className="shadow-xl">
          <CardHeader className="pb-8">
            <CardTitle className="text-2xl font-semibold">
              Link Configuration
            </CardTitle>
            <CardDescription className="text-base">
              Manage your link settings and routing preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <LinkNameEditor initialName={linkInfo.name} linkId={id} />

            <Separator />
            <DefaultUrlEditor
              linkId={linkInfo.linkId}
              destinations={linkInfo.destinations}
            />
            <GeoRoutingToggle
              linkId={linkInfo.linkId}
              destinations={linkInfo.destinations}
              setGeoToggle={setGeoToggle}
              geoToggle={geoToggle}
            />

            <GeoRoutingSection
              linkId={linkInfo.linkId}
              destinations={linkInfo.destinations}
              geoToggle={geoToggle}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
