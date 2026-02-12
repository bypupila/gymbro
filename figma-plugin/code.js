// GymBro Homepage Generator - Figma Plugin (Compatible)
// No spread, no for-of, compatible with Figma sandbox

function hex(h) {
  h = h.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255
  };
}

function solid(h, a) {
  return [{ type: 'SOLID', color: hex(h), opacity: a !== undefined ? a : 1 }];
}

function grad(h1, h2) {
  var c1 = hex(h1);
  var c2 = hex(h2);
  return [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0.7071, 0.7071, 0], [-0.7071, 0.7071, 0.5]],
    gradientStops: [
      { position: 0, color: { r: c1.r, g: c1.g, b: c1.b, a: 1 } },
      { position: 1, color: { r: c2.r, g: c2.g, b: c2.b, a: 1 } }
    ]
  }];
}

// Color tokens from colors.ts
var C = {
  primary: '#00E699',
  primaryDark: '#009966',
  bg: '#0A0A0B',
  surface: '#141416',
  surfaceLight: '#1A1A1E',
  text: '#FFFFFF',
  textSec: '#9CA3AF',
  textTer: '#6B7280',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  accent: '#A78BFA'
};

var border = [{ type: 'SOLID', color: hex('#FFFFFF'), opacity: 0.08 }];
var gradP = grad('#00E699', '#009966');
var gradS = grad('#10B981', '#059669');

function makeText(parent, str, size, weight, col, align) {
  var t = figma.createText();
  var s = 'Regular';
  if (weight >= 900) s = 'Black';
  else if (weight >= 800) s = 'Extra Bold';
  else if (weight >= 700) s = 'Bold';
  else if (weight >= 600) s = 'Semi Bold';
  else if (weight >= 500) s = 'Medium';
  t.fontName = { family: 'Inter', style: s };
  t.characters = str;
  t.fontSize = size;
  t.fills = solid(col);
  t.textAutoResize = 'WIDTH_AND_HEIGHT';
  if (align) t.textAlignHorizontal = align;
  parent.appendChild(t);
  return t;
}

function makeFrame(parent, name, w, h) {
  var f = figma.createFrame();
  f.name = name;
  f.fills = [];
  if (w && h) f.resize(w, h);
  if (parent) parent.appendChild(f);
  return f;
}

function autoV(f, spacing) {
  f.layoutMode = 'VERTICAL';
  f.itemSpacing = spacing || 0;
  return f;
}

function autoH(f, spacing) {
  f.layoutMode = 'HORIZONTAL';
  f.itemSpacing = spacing || 0;
  return f;
}

function pad(f, t, r, b, l) {
  f.paddingTop = t;
  f.paddingRight = r;
  f.paddingBottom = b;
  f.paddingLeft = l;
  return f;
}

function fillW(f) {
  f.layoutSizingHorizontal = 'FILL';
  return f;
}

function hugV(f) {
  f.primaryAxisSizingMode = 'AUTO';
  return f;
}

function hugH(f) {
  f.counterAxisSizingMode = 'AUTO';
  return f;
}

figma.notify('Loading fonts...');

Promise.all([
  figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Bold' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Extra Bold' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Black' })
]).then(function () {
  figma.notify('Fonts loaded! Building design...');

  // ═══════════════════════════════════════════════════
  // PHONE FRAME
  // ═══════════════════════════════════════════════════
  var phone = makeFrame(null, 'GymBro - Homepage', 393, 852);
  phone.fills = solid(C.bg);
  phone.clipsContent = true;
  autoV(phone, 24);
  pad(phone, 60, 20, 100, 20);

  // ── HEADER ─────────────────────────────────────────
  var header = makeFrame(phone, 'Header', 353, 56);
  autoH(header, 0);
  header.primaryAxisAlignItems = 'SPACE_BETWEEN';
  header.counterAxisAlignItems = 'CENTER';
  fillW(header);
  hugV(header);

  var hLeft = makeFrame(header, 'Header Left', 200, 50);
  autoV(hLeft, 4);
  fillW(hLeft);
  hugV(hLeft);

  var gRow = makeFrame(hLeft, 'Greeting Row', 200, 30);
  autoH(gRow, 8);
  gRow.counterAxisAlignItems = 'CENTER';
  fillW(gRow);
  hugV(gRow);

  // fontSize:24px, fontWeight:800, color:#FFF
  makeText(gRow, 'Hola, Daniel', 24, 800, C.text);

  // Sync dot
  var syncDot = figma.createEllipse();
  syncDot.name = 'Sync';
  syncDot.resize(8, 8);
  syncDot.fills = solid(C.success);
  gRow.appendChild(syncDot);

  // fontSize:13px, fontWeight:400, color:#9CA3AF
  makeText(hLeft, 'Miercoles, 12 Febrero', 13, 400, C.textSec);

  // Avatar: 50x50, borderRadius:50%, border:2px solid surface
  var avatar = makeFrame(header, 'Avatar', 50, 50);
  avatar.cornerRadius = 25;
  avatar.fills = solid(C.surfaceLight);
  avatar.strokes = solid(C.surface);
  avatar.strokeWeight = 2;
  var avTxt = makeText(avatar, 'DA', 18, 700, C.primary, 'CENTER');
  avTxt.x = 13;
  avTxt.y = 14;

  figma.notify('Header done...');

  // ── WEEKLY PROGRESS ────────────────────────────────
  // background:surface, borderRadius:20px, padding:20px, border:1px solid border
  var weekly = makeFrame(phone, 'Weekly Progress', 353, 10);
  weekly.fills = solid(C.surface);
  weekly.cornerRadius = 20;
  weekly.strokes = border;
  weekly.strokeWeight = 1;
  autoV(weekly, 16);
  pad(weekly, 20, 20, 20, 20);
  fillW(weekly);
  weekly.primaryAxisSizingMode = 'AUTO';

  // Weekly header
  var wkH = makeFrame(weekly, 'Weekly Header', 313, 50);
  autoH(wkH, 0);
  wkH.primaryAxisAlignItems = 'SPACE_BETWEEN';
  wkH.counterAxisAlignItems = 'CENTER';
  fillW(wkH);
  hugV(wkH);

  var wkTitleCol = makeFrame(wkH, 'Title', 200, 40);
  autoV(wkTitleCol, 4);
  fillW(wkTitleCol);
  hugV(wkTitleCol);

  // sectionTitle: fontSize:18px, fontWeight:800
  makeText(wkTitleCol, 'Progreso Semanal', 18, 800, C.text);
  makeText(wkTitleCol, '3 de 5 actividades completadas', 12, 400, C.textSec);

  // Progress circle 50x50
  var progBadge = makeFrame(wkH, 'Progress Badge', 50, 50);
  var progCircle = figma.createEllipse();
  progCircle.name = 'Circle';
  progCircle.resize(50, 50);
  progCircle.fills = gradP;
  progBadge.appendChild(progCircle);
  var pctTxt = makeText(progBadge, '60%', 14, 800, '#000000', 'CENTER');
  pctTxt.x = 9;
  pctTxt.y = 16;

  // Days grid: 7 columns, gap:8px
  var daysGrid = makeFrame(weekly, 'Days Grid', 313, 10);
  autoH(daysGrid, 8);
  fillW(daysGrid);
  hugV(daysGrid);

  var dayLabels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  var dayNums = ['10', '11', '12', '13', '14', '15', '16'];
  var dayStates = ['completed', 'completed', 'today', 'scheduled', 'scheduled', 'rest', 'rest'];

  for (var i = 0; i < 7; i++) {
    var state = dayStates[i];
    var pill = makeFrame(daysGrid, 'Day ' + dayLabels[i], 40, 10);
    autoV(pill, 4);
    pill.counterAxisAlignItems = 'CENTER';
    pill.primaryAxisAlignItems = 'CENTER';
    pad(pill, 12, 4, 12, 4);
    pill.cornerRadius = 14;
    fillW(pill);
    pill.primaryAxisSizingMode = 'AUTO';
    pill.minWidth = 40;

    if (state === 'completed') {
      pill.fills = gradS;
    } else if (state === 'today') {
      pill.fills = gradP;
      pill.strokes = solid(C.primary, 0.4);
      pill.strokeWeight = 2;
    } else {
      pill.fills = solid(C.surfaceLight);
    }

    var isLight = (state === 'completed' || state === 'today');
    var labelCol = isLight ? '#FFFFFF' : C.textSec;

    makeText(pill, dayLabels[i], 10, 600, labelCol, 'CENTER');
    makeText(pill, dayNums[i], 16, state === 'today' ? 700 : 500, labelCol, 'CENTER');

    if (state === 'completed') {
      makeText(pill, '\u2713', 12, 700, '#FFFFFF', 'CENTER');
    } else if (state === 'today') {
      var dot = figma.createEllipse();
      dot.name = 'Dot';
      dot.resize(6, 6);
      dot.fills = solid('#FFFFFF');
      pill.appendChild(dot);
    }
  }

  figma.notify('Weekly progress done...');

  // ── MOOD STATS ─────────────────────────────────────
  // card: background:surface, borderRadius:24px, padding:20px, border:1px solid border
  var mood = makeFrame(phone, 'Mood Stats', 353, 10);
  mood.fills = solid(C.surface);
  mood.cornerRadius = 24;
  mood.strokes = border;
  mood.strokeWeight = 1;
  autoV(mood, 20);
  pad(mood, 20, 20, 20, 20);
  fillW(mood);
  mood.primaryAxisSizingMode = 'AUTO';

  // Mood header
  var mHdr = makeFrame(mood, 'Mood Header', 313, 40);
  autoH(mHdr, 0);
  mHdr.primaryAxisAlignItems = 'SPACE_BETWEEN';
  mHdr.counterAxisAlignItems = 'MIN';
  fillW(mHdr);
  hugV(mHdr);

  var mTitleCol = makeFrame(mHdr, 'Title', 200, 35);
  autoV(mTitleCol, 4);
  fillW(mTitleCol);
  hugV(mTitleCol);
  // title: fontSize:16px, fontWeight:800
  makeText(mTitleCol, 'Impacto del Entreno', 16, 800, C.text);
  // subtitle: fontSize:12px
  makeText(mTitleCol, 'Tu energia antes vs. despues', 12, 400, C.textSec);

  // Trend badge: padding:4px 8px, borderRadius:8px, fontSize:12px, fontWeight:700
  var tBadge = makeFrame(mHdr, 'Trend Badge', 80, 24);
  tBadge.fills = solid(C.success, 0.13);
  tBadge.cornerRadius = 8;
  autoH(tBadge, 4);
  pad(tBadge, 4, 8, 4, 8);
  tBadge.counterAxisAlignItems = 'CENTER';
  hugV(tBadge);
  tBadge.primaryAxisSizingMode = 'AUTO';
  makeText(tBadge, '\u2191', 12, 700, C.success);
  makeText(tBadge, '0.8 pts', 12, 700, C.success);

  // Stats row: background:bg, padding:12px, borderRadius:16px
  var sRow = makeFrame(mood, 'Stats Row', 313, 60);
  sRow.fills = solid(C.bg);
  sRow.cornerRadius = 16;
  autoH(sRow, 0);
  sRow.primaryAxisAlignItems = 'SPACE_BETWEEN';
  sRow.counterAxisAlignItems = 'CENTER';
  pad(sRow, 12, 20, 12, 20);
  fillW(sRow);
  hugV(sRow);

  // Pre stat
  var preStat = makeFrame(sRow, 'Pre Stat', 100, 50);
  autoV(preStat, 4);
  preStat.counterAxisAlignItems = 'CENTER';
  fillW(preStat);
  hugV(preStat);

  var preLabel = makeText(preStat, 'PRE-ENTRENO', 10, 700, C.textTer, 'CENTER');
  preLabel.letterSpacing = { value: 0.5, unit: 'PIXELS' };

  var preVRow = makeFrame(preStat, 'Pre Value', 60, 24);
  autoH(preVRow, 6);
  preVRow.counterAxisAlignItems = 'CENTER';
  preVRow.primaryAxisSizingMode = 'AUTO';
  hugV(preVRow);
  makeText(preVRow, '\u26A1', 16, 400, C.textSec);
  makeText(preVRow, '2.8', 20, 800, C.text);

  // Divider
  var div1 = figma.createRectangle();
  div1.name = 'Divider';
  div1.resize(1, 30);
  div1.fills = solid('#FFFFFF', 0.08);
  sRow.appendChild(div1);

  // Post stat
  var postStat = makeFrame(sRow, 'Post Stat', 100, 50);
  autoV(postStat, 4);
  postStat.counterAxisAlignItems = 'CENTER';
  fillW(postStat);
  hugV(postStat);

  var postLabel = makeText(postStat, 'POST-ENTRENO', 10, 700, C.textTer, 'CENTER');
  postLabel.letterSpacing = { value: 0.5, unit: 'PIXELS' };

  var postVRow = makeFrame(postStat, 'Post Value', 60, 24);
  autoH(postVRow, 6);
  postVRow.counterAxisAlignItems = 'CENTER';
  postVRow.primaryAxisSizingMode = 'AUTO';
  hugV(postVRow);
  makeText(postVRow, '\u26A1', 16, 400, C.primary);
  makeText(postVRow, '3.6', 20, 800, C.primary);

  // Bar chart: height:100px
  var chart = makeFrame(mood, 'Bar Chart', 313, 100);
  autoH(chart, 0);
  chart.primaryAxisAlignItems = 'SPACE_BETWEEN';
  chart.counterAxisAlignItems = 'MAX';
  fillW(chart);

  var chartPre = [2, 3, 3, 2, 3.5, 2.5, 2];
  var chartPost = [3, 4, 3.5, 2.5, 4.5, 3, 4];
  var chartDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  for (var ci = 0; ci < 7; ci++) {
    var col = makeFrame(chart, 'Col ' + chartDays[ci], 40, 100);
    autoV(col, 8);
    col.counterAxisAlignItems = 'CENTER';
    col.primaryAxisAlignItems = 'MAX';
    fillW(col);

    var bp = makeFrame(col, 'Bar Pair', 16, 80);
    autoH(bp, 4);
    bp.counterAxisAlignItems = 'MAX';

    var preH = Math.max(4, (chartPre[ci] / 5) * 70);
    var postH = Math.max(4, (chartPost[ci] / 5) * 70);

    var preBar = figma.createRectangle();
    preBar.name = 'Pre';
    preBar.resize(6, preH);
    preBar.fills = solid(C.textSec, 0.5);
    preBar.cornerRadius = 4;
    bp.appendChild(preBar);

    var postBar = figma.createRectangle();
    postBar.name = 'Post';
    postBar.resize(6, postH);
    postBar.fills = solid(C.primary);
    postBar.cornerRadius = 4;
    bp.appendChild(postBar);

    makeText(col, chartDays[ci], 10, 400, C.textTer, 'CENTER');
  }

  figma.notify('Mood stats done...');

  // ── WORKOUT CARDS ──────────────────────────────────
  // daysList: flex row, gap:12px, overflowX:auto
  var cards = makeFrame(phone, 'Workout Cards', 393, 160);
  autoH(cards, 12);
  cards.clipsContent = true;
  fillW(cards);

  var wDays = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES'];
  var wMuscle = ['PECHO', 'ESPALDA', 'PIERNA', 'HOMBRO'];
  var wCount = [6, 5, 7, 5];
  var wToday = [true, false, false, false];

  for (var wi = 0; wi < 4; wi++) {
    // workoutCard: 240px, borderRadius:24px, padding:16px, minHeight:160px
    var card = makeFrame(cards, 'Card ' + wDays[wi], 240, 160);
    card.cornerRadius = 24;
    autoV(card, 0);
    card.primaryAxisAlignItems = 'SPACE_BETWEEN';
    pad(card, 16, 16, 16, 16);

    if (wToday[wi]) {
      card.fills = gradP;
    } else {
      card.fills = solid(C.surface);
      card.strokes = border;
      card.strokeWeight = 1;
    }

    // Badge: background:rgba(0,0,0,0.15), padding:4px 8px, borderRadius:8px
    var badge = makeFrame(card, 'Badge', 60, 20);
    badge.fills = solid('#000000', 0.15);
    badge.cornerRadius = 8;
    autoH(badge, 0);
    pad(badge, 4, 8, 4, 8);
    badge.primaryAxisSizingMode = 'AUTO';
    badge.counterAxisSizingMode = 'AUTO';

    // badgeText: fontSize:9px, fontWeight:900, letterSpacing:0.5px
    var bTxt = makeText(badge, wDays[wi], 9, 900, wToday[wi] ? '#FFFFFF' : C.primary);
    bTxt.letterSpacing = { value: 0.5, unit: 'PIXELS' };

    // cardTitle: fontSize:24px, fontWeight:900
    makeText(card, wMuscle[wi], 24, 900, wToday[wi] ? '#000000' : C.text);

    // Footer: flex row, space-between, align-end
    var footer = makeFrame(card, 'Footer', 208, 40);
    autoH(footer, 0);
    footer.primaryAxisAlignItems = 'SPACE_BETWEEN';
    footer.counterAxisAlignItems = 'MAX';
    fillW(footer);
    hugV(footer);

    // Exercise pill: gap:4px, padding:6px 10px, borderRadius:12px
    var exPill = makeFrame(footer, 'Ex Pill', 100, 28);
    exPill.fills = solid(wToday[wi] ? '#000000' : '#FFFFFF', 0.1);
    exPill.cornerRadius = 12;
    autoH(exPill, 4);
    pad(exPill, 6, 10, 6, 10);
    exPill.counterAxisAlignItems = 'CENTER';
    exPill.primaryAxisSizingMode = 'AUTO';
    exPill.counterAxisSizingMode = 'AUTO';

    makeText(exPill, '\u26A1', 14, 400, wToday[wi] ? '#000000' : C.textSec);
    // previewText: fontSize:11px, fontWeight:700
    makeText(exPill, wCount[wi] + ' Ejercicios', 11, 700, wToday[wi] ? '#000000' : C.textSec);

    // Play button: 40x40, borderRadius:50%
    var playG = makeFrame(footer, 'Play Btn', 40, 40);
    var playCirc = figma.createEllipse();
    playCirc.name = 'BG';
    playCirc.resize(40, 40);
    playCirc.fills = solid(wToday[wi] ? '#000000' : C.primary);
    playG.appendChild(playCirc);
    var playIco = makeText(playG, '\u25B6', 16, 700, wToday[wi] ? '#FFFFFF' : '#000000', 'CENTER');
    playIco.x = 13;
    playIco.y = 10;
  }

  figma.notify('Workout cards done...');

  // ── BOTTOM NAV ─────────────────────────────────────
  // container: padding:8px 16px, background:surface, borderTop:1px solid border
  var bnav = makeFrame(phone, 'Bottom Nav', 393, 70);
  bnav.fills = solid(C.surface);
  autoH(bnav, 0);
  bnav.primaryAxisAlignItems = 'SPACE_BETWEEN';
  bnav.counterAxisAlignItems = 'CENTER';
  pad(bnav, 8, 16, 20, 16);
  fillW(bnav);
  bnav.strokes = border;
  bnav.strokeWeight = 1;

  var navLabels = ['Hoy', 'Rutina', '', 'Progreso', 'Perfil'];
  var navIcons = ['\u2302', '\uD83C\uDFCB', '', '\u2197', '\uD83D\uDC64'];
  var navActive = [true, false, false, false, false];
  var navFab = [false, false, true, false, false];

  for (var ni = 0; ni < 5; ni++) {
    if (navFab[ni]) {
      var fabW = makeFrame(bnav, 'FAB', 64, 64);
      var fabC = figma.createEllipse();
      fabC.name = 'FAB Circle';
      fabC.resize(64, 64);
      fabC.fills = gradP;
      var pc = hex(C.primary);
      fabC.effects = [{
        type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL',
        color: { r: pc.r, g: pc.g, b: pc.b, a: 0.4 },
        offset: { x: 0, y: 4 }, radius: 20
      }];
      fabW.appendChild(fabC);
      var fabI = makeText(fabW, '\u26A1', 28, 700, '#000000', 'CENTER');
      fabI.x = 18;
      fabI.y = 16;
    } else {
      var tab = makeFrame(bnav, 'Tab ' + navLabels[ni], 60, 50);
      autoV(tab, 4);
      tab.counterAxisAlignItems = 'CENTER';
      tab.primaryAxisAlignItems = 'CENTER';
      fillW(tab);

      var nColor = navActive[ni] ? C.primary : C.textTer;
      makeText(tab, navIcons[ni], 24, 400, nColor, 'CENTER');
      makeText(tab, navLabels[ni], 10, navActive[ni] ? 600 : 500, nColor, 'CENTER');
    }
  }

  figma.currentPage.appendChild(phone);
  figma.notify('Homepage done! Building modals...');

  // ═══════════════════════════════════════════════════
  // MODAL: Day Picker
  // ═══════════════════════════════════════════════════
  var dpOvr = makeFrame(null, 'Modal - Day Picker', 393, 852);
  dpOvr.fills = solid('#000000', 0.8);
  dpOvr.x = 430;
  autoV(dpOvr, 0);
  dpOvr.primaryAxisAlignItems = 'CENTER';
  dpOvr.counterAxisAlignItems = 'CENTER';
  pad(dpOvr, 0, 20, 0, 20);

  // modalContent: background:surface, borderRadius:24px, padding:32px 24px, maxWidth:350px
  var dpC = makeFrame(dpOvr, 'Content', 350, 10);
  dpC.fills = solid(C.surface);
  dpC.cornerRadius = 24;
  dpC.strokes = border;
  dpC.strokeWeight = 1;
  autoV(dpC, 8);
  dpC.counterAxisAlignItems = 'CENTER';
  pad(dpC, 32, 24, 32, 24);
  dpC.primaryAxisSizingMode = 'AUTO';
  dpC.effects = [{
    type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL',
    color: { r: 0, g: 0, b: 0, a: 0.5 },
    offset: { x: 0, y: 10 }, radius: 40
  }];

  makeText(dpC, '\uD83D\uDCC5', 32, 400, C.primary, 'CENTER');
  // modalTitle: fontSize:24px, fontWeight:800
  makeText(dpC, 'Lunes - Mi Rutina', 24, 800, C.text, 'CENTER');
  // modalSubtitle: fontSize:14px
  var dpSub = makeText(dpC, 'Selecciona el dia para el que cuenta este entrenamiento', 14, 400, C.textSec, 'CENTER');
  dpSub.resize(300, dpSub.height);
  dpSub.textAutoResize = 'HEIGHT';

  // Spacer
  var sp1 = makeFrame(dpC, 'Spacer', 10, 12);

  // Day grid: gap:6px
  var dpGrid = makeFrame(dpC, 'Day Grid', 302, 10);
  autoH(dpGrid, 6);
  fillW(dpGrid);
  hugV(dpGrid);

  var dpD = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  var dpN = ['10', '11', '12', '13', '14', '15', '16'];

  for (var di = 0; di < 7; di++) {
    var isSel = (di === 2);
    var isFut = (di > 2);

    var cell = makeFrame(dpGrid, 'DP ' + dpD[di], 38, 10);
    autoV(cell, 4);
    cell.counterAxisAlignItems = 'CENTER';
    cell.primaryAxisAlignItems = 'CENTER';
    pad(cell, 8, 4, 8, 4);
    cell.cornerRadius = 12;
    fillW(cell);
    cell.primaryAxisSizingMode = 'AUTO';
    cell.minWidth = 38;

    if (isSel) {
      cell.fills = solid(C.primary, 0.13);
      cell.strokes = solid(C.primary);
      cell.strokeWeight = 2;
    } else {
      cell.fills = solid(C.surface);
      cell.strokes = border;
      cell.strokeWeight = 1;
    }
    if (isFut) cell.opacity = 0.3;

    makeText(cell, dpD[di], 10, 600, isSel ? C.primary : C.textSec, 'CENTER');
    makeText(cell, dpN[di], 16, isSel ? 700 : 500, isSel ? C.primary : C.textSec, 'CENTER');

    if (isSel) {
      var dpDot = figma.createEllipse();
      dpDot.name = 'Dot';
      dpDot.resize(4, 4);
      dpDot.fills = solid(C.primary);
      cell.appendChild(dpDot);
    }
  }

  var sp2 = makeFrame(dpC, 'Spacer', 10, 12);

  // Continue button: padding:14px 20px, borderRadius:16px, background:primary
  var contBtn = makeFrame(dpC, 'Continue Btn', 302, 48);
  contBtn.fills = solid(C.primary);
  contBtn.cornerRadius = 16;
  autoH(contBtn, 0);
  contBtn.primaryAxisAlignItems = 'CENTER';
  contBtn.counterAxisAlignItems = 'CENTER';
  pad(contBtn, 14, 20, 14, 20);
  fillW(contBtn);
  // fontSize:16px, fontWeight:800
  var cbTxt = makeText(contBtn, 'Continuar', 16, 800, '#000000', 'CENTER');
  cbTxt.layoutSizingHorizontal = 'FILL';
  cbTxt.textAlignHorizontal = 'CENTER';

  // cancelLink: fontSize:14px, underline
  var dpCancel = makeText(dpC, 'Cancelar', 14, 400, C.textSec, 'CENTER');
  dpCancel.textDecoration = 'UNDERLINE';

  figma.currentPage.appendChild(dpOvr);

  // ═══════════════════════════════════════════════════
  // MODAL: Mood Selection
  // ═══════════════════════════════════════════════════
  var mmOvr = makeFrame(null, 'Modal - Mood Selection', 393, 852);
  mmOvr.fills = solid('#000000', 0.8);
  mmOvr.x = 860;
  autoV(mmOvr, 0);
  mmOvr.primaryAxisAlignItems = 'CENTER';
  mmOvr.counterAxisAlignItems = 'CENTER';
  pad(mmOvr, 0, 20, 0, 20);

  var mmC = makeFrame(mmOvr, 'Content', 350, 10);
  mmC.fills = solid(C.surface);
  mmC.cornerRadius = 24;
  mmC.strokes = border;
  mmC.strokeWeight = 1;
  autoV(mmC, 8);
  mmC.counterAxisAlignItems = 'CENTER';
  pad(mmC, 32, 24, 32, 24);
  mmC.primaryAxisSizingMode = 'AUTO';
  mmC.effects = [{
    type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL',
    color: { r: 0, g: 0, b: 0, a: 0.5 },
    offset: { x: 0, y: 10 }, radius: 40
  }];

  makeText(mmC, '\u00bfComo te sientes hoy?', 24, 800, C.text, 'CENTER');
  makeText(mmC, 'Nivel de energia antes de entrenar', 14, 400, C.textSec, 'CENTER');

  makeFrame(mmC, 'Spacer', 10, 16);

  // moodGrid: 5 columns, gap:8px
  var mGrid = makeFrame(mmC, 'Mood Grid', 302, 10);
  autoH(mGrid, 8);
  fillW(mGrid);
  hugV(mGrid);

  var mLabels = ['Agotado', 'Bajo', 'Normal', 'Bien', 'A tope'];
  var mEmojis = ['\uD83E\uDEAB', '\uD83D\uDD0B', '\u26AA', '\uD83D\uDD0B', '\uD83D\uDD25'];
  var mColors = [C.error, C.warning, C.textSec, C.success, C.primary];

  for (var mi = 0; mi < 5; mi++) {
    var mBtn = makeFrame(mGrid, 'Mood ' + mLabels[mi], 50, 10);
    autoV(mBtn, 8);
    mBtn.counterAxisAlignItems = 'CENTER';
    mBtn.primaryAxisAlignItems = 'CENTER';
    pad(mBtn, 8, 0, 8, 0);
    mBtn.cornerRadius = 12;
    fillW(mBtn);
    mBtn.primaryAxisSizingMode = 'AUTO';

    makeText(mBtn, mEmojis[mi], 28, 400, mColors[mi], 'CENTER');
    // moodLabel: fontSize:10px, fontWeight:700
    makeText(mBtn, mLabels[mi], 10, 700, C.textSec, 'CENTER');
  }

  makeFrame(mmC, 'Spacer', 10, 16);
  var mmCancel = makeText(mmC, 'Cancelar', 14, 400, C.textSec, 'CENTER');
  mmCancel.textDecoration = 'UNDERLINE';

  figma.currentPage.appendChild(mmOvr);

  // ═══════════════════════════════════════════════════
  // MODAL: Mode Selection
  // ═══════════════════════════════════════════════════
  var moOvr = makeFrame(null, 'Modal - Mode Selection', 393, 852);
  moOvr.fills = solid('#000000', 0.8);
  moOvr.x = 1290;
  autoV(moOvr, 0);
  moOvr.primaryAxisAlignItems = 'CENTER';
  moOvr.counterAxisAlignItems = 'CENTER';
  pad(moOvr, 0, 20, 0, 20);

  var moC = makeFrame(moOvr, 'Content', 350, 10);
  moC.fills = solid(C.surface);
  moC.cornerRadius = 24;
  moC.strokes = border;
  moC.strokeWeight = 1;
  autoV(moC, 12);
  moC.counterAxisAlignItems = 'CENTER';
  pad(moC, 32, 24, 32, 24);
  moC.primaryAxisSizingMode = 'AUTO';
  moC.effects = [{
    type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL',
    color: { r: 0, g: 0, b: 0, a: 0.5 },
    offset: { x: 0, y: 10 }, radius: 40
  }];

  makeText(moC, 'Como entrenaras hoy?', 24, 800, C.text, 'CENTER');
  makeText(moC, 'Elige tu modo de entrenamiento', 14, 400, C.textSec, 'CENTER');

  // modeCard: background:surfaceLight, borderRadius:16px, padding:20px, gap:8px
  var moTitles = ['Solo', 'Con alguien'];
  var moEmojis = ['\uD83D\uDC64', '\uD83D\uDC65'];
  var moDescs = ['Entrena individualmente', 'Elige tu partner de entrenamiento'];

  for (var modi = 0; modi < 2; modi++) {
    var mc = makeFrame(moC, 'Mode ' + moTitles[modi], 302, 10);
    mc.fills = solid(C.surfaceLight);
    mc.cornerRadius = 16;
    mc.strokes = border;
    mc.strokeWeight = 1;
    autoV(mc, 8);
    mc.counterAxisAlignItems = 'CENTER';
    pad(mc, 20, 20, 20, 20);
    fillW(mc);
    mc.primaryAxisSizingMode = 'AUTO';

    // modeIcon: fontSize:32px
    makeText(mc, moEmojis[modi], 32, 400, C.text, 'CENTER');
    // modeTitle: fontSize:16px, fontWeight:800
    makeText(mc, moTitles[modi], 16, 800, C.text, 'CENTER');
    // modeDesc: fontSize:12px
    makeText(mc, moDescs[modi], 12, 400, C.textSec, 'CENTER');
  }

  makeFrame(moC, 'Spacer', 10, 8);
  var moCancel = makeText(moC, 'Cancelar', 14, 400, C.textSec, 'CENTER');
  moCancel.textDecoration = 'UNDERLINE';

  figma.currentPage.appendChild(moOvr);

  // ═══════════════════════════════════════════════════
  // FRAME: No-Routine State
  // ═══════════════════════════════════════════════════
  var noRt = makeFrame(null, 'State - No Routine', 393, 852);
  noRt.fills = solid(C.bg);
  noRt.x = 1720;
  noRt.clipsContent = true;
  autoV(noRt, 24);
  pad(noRt, 60, 20, 100, 20);

  // Header copy
  var h2 = makeFrame(noRt, 'Header', 353, 56);
  autoH(h2, 0);
  h2.primaryAxisAlignItems = 'SPACE_BETWEEN';
  h2.counterAxisAlignItems = 'CENTER';
  fillW(h2);
  hugV(h2);

  var hL2 = makeFrame(h2, 'Left', 200, 50);
  autoV(hL2, 4);
  fillW(hL2);
  hugV(hL2);

  var gR2 = makeFrame(hL2, 'Greeting', 200, 30);
  autoH(gR2, 8);
  gR2.counterAxisAlignItems = 'CENTER';
  fillW(gR2);
  hugV(gR2);
  makeText(gR2, 'Hola, Daniel', 24, 800, C.text);
  var sd2 = figma.createEllipse();
  sd2.name = 'Sync';
  sd2.resize(8, 8);
  sd2.fills = solid(C.success);
  gR2.appendChild(sd2);
  makeText(hL2, 'Miercoles, 12 Febrero', 13, 400, C.textSec);

  var av2 = makeFrame(h2, 'Avatar', 50, 50);
  av2.cornerRadius = 25;
  av2.fills = solid(C.surfaceLight);
  av2.strokes = solid(C.surface);
  av2.strokeWeight = 2;
  var avT2 = makeText(av2, 'DA', 18, 700, C.primary, 'CENTER');
  avT2.x = 13;
  avT2.y = 14;

  // routinePrompt: background:surface, borderRadius:24px, padding:20px, gap:16px
  var prompt = makeFrame(noRt, 'Routine Prompt', 353, 10);
  prompt.fills = solid(C.surface);
  prompt.cornerRadius = 24;
  prompt.strokes = border;
  prompt.strokeWeight = 1;
  autoH(prompt, 16);
  prompt.counterAxisAlignItems = 'CENTER';
  pad(prompt, 20, 20, 20, 20);
  fillW(prompt);
  prompt.primaryAxisSizingMode = 'AUTO';

  // promptIcon: 48x48, borderRadius:16px
  var pIcon = makeFrame(prompt, 'Icon', 48, 48);
  pIcon.fills = solid(C.primary, 0.09);
  pIcon.cornerRadius = 16;
  autoV(pIcon, 0);
  pIcon.primaryAxisAlignItems = 'CENTER';
  pIcon.counterAxisAlignItems = 'CENTER';
  makeText(pIcon, '\uD83D\uDCC4', 24, 400, C.primary, 'CENTER');

  var pContent = makeFrame(prompt, 'Content', 200, 10);
  autoV(pContent, 2);
  fillW(pContent);
  pContent.primaryAxisSizingMode = 'AUTO';
  // promptTitle: fontSize:16px, fontWeight:800
  makeText(pContent, '\u00bfTienes una rutina?', 16, 800, C.text);
  // promptSub: fontSize:12px
  makeText(pContent, 'Sube una foto y Gemini la analizara por ti.', 12, 400, C.textSec);

  // promptAction: 32x32, borderRadius:50%
  var pAct = makeFrame(prompt, 'Action', 32, 32);
  pAct.cornerRadius = 16;
  pAct.fills = solid(C.surfaceLight);
  autoV(pAct, 0);
  pAct.primaryAxisAlignItems = 'CENTER';
  pAct.counterAxisAlignItems = 'CENTER';
  makeText(pAct, '+', 20, 400, C.text, 'CENTER');

  figma.currentPage.appendChild(noRt);

  // ── Done ───────────────────────────────────────────
  figma.viewport.scrollAndZoomIntoView(figma.currentPage.children);
  figma.notify('\u2705 GymBro Homepage generado! 5 frames con todos los componentes');
  figma.closePlugin();

}).catch(function (err) {
  figma.notify('Error: ' + err.message, { error: true });
  figma.closePlugin();
});
