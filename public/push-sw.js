self.addEventListener('push', (event) => {
  let data = { title: 'Myles Portfolio', body: 'New portfolio activity.' };
  try { data = event.data ? event.data.json() : data; } catch {}
  event.waitUntil(self.registration.showNotification(data.title || 'Myles Portfolio', {
    body: data.body || 'New portfolio activity.',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'myles-portfolio-activity',
    renotify: true,
    data: { url: '/admin' },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const client of list) if ('focus' in client) return client.focus();
    return clients.openWindow(event.notification.data?.url || '/admin');
  }));
});
