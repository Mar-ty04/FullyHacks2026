import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import { RECIPES } from './data/recipes.js';

export function getRandomOrder() {
  const recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
  return recipe.result.replace('\n', ' ');
}

export function createOrderSystem(app) {
  let yesCount = 0;
  let noCount = 0;
  let moneyAmount = 20;
  let dialogOpen = false;   // true while accepting Yes/No input
  let dialogFading = false; // true while container is fading in or out
  let selectedOption = 0;
  let onDecision = null;
  let onDismiss = null;     // fired when player closes dialog without making a decision

  // ---- Dialog fade state ----
  const FADE_FRAMES = 12; // ~0.2s at 60fps
  let fadeDir = 0;         // 1=fade-in, -1=fade-out, 0=idle
  let fadeProgress = 0;
  let onFadeOutDone = null;
  let seatModalOpen = false;
  let seatModalOnDone = null;
  let ordersPaneVisible = false;

  // Seated customers tracked for the orders pane: { npc, name, order, rowContainer }
  const seatedCustomers = [];

  // ---- HUD: top-right tally (Yes / No / Money) ----
  const hudContainer = new Container();

  const hudBg = new Graphics();
  hudBg.roundRect(0, 0, 152, 92, 8);
  hudBg.fill({ color: 0x1a1a2e, alpha: 0.78 });
  hudBg.stroke({ width: 2, color: 0x8b5e3c });
  hudContainer.addChild(hudBg);

  const hudStyle = new TextStyle({ fill: 0xffffff, fontSize: 16, fontFamily: 'monospace' });
  const yesText = new Text({ text: 'Yes: 0', style: hudStyle });
  yesText.x = 12;
  yesText.y = 10;
  const noText = new Text({ text: 'No: 0', style: hudStyle });
  noText.x = 12;
  noText.y = 36;
  const moneyText = new Text({
    text: 'Money: $20',
    style: new TextStyle({ fill: 0xffd700, fontSize: 14, fontFamily: 'monospace' }),
  });
  moneyText.x = 12;
  moneyText.y = 62;
  hudContainer.addChild(yesText);
  hudContainer.addChild(noText);
  hudContainer.addChild(moneyText);
  hudContainer.x = GAME_WIDTH - 165;
  hudContainer.y = 10;

  // ---- Customer Orders toggle button (left of HUD) ----
  const ordersButtonContainer = new Container();

  const ordersBtnBg = new Graphics();
  ordersBtnBg.roundRect(0, 0, 150, 30, 6);
  ordersBtnBg.fill({ color: 0x1a1a2e, alpha: 0.85 });
  ordersBtnBg.stroke({ width: 2, color: 0x8b5e3c });
  ordersButtonContainer.addChild(ordersBtnBg);

  const ordersBtnText = new Text({
    text: 'Customer Orders',
    style: new TextStyle({ fill: 0xffffff, fontSize: 12, fontFamily: 'monospace' }),
  });
  ordersBtnText.x = 10;
  ordersBtnText.y = 8;
  ordersButtonContainer.addChild(ordersBtnText);

  ordersButtonContainer.x = GAME_WIDTH - 320;
  ordersButtonContainer.y = 10;
  ordersButtonContainer.eventMode = 'static';
  ordersButtonContainer.cursor = 'pointer';
  ordersButtonContainer.on('pointerdown', toggleOrdersPane);

  // ---- Orders pane overlay ----
  const ordersPaneContainer = new Container();
  ordersPaneContainer.visible = false;

  const PANE_W = 400;
  const PANE_H = 360;

  const paneBg = new Graphics();
  paneBg.roundRect(0, 0, PANE_W, PANE_H, 12);
  paneBg.fill({ color: 0x1a1a2e, alpha: 0.93 });
  paneBg.stroke({ width: 2, color: 0x8b5e3c });
  ordersPaneContainer.addChild(paneBg);

  const paneHeader = new Graphics();
  paneHeader.roundRect(3, 3, PANE_W - 6, 36, 10);
  paneHeader.fill({ color: 0x8b5e3c, alpha: 0.9 });
  ordersPaneContainer.addChild(paneHeader);

  const paneTitleText = new Text({
    text: 'Customer Orders',
    style: new TextStyle({ fill: 0xfff8e7, fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  paneTitleText.x = 14;
  paneTitleText.y = 10;
  ordersPaneContainer.addChild(paneTitleText);

  const paneCloseBtn = new Graphics();
  paneCloseBtn.roundRect(0, 0, 24, 24, 5);
  paneCloseBtn.fill({ color: 0xb85a5a });
  paneCloseBtn.x = PANE_W - 32;
  paneCloseBtn.y = 8;
  ordersPaneContainer.addChild(paneCloseBtn);
  const paneCloseTxt = new Text({
    text: 'X',
    style: new TextStyle({ fill: 0xffffff, fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  paneCloseTxt.x = PANE_W - 26;
  paneCloseTxt.y = 12;
  ordersPaneContainer.addChild(paneCloseTxt);

  function closePane() { ordersPaneContainer.visible = false; ordersPaneVisible = false; }
  paneCloseBtn.eventMode = 'static'; paneCloseBtn.cursor = 'pointer';
  paneCloseBtn.on('pointerdown', closePane);
  paneCloseTxt.eventMode = 'static'; paneCloseTxt.cursor = 'pointer';
  paneCloseTxt.on('pointerdown', closePane);

  const paneListContainer = new Container();
  paneListContainer.x = 0;
  paneListContainer.y = 48;
  ordersPaneContainer.addChild(paneListContainer);

  const emptyText = new Text({
    text: 'No customers seated yet.',
    style: new TextStyle({ fill: 0x888866, fontSize: 13, fontFamily: 'monospace' }),
  });
  emptyText.x = 20;
  emptyText.y = 12;
  paneListContainer.addChild(emptyText);

  ordersPaneContainer.x = GAME_WIDTH - PANE_W - 10;
  ordersPaneContainer.y = 50;

  // ---- Seat modal (shown when clicking a seated NPC) ----
  const seatModalContainer = new Container();
  seatModalContainer.visible = false;

  const MODAL_W = 320;
  const MODAL_H = 160;

  const modalBg = new Graphics();
  modalBg.roundRect(0, 0, MODAL_W, MODAL_H, 12);
  modalBg.fill({ color: 0xfff8e7, alpha: 0.97 });
  modalBg.stroke({ width: 3, color: 0x8b5e3c });
  seatModalContainer.addChild(modalBg);

  const modalHeader = new Graphics();
  modalHeader.roundRect(3, 3, MODAL_W - 6, 36, 10);
  modalHeader.fill({ color: 0x8b5e3c, alpha: 0.9 });
  seatModalContainer.addChild(modalHeader);

  const modalTitleText = new Text({
    text: '',
    style: new TextStyle({ fill: 0xfff8e7, fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  modalTitleText.x = 14;
  modalTitleText.y = 10;
  seatModalContainer.addChild(modalTitleText);

  const modalCloseBtn = new Graphics();
  modalCloseBtn.roundRect(0, 0, 24, 24, 5);
  modalCloseBtn.fill({ color: 0xb85a5a });
  modalCloseBtn.x = MODAL_W - 32;
  modalCloseBtn.y = 8;
  seatModalContainer.addChild(modalCloseBtn);
  const modalCloseTxt = new Text({
    text: 'X',
    style: new TextStyle({ fill: 0xffffff, fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  modalCloseTxt.x = MODAL_W - 26;
  modalCloseTxt.y = 12;
  seatModalContainer.addChild(modalCloseTxt);
  modalCloseBtn.eventMode = 'static'; modalCloseBtn.cursor = 'pointer';
  modalCloseBtn.on('pointerdown', hideSeatModal);
  modalCloseTxt.eventMode = 'static'; modalCloseTxt.cursor = 'pointer';
  modalCloseTxt.on('pointerdown', hideSeatModal);

  const modalOrderText = new Text({
    text: '',
    style: new TextStyle({ fill: 0x3b2700, fontSize: 15, fontFamily: 'serif' }),
  });
  modalOrderText.x = 20;
  modalOrderText.y = 50;
  seatModalContainer.addChild(modalOrderText);

  const markDoneBg = new Graphics();
  markDoneBg.roundRect(0, 0, 140, 36, 7);
  markDoneBg.fill({ color: 0x5cb84a });
  markDoneBg.x = (MODAL_W - 140) / 2;
  markDoneBg.y = 108;
  seatModalContainer.addChild(markDoneBg);

  const markDoneText = new Text({
    text: 'Mark as Done',
    style: new TextStyle({ fill: 0xffffff, fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  markDoneText.x = markDoneBg.x + 14;
  markDoneText.y = markDoneBg.y + 10;
  seatModalContainer.addChild(markDoneText);

  function fireMarkDone() {
    if (seatModalOnDone) seatModalOnDone();
    hideSeatModal();
  }
  markDoneBg.eventMode = 'static'; markDoneBg.cursor = 'pointer';
  markDoneBg.on('pointerdown', fireMarkDone);
  markDoneText.eventMode = 'static'; markDoneText.cursor = 'pointer';
  markDoneText.on('pointerdown', fireMarkDone);

  seatModalContainer.x = (GAME_WIDTH - MODAL_W) / 2;
  seatModalContainer.y = (GAME_HEIGHT - MODAL_H) / 2;

  // ---- Order dialog popup (existing) ----
  const dialogContainer = new Container();
  dialogContainer.visible = false;

  const DIALOG_W = 420;
  const DIALOG_H = 195;

  const dialogBg = new Graphics();
  dialogBg.roundRect(0, 0, DIALOG_W, DIALOG_H, 14);
  dialogBg.fill({ color: 0xfff8e7, alpha: 0.97 });
  dialogBg.stroke({ width: 3, color: 0x8b5e3c });
  dialogContainer.addChild(dialogBg);

  const headerBar = new Graphics();
  headerBar.roundRect(3, 3, DIALOG_W - 6, 36, 11);
  headerBar.fill({ color: 0x8b5e3c, alpha: 0.9 });
  dialogContainer.addChild(headerBar);

  const headerText = new Text({
    text: 'Customer Order',
    style: new TextStyle({ fill: 0xfff8e7, fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  headerText.x = 14;
  headerText.y = 10;
  dialogContainer.addChild(headerText);

  // X dismiss button — closes dialog without making a Yes/No decision
  const dialogCloseBtn = new Graphics();
  dialogCloseBtn.roundRect(0, 0, 24, 24, 5);
  dialogCloseBtn.fill({ color: 0xb85a5a });
  dialogCloseBtn.x = DIALOG_W - 32;
  dialogCloseBtn.y = 8;
  dialogContainer.addChild(dialogCloseBtn);
  const dialogCloseTxt = new Text({
    text: 'X',
    style: new TextStyle({ fill: 0xffffff, fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  dialogCloseTxt.x = DIALOG_W - 26;
  dialogCloseTxt.y = 12;
  dialogContainer.addChild(dialogCloseTxt);

  const orderText = new Text({
    text: '',
    style: new TextStyle({ fill: 0x3b2700, fontSize: 17, fontFamily: 'serif', wordWrap: true, wordWrapWidth: 385 }),
  });
  orderText.x = 20;
  orderText.y = 50;
  dialogContainer.addChild(orderText);

  const hintText = new Text({
    text: '\u2190 \u2192 to select   Enter/Space or click to confirm',
    style: new TextStyle({ fill: 0x888866, fontSize: 12, fontFamily: 'monospace' }),
  });
  hintText.x = 20;
  hintText.y = 94;
  dialogContainer.addChild(hintText);

  const yesBg = new Graphics();
  yesBg.x = 60;
  yesBg.y = 128;
  dialogContainer.addChild(yesBg);

  const noBg = new Graphics();
  noBg.x = 250;
  noBg.y = 128;
  dialogContainer.addChild(noBg);

  const yesLabel = new Text({
    text: 'Yes',
    style: new TextStyle({ fill: 0xffffff, fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  yesLabel.x = 60 + 38;
  yesLabel.y = 138;
  dialogContainer.addChild(yesLabel);

  const noLabel = new Text({
    text: 'No',
    style: new TextStyle({ fill: 0xffffff, fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold' }),
  });
  noLabel.x = 250 + 43;
  noLabel.y = 138;
  dialogContainer.addChild(noLabel);

  dialogContainer.x = (GAME_WIDTH - DIALOG_W) / 2;
  dialogContainer.y = (GAME_HEIGHT - DIALOG_H) / 2;

  function updateButtons() {
    yesBg.clear();
    yesBg.roundRect(0, 0, 110, 40, 7);
    yesBg.fill({ color: selectedOption === 0 ? 0x5cb84a : 0x3d6b34 });
    if (selectedOption === 0) yesBg.stroke({ width: 2, color: 0xffd700 });

    noBg.clear();
    noBg.roundRect(0, 0, 110, 40, 7);
    noBg.fill({ color: selectedOption === 1 ? 0xb85a5a : 0x7c3030 });
    if (selectedOption === 1) noBg.stroke({ width: 2, color: 0xffd700 });
  }

  function confirmSelection() {
    if (!dialogOpen) return;
    const decision = selectedOption === 0 ? 'yes' : 'no';
    if (selectedOption === 0) {
      yesCount++;
      yesText.text = `Yes: ${yesCount}`;
    } else {
      noCount++;
      noText.text = `No: ${noCount}`;
    }
    // Stop accepting input immediately; keep dialogFading=true so player stays frozen
    dialogOpen = false;
    dialogFading = true;
    const capturedCallback = onDecision;
    fadeDir = -1;
    fadeProgress = 0;
    onFadeOutDone = () => {
      dialogContainer.visible = false;
      dialogContainer.alpha = 1;
      dialogFading = false;
      if (capturedCallback) capturedCallback(decision);
    };
  }

  // Close dialog without committing to Yes or No — NPC stays in queue
  function dismissDialog() {
    if (!dialogOpen) return;
    dialogOpen = false;
    dialogFading = true;
    const capturedDismiss = onDismiss;
    fadeDir = -1;
    fadeProgress = 0;
    onFadeOutDone = () => {
      dialogContainer.visible = false;
      dialogContainer.alpha = 1;
      dialogFading = false;
      if (capturedDismiss) capturedDismiss();
    };
  }

  dialogCloseBtn.eventMode = 'static'; dialogCloseBtn.cursor = 'pointer';
  dialogCloseBtn.on('pointerdown', dismissDialog);
  dialogCloseTxt.eventMode = 'static'; dialogCloseTxt.cursor = 'pointer';
  dialogCloseTxt.on('pointerdown', dismissDialog);

  function onKeyDown(e) {
    if (!dialogOpen) return;
    if (e.key === 'ArrowLeft' || e.key === 'a') { selectedOption = 0; updateButtons(); }
    else if (e.key === 'ArrowRight' || e.key === 'd') { selectedOption = 1; updateButtons(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); confirmSelection(); }
    else if (e.key === 'Escape') { e.preventDefault(); dismissDialog(); }
  }
  window.addEventListener('keydown', onKeyDown);

  yesBg.eventMode = 'static'; yesBg.cursor = 'pointer';
  yesBg.on('pointerdown', () => { if (!dialogOpen) return; selectedOption = 0; updateButtons(); confirmSelection(); });
  yesLabel.eventMode = 'static'; yesLabel.cursor = 'pointer';
  yesLabel.on('pointerdown', () => { if (!dialogOpen) return; selectedOption = 0; updateButtons(); confirmSelection(); });
  noBg.eventMode = 'static'; noBg.cursor = 'pointer';
  noBg.on('pointerdown', () => { if (!dialogOpen) return; selectedOption = 1; updateButtons(); confirmSelection(); });
  noLabel.eventMode = 'static'; noLabel.cursor = 'pointer';
  noLabel.on('pointerdown', () => { if (!dialogOpen) return; selectedOption = 1; updateButtons(); confirmSelection(); });

  function show(order, callback, dismissCallback) {
    onDecision = callback || null;
    onDismiss = dismissCallback || null;
    selectedOption = 0;
    orderText.text = `"I'd like a ${order}, please!"`;
    updateButtons();
    dialogContainer.alpha = 0;
    dialogContainer.visible = true;
    dialogOpen = true;
    dialogFading = true;
    fadeDir = 1;
    fadeProgress = 0;
    onFadeOutDone = null;
  }

  function hide() {
    if (!dialogOpen && !dialogFading) return;
    dialogOpen = false;
    dialogFading = true;
    fadeDir = -1;
    fadeProgress = 0;
    onFadeOutDone = () => {
      dialogContainer.visible = false;
      dialogContainer.alpha = 1;
      dialogFading = false;
    };
  }

  function isOpen() { return dialogOpen || dialogFading; }

  // Ticker drives the dialog fade-in / fade-out animation
  function onFadeTick(ticker) {
    if (fadeDir === 0) return;
    fadeProgress += ticker.deltaTime;
    const t = Math.min(fadeProgress / FADE_FRAMES, 1);
    dialogContainer.alpha = fadeDir === 1 ? t : 1 - t;
    if (t >= 1) {
      const completedDir = fadeDir;
      fadeDir = 0;
      if (completedDir === -1) {
        // Fade-out done — fire the completion callback (hides container, fires onDecision)
        if (onFadeOutDone) {
          const fn = onFadeOutDone;
          onFadeOutDone = null;
          fn();
        }
      } else {
        // Fade-in done — dialog fully visible, stop fading flag
        dialogFading = false;
      }
    }
  }
  app.ticker.add(onFadeTick);

  // ---- New API ----

  function addMoney(amount) {
    moneyAmount += amount;
    moneyText.text = `Money: $${moneyAmount}`;
  }

  function getBalance() { return moneyAmount; }

  function spendMoney(amount) {
    if (moneyAmount < amount) return false;
    moneyAmount -= amount;
    moneyText.text = `Money: $${moneyAmount}`;
    return true;
  }

  function addSeatedCustomer(npc, name, order) {
    if (seatedCustomers.length === 0) emptyText.visible = false;

    const rowY = seatedCustomers.length * 46;
    const rowContainer = new Container();
    rowContainer.y = rowY;

    const thumb = new Sprite(npc.getThumbnailTexture());
    thumb.width = 32;
    thumb.height = 32;
    thumb.x = 10;
    thumb.y = 7;
    rowContainer.addChild(thumb);

    const nameText = new Text({
      text: name,
      style: new TextStyle({ fill: 0xffffff, fontSize: 13, fontFamily: 'monospace' }),
    });
    nameText.x = 52;
    nameText.y = 14;
    rowContainer.addChild(nameText);

    const orderTxt = new Text({
      text: order,
      style: new TextStyle({ fill: 0xffd700, fontSize: 13, fontFamily: 'monospace' }),
    });
    orderTxt.x = 200;
    orderTxt.y = 14;
    rowContainer.addChild(orderTxt);

    const sep = new Graphics();
    sep.moveTo(10, 45).lineTo(PANE_W - 20, 45);
    sep.stroke({ width: 1, color: 0x444444 });
    rowContainer.addChild(sep);

    paneListContainer.addChild(rowContainer);
    seatedCustomers.push({ npc, name, order, rowContainer });
  }

  function removeSeatedCustomer(npc) {
    const idx = seatedCustomers.findIndex(c => c.npc === npc);
    if (idx === -1) return;
    paneListContainer.removeChild(seatedCustomers[idx].rowContainer);
    seatedCustomers.splice(idx, 1);
    seatedCustomers.forEach((c, i) => { c.rowContainer.y = i * 46; });
    if (seatedCustomers.length === 0) emptyText.visible = true;
  }

  function showSeatModal(customerData, onMarkDone) {
    modalTitleText.text = customerData.name;
    modalOrderText.text = `Order: ${customerData.order}`;
    seatModalOnDone = onMarkDone || null;
    seatModalContainer.visible = true;
    seatModalOpen = true;
  }

  function hideSeatModal() {
    seatModalContainer.visible = false;
    seatModalOpen = false;
    seatModalOnDone = null;
  }

  function isSeatModalOpen() { return seatModalOpen; }

  function toggleOrdersPane() {
    ordersPaneVisible = !ordersPaneVisible;
    ordersPaneContainer.visible = ordersPaneVisible;
  }

  function destroy() {
    window.removeEventListener('keydown', onKeyDown);
    app.ticker.remove(onFadeTick);
  }

  return {
    hudContainer,
    dialogContainer,
    ordersPaneContainer,
    seatModalContainer,
    ordersButtonContainer,
    show,
    hide,
    isOpen,
    isSeatModalOpen,
    showSeatModal,
    hideSeatModal,
    addSeatedCustomer,
    removeSeatedCustomer,
    addMoney,
    getBalance,
    spendMoney,
    toggleOrdersPane,
    destroy,
  };
}
