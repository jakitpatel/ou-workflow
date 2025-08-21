const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function fetchApplicants({
  page = 0,
  limit = 20
}: { page?: number; limit?: number } = {}): Promise<Applicant[]> {
  const url = `${API_BASE_URL}/ncrc_dashboard?page[limit]=${limit}&page[offset]=${page}`;
  //const url = `${API_BASE_URL}/ncrc_dashboard.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load applicants: ${response.statusText}`);
  return response.json();
}