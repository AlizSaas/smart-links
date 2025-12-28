import { queryOptions } from '@tanstack/react-query'
import { activeLinks, clicksByCountry, getLink, getLinks, last24HourClicks, last30DaysClicks, totalLinClickLastHour } from './link-functions'


export const linksQueryOptions = () =>
  queryOptions({
    queryKey: ['links'],
    queryFn: () =>  getLinks({data: {}}),
  })

// export type PostsQueryOptions = ReturnType<typeof postsQueryOptions>

export const linkQueryOptions = (linkId: string) =>
  queryOptions({
    queryKey: ['link', linkId],
    queryFn: () => getLink({ data: { linkId } }),
  });

  export const activeLinksQueryOptions = () =>
  queryOptions({
    queryKey: ['activeLinks'],
    queryFn: () => activeLinks(),
 
    refetchInterval: 5000, // Refresh every 5 seconds
  });

// Total link clicks in last hour
export const totalClicksLastHourQueryOptions = () =>
  queryOptions({
    queryKey: ['totalClicksLastHour'],
    queryFn: () => totalLinClickLastHour(),
  
    refetchInterval: 5000, // Refresh every 5 seconds
  });

// Last 24 hour clicks with comparison
export const last24HourClicksQueryOptions = () =>
  queryOptions({
    queryKey: ['last24HourClicks'],
    queryFn: () => last24HourClicks(),
    // Refresh every 5 seconds
    refetchInterval: 5000
  });

// Last 30 days clicks total
export const last30DaysClicksQueryOptions = () =>
  queryOptions({
    queryKey: ['last30DaysClicks'],
    queryFn: () => last30DaysClicks(),
    // Refresh every 5 seconds
    refetchInterval: 5000
  });

// Clicks by country in last 30 days
export const clicksByCountryQueryOptions = () =>
  queryOptions({
    queryKey: ['clicksByCountry'],
    queryFn: () => clicksByCountry(),
    // Refresh every 5 minutes
    refetchInterval: 300000,
  });

