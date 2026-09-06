/**
 * Account-level server calls that can't be made from the client SDK.
 *
 * Split out of the old `billing.ts` when the app dropped its purchase path
 * (#173). Deletion belongs here rather than there because it isn't a purchase:
 * it deletes the Appwrite Auth user and every user-keyed row, and cancels any
 * live subscription as a side effect — none of which the client SDK can do,
 * which is why it goes through n8n (`CLAUDE_account_delete`).
 */
import { createLogger } from './logger';

const log = createLogger('account');

/** Base URL of the n8n account webhooks, e.g. https://n8n.piggnify.com/webhook. */
const N8N_ACCOUNT_URL = process.env.EXPO_PUBLIC_N8N_ACCOUNT_URL ?? '';
const ACCOUNT_DELETE_PATH = process.env.EXPO_PUBLIC_N8N_ACCOUNT_DELETE_PATH ?? 'account-delete';

export function accountEndpointConfigured(): boolean {
  return N8N_ACCOUNT_URL.length > 0;
}

/**
 * Ask n8n to permanently delete the Appwrite account (and cancel any active
 * subscription). Returns false on any failure so the caller does NOT wipe local
 * state unless the server deletion is confirmed.
 */
export async function requestAccountDeletion(userId: string): Promise<boolean> {
  if (!accountEndpointConfigured()) return false;
  try {
    const res = await fetch(`${N8N_ACCOUNT_URL.replace(/\/$/, '')}/${ACCOUNT_DELETE_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      throw new Error(`Account deletion failed (${res.status})`);
    }
    return true;
  } catch (err) {
    log.warn('requestAccountDeletion failed:', err);
    return false;
  }
}
