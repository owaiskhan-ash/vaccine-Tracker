/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string | null }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Any in-app navigation (including `/`) is served the precached shell, so the
// app opens with no signal.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

self.addEventListener('install', () => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

type NotificationData = { url?: string };

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification as Notification & { data?: NotificationData };
  notification.close();
  const target = notification.data?.url ?? '/?tab=today';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if ('focus' in client) {
          try {
            await client.focus();
            client.postMessage({ type: 'notification-click' });
            return;
          } catch {
            /* try the next one */
          }
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
