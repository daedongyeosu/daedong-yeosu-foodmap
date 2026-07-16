(() => {
  const baseRouteKey = routeKey;
  routeKey = function routeKeyWithOndongne(name = '') {
    const value = String(name ?? '').toLowerCase().replace(/\s+/g, '');
    if (value.includes('온동네')) return 'ondongne';
    return baseRouteKey(name);
  };

  APP_META.ondongne = {label: '온동네', icon: 'assets/ondongne.png'};
  if (!APP_ICON_ORDER.includes('ondongne')) {
    const index = APP_ICON_ORDER.indexOf('brand');
    APP_ICON_ORDER.splice(index >= 0 ? index + 1 : 1, 0, 'ondongne');
  }

  const baseAdapt = adapt;
  adapt = function adaptWithRouteControls(raw, index) {
    const store = baseAdapt(raw, index);
    const suspended = new Set((raw.suspendedRoutes || []).map(String));
    for (const key of suspended) delete store.links[key];
    store.suspendedRoutes = [...suspended];
    store.visibility = raw.visibility || 'visible';
    store.feedbackStatus = raw.feedbackStatus || '';
    return store;
  };
})();
