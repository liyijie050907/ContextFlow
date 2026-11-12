// Only the short dictionary-free lookup uses low reasoning. Generation is unchanged.
export function quickLookupOptions(model){return /^gpt-6(?:\.1)?-(?:sol|terra|astra|luna)(?:-\d{4}-\d{2}-\d{2})?$/.test(model)?{reasoning:{effort:'low'}}:{};}
