import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** The site's one date format, "22 Jun 2026", in Malaysia time (a timestamp
 * late in the evening UTC is already the next day for the reader). Fixed
 * locale, so server and browser render the same string. */
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  })
}
