import { queryOptions } from '@tanstack/react-query'
import { recentEvaluations,problematicDestinations } from './evaluation.functions'


export const evaluationsQueryOptions = () =>
  queryOptions({
    queryKey: ['evaluations'],
    queryFn: () =>  recentEvaluations({data:{createdBefore:undefined}}),
    })


    // export type EvaluationsQueryOptions = ReturnType<typeof evaluationsQueryOptions>

    export const problematicDestinationsQueryOptions = () => 
    queryOptions({
      queryKey: ['problematicDestinations'],
      queryFn: () => problematicDestinations(),
      refetchInterval: 300000, // Refresh every 5 minutes
      })
    
