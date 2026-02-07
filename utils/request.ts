export default async function (url: string, options?: RequestInit) {
  const token = localStorage.getItem("access_token") || "";

  const res = await fetch(url, {
    ...options, headers: {
      ...options?.headers,
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    }
  });

  return await res.json()
}