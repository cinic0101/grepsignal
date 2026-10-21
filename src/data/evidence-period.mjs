/** Display known evidence precision without manufacturing a missing month. */
export function formatEvidencePeriod(value) {
  if (value.length === 4 && /^(?!0000)[0-9]{4}$/.test(value)) return value;
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}
