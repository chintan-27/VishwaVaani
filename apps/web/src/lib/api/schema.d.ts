/**
 * Generated from packages/contracts/openapi.json. Do not edit by hand.
 */
export type ApiPath = "/v1/admin/invitations" | "/v1/admin/provider/conformance" | "/v1/bootstrap" | "/v1/consents" | "/v1/health" | "/v1/invites/claim" | "/v1/missions" | "/v1/missions/{slug}" | "/v1/privacy/deletion" | "/v1/privacy/exports" | "/v1/profile" | "/v1/progress" | "/v1/sessions" | "/v1/sessions/{session_id}/complete" | "/v1/sessions/{session_id}/evaluation" | "/v1/sessions/{session_id}/realtime/offers" | "/v1/sessions/{session_id}/repairs" | "/v1/sessions/{session_id}/turns" | "/v1/waitlist";

export interface ApiMethodByPath {
  "/v1/admin/invitations": "POST";
  "/v1/admin/provider/conformance": "POST";
  "/v1/bootstrap": "GET";
  "/v1/consents": "POST";
  "/v1/health": "GET";
  "/v1/invites/claim": "POST";
  "/v1/missions": "GET";
  "/v1/missions/{slug}": "GET";
  "/v1/privacy/deletion": "POST";
  "/v1/privacy/exports": "POST";
  "/v1/profile": "PUT";
  "/v1/progress": "GET";
  "/v1/sessions": "POST";
  "/v1/sessions/{session_id}/complete": "POST";
  "/v1/sessions/{session_id}/evaluation": "GET";
  "/v1/sessions/{session_id}/realtime/offers": "POST";
  "/v1/sessions/{session_id}/repairs": "POST";
  "/v1/sessions/{session_id}/turns": "POST";
  "/v1/waitlist": "POST";
}

export interface paths {
  "/v1/admin/invitations": { [method: string]: unknown };
  "/v1/admin/provider/conformance": { [method: string]: unknown };
  "/v1/bootstrap": { [method: string]: unknown };
  "/v1/consents": { [method: string]: unknown };
  "/v1/health": { [method: string]: unknown };
  "/v1/invites/claim": { [method: string]: unknown };
  "/v1/missions": { [method: string]: unknown };
  "/v1/missions/{slug}": { [method: string]: unknown };
  "/v1/privacy/deletion": { [method: string]: unknown };
  "/v1/privacy/exports": { [method: string]: unknown };
  "/v1/profile": { [method: string]: unknown };
  "/v1/progress": { [method: string]: unknown };
  "/v1/sessions": { [method: string]: unknown };
  "/v1/sessions/{session_id}/complete": { [method: string]: unknown };
  "/v1/sessions/{session_id}/evaluation": { [method: string]: unknown };
  "/v1/sessions/{session_id}/realtime/offers": { [method: string]: unknown };
  "/v1/sessions/{session_id}/repairs": { [method: string]: unknown };
  "/v1/sessions/{session_id}/turns": { [method: string]: unknown };
  "/v1/waitlist": { [method: string]: unknown };
}
