# Nextute Certificate Management System

Internal system for issuing and verifying internship certificates for Nextute Edtech Pvt. Ltd.

An admin enters candidate details, checks the finished certificate, and generates it. The system
mints a sequential certificate number, builds a PDF by overlaying the details onto your existing
certificate design, embeds a QR code, stores the record, and serves a public verification page that
anyone can reach by scanning the code.

Next.js 15 · TypeScript · Tailwind · PostgreSQL · Prisma · Auth.js · pdf-lib

---

## Getting it running

You need Node 20+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_APP_URL
npx prisma migrate dev --name init
```

Your certificate design is already in place at `templates/assets/internship-template.pdf`, with the
field coordinates measured and set in `templates/internship-v1.json`. See "Your template" below for
what was done to it and the one thing still outstanding — the fonts.

Then seed and start:

```bash
npm run seed
npm run dev
```

Sign in with the `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from your `.env`. Change that password
immediately; there is no public sign-up, and further accounts are created by a super admin.

### Two things to generate before going live

```bash
openssl rand -base64 32     # AUTH_SECRET
```

`NEXT_PUBLIC_APP_URL` is burned into every QR code at generation time. Set it to the real production
domain before you issue a single certificate — changing it later does **not** update certificates
already printed and handed out.

---

## Your template

The Canva export you supplied had Harsh Raj Anand's details printed on it, so it couldn't be used as
a background as-is. `scripts/build-clean-template.py` produced the blank version by deleting the
drawing operations for the candidate name, the body paragraph and the old QR image, then wiping the
Canva metadata. Everything else — the logo, both headings, the rule under the name, the signature
block, the seal and all four decorative corners — is the original artwork, untouched.

```bash
python3 scripts/build-clean-template.py <canva-export.pdf> templates/assets/internship-template.pdf
```

Run that again if the design is ever updated in Canva. It classifies text by reading it, not by
guessing at fonts, so the fixed wording it keeps is listed explicitly in `STATIC_WORDING` at the top
of the script. If you change the wording on the design, update that list to match.

Coordinates were measured off the original and are already set:

| | Position (from top-left) | Size |
|---|---|---|
| Candidate name | centred on x 417, baseline y 292 | Parisienne 85.4pt, `#2B7961` |
| Body paragraph | centred on x 417, first baseline y 333 | Lora Italic 18.6pt, black |
| Certificate number | centred on x 421, baseline y 543 | Lora 9pt, grey |
| QR code | x 649.8, y 406 | 112 × 112pt |

The certificate number is new — the original design has no place for it, so it sits in the clear
band along the bottom, well away from the corner brackets.

### The one thing still outstanding: fonts

Three font files need to go in `templates/assets/fonts/`. All three are free on Google Fonts, and all
three are the faces your design already uses:

| File | Font | Used for |
|---|---|---|
| `Parisienne-Regular.ttf` | [Parisienne](https://fonts.google.com/specimen/Parisienne) | the candidate name |
| `Lora-Italic.ttf` | [Lora](https://fonts.google.com/specimen/Lora) | the body paragraph |
| `Lora-Regular.ttf` | Lora | the certificate number |

Until they're there the system falls back to Times Italic and logs a warning on each generation. It
won't crash, but the name won't be in the script face and the paragraph won't match the design.
The fonts embedded in the Canva PDF are subsets containing only the glyphs of that one candidate's
name, so they can't be reused — the real font files are needed.

After adding them, re-render a test certificate and nudge `candidateName.y` in the config if the
name doesn't sit on the rule. Parisienne's baseline sits differently from the Times fallback, so a
point or two of adjustment is likely.

To re-measure anything, `npm run template:probe` stamps a numbered grid over the design. Re-run
`npm run seed` after any config edit to push it to the database.

See `templates/README.md` for the full field reference.

---

## How a certificate gets made

```
Fill form  →  Preview  →  Generate
                             │
   ┌─────────────────────────┴──────────────────────────┐
   │ transaction: reserve number + insert row as DRAFT  │
   └─────────────────────────┬──────────────────────────┘
                             │  (lock released here)
              render PDF → store file → mark ISSUED
```

The preview is the real template with the entered values and a PREVIEW watermark, rendered without
touching the database. Nothing is saved until the admin confirms.

The number is reserved and the row inserted in one short transaction, then the lock is released
before PDF rendering starts. If rendering fails the record stays `DRAFT` and can be rebuilt from the
detail page. A burnt number is a far cheaper failure than two certificates sharing one.

---

## Decisions worth knowing about

**The QR points to a random token, not the certificate number.** Certificate numbers are sequential
by design, so a public page keyed on them could be walked from `000001` upward to harvest every
intern's name, role and dates. The public URL uses an unguessable 160-bit token instead; the readable
number stays on the certificate and in the admin UI.

**Each certificate stores a frozen copy of the template config.** Nudge a coordinate next month and
certificates already issued still rebuild exactly as they were printed.

**Revoked certificates keep their PDF.** Copies are already in people's inboxes, so the record of
what was issued has to survive. Only its validity changes, and the verification page says so.

**Duplicates warn but never block.** Reissuing a corrected certificate is legitimate. Blocking it
just teaches people to work around the system.

**PDFs stream through an authenticated route.** Nothing sits in a public bucket, so a leaked or
guessed storage URL gets you nothing.

**Dates are stored and formatted in UTC.** Otherwise a server in a different timezone can shift a
certificate by a day.

---

## Roles

| | Super admin | Admin / HR |
|---|---|---|
| Create, view, download, search certificates | yes | yes |
| Revoke and rebuild certificates | yes | no |
| Manage templates and accounts | yes | no |
| View audit logs | yes | no |

Every check runs server-side in `src/lib/rbac.ts`. Hidden buttons are a convenience, not a control.

---

## Layout

```
prisma/schema.prisma          Database schema, including the certificate counter
src/lib/dates.ts              Ordinal formatting, cross-year ranges
src/lib/certificate-text.ts   The certificate wording, generated not typed
src/lib/certificate-number.ts Number reservation, verification tokens, filenames
src/lib/pdf/engine.ts         Overlay engine: text fitting, wrapping, QR placement
src/lib/pdf/template-config.ts Field schema and validation
src/lib/rbac.ts               Permissions
src/lib/storage.ts            Local and S3 drivers
src/server/certificates.ts    Issue, revoke, rebuild, search, verify
src/app/(admin)/              Admin pages
src/app/verify/[token]/       Public verification page
scripts/probe-template.ts     Coordinate measuring grid
```

Business logic lives in `src/server` and `src/lib`, not in components, so it can be reused by bulk
generation and email later without touching the UI.

---

## Testing before you issue anything real

Work through these, they're where the bugs hide:

- A very long candidate name (try 50+ characters) — it should shrink, not overflow the border
- A long internship role — the body paragraph should rewrap
- An internship spanning New Year — the wording must state both years
- A candidate with no title — the closing sentence should read "their work"
- Scan the QR with a phone on mobile data, not wifi, to confirm the public URL resolves externally
- Revoke a certificate, then rescan its printed QR — it must report revoked
- Sign in as an ADMIN and confirm the revoke endpoint returns 403, not just a hidden button

---

## Not built yet, deliberately

Bulk Excel upload, email delivery, WhatsApp sharing, a candidate portal and a visual template editor
are all Phase 2. The architecture leaves room for them: PDF generation, QR generation and certificate
logic are isolated modules, and the counter already handles concurrent minting, which is what bulk
generation will need first.
