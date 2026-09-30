import type { PublicPaginationMeta } from "../../models/public/PublicApiResponseModel";
import { createPublicError } from "./publicErrorUtils";

export const PUBLIC_MAX_PAGE_SIZE = 100;
const MAX_QUERY_LENGTH = 1600;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const allowedSorts: Record<string, Set<string>> = {
  artists: new Set(["displayName", "featured", "newest", "updated", "sortOrder"]),
  releases: new Set(["releaseDate", "title", "featured", "newest", "sortOrder"]),
  gallery: new Set(["sortOrder", "newest", "title", "featured"]),
};

export const sanitizePublicSearchQuery = (query: string | null | undefined): string =>
  (query ?? "").replace(/[^\p{L}\p{N}\s'"_-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 120);

export const parsePagination = (url: URL) => {
  validateQueryString(url);
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(url.searchParams.get("pageSize") ?? "24", 10);
  if (!Number.isFinite(page) || page < 1) throw createPublicError("PUBLIC_PAGE_INVALID", "Invalid page.", 400);
  if (!Number.isFinite(pageSize) || pageSize < 1) throw createPublicError("PUBLIC_PAGE_SIZE_INVALID", "Invalid page size.", 400);
  if (pageSize > PUBLIC_MAX_PAGE_SIZE) throw createPublicError("PUBLIC_PAGE_SIZE_INVALID", `Page size cannot exceed ${PUBLIC_MAX_PAGE_SIZE}.`, 400);
  return { page, pageSize };
};

export const validateQueryString = (url: URL) => {
  if (url.search.length > MAX_QUERY_LENGTH) throw createPublicError("PUBLIC_INVALID_QUERY", "Query string is too large.", 400);
  for (const [key, value] of url.searchParams.entries()) {
    if (key.includes("$") || key.includes(".") || /operator|where|pipeline|aggregate/i.test(key)) {
      throw createPublicError("PUBLIC_INVALID_FILTER", "Unsupported public query parameter.", 400);
    }
    if (/[${}[\]]/.test(value) || /operator|where|pipeline|aggregate/i.test(value)) throw createPublicError("PUBLIC_INVALID_FILTER", "Unsupported public query value.", 400);
  }
};

export const validatePublicSlug = (slug: string, label = "slug") => {
  if (!slugPattern.test(slug) || slug.length > 160) throw createPublicError("PUBLIC_INVALID_FILTER", `Invalid ${label}.`, 400);
  return slug;
};

export const parsePublicSort = (url: URL, scope: keyof typeof allowedSorts, fallback: string) => {
  const sort = url.searchParams.get("sort") ?? fallback;
  if (!allowedSorts[scope].has(sort)) throw createPublicError("PUBLIC_SORT_INVALID", "Unsupported sort field.", 400);
  return sort;
};

export const paginatePublicItems = <T>(items: readonly T[], page: number, pageSize: number): { items: T[]; pagination: PublicPaginationMeta } => {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};
