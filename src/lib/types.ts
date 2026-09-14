export type Page<T> = { items: T[]; next_cursor: string | null };

export type LayerMode = "managed" | "external";

export type AdminLayer = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  mode: LayerMode;
  geometry_types: string[];
  enabled: boolean;
  style: Record<string, unknown>;
  metadata_: Record<string, unknown>;
  revision: number;
  data_updated_at: string | null;
  feature_count: number;
  created_at: string;
  updated_at: string;
};

export type Provenance = {
  id: string;
  source_type: string;
  source_name: string | null;
  source_url: string | null;
  source_record_id: string | null;
  import_id: string | null;
  created_by: string;
  confidence: string | null;
  observed_at: string | null;
  imported_at: string;
  verified_at: string | null;
  metadata_: Record<string, unknown>;
};

export type FeatureStatus = "draft" | "published" | "stale" | "archived";

export type PointGeometry = { type: "Point"; coordinates: [number, number] };

export type AdminFeature = {
  id: string;
  layer_id: string;
  external_id: string | null;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
  status: FeatureStatus;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  archived_at: string | null;
  provenance: Provenance[];
};

export type FeatureWrite = {
  geometry: PointGeometry;
  properties: Record<string, unknown>;
  external_id?: string | null;
  status?: FeatureStatus;
  verified_at?: string | null;
  source_type?: "manual" | "import" | "agent" | "external";
  source_name?: string | null;
  source_url?: string | null;
  source_record_id?: string | null;
};

export type LayerCreate = {
  slug: string;
  name: string;
  description?: string | null;
  category: string;
  mode: "managed";
  geometry_types: string[];
  enabled: boolean;
  style: Record<string, unknown>;
  metadata_: Record<string, unknown>;
};

export type LayerUpdate = Partial<
  Pick<AdminLayer, "name" | "description" | "category" | "enabled" | "style" | "metadata_">
>;

export function isManaged(layer: Pick<AdminLayer, "mode">): boolean {
  return layer.mode === "managed";
}

export type ImportState = "validated" | "committed" | "cancelled";
export type ImportRowState = "invalid" | "candidate" | "valid";

export type ApprovalState =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "stale"
  | "executed"
  | "failed";

export type ImportApproval = {
  id: string;
  import_id: string;
  layer_id: string;
  layer_name: string;
  layer_slug: string;
  filename: string;
  format: string;
  source_name: string | null;
  source_url: string | null;
  mapping_version: string;
  requested_status: "draft" | "published";
  requester: string;
  requested_at: string;
  state: ApprovalState;
  approver: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  expires_at: string;
  executor: string | null;
  executed_at: string | null;
  failure_reason: string | null;
  fingerprint: string;
  row_count: number;
  valid_count: number;
  invalid_count: number;
  candidate_count: number;
  resolved_candidate_count: number;
  unresolved_candidate_count: number;
};

export type ImportBase = {
  id: string;
  layer_id: string;
  filename: string;
  format: "geojson" | "csv";
  status: ImportState;
  row_count: number;
  valid_count: number;
  invalid_count: number;
  candidate_count: number;
  created_at: string;
  committed_at: string | null;
  cancelled_at: string | null;
  source_name: string | null;
  source_url: string | null;
};

export type AdminImport = ImportBase & {
  resolved_candidate_count: number;
  unresolved_candidate_count: number;
  csv_mapping: Record<string, unknown>;
  csv_headers: string[];
  mapping_version: string;
};

export type ImportSummary = ImportBase & {
  csv_mapping: Record<string, unknown>;
  csv_headers: string[];
  mapping_version: string;
};

export type CandidateReason = {
  type: string;
  value?: unknown;
  property?: string;
  distance_m?: number;
  threshold_m?: number;
};

export type CandidateMatch = {
  feature_id: string;
  reasons: CandidateReason[];
  summary: {
    external_id?: string | null;
    status?: string;
    coordinates?: [number, number];
    label?: string;
  };
};

export type AdminImportRow = {
  row_number: number;
  external_id: string | null;
  geometry: { type: string; coordinates: unknown } | null;
  properties: Record<string, unknown>;
  validation_error: string | null;
  candidate_feature_ids: string[];
  candidate_matches: CandidateMatch[];
  resolution: "skip" | "import_anyway" | null;
  resolved_at: string | null;
};

export type CsvPropertyType = "string" | "number" | "integer" | "boolean" | "json";

export type CsvPropertyMapping =
  | string
  | { column: string; type?: CsvPropertyType };

export type CsvMapping = {
  longitude: string;
  latitude: string;
  external_id: string | null;
  properties: Record<string, CsvPropertyMapping>;
};

export type SourceStatus = "never" | "success" | "failed";

export type AdminSource = {
  id: string;
  layer_id: string;
  slug: string;
  adapter: string;
  dataset_id: string;
  endpoint: string | null;
  enabled: boolean;
  status: SourceStatus;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
};

export type SourceSyncResult = {
  id: string;
  layer_id: string;
  slug: string;
  adapter: string;
  dataset_id: string;
  status: SourceStatus;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
};
