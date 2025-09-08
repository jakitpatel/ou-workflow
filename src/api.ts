const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function fetchApplicants({
  page = 0,
  limit = 20
}: { page?: number; limit?: number } = {}): Promise<Applicant[]> {
  //const url = `${API_BASE_URL}/ncrc_dashboard?page[limit]=${limit}&page[offset]=${page}`;
  const url = `${API_BASE_URL}/ncrc_dashboard.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load applicants: ${response.statusText}`);
  const json = await response.json();
  // Normalize stage keys for all applicants
  return json.data.map((applicant: any) => ({
    ...applicant,
    stages: Object.fromEntries(
      Object.entries(applicant.stages).map(([k, v]) => [k.toLowerCase(), v])
    )
  }))
  //return json.data; // <-- return the array only
}