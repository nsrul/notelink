import { schema as s } from "jazz-tools";
import { schema as betterAuthSchema } from "./schema-better-auth/schema.ts";

/** The notebook's records and attachments, one row per local key.
 *  `updated_at` is milliseconds as text. `deleted` is a tombstone so a
 *  removal on one device is not filled back in from another device's copy.
 *  Better Auth's own tables live in the same app so one backend session can
 *  serve both sign-in and the notebook. */
export const app = s.defineApp({
  ...betterAuthSchema,
  notes_records: s.table({
    scope: s.string(),
    collection: s.string(),
    record_id: s.string(),
    value: s.json(),
    updated_at: s.string(),
    deleted: s.boolean(),
  }, {}),
  notes_files: s.table({
    file_key: s.string(),
    media_type: s.string(),
    bytes: s.bytes(),
    updated_at: s.string(),
    deleted: s.boolean(),
  }, {}),
});
