# Security Spec

## Data Invariants
1. Customers must have an `ownerId` that matches the authenticated user's UID.
2. Visits must have an `ownerId` matching the user's UID.
3. Visits can only be created as a subcollection under a customer that the user owns.
4. Inventory items must have an `ownerId` matching the authenticated user's UID.
5. All string identities and basic structures must respect size boundaries.
6. The user must be signed in to perform any operation.

## The "Dirty Dozen" Payloads

1. **Spoofed Customer Owner**: Create customer with `ownerId` set to another user's UID.
2. **Missing Customer Status**: Create customer without the required `status` field.
3. **Invalid Inventory Category**: Create inventory item with category `magic`.
4. **Huge Description Attack**: Create customer with a 2MB `notes` or `addressDetail` string.
5. **Orphaned Visit**: Create a visit under a customer ID that does not exist.
6. **Subcollection Owner Mismatch**: Create a visit under a valid customer, but the visit's `ownerId` doesn't match the customer's `ownerId` or the auth UID.
7. **Negative Quantity**: Set inventory `quantity` to -10, passing as a valid integer but skipping application-level boundary logic (handled here implicitly by type, but rules should restrict if needed. Wait, firestore rules only check `is number`).
8. **Field Injection (Shadow Update)**: Update customer adding an unapproved ghost field `isAdmin: true`.
9. **Tampering with Timestamps**: Try updating `createdAt` during an update operation or passing a string instead of a server timestamp.
10. **Type Poisoning**: Set `stages` to a string instead of a list.
11. **List Size DoS**: An array of `stages` with 5,000 elements.
12. **Blanket Read Request**: A `getDocs` request across all customers without filtering `ownerId == request.auth.uid`.

## Test Runner (firestore.rules.test.ts)
(Provided conceptually for the audit context, simulating the test environment)
