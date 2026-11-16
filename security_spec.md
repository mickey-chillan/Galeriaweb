# Security Specification — Noctis Atlas

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every user document (`/users/{userId}`) and all nested subcollections (`countries`, `pins`, `references`, `photos`) belong exclusively to `userId == request.auth.uid` with `request.auth.token.email_verified == true`.
2. **Referential Integrity**: A `TravelPin` cannot be created without an existing parent `TravelCountry` under the same `userId`. A `TravelReference` or `TravelPhoto` cannot be created without an existing parent `TravelPin` under the same `userId`.
3. **Immutable Ownership & Timestamps**: `ownerId`, `id`, and `createdAt` can never be mutated after creation. `createdAt` and `updatedAt` must equal `request.time` on creation, and `updatedAt` must equal `request.time` on update.
4. **Coordinate & Payload Bounds**: `lat` must be in `[-90, 90]`, `lng` must be in `[-180, 180]`. All strings have strict `.size()` upper bounds (including `imageUrl <= 550000` bytes to prevent document bloat).

## 2. The "Dirty Dozen" Attack Payloads
1. **Cross-User Read**: User B attempts `get(/users/userA/pins/pin1)` -> `PERMISSION_DENIED`.
2. **Cross-User List**: User B attempts `list(/users/userA/countries)` -> `PERMISSION_DENIED`.
3. **Unverified Email Write**: User A with `email_verified: false` creates a `TravelPin` -> `PERMISSION_DENIED`.
4. **Identity Spoofing on Create**: User A writes `/users/userA/pins/p1` with `ownerId: "userB"` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection**: User A creates a `TravelCountry` with extra field `isAdmin: true` -> `PERMISSION_DENIED`.
6. **Oversized ID Poisoning**: User A writes `/users/userA/pins/<150-char-invalid-id>` -> `PERMISSION_DENIED`.
7. **Orphaned Pin Creation**: User A creates a `TravelPin` referencing non-existent `countryId: "ghost"` -> `PERMISSION_DENIED`.
8. **Orphaned Photo Creation**: User A creates a `TravelPhoto` referencing non-existent `pinId: "ghost"` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: User A creates a `TravelPin` with backdated `createdAt` instead of `request.time` -> `PERMISSION_DENIED`.
10. **Immutable Field Mutation**: User A updates `ownerId` or `createdAt` on an existing `TravelPin` -> `PERMISSION_DENIED`.
11. **Invalid Coordinate Injection**: User A updates `lat: 120` or `lng: -250` -> `PERMISSION_DENIED`.
12. **PII / Image Bloat Exhaustion**: User A submits an `imageUrl` string > 550,000 chars -> `PERMISSION_DENIED`.
