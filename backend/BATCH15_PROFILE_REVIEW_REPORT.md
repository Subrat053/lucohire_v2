# Batch 15 — Profile review Prisma conversion

Date: 2026-09-04

## Files changed

- `controllers/profileReviewController.js`
- `tests/profileReviewPrisma.test.js`
- `BATCH15_PROFILE_REVIEW_REPORT.md`

The existing profile-review route registrations in `routes/adminRoutes.js` and `routes/providerRoutes.js` required no changes.

## Completed

- Replaced all `User`, `ProviderProfile`, `RecruiterProfile`, and `PartnerProfile` compatibility-model imports and calls in `profileReviewController.js` with direct Prisma delegates.
- Converted provider/recruiter review statistics, including JSON photo/resume status filters.
- Converted multi-role profile listing, search, location/status filtering, sorting, bounded pagination, and profile attachment.
- Added partner profiles to the multi-role filtering scan.
- Converted distinct country/state/city collection without MongoDB `distinct` calls.
- Converted provider, recruiter, and partner review detail reads while retaining the existing dynamic response shape.
- Preserved `_id` aliases for user/profile data exposed by review responses.
- Converted section approve, reject, remark, activity-log, bulk-action, follow-back, response, and provider resubmission persistence.
- Photo plus review JSON updates use Prisma transactions when both the profile and related user must change.
- Review/activity timestamps stored inside JSON are serialized as ISO strings.
- Multi-role section actions now reject a section that does not belong to any role held by the target user, preventing writes to unsupported model fields.
- Email behavior remains attached to the existing explicit notification/rejection endpoints; no email or external provider was called during this batch.

## Exact Prisma schema gaps

`PartnerProfile` currently has `approvalSections` and `activityLogs`, but does not have:

- `profilePhoto`
- `profilePhotoApproval`
- `isApproved`
- `approvalAction`
- `businessName`
- `followBackRequest`
- profile location fields

Consequences:

- Partner photo content and photo approval state use the related `User.profilePhoto` and `User.profilePhotoApproval` fields. Partner review history still uses `PartnerProfile.approvalSections` and `PartnerProfile.activityLogs`.
- Partner list/detail approval indicators are derived from existing `User.approvalStatus`; no partner approval column was invented.
- Partner `businessInfo` remains represented by its approval-section JSON. There is no schema-backed business-name value to display.
- Partner and recruiter follow-back questions are preserved in `activityLogs`; only `ProviderProfile` has a dedicated `followBackRequest` JSON field.
- Location filtering cannot match partner-specific profile location data because no such fields exist. User-level country search remains available.

`RecruiterProfile` also has no `followBackRequest` field. `User` has no `isApproved` field, so provider resubmission updates only the existing `ProviderProfile.isApproved` field rather than inventing a user column.

## Deferred

- No schema columns or relational review tables were added.
- Existing JSON review structures were retained rather than normalized.
- Profile-level JSON/location search currently pre-scans the selected profile tables in application memory, then performs user pagination in PostgreSQL. This preserves flexible legacy matching but should be redesigned with normalized/indexed location and review fields if the admin dataset becomes large.
- External mail delivery behavior was not redesigned.
- Unrelated compatibility usage elsewhere in `adminRoutes.js`, provider/recruiter controllers, AI, crawler, pipeline, workers, cron, payments, and analytics was not touched.

## Remaining usage in this batch

- Compatibility-model imports in `profileReviewController.js`: **0**
- Direct Mongoose imports/usages in `profileReviewController.js`: **0**
- Mongoose document methods (`save`, `lean`, `markModified`, `countDocuments`, `findById`, `updateOne`): **0**

## Validation

- Prisma schema validation: passed with an offline placeholder URL; no database connection was made.
- Prisma Client generation: passed (`v6.19.1`).
- JavaScript syntax parse: 710 files passed.
- Tests: 47 passed, 0 failed, including 2 new profile-review conversion checks.
- Database connections, migrations, seeds, startup, external calls, and commits: none.
