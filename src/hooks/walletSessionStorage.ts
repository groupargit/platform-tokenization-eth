
export const WALLET_AUTO_CREATE_ATTEMPTED_KEY = 'circle_wallet_auto_create_attempted';

export function getAutoCreateAttemptedKey(userId: string): string {
  return `${WALLET_AUTO_CREATE_ATTEMPTED_KEY}:${userId}`;
}
  
export function clearWalletSessionStorage(userId?: string): void {
  try {
    if (userId) {
      sessionStorage.removeItem(getAutoCreateAttemptedKey(userId));
    } else {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k?.startsWith(WALLET_AUTO_CREATE_ATTEMPTED_KEY)) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    }
  } catch (_) {}
}
