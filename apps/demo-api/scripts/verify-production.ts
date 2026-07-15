const apiBaseUrl =
  process.env.MMD_API_URL?.replace(/\/$/, "") ??
  "https://mmd-api.zyking.xyz";
const endpoint = `${apiBaseUrl}/api/mmd/query-list`;
const requestBody = JSON.stringify({
  model: "Product",
  fields: ["name", "price", "status"],
  page: 1,
  pageSize: 3,
  search: {}
});

function isQueryListResponse(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  return (
    Array.isArray(response.data) &&
    Number.isInteger(response.total) &&
    Number.isInteger(response.page) &&
    Number.isInteger(response.pageSize)
  );
}

async function verifyRequest(label: string): Promise<void> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": `verify_${crypto.randomUUID()}`
    },
    body: requestBody
  });
  const text = await response.text();
  const requestId = response.headers.get("x-request-id") ?? "missing";
  const cfRay = response.headers.get("cf-ray") ?? "missing";

  if (!response.ok) {
    throw new Error(
      `${label}: HTTP ${response.status}; requestId=${requestId}; cfRay=${cfRay}; body=${text.slice(0, 500)}`
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(
      `${label}: invalid JSON; requestId=${requestId}; cfRay=${cfRay}`
    );
  }
  if (!isQueryListResponse(body)) {
    throw new Error(
      `${label}: invalid response shape; requestId=${requestId}; cfRay=${cfRay}`
    );
  }
}

for (let index = 1; index <= 20; index += 1) {
  await verifyRequest(`serial-${index}`);
}

for (let round = 1; round <= 3; round += 1) {
  await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      verifyRequest(`concurrent-${round}-${index + 1}`)
    )
  );
}

console.info("MMD production API verification passed", {
  serialRequests: 20,
  concurrentRounds: 3,
  requestsPerRound: 12
});

export {};
