import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';

const ORDERS = ['Americano', 'Frappuccino', 'Macchiato', 'Matcha Latte'];

export function getRandomOrder() {
  return ORDERS[Math.floor(Math.random() * ORDERS.length)];
}

// createOrderSystem builds the HUD counter display and dialog popup.
// Returns { hudContainer, dialogContainer, show, hide, isOpen, destroy }
export function createOrderSystem(app) {
  let yesCount = 0;
  let noCount = 0;
  let dialogOpen = false;
  let selectedOption = 0; // 0 = Yes, 1 = No
  let onDecision = null;

  // ---- HUD: top-right order tally ----
  const hudContainer = new Container();

  const hudBg = new Graphics();
  hudBg.roundRect(0, 0, 152, 68, 8);
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
  hudContainer.addChild(yesText);
  hudContainer.addChild(noText);

  hudContainer.x = GAME_WIDTH - 165;
  hudContainer.y = 10;

  // ---- Dialog popup ----
  const dialogContainer = new Container();
  dialogContainer.visible = false;

  const DIALOG_W = 420;
  const DIALOG_H = 195;

  // Background panel
  const dialogBg = new Graphics();
  dialogBg.roundRect(0, 0, DIALOG_W, DIALOG_H, 14);
  dialogBg.fill({ color: 0xfff8e7, alpha: 0.97 });
  dialogBg.stroke({ width: 3, color: 0x8b5e3c });
  dialogContainer.addChild(dialogBg);

  // Header bar
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

  // NPC order text (populated in show())
  const orderText = new Text({
    text: '',
    style: new TextStyle({ fill: 0x3b2700, fontSize: 17, fontFamily: 'serif', wordWrap: true, wordWrapWidth: 385 }),
  });
  orderText.x = 20;
  orderText.y = 50;
  dialogContainer.addChild(orderText);

  // Controls hint
  const hintText = new Text({
    text: '\u2190 \u2192 to select   Enter/Space or click to confirm',
    style: new TextStyle({ fill: 0x888866, fontSize: 12, fontFamily: 'monospace' }),
  });
  hintText.x = 20;
  hintText.y = 94;
  dialogContainer.addChild(hintText);

  // Yes / No button backgrounds (drawn dynamically in updateButtons)
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

  // Center dialog on screen
  dialogContainer.x = (GAME_WIDTH - DIALOG_W) / 2;
  dialogContainer.y = (GAME_HEIGHT - DIALOG_H) / 2;

  // Redraw button backgrounds to reflect current selection highlight
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

  // Commit the current selection, update counters, and close dialog
  function confirmSelection() {
    if (!dialogOpen) return;
    if (selectedOption === 0) {
      yesCount++;
      yesText.text = `Yes: ${yesCount}`;
    } else {
      noCount++;
      noText.text = `No: ${noCount}`;
    }
    hide();
    if (onDecision) onDecision(selectedOption === 0 ? 'yes' : 'no');
  }

  // Keyboard handler — only acts when dialog is open
  function onKeyDown(e) {
    if (!dialogOpen) return;

    if (e.key === 'ArrowLeft' || e.key === 'a') {
      selectedOption = 0;
      updateButtons();
    } else if (e.key === 'ArrowRight' || e.key === 'd') {
      selectedOption = 1;
      updateButtons();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      confirmSelection();
    }
  }
  window.addEventListener('keydown', onKeyDown);

  // Make Yes button and label clickable
  yesBg.eventMode = 'static';
  yesBg.cursor = 'pointer';
  yesBg.on('pointerdown', () => {
    if (!dialogOpen) return;
    selectedOption = 0;
    updateButtons();
    confirmSelection();
  });

  yesLabel.eventMode = 'static';
  yesLabel.cursor = 'pointer';
  yesLabel.on('pointerdown', () => {
    if (!dialogOpen) return;
    selectedOption = 0;
    updateButtons();
    confirmSelection();
  });

  // Make No button and label clickable
  noBg.eventMode = 'static';
  noBg.cursor = 'pointer';
  noBg.on('pointerdown', () => {
    if (!dialogOpen) return;
    selectedOption = 1;
    updateButtons();
    confirmSelection();
  });

  noLabel.eventMode = 'static';
  noLabel.cursor = 'pointer';
  noLabel.on('pointerdown', () => {
    if (!dialogOpen) return;
    selectedOption = 1;
    updateButtons();
    confirmSelection();
  });

  // Show the dialog for a given order string. Optional callback fires with 'yes' or 'no'.
  function show(order, callback) {
    onDecision = callback || null;
    selectedOption = 0;
    orderText.text = `"I'd like a ${order}, please!"`;
    dialogContainer.visible = true;
    dialogOpen = true;
    updateButtons();
  }

  function hide() {
    dialogContainer.visible = false;
    dialogOpen = false;
  }

  function isOpen() {
    return dialogOpen;
  }

  // Remove event listeners when cleaning up
  function destroy() {
    window.removeEventListener('keydown', onKeyDown);
  }

  return { hudContainer, dialogContainer, show, hide, isOpen, destroy };
}
