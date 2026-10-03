export const ROLES = ['citizen', 'admin', 'driver'] as const;

export const WASTE_TYPES = [
  'organic', 'dry_recyclable', 'hazardous', 'medical', 'ewaste', 'construction', 'others'
] as const;

export const ZONE_TYPES = [
  'hospital', 'market', 'school', 'residential', 'public', 'industrial'
] as const;

export const STATUSES = ['Pending', 'Assigned', 'Collected', 'Cancelled'] as const;

export const FILL_COLORS = {
  low: '#22C55E', // < 50%
  medium: '#F59E0B', // 50 - 80%
  high: '#EF4444' // > 80%
};
