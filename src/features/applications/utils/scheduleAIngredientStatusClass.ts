export const statusClass = (status: string) => {
  const value = status.toLowerCase()
  if (value.includes('active') || value.includes('approved') || value.includes('submitted')) {
    return 'bg-green-100 text-green-700'
  }
  if (value.includes('hold') || value.includes('pending')) return 'bg-amber-100 text-amber-800'
  if (value.includes('reject') || value.includes('inactive')) return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-700'
}
