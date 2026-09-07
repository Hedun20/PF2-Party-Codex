# Unified session ingestion, consent, privacy, and retention contract

- **Task:** HED-26
- **Status:** target policy/contract freeze; no live audio provider, new collection, migration, worker activation, or deployment
- **Executable contracts:** `packages/contracts/src/sessionIngestion.ts`
- **Executable privacy policy:** `packages/core/src/sessionIngestionPolicy.ts`
- **Prerequisites reused:** HED-56 Integration Hub, HED-70/HED-74 Discord boundaries, HED-27 unified session lifecycle, HED-21 campaign policy, HED-19 evidence/canon retention boundary
- **Implementation follow-up:** HED-101 owns the real opt-in audio/transcript adapter and speaker-correction UI

## Frozen alpha inputs

The alpha accepts exactly five session source kinds:

1. `foundry` — normalized Foundry events accepted through the HED-56 integration boundary;
2. `discord` — events from individually opted-in campaign channels/threads and explicit `/moment` context under HED-70/HED-74;
3. `manualNote` — an explicit GM/player note entered in the application; it remains local evidence and cannot impersonate an integration connection;
4. `pastedTranscript` — text pasted/uploaded by an authenticated user who explicitly accepts the current ingestion notice;
5. `audioUpload` — an explicit authenticated audio-file upload, malware-scanned before transcription and deleted automatically after transcription according to this contract.

**Live Discord voice recording is not an alpha input.** No bot joins, records, mirrors, or passively captures a Discord voice channel. Adding live voice requires a new product/privacy review and contract version rather than treating it as another Discord event.

## Source authority and identity

Every source is bound before ingestion to one exact `workspaceId`, `campaignId`, `sessionId`, stable `sourceId`, stream, source kind and visibility class. The session policy never accepts a source-level tenant override during an event.

- Foundry, Discord, pasted-transcript and audio-upload sources require an integration connection controlled by the platform. Provider IDs remain evidence, not platform authorization.
- A manual note has `connectionId = null`; the authenticated application user is resolved separately by HED-21 and the note is written through the evidence boundary.
- Integration ordering, semantic checksum, occurrence idempotency, cursor monotonicity, edit/delete lineage and connection revocation reuse HED-56 exactly. HED-26 does not invent a second ordering or dedupe algorithm.
- Discord channel/thread opt-in, partial edits, backfill boundaries and delete reconciliation reuse HED-74. A Discord guild/channel role cannot grant a campaign role.
- HED-27 source ranges freeze the exact session processing cursors. HED-26 governs whether those sources are consented, retainable and safe to expose at all.

## Consent notice

Each session ingestion policy names one current `consentNoticeVersion`. Consent is evidence, not a checkbox inferred from activity.

| Source kind | Consent rule |
|---|---|
| Foundry | Manager explicitly grants the current notice when pairing/enabling the source. |
| Discord | Manager explicitly grants the current notice and separately opts in each captured channel/thread under HED-74. |
| Manual note | `notRequired`: creating the note is the authenticated author's explicit action; it may not claim another provider/participant's consent. |
| Pasted transcript | Uploader explicitly grants the current notice and asserts authority to provide the text. |
| Audio upload | Uploader explicitly grants the current notice before upload; the grant records accountable platform user + time. |

An `active` or `ended` source must have effective consent (`granted` or the narrowly allowed `notRequired`). Pending consent cannot ingest. Revoked consent moves the source to `revoked`/`deleted`; it cannot remain active and no new retrieval/model context may use it.

Changing the notice version does not silently reinterpret old consent. A source that requires explicit consent must accept the current version before new ingestion resumes.

## Source lifecycle and reconciliation

Source states are `configured`, `active`, `paused`, `ended`, `revoked`, `deleted`.

- `configured` may exist while consent/provider readiness is incomplete.
- `active` accepts new occurrences only under current connection + consent + HED-21/HED-56 checks.
- `paused` retains already accepted evidence but accepts no ambient capture until resumed.
- `ended` closes the session source range and establishes raw-evidence expiry.
- `revoked` rejects all new events/replays immediately and invalidates retrieval/cache eligibility.
- `deleted` records the completed deletion disposition; compact anti-reingestion lineage may remain only under the approved deletion policy.

Provider edits and deletes never rewrite previously accepted evidence in place. They append immutable revision/deletion lineage using HED-56 provider source identity/version. New retrieval resolves the current approved/revoked/deleted state and excludes superseded/deleted evidence. Derived approved canon is separately governed and is not silently erased by provider deletion.

## Retention policy

The alpha retention values are deliberately fixed, versioned product decisions:

- raw evidence: **30 days maximum after source end**;
- transcript evidence: **30 days maximum after source end** unless a later explicitly approved policy shortens it;
- successful audio transcription: raw audio is scheduled for deletion **within 24 hours** of successful transcription;
- failed/interrupted audio processing: raw audio has an absolute **168-hour (7-day)** failure deadline, after which retry requires a new upload;
- approved canon: **persists after raw-evidence expiry** until separately edited/deleted through the canon/campaign workflow.

Expiry removes the raw evidence from new retrieval/model bundles before physical cleanup completes. TTL/index creation and destructive cleanup remain operator/migration work under HED-19; a delayed cleanup job must not make expired evidence logically visible again.

Retention deadlines are monotonic. A retry may shorten a deadline but cannot silently extend it beyond the policy without a new reviewed policy version and auditable user action.

## Disconnect, deletion, and export

Disconnect and data deletion are separate operations.

**Disconnect/revoke:** connection and consent become non-ingesting first. Existing evidence follows its retention policy; approved canon remains. Cached connection/retrieval projections are invalidated.

**Delete source/evidence:** an authorized idempotent workflow marks the source non-ingesting, excludes it immediately from new retrieval, applies the current deletion policy to raw payloads, and preserves only bounded hashes/tombstones needed to prevent reingestion for the approved period. It does not autonomously delete approved canon.

**Export:** export reauthorizes the requester and exact campaign/source scope at execution time. Manager export may include policy-authorized evidence plus source IDs/timestamps; player export uses only player-safe approved projections. Credentials, request signatures, provider tokens, malware artifacts, secret manager-only evidence and cross-campaign records never enter an export.

## Audio upload boundary

`hed26-session-audio-upload-v1` is the only alpha audio input admitted to the transcription adapter.

### Limits

- allowed media types: `audio/mpeg`, `audio/mp4`, `audio/ogg`, `audio/wav`, `audio/webm`;
- maximum file size: **500 MiB**;
- maximum declared duration: **4 hours**;
- filename is a basename only; no path separators or traversal;
- lowercase SHA-256 is required before provider submission;
- consent must be recorded before upload;
- malware scan must complete **clean** after upload and before transcription.

A pending/failed/unknown malware result is not “probably safe”; the transcription request fails closed. Scanner/provider credentials and scanner diagnostics are not persisted in campaign evidence.

### Transcription provider

The transcription adapter receives only the minimum audio operation data required for transcription: scoped internal operation/source reference, audio bytes/object reference, content type, bounded language/config hints if later added, and a short-lived provider credential owned by the adapter. It receives no campaign membership list, GM secrets, unrelated evidence, canon archive, Discord token, Foundry credential or application session.

Provider output is untrusted evidence until runtime parsing succeeds. Unknown provider fields are rejected or mapped by an explicit adapter version. Raw provider JSON does not cross into player/model/cache/analytics payloads.

## Transcript and speaker correction

`hed26-session-transcript-evidence-v1` preserves ordered non-overlapping timestamped segments. Each segment has stable ID, `startMs`, `endMs`, text and optional **suggested** speaker identity/label.

Suggested speaker segmentation is evidence only. It cannot grant a platform user/character identity. A manual correction is an accountable revision with:

- corrected speaker ID;
- correcting platform user ID;
- canonical correction time.

All three correction fields are present together or absent together. Corrections do not destroy original suggested-speaker evidence. HED-101 may provide the correction UI but must preserve this lineage.

An audio-backed transcript carries the source-audio SHA-256 and its raw-audio deletion deadline. Successful transcription requires deletion no later than 24 hours after `transcribedAt`.

## Visibility and downstream data-flow policy

Raw ingestion visibility is exactly `restricted`, `managerOnly`, or `participantScoped`. There is no raw `public` value. Public/player-safe content exists only as separately approved canon/projections.

The executable HED-26 exposure policy applies before data crosses a downstream boundary:

| Data class | Allowed destinations |
|---|---|
| Raw audio | malware scanner or transcription provider only, raw projection |
| Manager-only raw/transcript evidence | manager review or authorized export only; never player/model/cache/analytics |
| Restricted/participant-scoped raw/transcript evidence | manager review/export, or model context only through a HED-28 policy-filtered evidence bundle |
| Approved public canon | approved player/model/cache/export/manager projections; analytics receives metadata-only projection |

Raw evidence is never stored in a shared response/model cache. Analytics gets allowlisted bounded metadata only, never evidence text, transcript text, speaker names, provider message bodies or raw source IDs that identify private participants unless separately privacy-reviewed.

Prompt-injection text is evidence, not instruction. HED-28 must serialize it into a data-only evidence envelope and apply exact campaign/member/character policy before retrieval and again before model context. Model output cannot change visibility, consent, retention, source state or canon status.

## Failure and retry behavior

Failures are explicit and bounded:

- consent/connection inactive: no ingestion, no cursor advance;
- sequence gap/conflict: HED-56 quarantine/retry behavior; no silent skip;
- upload validation/malware failure: no transcription call;
- transcription timeout/provider failure: retain raw audio only until the 168-hour failure deadline and expose a safe retryable status;
- transcript validation failure: do not publish transcript evidence; raw audio still follows the failure deadline;
- retention cleanup delay: evidence becomes logically expired on deadline even if bytes await cleanup;
- deletion/export retry: idempotent on exact source/workflow identity and never broadens scope;
- revoked/deleted source: all new retrieval and cache population fail closed.

Safe errors may name source kind, stable source/job ID, retry state and policy code. They never echo evidence payload, transcript content, participant secrets, credentials or raw audio metadata beyond allowlisted operational fields.

## Audit facts

Audit records are payload-light. Required facts include policy/source ID, campaign/session, source state transition, consent notice/state transition, retention/deletion/export action, actor/principal reference, provider adapter version where relevant, safe outcome code and time. No audio bytes, transcript text, Discord/Foundry message content, provider credential, signature or model prompt is an audit field.

## Acceptance mapping

- provider/source identity, ordering/dedupe: HED-56 + exact source registry;
- limits and visibility mapping: executable source/audio/exposure contracts;
- consent notice: versioned per-policy and accountable per source;
- retention/deletion/export/disconnect: frozen rules above;
- edit/delete reconciliation: immutable HED-56 occurrence/version lineage;
- statuses/retries/failures: source lifecycle + fail-closed rules;
- raw-evidence expiry / approved-canon persistence: fixed 30-day raw policy and explicit canon survival;
- audio limits/malware: 500 MiB, four hours, approved media allowlist, clean scan required;
- transcription provider boundary: minimal-data adapter boundary;
- timestamps/speaker segmentation/correction: executable transcript contract;
- automatic raw-audio deletion: 24-hour success / 168-hour failure deadlines;
- no secret evidence in player/model/cache/analytics: executable exposure policy plus HED-28 second-gate requirement.

## Out of scope

HED-26 does not:

- capture live Discord voice or join voice channels;
- upload/transcribe a real audio file or choose a transcription vendor;
- create evidence/connection/audio collections or indexes;
- run TTL cleanup, deletion, export, malware scanning or a worker;
- change current production data, merge, deploy or access a shared/production MongoDB;
- implement HED-101 speaker-correction UI, HED-28 retrieval, HED-29 generation, HED-31 canon publication or HED-98 runtime activation.
