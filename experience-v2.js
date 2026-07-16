(() => {
  const FAVORITE_KEY = 'daedongFavoriteStoresV2';
  const RECENT_KEY = 'daedongRecentStoresV2';
  const FEEDBACK_QUEUE_KEY = 'daedongFeedbackQueueV1';
  const VISITOR_KEY = 'daedongVisitorKeyV1';
  const FEEDBACK_FORM_URL = 'https://www.notion.so/8ae3728176e344fdaee3475a97d03740';

  const clean = value => String(value ?? '').trim();
  const escapeHtml = value => clean(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const readJson = (key, fallback = []) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  function visitorKey() {
    let key = localStorage.getItem(VISITOR_KEY);
    if (!key) {
      key = globalThis.crypto?.randomUUID?.() || `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VISITOR_KEY, key);
    }
    return key;
  }

  function byId(id) {
    return (Array.isArray(stores) ? stores : []).find(store => String(store.id) === String(id));
  }

  function favoriteIds() {
    return readJson(FAVORITE_KEY).map(String);
  }

  function isFavorite(id) {
    return favoriteIds().includes(String(id));
  }

  function toggleFavorite(id) {
    const value = String(id);
    const current = favoriteIds();
    const next = current.includes(value) ? current.filter(item => item !== value) : [value, ...current].slice(0, 100);
    writeJson(FAVORITE_KEY, next);
    document.querySelectorAll(`[data-favorite-store="${CSS.escape(value)}"]`).forEach(button => {
      const active = next.includes(value);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      const label = button.querySelector('span');
      if (label) label.textContent = active ? '찜 해제' : '찜하기';
    });
  }

  function addRecent(store) {
    if (!store) return;
    const current = readJson(RECENT_KEY);
    const next = [{storeId: String(store.id), storeName: store.name, visitedAt: new Date().toISOString()}, ...current.filter(item => String(item.storeId) !== String(store.id))].slice(0, 50);
    writeJson(RECENT_KEY, next);
  }

  function utilityButtons(store) {
    const favorite = isFavorite(store.id);
    return `<div class="store-card-tools">
      <button type="button" class="store-card-tool favorite-tool ${favorite ? 'active' : ''}" data-favorite-store="${escapeHtml(store.id)}" aria-pressed="${favorite}">♥ <span>${favorite ? '찜 해제' : '찜하기'}</span></button>
      <button type="button" class="store-card-tool feedback-tool" data-feedback-store="${escapeHtml(store.id)}">정보 수정 요청</button>
    </div>`;
  }

  const baseStoreCard = storeCard;
  storeCard = function storeCardWithTools(store, index = 0) {
    const html = baseStoreCard(store, index);
    return html.replace('</article>', `${utilityButtons(store)}</article>`);
  };

  const baseDetail = detail;
  detail = function detailWithPersonalActions(store) {
    addRecent(store);
    baseDetail(store);
    setTimeout(() => {
      const modal = document.querySelector('#modalContent');
      if (!modal || modal.querySelector('.detail-personal-actions')) return;
      const favorite = isFavorite(store.id);
      modal.insertAdjacentHTML('beforeend', `<div class="detail-personal-actions">
        <button type="button" data-favorite-store="${escapeHtml(store.id)}" class="detail-personal-btn ${favorite ? 'active' : ''}" aria-pressed="${favorite}">♥ <span>${favorite ? '찜 해제' : '찜하기'}</span></button>
        <button type="button" data-feedback-store="${escapeHtml(store.id)}" class="detail-personal-btn">정보 수정 요청</button>
      </div>`);
    }, 0);
  };

  function personalList(title, ids, emptyText) {
    const list = ids.map(byId).filter(Boolean);
    const content = list.length ? list.map(store => {
      const photo = window.DaedongPhotoDisplay?.attributes(store, 'card') || {src: store.img || store.image || 'assets/store1.jpg'};
      return `<button type="button" class="personal-store-row" data-personal-store="${escapeHtml(store.id)}"><img src="${escapeHtml(photo.src)}" alt="" loading="lazy"><span><b>${escapeHtml(store.name)}</b><small>${escapeHtml(store.area)} · ${escapeHtml(store.cat)}</small></span><i>›</i></button>`;
    }).join('') : `<p class="personal-empty">${escapeHtml(emptyText)}</p>`;
    openModal(`<section class="personal-list-sheet"><h2>${escapeHtml(title)}</h2>${content}</section>`);
  }

  function openFavorites() {
    personalList('찜한 가게', favoriteIds(), '아직 찜한 가게가 없습니다.');
  }

  function openRecent() {
    const ids = readJson(RECENT_KEY).map(item => String(item.storeId));
    personalList('최근 방문 가게', ids, '아직 방문한 가게가 없습니다.');
  }

  function feedbackModal(store) {
    const appOptions = ['해당 없음','먹깨비','땡겨요','온동네','배달의민족','쿠팡이츠','요기요','가게바로주문','전화주문'];
    openModal(`<section class="feedback-sheet" data-store-id="${escapeHtml(store.id)}">
      <h2>정보 수정 요청</h2>
      <p><b>${escapeHtml(store.name)}</b>의 잘못된 정보를 알려주세요. 접수 내용은 다른 고객에게 공개되지 않습니다.</p>
      <form id="storeFeedbackForm">
        <label>무엇이 잘못됐나요?<select name="issueType" required><option value="">선택하세요</option><option>사진 오류</option><option>전화번호 오류</option><option>주문앱에서 가게 없음</option><option>폐업·휴업 의심</option><option>주소·위치 오류</option><option>기타</option></select></label>
        <label>관련 주문앱<select name="app">${appOptions.map(item => `<option>${item}</option>`).join('')}</select></label>
        <label>상세 내용<textarea name="details" rows="4" maxlength="500" placeholder="예: 먹깨비에서 검색해도 이 가게가 나오지 않습니다."></textarea></label>
        <button type="submit" class="feedback-submit">비공개로 접수하기</button>
      </form>
      <small>한 번의 신고만으로 가게 전체를 숨기지 않습니다. 링크 오류가 실제로 확인되면 해당 주문경로만 임시 보류하고, 전화번호·사진은 관리자 확인 후 수정합니다.</small>
    </section>`);
  }

  async function submitFeedback(form) {
    const sheet = form.closest('.feedback-sheet');
    const store = byId(sheet?.dataset.storeId);
    if (!store) return;
    const data = new FormData(form);
    const report = {
      reportId: globalThis.crypto?.randomUUID?.() || `report-${Date.now()}`,
      storeId: String(store.id),
      storeName: store.name,
      issueType: clean(data.get('issueType')),
      app: clean(data.get('app')) || '해당 없음',
      details: clean(data.get('details')),
      reporterKey: visitorKey(),
      pageUrl: location.href,
      createdAt: new Date().toISOString(),
      status: '접수 대기'
    };
    const queue = [report, ...readJson(FEEDBACK_QUEUE_KEY)].slice(0, 100);
    writeJson(FEEDBACK_QUEUE_KEY, queue);
    const text = [`요청 제목: ${report.storeName} 정보 수정 요청`,`가게 ID: ${report.storeId}`,`가게명: ${report.storeName}`,`요청 유형: ${report.issueType}`,`주문앱: ${report.app}`,`상세 내용: ${report.details || '없음'}`,`신고자 식별키: ${report.reporterKey}`,`페이지 URL: ${report.pageUrl}`].join('\n');
    try { await navigator.clipboard?.writeText(text); } catch {}
    openModal(`<section class="feedback-complete"><h2>접수 내용을 준비했습니다</h2><p>정보는 공개 댓글로 남지 않습니다. 아래 버튼을 눌러 비공개 접수폼에 붙여넣어 주세요.</p><a href="${FEEDBACK_FORM_URL}" target="_blank" rel="noopener">비공개 접수폼 열기</a><button type="button" data-feedback-copy="${escapeHtml(report.reportId)}">접수 내용 다시 복사</button><small>공개 홈페이지에서는 접수폼을 익명 공개 링크로 연결하면 이 단계가 바로 자동 접수로 전환됩니다.</small></section>`);
  }

  function copyQueuedReport(reportId) {
    const report = readJson(FEEDBACK_QUEUE_KEY).find(item => item.reportId === reportId);
    if (!report) return;
    const text = [`요청 제목: ${report.storeName} 정보 수정 요청`,`가게 ID: ${report.storeId}`,`가게명: ${report.storeName}`,`요청 유형: ${report.issueType}`,`주문앱: ${report.app}`,`상세 내용: ${report.details || '없음'}`,`신고자 식별키: ${report.reporterKey}`,`페이지 URL: ${report.pageUrl}`].join('\n');
    navigator.clipboard?.writeText(text);
  }

  function showLocationOnboarding() {
    const secure = window.isSecureContext || ['localhost','127.0.0.1'].includes(location.hostname);
    openModal(`<section class="location-onboarding"><span>📍</span><h2>배달받을 위치를 설정해 주세요</h2><p>현재 위치를 허용하면 가까운 가게와 주문 가능한 가게를 먼저 보여드립니다. 정확한 배달주소도 함께 입력할 수 있습니다.</p><button type="button" data-location-current ${secure ? '' : 'disabled'}>현재 위치 허용하기</button><button type="button" data-location-manual>주소 직접 입력하기</button>${secure ? '' : '<small>지금 접속한 192.168.x.x 개발주소는 보안 연결이 아니어서 휴대전화 브라우저가 위치 권한을 차단합니다. 공개 HTTPS 홈페이지에서는 정상적으로 위치 허용창이 나타납니다.</small>'}</section>`);
  }

  if (typeof openAddressSetup === 'function') {
    const baseOpenAddressSetup = openAddressSetup;
    let bypassOnboarding = false;
    openAddressSetup = function openAddressWithChoice() {
      const saved = typeof getSavedAddress === 'function' ? getSavedAddress() : null;
      if (!saved && !bypassOnboarding) {
        showLocationOnboarding();
        return;
      }
      baseOpenAddressSetup();
    };
    window.DaedongOpenManualAddress = () => {
      bypassOnboarding = true;
      closeModal();
      setTimeout(baseOpenAddressSetup, 60);
    };
  }

  document.addEventListener('click', event => {
    const favorite = event.target.closest('[data-favorite-store]');
    if (favorite) {
      event.preventDefault(); event.stopPropagation();
      toggleFavorite(favorite.dataset.favoriteStore);
      return;
    }
    const feedback = event.target.closest('[data-feedback-store]');
    if (feedback) {
      event.preventDefault(); event.stopPropagation();
      const store = byId(feedback.dataset.feedbackStore);
      if (store) feedbackModal(store);
      return;
    }
    const personal = event.target.closest('[data-personal-store]');
    if (personal) {
      const store = byId(personal.dataset.personalStore);
      if (store) detail(store);
      return;
    }
    if (event.target.closest('#topFavoriteBtn')) { openFavorites(); return; }
    if (event.target.closest('#topRecentBtn')) { openRecent(); return; }
    if (event.target.closest('[data-location-current]')) {
      closeModal();
      setTimeout(() => typeof useCurrentLocation === 'function' && useCurrentLocation(), 80);
      return;
    }
    if (event.target.closest('[data-location-manual]')) {
      window.DaedongOpenManualAddress?.();
      return;
    }
    const copy = event.target.closest('[data-feedback-copy]');
    if (copy) copyQueuedReport(copy.dataset.feedbackCopy);

    const nav = event.target.closest('.bottom-nav [data-tab]');
    if (nav) {
      document.querySelectorAll('.bottom-nav button').forEach(button => button.classList.toggle('active', button === nav));
      if (nav.dataset.tab === 'home') scrollTo({top: 0, behavior: 'smooth'});
      if (nav.dataset.tab === 'category') document.querySelector('.category-section')?.scrollIntoView({behavior: 'smooth'});
      if (nav.dataset.tab === 'order') document.querySelector('.order-section')?.scrollIntoView({behavior: 'smooth'});
      if (nav.dataset.tab === 'near') {
        if (typeof gpsState !== 'undefined' && gpsState.active) renderStores({scroll: true});
        else openAddressSetup();
      }
      if (nav.dataset.tab === 'mypage') openModal(`<h2>마이페이지</h2><div class="my-list"><button id="topFavoriteBtn">찜한 가게 ${favoriteIds().length}곳</button><button id="topRecentBtn">최근 방문 가게 ${readJson(RECENT_KEY).length}곳</button><button>접수 대기 ${readJson(FEEDBACK_QUEUE_KEY).length}건</button></div>`);
    }
  }, true);

  document.addEventListener('submit', event => {
    if (event.target.id !== 'storeFeedbackForm') return;
    event.preventDefault();
    submitFeedback(event.target);
  });
})();
