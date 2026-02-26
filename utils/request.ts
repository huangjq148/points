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

  const isFormData = options?.body instanceof FormData;

  const fetchOptions: RequestInit = {
    method: options?.method,
    signal: options?.signal,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  };

  // 只有非 FormData 请求才设置 Content-Type
  if (!isFormData) {
    fetchOptions.headers = {
      ...fetchOptions.headers,
      "Content-Type": "application/json",
    };
  }

  if (options?.body) {
    if (isFormData) {
      fetchOptions.body = options.body as FormData;
    } else {
      fetchOptions.body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(finalUrl, fetchOptions);

  return await res.json();
}
