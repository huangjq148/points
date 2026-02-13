interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, unknown>;
  body?: unknown;
}

export default async function request(url: string, options?: RequestOptions) {
  const token = typeof window !== 'undefined' ? localStorage.getItem("access_token") || "" : "";

  let finalUrl = url;
  if (options?.params) {
    const searchParams = new URLSearchParams(options.params as Record<string, string>);
    finalUrl += (finalUrl.includes('?') ? '&' : '?') + searchParams.toString();
  }

  const fetchOptions: RequestInit = {
    method: options?.method,
    signal: options?.signal,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  };

  if (options?.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(finalUrl, fetchOptions);

  return await res.json();
}
