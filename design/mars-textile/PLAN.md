# Mars Textile visual redesign plan

This is a design proposal, based on the live Mars Textile screenshots and direct review of the uploaded Grok prototype's styles and screen components. The Grok application was not installed or run for this review. Its design source uses warm paper (#f3eee6), charcoal ink, brown accents, Newsreader/Source Sans/IBM Plex Mono typography, bordered document panels, a short numbered sidebar and a mobile dock. Borrow its visual restraint and office language; implement the agreed deep green direction in the existing Next.js application.

## Direction

Warm white (#f7f5ef), near-white panels (#fffefa), deep green (#225744), charcoal text (#242c29), readable secondary text (#626c65), thin warm-grey borders, small amber badges for pending pricing. Text must meet WCAG AA contrast (4.5:1 normal text). Use serif headings sparingly, readable sans-serif forms and tabular numbers for money and quantities. Replace the unrelated flask with an original woven-grid mark until an official logo is supplied. Use Mars Textile as the company name and preserve configured business identity rather than hardcoding another business throughout the application. Public login branding needs a deliberate installation configuration; do not leak tenant details through public database lookups.

## Current screen findings

- Dark-mode global overrides make sidebar labels, placeholders and help text very faint. Replace broad element/utility overrides with semantic theme tokens and verify both themes; default the new design to light. A selected dark preference needs a supported switch/reset.
- The owner menu is long enough to require substantial scrolling. Mills appears twice. Use six compact top-level groups: Day book; Godown & mills; Bills & recovery; Books & accounts; Evening & reports; More. Keep all existing functionality available in contextual submenus. More retains People and pins, Settings and Office file/backup.
- Active navigation needs visible text/weight and a marker; other entries must remain readable and clearly interactive.
- The stock form depends on placeholders. Use persistent field labels, clarify quantity units, and separate required receipt details from optional shade/quality/storage notes.
- Missing masters should give the owner/bookkeeper a direct setup path. A keeper gets an explanation and cannot create financial masters through a new visual shortcut. An incomplete form is disabled with a reason.
- Present Available stock and Waiting for a rate as distinct, scannable states, with useful zero-state instructions. Show actual unit beside every quantity; never sum kg/metres/thaan into one total.
- The topbar keeps the person, role and Leave the desk accessible. Clarify that shared-book connectivity is different from a confirmed live-update status; a green status must reflect a real check.

## Deliver in stages

1. Review the separate interactive preview: login, personal PIN, owner day book and godown stock. This is sample content, not a working desk or authentication system.
2. Implement shared visual tokens, typography, woven identity, accessible buttons/inputs/panels, compact role-filtered navigation and mobile layout in a separate design branch.
3. Apply the shared components to login/PIN, owner dashboard, stock receipt and pricing, followed by bills, recovery, returns/direct deals, books and evening note. Preserve all existing server permission checks, decimal calculations and session behavior.
4. Finish printable invoices/statements, reports, people/settings and office file. Correct loading, validation, errors, empty lists and pending states as part of each screen.
5. Validate desktop (1366/1440), small laptop and mobile (390), keyboard/focus, contrast, field labels, table overflow, bill printing, role navigation and real shared-screen refresh. Run production build and targeted browser checks. Publish to the Hostinger-tracked release branch only when the intended visuals have been reviewed; do not change production data for visual acceptance.

## Preview limits

index.html is an isolated visual prototype. Its navigation and screen switcher work; forms do not connect to a database or validate credentials. Sample names derive from the supplied screenshot; all figures are illustrative zero states. Role permission text is explanatory, not an implementation of access control. The live application and release branch are unchanged by this preview.
