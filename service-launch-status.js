'use strict';
// The full source is retained while these public services await opening.
(() => {
  const closed = new Set(['errand','online-store','store-partner','store-manager','shop-owners','store-alley','store-studio','neighbor-market']);
  const service = location.pathname.split('/').filter(Boolean)[0];
  if (closed.has(service)) location.replace('/coming-soon/?service=' + encodeURIComponent(service));
})();
