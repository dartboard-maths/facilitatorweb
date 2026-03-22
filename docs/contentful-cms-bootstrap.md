# Contentful CMS Bootstrap

This project includes a repeatable bootstrap script for Contentful schema patching and content seeding.

## Required env vars

- `CONTENTFUL_SPACE_ID`
- `CONTENTFUL_ACCESS_TOKEN` (delivery API, used by the app at runtime)
- `CONTENTFUL_ENVIRONMENT_ID` (defaults to `master`)
- `CONTENTFUL_CLI_MANAGEMENT_TOKEN` (management API, used by bootstrap script)

## Commands

Run from `tutor_marketplace/`:

- `npm run contentful:bootstrap` : patch schema + seed entries
- `npm run contentful:bootstrap:dry-run` : print intended mutations without writing
- `npm run contentful:bootstrap:schema` : patch schema only
- `npm run contentful:bootstrap:seed` : seed entries only

## What gets patched

- `page` content type gains: `metaTitle`, `metaDescription`, `metaKeywords`
- `subcomponentLink` gains: `linkedPage` (Entry reference to `page`)
- `globalSettings` content type is created (if missing), with `key`, `header`, `footer`

## What gets seeded

- Page slugs: `home`, `about`, `how-it-works`, `for-schools`, `for-tutors`, `contact`, `faq`, `privacy-policy`, `terms`
- Shared header/footer/menu entries and linked internal navigation
- Component entries for homepage + brochure pages
- Singleton global settings entry: `tm-global-settings-default` (`key=default`)

The script is idempotent and uses deterministic IDs (prefixed with `tm-`).
