export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return null;
  }

  await navigator.serviceWorker.register('/push-sw.js');
  const registration = await navigator.serviceWorker.ready;

  return registration.pushManager.getSubscription();
}

export async function isCurrentPushSubscriptionActive(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const subscription = await getCurrentPushSubscription();

    if (!subscription) {
      return false;
    }

    const response = await fetch(
      `/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();

    return data.active === true;
  } catch {
    return false;
  }
}

export async function unsubscribeCurrentPush(): Promise<void> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return;
  }

  try {
    const subscription = await getCurrentPushSubscription();

    if (!subscription) {
      return;
    }

    const endpoint = subscription.endpoint;

    try {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint }),
      });
    } catch (error) {
      console.error('[push] server unsubscribe failed:', error);
    }

    try {
      await subscription.unsubscribe();
    } catch (error) {
      console.error('[push] browser unsubscribe failed:', error);
    }
  } catch (error) {
    console.error('[push] unsubscribe failed:', error);
  }
}
