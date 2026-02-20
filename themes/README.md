# Theme Library

This project now supports two visual themes:

- `mono` (default): black/gray mood
- `legacy`: original dark-green + amber mood

## Files

- `themes/theme-mono.css`
- `themes/theme-legacy.css`
- `theme-init.js`

## How Theme Is Selected

1. URL param `?theme=mono` or `?theme=legacy`
2. Saved value in `localStorage` key `dashboard-theme`
3. Fallback default: `mono`

Example:

- `index.html?theme=legacy`
- `company-detail.html?company_id=...&theme=legacy`

If no `theme` query is provided, the last selected theme is reused automatically.
