let modalLockedScrollY=0;

function lockModalBackground(){
  if(document.body.classList.contains('modal-open'))return;
  modalLockedScrollY=window.scrollY||window.pageYOffset||0;
  document.documentElement.classList.add('modal-open');
  document.body.classList.add('modal-open');
  document.body.style.setProperty('--modal-lock-top',`-${modalLockedScrollY}px`);
}

function unlockModalBackground(){
  if(!document.body.classList.contains('modal-open'))return;
  document.documentElement.classList.remove('modal-open');
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('--modal-lock-top');
  window.scrollTo(0,modalLockedScrollY);
}

const baseOpenModal=window.openModal;
if(typeof baseOpenModal==='function'){
  window.openModal=function(html){
    lockModalBackground();
    return baseOpenModal(html);
  };
}

const baseHideModal=window.hideModal;
if(typeof baseHideModal==='function'){
  window.hideModal=function(){
    const result=baseHideModal();
    unlockModalBackground();
    return result;
  };
}

const baseCloseModal=window.closeModal;
if(typeof baseCloseModal==='function'){
  window.closeModal=function(fromPop=false){
    const result=baseCloseModal(fromPop);
    if(document.querySelector('#modal')?.hidden)unlockModalBackground();
    return result;
  };
}

// iOS/Samsung Internet에서 팝업 끝에서 스크롤할 때 뒤 화면으로 전달되는 현상 차단
let modalTouchStartY=0;
document.addEventListener('touchstart',event=>{
  if(!document.body.classList.contains('modal-open'))return;
  modalTouchStartY=event.touches?.[0]?.clientY||0;
},{passive:true});

document.addEventListener('touchmove',event=>{
  if(!document.body.classList.contains('modal-open'))return;
  const card=event.target.closest?.('.modal-card');
  if(!card){event.preventDefault();return;}
  const currentY=event.touches?.[0]?.clientY||0;
  const movingDown=currentY>modalTouchStartY;
  const atTop=card.scrollTop<=0;
  const atBottom=Math.ceil(card.scrollTop+card.clientHeight)>=card.scrollHeight;
  if((movingDown&&atTop)||(!movingDown&&atBottom))event.preventDefault();
},{passive:false});

window.addEventListener('pagehide',unlockModalBackground);