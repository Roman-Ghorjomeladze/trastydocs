import type { AnalyticsData, AnalyticsFilters } from '../types/index.ts';
import { getAnalytics as getAnalyticsFromDocuments } from './documents.ts';

/**
 * Fetch analytics data with optional filters.
 * Delegates to the documents API endpoint.
 */
export async function fetchAnalytics(
  filters?: AnalyticsFilters,
): Promise<AnalyticsData> {
  return getAnalyticsFromDocuments(filters);
}
