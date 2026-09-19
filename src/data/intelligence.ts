import { load } from '../../scripts/accountability.mjs';
const projection = load();
export const changes = projection.changes;
export default projection.data;
