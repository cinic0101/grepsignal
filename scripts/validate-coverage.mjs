import { readFile } from 'node:fs/promises';
import { validateCoverage } from './coverage-contract.mjs';
const data=JSON.parse(await readFile(new URL('../src/data/coverage.json',import.meta.url),'utf8'));
validateCoverage(data);
console.log(`coverage validation passed (${data.coverage_status})`);
