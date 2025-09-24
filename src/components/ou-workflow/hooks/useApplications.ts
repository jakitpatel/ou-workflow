import { useQuery } from '@tanstack/react-query'
import { fetchApplicants } from './../../../api' // adjust import as needed

export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplicants,
    // ...add options if needed
  })
}