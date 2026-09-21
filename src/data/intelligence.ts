import { load } from '../../scripts/accountability.mjs';
const projection = load();
export const changes = projection.changes;
export const versions = projection.versions;
export default projection.data;
