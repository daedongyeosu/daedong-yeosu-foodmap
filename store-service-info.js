'use strict';

(() => {
  const DATA_URL = 'store-service-info.json';
  const HISTORY_KEY = 'daedongStoreServiceOverview';
  const WEEK_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const WEEK_FROM_SHORT = {
    Sun: 'sun',
    Mon: 'mon',
    Tue: 'tue',
    Wed: 'wed',
    Thu: 'thu',
    Fri: 'fri',
    Sat: 'sat'
  };
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  let serviceData = {programs: [], stores: {}};
  let lastFocused = null;
  let pendingStoreId = '';
  let activeFilter = 'all';

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[char]);

  function timeMinutes(value) {
    const [hour, minute] = String(value || '').split(':').map(Number);
    return Number.isFinite(hour) && Number.isFinite(minute) ? (hour * 60) + minute : NaN;
  }

  function calendarParts(date = new Date()) {
    const parts = Object.fromEntries(formatter.formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]));
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      weekday: WEEK_FROM_SHORT[parts.weekday] || 'sun',
      hour: Number(parts.hour),
      minute: Number(parts.minute)
    };
  }

  function shiftCalendar(parts, amount) {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount, 12));
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      weekday: WEEK_KEYS[date.getUTCDay()],
      hour: parts.hour,
      minute: parts.minute
    };
  }

  function closureFor(hours, parts) {
    return (hours?.closures || []).find(rule => (
      rule.type === 'monthly-weekday'
      && rule.weekday === parts.weekday
      && Number(rule.nth) === Math.ceil(parts.day / 7)
    )) || null;
  }

  function periodLabel(period) {
    const open = String(period?.open || '');
    const close = String(period?.close || '');
    const crossesMidnight = timeMinutes(close) <= timeMinutes(open);
    return `${open}–${crossesMidnight ? '다음 날 ' : ''}${close}`;
  }

  function storeStatus(info, date = new Date()) {
    if (!info?.hours?.weekly) {
      return {
        state: 'unknown',
        label: '영업시간 확인 필요',
        detail: '확인된 영업시간이 없습니다.',
        today: '영업시간 확인 필요'
      };
    }
    const now = calendarParts(date);
    const minutes = (now.hour * 60) + now.minute;
    const previous = shiftCalendar(now, -1);
    const previousPeriods = info.hours.weekly[previous.weekday] || [];
    if (!closureFor(info.hours, previous)) {
      const overnight = previousPeriods.find(period => {
        const open = timeMinutes(period.open);
        const close = timeMinutes(period.close);
        return close <= open && minutes < close;
      });
      if (overnight) {
        const todayClosure = closureFor(info.hours, now);
        return {
          state: 'open',
          label: '영업 중',
          detail: `${overnight.close}까지`,
          today: todayClosure
            ? `${overnight.close}까지 영업 · 이후 정기휴무`
            : `오늘 ${periodLabel((info.hours.weekly[now.weekday] || [])[0])}`
        };
      }
    }
    const closure = closureFor(info.hours, now);
    if (closure) {
      return {
        state: 'closed',
        label: '정기휴무',
        detail: closure.label || '오늘 휴무',
        today: `오늘 ${closure.label || '휴무'}`
      };
    }
    const todayPeriods = info.hours.weekly[now.weekday] || [];
    for (const period of todayPeriods) {
      const open = timeMinutes(period.open);
      const close = timeMinutes(period.close);
      const isOpen = close <= open
        ? minutes >= open
        : minutes >= open && minutes < close;
      if (isOpen) {
        return {
          state: 'open',
          label: '영업 중',
          detail: `${period.close}까지`,
          today: `오늘 ${periodLabel(period)}`
        };
      }
    }
    const nextToday = todayPeriods
      .map(period => ({period, minutes: timeMinutes(period.open)}))
      .filter(item => item.minutes > minutes)
      .sort((a, b) => a.minutes - b.minutes)[0];
    return {
      state: 'closed',
      label: '영업 종료',
      detail: nextToday ? `오늘 ${nextToday.period.open} 오픈` : '다음 영업시간 확인',
      today: todayPeriods.length ? `오늘 ${todayPeriods.map(periodLabel).join(', ')}` : '오늘 영업시간 없음'
    };
  }

  function storeById(id) {
    if (typeof fxStoreById === 'function') return fxStoreById(id);
    if (typeof stores !== 'undefined' && Array.isArray(stores)) {
      return stores.find(store => String(store.id) === String(id)) || null;
    }
    return null;
  }

  function paymentLabels(info) {
    const programMap = new Map((serviceData.programs || []).map(program => [program.key, program.label]));
    return (info?.payments || [])
      .filter(payment => payment.status === 'accepted')
      .map(payment => programMap.get(payment.key) || payment.key);
  }

  function verifiedLabel(info) {
    const date = String(info?.verifiedAt || '').replaceAll('-', '.');
    return [info?.sourceLabel, date ? `${date} 확인` : ''].filter(Boolean).join(' · ');
  }

  function menuMarkup(storeId) {
    const info = serviceData.stores?.[String(storeId)];
    if (!info) return '';
    const status = storeStatus(info);
    const payments = paymentLabels(info);
    return `
      <section class="store-service-menu-summary" data-store-service-menu-summary>
        <div class="store-service-menu-now">
          <span class="store-service-status is-${escapeHtml(status.state)}"><i aria-hidden="true"></i>${escapeHtml(status.label)}</span>
          <strong>${escapeHtml(status.detail)}</strong>
          <small>${escapeHtml(status.today)}</small>
        </div>
        ${payments.length ? `
          <div class="store-service-payment-badges" aria-label="확인된 사용 가능 결제수단">
            ${payments.map(label => `<span>✓ ${escapeHtml(label)}</span>`).join('')}
          </div>
        ` : ''}
        <details>
          <summary>영업시간·결제정보 자세히 보기</summary>
          <div>
            <h3>영업시간</h3>
            <ul>${(info.hours?.displayLines || []).map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
            <p><b>사용 가능 확인</b> ${payments.length ? payments.map(escapeHtml).join(' · ') : '확인된 항목 없음'}</p>
            <small>${escapeHtml(verifiedLabel(info))} · 영업시간과 사용 가능 여부는 가게 사정에 따라 달라질 수 있습니다.</small>
          </div>
        </details>
      </section>
    `;
  }

  function decorateStoreCards() {
    document.querySelectorAll('#storeGrid .store-card[data-id]').forEach(card => {
      const info = serviceData.stores?.[String(card.dataset.id)];
      if (!info || card.querySelector('[data-store-service-card-meta]')) return;
      const status = storeStatus(info);
      const payments = paymentLabels(info);
      const meta = document.createElement('div');
      meta.className = 'store-service-card-meta';
      meta.dataset.storeServiceCardMeta = '';
      meta.innerHTML = `
        <span class="store-service-status is-${escapeHtml(status.state)}"><i aria-hidden="true"></i>${escapeHtml(status.label)}</span>
        ${payments.slice(0, 2).map(label => `<span class="store-service-card-payment">✓ ${escapeHtml(label)}</span>`).join('')}
      `;
      const copy = card.querySelector('.store-info');
      const routes = copy?.querySelector('.miniapps');
      if (routes) routes.before(meta);
      else copy?.append(meta);
    });
  }

  function ensureOverviewButton() {
    if (document.querySelector('[data-store-service-overview-open]')) return;
    const head = document.querySelector('#recommendSection .section-head');
    if (!head) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'store-service-overview-button';
    button.dataset.storeServiceOverviewOpen = '';
    button.innerHTML = '<span aria-hidden="true">◷</span><b>영업·혜택 한눈에</b>';
    head.append(button);
  }

  function overviewEntries() {
    return Object.entries(serviceData.stores || {}).map(([storeId, info]) => ({
      storeId,
      info,
      store: storeById(storeId),
      status: storeStatus(info),
      payments: paymentLabels(info)
    }));
  }

  function overviewMarkup() {
    const entries = overviewEntries().filter(entry => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'open') return entry.status.state === 'open';
      return (entry.info.payments || []).some(payment => (
        payment.key === activeFilter && payment.status === 'accepted'
      ));
    });
    const filters = [
      ['all', '전체'],
      ['open', '지금 영업 중'],
      ...(serviceData.programs || []).map(program => [program.key, program.label])
    ];
    return `
      <section class="store-service-overview" role="dialog" aria-modal="true" aria-labelledby="storeServiceOverviewTitle">
        <header>
          <div>
            <span>확인된 가게 정보</span>
            <h2 id="storeServiceOverviewTitle">영업·혜택 한눈에</h2>
          </div>
          <button type="button" data-store-service-overview-close aria-label="영업·혜택 정보 닫기">×</button>
        </header>
        <p class="store-service-overview-lead">사진·가게 확인 자료가 있는 정보만 표시합니다. 표시가 없으면 ‘사용 불가’가 아니라 아직 확인되지 않은 상태입니다.</p>
        <nav aria-label="영업 및 결제혜택 필터">
          ${filters.map(([key, label]) => `
            <button type="button" data-store-service-filter="${escapeHtml(key)}" class="${key === activeFilter ? 'active' : ''}">${escapeHtml(label)}</button>
          `).join('')}
        </nav>
        <div class="store-service-overview-list">
          ${entries.length ? entries.map(entry => `
            <button type="button" class="store-service-overview-card" data-store-service-store-id="${escapeHtml(entry.storeId)}">
              <span class="store-service-overview-card-main">
                <strong>${escapeHtml(entry.store?.name || '가게 정보')}</strong>
                <small>${escapeHtml(entry.status.today)}</small>
              </span>
              <span class="store-service-status is-${escapeHtml(entry.status.state)}"><i aria-hidden="true"></i>${escapeHtml(entry.status.label)}</span>
              <span class="store-service-overview-payments">
                ${entry.payments.length ? entry.payments.map(label => `<b>✓ ${escapeHtml(label)}</b>`).join('') : '<b>확인된 혜택 없음</b>'}
              </span>
              <i aria-hidden="true">›</i>
            </button>
          `).join('') : '<p class="store-service-overview-empty">이 조건으로 확인된 가게가 아직 없습니다.</p>'}
        </div>
        <footer>
          <p>가게가 추가될 때마다 같은 기준으로 자동 정리됩니다.</p>
          <small>영업시간·사용 가능 여부는 변경될 수 있으므로 주문 전 가게에 다시 확인해 주세요.</small>
        </footer>
      </section>
    `;
  }

  function ensureOverviewOverlay() {
    let overlay = document.querySelector('[data-store-service-overview-overlay]');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'store-service-overview-overlay';
    overlay.dataset.storeServiceOverviewOverlay = '';
    overlay.hidden = true;
    document.body.append(overlay);
    return overlay;
  }

  function renderOverview() {
    const overlay = ensureOverviewOverlay();
    overlay.innerHTML = overviewMarkup();
  }

  function showOverview(trigger) {
    const overlay = ensureOverviewOverlay();
    lastFocused = trigger || document.activeElement;
    activeFilter = 'all';
    renderOverview();
    overlay.hidden = false;
    document.body.classList.add('store-service-overview-open');
    try {
      history.pushState({...history.state, [HISTORY_KEY]: true}, '', location.href);
    } catch {
      // The overlay still works when browser history is unavailable.
    }
    overlay.querySelector('[data-store-service-overview-close]')?.focus();
  }

  function hideOverview({restoreFocus = true} = {}) {
    const overlay = document.querySelector('[data-store-service-overview-overlay]');
    if (overlay) {
      overlay.hidden = true;
      overlay.innerHTML = '';
    }
    document.body.classList.remove('store-service-overview-open');
    if (restoreFocus) lastFocused?.focus?.();
    lastFocused = null;
  }

  function requestOverviewClose() {
    if (history.state?.[HISTORY_KEY]) history.back();
    else hideOverview();
  }

  function openStoreAfterOverview(storeId) {
    const store = storeById(storeId);
    if (store && typeof openStore === 'function') {
      openStore(store);
      return;
    }
    document.querySelector(`#storeGrid .store-card[data-id="${CSS.escape(storeId)}"]`)?.click();
  }

  const ready = fetch(DATA_URL, {cache: 'no-store'})
    .then(response => {
      if (!response.ok) throw new Error(`영업·혜택 정보를 불러오지 못했습니다. (${response.status})`);
      return response.json();
    })
    .then(data => {
      serviceData = data;
      ensureOverviewButton();
      decorateStoreCards();
      return data;
    })
    .catch(error => {
      console.warn(error);
      return serviceData;
    });

  window.daedongStoreServiceInfo = Object.freeze({
    ready,
    get: storeId => serviceData.stores?.[String(storeId)] || null,
    status: (storeId, date) => storeStatus(serviceData.stores?.[String(storeId)], date),
    menuMarkup
  });

  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-store-service-overview-open]');
    if (opener) {
      showOverview(opener);
      return;
    }
    if (event.target.closest('[data-store-service-overview-close]')) {
      requestOverviewClose();
      return;
    }
    const filter = event.target.closest('[data-store-service-filter]');
    if (filter) {
      activeFilter = filter.dataset.storeServiceFilter || 'all';
      renderOverview();
      return;
    }
    const storeCard = event.target.closest('[data-store-service-store-id]');
    if (storeCard) {
      pendingStoreId = storeCard.dataset.storeServiceStoreId || '';
      if (history.state?.[HISTORY_KEY]) history.back();
      else {
        hideOverview({restoreFocus: false});
        openStoreAfterOverview(pendingStoreId);
        pendingStoreId = '';
      }
    }
  });

  window.addEventListener('popstate', event => {
    const overlay = document.querySelector('[data-store-service-overview-overlay]');
    if (!overlay || overlay.hidden || event.state?.[HISTORY_KEY]) return;
    event.stopImmediatePropagation();
    hideOverview({restoreFocus: !pendingStoreId});
    if (pendingStoreId) {
      const storeId = pendingStoreId;
      pendingStoreId = '';
      window.setTimeout(() => openStoreAfterOverview(storeId), 0);
    }
  }, true);

  new MutationObserver(() => {
    ensureOverviewButton();
    decorateStoreCards();
  }).observe(document.documentElement, {childList: true, subtree: true});

  window.setInterval(() => {
    document.querySelectorAll('[data-store-service-card-meta]').forEach(node => node.remove());
    decorateStoreCards();
    const overlay = document.querySelector('[data-store-service-overview-overlay]');
    if (overlay && !overlay.hidden) renderOverview();
  }, 60000);
})();
