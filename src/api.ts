const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function fetchApplicants({ page = 0, limit = 20 }: { page?: number; limit?: number } = {}): Promise<Applicant[]> {
  //const url = `${API_BASE_URL}/ncrc_dashboard?page[limit]=${limit}&page[offset]=${page}`;
  const url = `${API_BASE_URL}/ncrc_dashboard.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load applicants: ${response.statusText}`);
  const json = await response.json();
  return json.data.map((applicant: any) => ({
    ...applicant,
    stages: Object.fromEntries(
      Object.entries(applicant.stages).map(([k, v]) => [k.toLowerCase(), v])
    )
  }));
}

export async function fetchRoles({ page = 0, limit = 20 }: { page?: number; limit?: number } = {}): Promise<any[]> {
  const url = `${API_BASE_URL}/ncrc_role.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load roles: ${response.statusText}`);
  const json = await response.json();
  return json.data;
}

export async function fetchRcs({ page = 0, limit = 20 }: { page?: number; limit?: number } = {}): Promise<any[]> {
  const url = `${API_BASE_URL}/ncrc_rc.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load Rcs: ${response.statusText}`);
  const json = await response.json();
  return json.data;
}

/** 👇 New: Assign task mutation */
export async function assignTask({
  appId,
  taskId,
  role,
  assignee,
}: {
  appId: string;
  taskId: string;
  role: string;
  assignee: string;
}) {
  const response = await fetch(`${API_BASE_URL}/assign-task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appId, taskId, role, assignee }),
  });

  if (!response.ok) {
    throw new Error(`Failed to assign task: ${response.statusText}`);
  }

  return response.json();
}

/** 👇 New: Confirm task mutation */
export async function confirmTask({
  appId,
  taskId
}: {
  appId: string;
  taskId: string;
}) {
  const response = await fetch(`${API_BASE_URL}/confirm-task`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appId, taskId, done:"true" }),
  });

  if (!response.ok) {
    throw new Error(`Failed to confirm task: ${response.statusText}`);
  }

  return response.json();
}
