import { breadcrumbsIntegration, init } from '@sentry/nextjs';

import { APP_VERSION } from './lib/app-version';
import { isKnownEngineNoise } from './lib/monitoring/known-engine-noise';
import { addInstrumentsTag } from './lib/monitoring/report';
import { scrubBreadcrumb, scrubEvent } from './lib/monitoring/scrub';

// Next.js runs this file in the browser before the page becomes interactive. It starts Sentry and
// nothing else. With no NEXT_PUBLIC_SENTRY_DSN — `pnpm dev`, unit tests, preview deployments — the
// SDK sends nothing: only Vercel's Production environment holds the DSN.
init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  release: APP_VERSION,
  // Each of these is on by default in Sentry 11. The User-Agent stays, so each issue shows its
  // browser and Sentry's crawler filter can work; the Referer is sent as [Filtered]. Neither key
  // touches the page address — scrub.ts cuts that.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { allow: ['User-Agent'] },
    urlQueryParams: false,
  },
  integrations: (defaults) => [
    ...defaults.filter(
      (integration) =>
        // Console: AlphaTab's console lines can quote a broken alphaTex line. BrowserApiErrors:
        // it wraps the engine's listeners in a frame of ours, so known-engine-noise.ts could no
        // longer match "every frame in the engine bundle". Breadcrumbs: added back below, without
        // clicks. BrowserTracing: errors only, and it adds trace headers to every same-origin
        // request.
        !['Console', 'BrowserApiErrors', 'Breadcrumbs', 'BrowserTracing'].includes(
          integration.name,
        ),
    ),
    // Navigation, fetch and xhr breadcrumbs stay. Click and key-press breadcrumbs go: they record
    // a button's label, and the track buttons are labelled with the track's name.
    breadcrumbsIntegration({ dom: false }),
    // The `instruments` tag, decided by the page at the moment an error is captured. Sentry runs
    // preprocessEvent inside captureException; beforeSend would read the page only as the report
    // leaves, which @sentry/nextjs delays under `next dev`. No test can tell the two hooks apart
    // in a production build, so this comment is what keeps the hook.
    { name: 'InstrumentsTag', preprocessEvent: addInstrumentsTag },
  ],
  beforeBreadcrumb: scrubBreadcrumb,
  beforeSend: (event) => (isKnownEngineNoise(event) ? null : scrubEvent(event)),
});
