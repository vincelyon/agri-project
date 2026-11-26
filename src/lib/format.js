export function formatNumber(n) {
  return new Intl.NumberFormat("en-ZM").format(n ?? 0);
}

export function formatMoney(amount, currency = "ZMW") {
  if (amount == null) return "—";
  const n = Number(amount.toString());
  return `${currency} ${new Intl.NumberFormat("en-ZM", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)}`;
}

export function formatDate(d) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(d));
}

export function formatDateTime(d) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(d),
  );
}

/** yyyy-mm-dd for <input type="date"> */
export function toDateInput(d = new Date()) {
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
