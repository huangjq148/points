import dayjs from "dayjs";

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  return dayjs(d).format("YYYY-MM-DD HH:mm:ss");
}
