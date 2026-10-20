/** Public branding for this installation; never sourced from an unauthenticated tenant lookup. */
export const OFFICE_NAME =
  process.env.NEXT_PUBLIC_OFFICE_NAME || "Mars Textile";
export const DESK_LABELS: Record<string, string> = {
  OWNER: "Owner",
  STOREKEEPER: "Godown keeper",
  SALESMAN: "Salesman",
  ACCOUNTANT: "Bookkeeper",
  CASHIER: "Cashier",
  ADMIN: "Administrator",
};
