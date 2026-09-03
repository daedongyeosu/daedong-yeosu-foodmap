'use strict';

(() => {
  const OWNER_EXCLUSION_KEY = 'daedongAnalyticsOwnerExcludedV1';
  const PRODUCTION_HOSTS = new Set(['daedongmap.com', 'www.daedongmap.com']);
  const POSTHOG_TOKEN = 'phc_ARyEh4UVZyqTBpXAM8DgDUFwGJHpGvgRtoJcZKaaWQdu';
  const POSTHOG_HOST = 'https://us.i.posthog.com';
  const POSTHOG_ASSET = 'https://us-assets.i.posthog.com/static/array.js';
  const ALLOWED_PROPERTIES = new Set([
    'channel',
    'surface',
    'storeId',
    'entrySource',
    'region1',
    'region2',
    'regionSource'
  ]);
  const queuedCaptures = [];
  let ready = false;

  function ownerExcluded() {
    try { return localStorage.getItem(OWNER_EXCLUSION_KEY) === '1'; }
    catch { return false; }
  }

  function safeText(value, limit) {
    return String(value || '')
      .replace(/https?:\/\/\S+/gi, '[url]')
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
      .replace(/\b\d{7,}\b/g, '[number]')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, limit);
  }

  function sanitizeProperties(input = {}) {
    const output = {};
    for (const [key, value] of Object.entries(input)) {
      if (!ALLOWED_PROPERTIES.has(key)) continue;
      const clean = safeText(value, key === 'storeId' ? 32 : 60);
      if (clean) output[key] = clean;
    }
    return output;
  }

  function flushCaptures() {
    if (!ready || ownerExcluded()) return;
    for (const [eventName, properties] of queuedCaptures.splice(0)) {
      window.posthog.capture(eventName, properties);
    }
  }

  function capture(eventName, properties = {}) {
    if (!PRODUCTION_HOSTS.has(location.hostname) || ownerExcluded()) return;
    const safeName = safeText(eventName, 60);
    if (!/^[a-z][a-z0-9_]{0,59}$/.test(safeName)) return;
    const safeProperties = sanitizeProperties(properties);
    if (!ready) {
      queuedCaptures.push([safeName, safeProperties]);
      return;
    }
    window.posthog.capture(safeName, safeProperties);
  }

  function setOwnerExcluded(excluded) {
    if (!window.posthog) return;
    if (excluded) {
      queuedCaptures.length = 0;
      window.posthog.opt_out_capturing();
    } else {
      window.posthog.opt_in_capturing();
    }
  }

  window.daedongPostHogCapture = capture;
  window.daedongPostHogSetOwnerExcluded = setOwnerExcluded;

  if (!PRODUCTION_HOSTS.has(location.hostname)) return;

  const posthog = window.posthog = window.posthog || [];
  if (!posthog.__SV) {
    posthog._i = [];
    posthog.init = function init(token, config, name) {
      function stub(target, method) {
        target[method] = function queuedMethod() {
          target.push([method, ...arguments]);
        };
      }
      const instance = name ? (posthog[name] = []) : posthog;
      const methods = [
        'capture',
        'opt_out_capturing',
        'opt_in_capturing',
        'has_opted_out_capturing'
      ];
      for (const method of methods) stub(instance, method);
      posthog._i.push([token, config, name]);
    };
    posthog.__SV = 1;
  }

  posthog.init(POSTHOG_TOKEN, {
    api_host: POSTHOG_HOST,
    defaults: '2026-05-30',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_exceptions: false,
    person_profiles: 'never',
    disable_session_recording: true,
    disable_surveys: true,
    advanced_disable_flags: true,
    persistence: 'localStorage',
    opt_out_capturing_persistence_type: 'local_storage',
    loaded(instance) {
      ready = true;
      if (ownerExcluded()) instance.opt_out_capturing();
      flushCaptures();
    }
  });

  const loader = document.createElement('script');
  loader.async = true;
  loader.crossOrigin = 'anonymous';
  loader.src = POSTHOG_ASSET;
  loader.addEventListener('error', () => { queuedCaptures.length = 0; }, {once: true});
  document.head.append(loader);

  window.addEventListener('error', event => {
    capture('app_error', {
      surface: 'window_error',
      channel: safeText(event?.error?.name || 'Error', 40)
    });
  });
  window.addEventListener('unhandledrejection', event => {
    capture('app_error', {
      surface: 'unhandled_rejection',
      channel: safeText(event?.reason?.name || typeof event?.reason || 'unknown', 40)
    });
  });
})();
