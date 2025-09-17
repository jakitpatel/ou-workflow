import { useQuery } from '@tanstack/react-query'
import { fetchApplicants, fetchRcs } from './../../../api' // adjust import as needed

export function useTasks() {
  return useQuery({
    queryKey: ['tasksplants'],
    queryFn: fetchApplicants,
    // ...add options if needed
  })
}

export function useRCNames() {
  return useQuery({
    queryKey: ['rcnames'],
    queryFn: fetchRcs,
    // ...add options if needed
  })
}