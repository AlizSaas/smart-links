
import { EvaluationsTable } from '@/components/evaluations/evaluations-table'
import { evaluationsQueryOptions } from '@/data/evaluations/evaluations-fetch-query'

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/_authed/evaluations')({
  component: RouteComponent,
  loader: async ({context}) => {
    await context.queryClient.ensureQueryData(evaluationsQueryOptions())
  }
})

function RouteComponent() {

  return <div>
    <EvaluationsTable  />
  </div>
}
