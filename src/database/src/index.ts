import { createDatabase } from '@large-event/database';
import * as sharedSchema from './schemas/alltables';
import * as overlaySchema from './overlays';

export function createTeamDDatabase() {
  return createDatabase();
}

export const schema = {
  ...sharedSchema,
  ...overlaySchema,
};

export { sharedSchema, overlaySchema };

export const db = createTeamDDatabase();

export type TeamDDatabase = ReturnType<typeof createTeamDDatabase>;
