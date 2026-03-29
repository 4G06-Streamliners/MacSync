/** Staff access for RBAC: global admins vs per-event managers. */
export interface StaffAccess {
  isSystemAdmin: boolean;
  /** True if user has full app access (system admin or legacy Admin role). */
  isGlobalAdmin: boolean;
  /** Event IDs this user may manage (empty when not a scoped event admin). */
  managedEventIds: number[];
}
