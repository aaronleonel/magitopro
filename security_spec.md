# Security Specification: RPG de Mundo Abierto

This document defines the security boundaries, data invariants, and threat models for the RPG save persistence layer.

## 1. Data Invariants
- A player's progress save document can only exist at the path `/saves/{userId}` where `{userId}` matches the authenticated player's unique identifier.
- Only the authenticated owner can read, create, or update their own progress save. No other player can see or modify another player's progress save.
- All stats (HP, Mana, Level, Exp, position) must be of valid type (numbers or lists for interactions) and within reasonable boundaries.

## 2. The Dirty Dozen (Attacks and Malicious Payloads)
The following malicious requests must be rejected by Firestore Security Rules:
1. **Unauthenticated Read**: Reading any progress save without being logged in.
2. **Unauthenticated Write**: Creating or updating a save without being logged in.
3. **Cross-User Read**: User A attempting to read the save of User B.
4. **Cross-User Write**: User A attempting to modify the save of User B.
5. **Identity Spoofing**: User A creating a save at path `/saves/UserA` but setting `userId` field to `UserB`'s UID.
6. **Path Traversal / Poison ID**: Attempting to use a malicious document ID like `../other/save` as a path variable.
7. **Junk Character Document ID**: Using an ID with 1.5KB of junk characters to bloat database indexes.
8. **Invalid Stat Types**: Attempting to update `hp` to a string value (e.g. `"hundred"`).
9. **Invalid Interacted NPCs list**: Setting `interactedNPCs` to a string or number instead of an array/list.
10. **Ghost Fields Injection**: Injecting unsolicited keys like `isAdmin: true` into the document save structure.
11. **Timestamp Spoofing**: Submitting a pre-dated `updatedAt` client-side timestamp instead of checking against server timestamp (or omitting it).
12. **Status Shortcut / Terminal Lock Manipulation**: Saving illegal state structures or changing read-only identity identifiers after creation.

## 3. Test Cases (TDD Blueprint)
We ensure that:
- `get` on `/saves/{userId}` is allowed only if `request.auth.uid == userId`.
- `create` on `/saves/{userId}` is allowed only if `request.auth.uid == userId` and the schema matches.
- `update` on `/saves/{userId}` is allowed only if `request.auth.uid == userId`, the schema matches, and the `userId` is unchanged.
- `delete` is denied (progress saves are perpetual, or we can restrict it to the owner).
