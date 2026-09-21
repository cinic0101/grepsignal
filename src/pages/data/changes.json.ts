import { changes } from '../../data/intelligence';
export function GET() {
  return new Response(JSON.stringify({schema_version:1,cursor_kind:'sequence',latest_sequence:changes.length,complete_history_since_migration:true,notice:'Static complete feed. Filter sequence > your stored cursor locally. recorded_at is not verified first-publication time. proposal and acceptance_receipt are normalized public projections; source_reference may point to private operational review. Legacy records predate this journal.',events:changes}),{headers:{'Content-Type':'application/json; charset=utf-8'}});
}
