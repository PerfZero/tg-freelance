export const formatMoney = (value: number): string =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

export const formatRating = (value: number): string =>
  Number.isFinite(value) ? value.toFixed(1) : "0.0";

export const formatDate = (value: string | null): string => {
  if (!value) {
    return "без дедлайна";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "без дедлайна";
  }

  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const trimText = (value: string, max = 130): string => {
  const prepared = value.trim();
  if (prepared.length <= max) {
    return prepared;
  }

  return `${prepared.slice(0, max)}...`;
};
