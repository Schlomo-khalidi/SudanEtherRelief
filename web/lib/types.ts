export type EventRow = {
  id: string;
  slug: string;
  headline: string;
  location_label: string | null;
  happened_at: string | null;
  status: "draft" | "in_review" | "approved" | "paused" | "archived";
  explainer_what: string | null;
  explainer_why: string | null;
  donation_ask: string | null;
  ethar_copy_locked: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type SourceRow = {
  id: string;
  event_id: string;
  outlet: string;
  title: string;
  url: string;
  quote: string | null;
  published_at: string | null;
  is_field_report: boolean;
  fetched_at: string;
};

export type Claim = { text: string; sourceIds: string[] };

export type StoryPackRow = {
  id: string;
  event_id: string;
  version: number;
  language: string;
  headline: string;
  claims: Claim[];
  ai_confidence: number | null;
  status: "draft" | "current" | "superseded";
  created_at: string;
};

export type DecisionRow = {
  id: string;
  event_id: string;
  story_pack_id: string | null;
  actor: string;
  action: "auto_draft" | "request_edit" | "revise" | "approve" | "pause" | "reject" | "note";
  note: string | null;
  created_at: string;
};

export type ShareLinkRow = {
  id: string;
  code: string;
  event_id: string;
  lane_id: string;
  relayer_id: string;
  channel: string;
  created_at: string;
};

/** row of the `event_chain` view (see supabase/migrations/0001_init.sql) */
export type EventChainRow = {
  event_id: string;
  slug: string;
  lanes_count: number;
  relayers_count: number;
  views: number;
  clicks: number;
  confirmed_amount: number;
  confirmed_count: number;
  pending_count: number;
};

/** row of the `event_lane_chain` view */
export type LaneChainRow = {
  event_id: string;
  lane_id: string;
  lane_name: string;
  relayers_count: number;
  views: number;
  clicks: number;
  confirmed_amount: number;
};
