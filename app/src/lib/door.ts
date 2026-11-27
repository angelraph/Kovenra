import type { GateInput, HumanVerifier } from "./selfgate";
import type { EventRec, Store } from "./store";

/**
 * VIP door check with Self.
 *
 * On a door-check event a ticket QR alone does not get you in. At the gate the
 * organizer's phone shows a fresh Self QR, the guest scans it with their own Self
 * app and passport, and that creates a one-time agent signed by the guest's
 * passport. Self gives the same nullifier for the same passport every time, so
 * if the new proof's nullifier equals the one stored on the ticket, the person
 * at the door is the person who bought it. Someone holding a stolen phone or a
 * screenshot of the QR cannot pass without the owner's passport.
 *
 * Kovenra never learns a name: it only compares two anonymous numbers.
 */
export type DoorResult =
  | { result: "ok"; message: string; ticketId: string }
  | { result: "used" | "invalid" | "self_failed" | "mismatch"; message: string };

export const needsDoorCheck = (e: EventRec, t: { nullifier: string }) => Boolean(e.doorCheck && e.humansOnly && t.nullifier !== "0");

export async function confirmAtDoor(
  deps: { store: Store; verifier: HumanVerifier; now?: () => number },
  e: EventRec,
  ticketId: string,
  gate: GateInput,
): Promise<DoorResult> {
  const { store } = deps;
  const t = await store.getTicket(ticketId);
  if (!t || t.eventId !== e.id) return { result: "invalid", message: "Ticket is for a different event" };
  if (t.status === "resold") return { result: "invalid", message: "This ticket was resold. The QR no longer works." };
  if (t.status === "listed") return { result: "invalid", message: "This ticket was handed back for resale." };
  if (t.status === "used") return { result: "used", message: `Already used at ${t.checkedInAt ?? "an earlier scan"}` };

  const g = await deps.verifier.check(gate, 0);
  if (!g.ok) return { result: "self_failed", message: "Self could not confirm the passport. Ask them to scan the Self QR again." };

  const at = new Date(deps.now?.() ?? Date.now()).toISOString();
  if (g.nullifier !== t.nullifier) {
    return { result: "mismatch", message: "Wrong person. This passport did not buy this ticket. Do not let them in." };
  }
  const done = await store.checkIn(t.id, at);
  if (!done) return { result: "used", message: "Already used at an earlier scan" };
  return { result: "ok", message: "Passport matches the buyer. Welcome in", ticketId: t.id };
}
