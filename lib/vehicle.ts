// Indian registration numbers: state code, RTO number, series, 4 digits (MH 12 AB 1234),
// or the Bharat series (22 BH 1234 AA). Spaces and dashes are ignored.
const STATE = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/;
const BHARAT = /^\d{2}BH\d{4}[A-Z]{1,2}$/;

export function isRcNumber(value: string): boolean {
  const v = value.toUpperCase().replace(/[\s-]/g, "");
  return STATE.test(v) || BHARAT.test(v);
}
