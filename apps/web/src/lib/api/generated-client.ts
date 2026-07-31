/**
 * Generated from packages/contracts/openapi.json. Do not edit by hand.
 */
export const operations = {
  "create_invitation_v1_admin_invitations_post": { method: "POST", path: "/v1/admin/invitations" },
  "provider_conformance_v1_admin_provider_conformance_post": { method: "POST", path: "/v1/admin/provider/conformance" },
  "request_auth_code_v1_auth_code_post": { method: "POST", path: "/v1/auth/code" },
  "verify_auth_code_v1_auth_code_verify_post": { method: "POST", path: "/v1/auth/code/verify" },
  "bootstrap_v1_bootstrap_get": { method: "GET", path: "/v1/bootstrap" },
  "record_consents_v1_consents_post": { method: "POST", path: "/v1/consents" },
  "health_v1_health_get": { method: "GET", path: "/v1/health" },
  "claim_invite_v1_invites_claim_post": { method: "POST", path: "/v1/invites/claim" },
  "list_missions_v1_missions_get": { method: "GET", path: "/v1/missions" },
  "get_mission_v1_missions__slug__get": { method: "GET", path: "/v1/missions/{slug}" },
  "request_deletion_v1_privacy_deletion_post": { method: "POST", path: "/v1/privacy/deletion" },
  "request_export_v1_privacy_exports_post": { method: "POST", path: "/v1/privacy/exports" },
  "update_profile_v1_profile_put": { method: "PUT", path: "/v1/profile" },
  "get_progress_v1_progress_get": { method: "GET", path: "/v1/progress" },
  "create_session_v1_sessions_post": { method: "POST", path: "/v1/sessions" },
  "update_caption_assistance_v1_sessions__session_id__caption_assistance_put": { method: "PUT", path: "/v1/sessions/{session_id}/caption-assistance" },
  "complete_session_v1_sessions__session_id__complete_post": { method: "POST", path: "/v1/sessions/{session_id}/complete" },
  "get_evaluation_v1_sessions__session_id__evaluation_get": { method: "GET", path: "/v1/sessions/{session_id}/evaluation" },
  "exchange_realtime_offer_v1_sessions__session_id__realtime_offers_post": { method: "POST", path: "/v1/sessions/{session_id}/realtime/offers" },
  "record_repair_v1_sessions__session_id__repairs_post": { method: "POST", path: "/v1/sessions/{session_id}/repairs" },
  "record_turn_v1_sessions__session_id__turns_post": { method: "POST", path: "/v1/sessions/{session_id}/turns" },
  "join_waitlist_v1_waitlist_post": { method: "POST", path: "/v1/waitlist" },
} as const;

export type OperationId = keyof typeof operations;
export type OperationDefinition = (typeof operations)[OperationId];
