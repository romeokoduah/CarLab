# Leads, Admin Roles, Analytics & Reservations — Design

**Date:** 2026-07-20
**Status:** Approved → build
**Site:** https://eclipsemotors.org

## Goals

1. Promote the existing admin to **super admin**; let them create other admins who can upload cars.
2. **Gate the WhatsApp enquiry** behind a lead-capture form; issue a customer reference `XXXX-XXXX`; returning customers just enter the reference.
3. **Log enquiries and car views** server-side; show which cars are viewed and asked about most, and how many *people* asked.
4. **Leads directory** — references, profiles and the cars each person asked about.
5. **Reservations** — admins hold a car for a reference, with an expiring hold.

## Privacy stance (standard practice, applied by default)

The owner deferred to best practice. Ghana's Data Protection Act 2012 (Act 843) applies; the following are built in:

- **Lawful basis:** explicit, **unticked** consent checkbox with a specific purpose ("contact me about this vehicle"). Consent flag + timestamp stored.
- **Data minimisation:** only name, phone, email. Nothing else.
- **No IP addresses.** View/enquiry analytics use an anonymous random `session_key` generated in the browser — never an IP, never a fingerprint.
- **No public exposure of personal data.** `GET /api/leads/lookup` returns only `{ valid, firstName }` so a reference can be confirmed without allowing enumeration/harvesting of the customer list. All full profiles sit behind admin auth.
- **Right to erasure:** admins can delete a lead; enquiries/reservations cascade.
- **Transparency:** `/privacy` page — what is collected, why, how long, who to contact, how to request deletion.
- **Retention:** stated as 24 months from last activity; deletion is admin-initiated (no silent auto-purge).
- **Security:** personal data reachable only over HTTPS behind the existing server-side admin session; passwords bcrypt-hashed.
- **Note:** backups (local + Google Drive) now contain personal data — flagged to the owner.

Not legal advice; registration with the Data Protection Commission is the owner's call.

## Data model

`admin_users` gains `role` (`super_admin`|`admin`, default `admin`), `name`, `active` (bool).

```
leads(id, reference UNIQUE, full_name, phone, email, consent, consent_at,
      created_at, last_seen_at)
enquiries(id, lead_id→leads CASCADE, car_id→cars SET NULL, channel, created_at)
events(id, car_id→cars CASCADE, type 'view'|'enquiry', session_key, created_at)
reservations(id, car_id→cars CASCADE, lead_id→leads CASCADE, admin_email,
      note, status 'active'|'released'|'completed', created_at, expires_at)
```

### Reference format

`XXXX-XXXX`, alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no `0/O/1/I/L` — customers read these aloud). Uniqueness checked on insert with retry. Lookup is forgiving: uppercased, whitespace stripped, dash auto-inserted.

## Customer flow

1. Tap **Enquire on WhatsApp**.
2. Browser holds a saved reference → log enquiry → open WhatsApp. Done.
3. Otherwise a dialog offers:
   - **First time:** name, phone, email, consent → create lead → show reference prominently → save to browser → open WhatsApp.
   - **Returning:** enter reference → validated → saved → open WhatsApp.
4. The reference is injected into the WhatsApp message (`Ref: A7K2-9QMX`) so it lives in the customer's chat history and the dealer sees who is messaging.

## Analytics

- Views logged client-side on car detail (bots don't run JS), de-duplicated per `session_key` per car per day.
- Metrics: **views**, **total enquiries**, and **unique people** (distinct `lead_id`) per car; 7/30-day windows; top lists.
- Replaces the old localStorage-only analytics panel (historic browser data is discarded; server stats start now).

## Permissions

| Capability | super_admin | admin |
|---|---|---|
| Cars, discounts | ✓ | ✓ |
| Leads (view/delete) | ✓ | ✓ |
| Reservations | ✓ | ✓ |
| Analytics | ✓ | ✓ |
| Change own password | ✓ | ✓ |
| Manage admins | ✓ | ✗ |
| Duty rates, site settings | ✓ | ✗ |

Role is carried in the session JWT for cheap checks and **re-verified against the database** on admin-management routes (so a demoted admin can't act on a stale token).

## Pages

- Public: enquiry dialog (in `WhatsAppButton`), `/privacy`.
- Admin tabs: **Leads**, **Analytics** (server-backed), **Reservations**, **Admins** (super admin only), plus password change in Settings.

## Reservations

Admin picks a car + reference + hold period (default **3 days**) + note → creates reservation and sets `car.status = 'Reserved'`. Expiry does **not** silently release the car; expired holds are flagged in the admin for action. Releasing sets the car back to `Available`.

## Build order

**A** roles + admin management → **B** leads + gate + enquiry logging + `/privacy` → **C** analytics → **D** reservations → deploy.

## Out of scope (YAGNI)

- Email/SMS delivery of references (the WhatsApp message carries it).
- Customer-facing self-service portal.
- Automatic data purging.

## Risks

- Gating the primary conversion action will reduce raw enquiry volume; mitigated by one-time-per-browser capture.
- Owner becomes a data controller; consent + notice cover the basics, registration is theirs to confirm.
