(() => {
  const IMPACT_TEXT = '한 번의 주문이 여수의 가게와 일자리를 이어갑니다';
  const missingImageIds = new Set();
  const missingImageNames = new Set();
  let dataReady = false;
  let applying = false;

  function removeDuplicateImpactBlock() {
    const all = [...document.querySelectorAll('section, article, div')]
      .filter(el => (el.textContent || '').includes(IMPACT_TEXT));
    if (!all.length) return;

    const blocks = [];
    for (const el of all) {
      const block = el.closest('section, article') || el;
      if (!blocks.includes(block)) blocks.push(block);
    }
    if (blocks.length < 2) return;

    blocks.sort((a, b) => {
      const relation = a.compareDocumentPosition(b);
      return relation & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    blocks[0].remove();
  }

  function makeCardPlaceholder() {
    const holder = document.createElement('div');
    holder.className = 'photo-placeholder-card';
    holder.innerHTML = '<span>🍗</span><b>사진 준비 중</b>';
    return holder;
  }

  function makeDetailPlaceholder() {
    const holder = document.createElement('div');
    holder.className = 'detail-photo-placeholder';
    holder.innerHTML = '<span>🍗</span><b>사진 준비 중</b>';
    return holder;
  }

  function applyMissingPhotoFix(root = document) {
    if (!dataReady || applying) return;
    applying = true;
    try {
      root.querySelectorAll?.('.store-card[data-id]').forEach(card => {
        if (!missingImageIds.has(card.dataset.id)) return;
        const image = card.querySelector(':scope > img');
        if (image) image.replaceWith(makeCardPlaceholder());
      });

      const modal = document.querySelector('#modal:not([hidden]) .modal-card, .modal:not(.hidden) .modal-card');
      if (modal) {
        const name = modal.querySelector('h2')?.textContent?.trim();
        const image = modal.querySelector('.detail-photo');
        if (name && image && missingImageNames.has(name)) image.replaceWith(makeDetailPlaceholder());
      }
    } finally {
      applying = false;
    }
  }

  async function loadPhotoState() {
    try {
      const response = await fetch(`data/stores.json?v=${Date.now()}`, {cache: 'no-store'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      data.forEach(store => {
        if (!String(store.image || '').trim()) {
          missingImageIds.add(String(store.id || ''));
          missingImageNames.add(String(store.name || '').trim());
        }
      });
      dataReady = true;
      applyMissingPhotoFix();
    } catch (error) {
      console.error('사진 상태 확인 실패', error);
    }
  }

  function startObserver() {
    const observer = new MutationObserver(() => {
      removeDuplicateImpactBlock();
      applyMissingPhotoFix();
    });
    observer.observe(document.body, {childList: true, subtree: true});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      removeDuplicateImpactBlock();
      startObserver();
      loadPhotoState();
    }, {once: true});
  } else {
    removeDuplicateImpactBlock();
    startObserver();
    loadPhotoState();
  }
})();
