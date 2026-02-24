// Too-Doo-List Figma Plugin
// Generates all 6 app screens as editable Figma frames
// Based on actual app source code + theme.js

const W = 393;   // iPhone 14 Pro width
const H = 852;   // iPhone 14 Pro height
const GAP = 80;  // gap between screens

// Colors from lightTheme (theme.js)
const C = {
  bg:           { r: 1,     g: 1,     b: 1     },  // #ffffff
  bgSecondary:  { r: 0.961, g: 0.961, b: 0.961 },  // #f5f5f5
  bgTertiary:   { r: 0.910, g: 0.910, b: 0.910 },  // #e8e8e8
  primary:      { r: 0.231, g: 0.510, b: 0.965 },  // #3B82F6
  primaryLight: { r: 0.220, g: 0.749, b: 0.980 },  // #DBEAFE tint
  primaryBg:    { r: 0.859, g: 0.925, b: 0.996 },  // #DBEAFE
  text:         { r: 0,     g: 0,     b: 0     },  // #000000
  textSec:      { r: 0.4,   g: 0.4,   b: 0.4   },  // #666666
  textTert:     { r: 0.533, g: 0.533, b: 0.533 },  // #888888
  card:         { r: 1,     g: 1,     b: 1     },  // #ffffff
  border:       { r: 0.878, g: 0.878, b: 0.878 },  // #e0e0e0
  divider:      { r: 0.878, g: 0.878, b: 0.878 },  // #e0e0e0
  white:        { r: 1,     g: 1,     b: 1     },
  error:        { r: 1,     g: 0.267, b: 0.267 },  // #ff4444
  success:      { r: 0.298, g: 0.686, b: 0.314 },  // #4caf50
  warning:      { r: 1,     g: 0.596, b: 0     },  // #ff9800
  googleBlue:   { r: 0.102, g: 0.451, b: 0.914 },  // #1a73e8
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function rect(parent, x, y, w, h, color, r = 0, opacity = 1) {
  const node = figma.createRectangle();
  node.x = x; node.y = y;
  node.resize(w > 0 ? w : 1, h > 0 ? h : 1);
  node.fills = [{ type: 'SOLID', color, opacity }];
  if (r > 0) node.cornerRadius = r;
  parent.appendChild(node);
  return node;
}

// Tracks which font styles were successfully loaded
const loadedStyles = new Set();

function txt(parent, content, x, y, w, size, color, weight = 'Regular', align = 'LEFT') {
  const styleMap = { '700': 'Bold', 'Bold': 'Bold', '600': 'SemiBold', 'SemiBold': 'SemiBold', '500': 'Medium', 'Medium': 'Medium', 'Regular': 'Regular' };
  let style = styleMap[weight] || 'Regular';
  // Fall back to the best available style
  if (!loadedStyles.has(style)) {
    if (loadedStyles.has('Bold')) style = 'Bold';
    else if (loadedStyles.has('Medium')) style = 'Medium';
    else style = 'Regular';
  }
  const node = figma.createText();
  node.fontName = { family: 'Inter', style };
  node.characters = content;
  node.fontSize = size;
  node.fills = [{ type: 'SOLID', color }];
  if (w > 0) { node.textAutoResize = 'HEIGHT'; node.resize(w, 20); }
  node.textAlignHorizontal = align;
  node.x = x; node.y = y;
  parent.appendChild(node);
  return node;
}

function frame(name, x, y, w, h, color) {
  const f = figma.createFrame();
  f.name = name; f.x = x; f.y = y;
  f.resize(w, h);
  f.fills = [{ type: 'SOLID', color }];
  f.clipsContent = true;
  return f;
}

function statusBar(parent) {
  // Time
  txt(parent, '9:41', 20, 14, 60, 16, C.text, 'SemiBold');
  // Dynamic island
  rect(parent, W / 2 - 60, 8, 120, 36, C.text, 20);
}

function homeIndicator(parent) {
  rect(parent, W / 2 - 66, H - 10, 132, 5, C.text, 3);
}

function tabBar(parent, activeTab) {
  rect(parent, 0, H - 82, W, 82, C.bg);
  rect(parent, 0, H - 82, W, 0.5, C.divider);
  const tabsData = [
    { label: 'Today', icon: '☑', x: W / 4 - 40 },
    { label: 'Calendar', icon: '📅', x: W / 2 - 40 },
    { label: 'Settings', icon: '⚙', x: 3 * W / 4 - 40 },
  ];
  tabsData.forEach((tab, i) => {
    const isActive = i === activeTab;
    const col = isActive ? C.primary : C.textTert;
    txt(parent, tab.icon, tab.x, H - 66, 80, 20, col, isActive ? 'SemiBold' : 'Regular', 'CENTER');
    txt(parent, tab.label, tab.x, H - 42, 80, 11, col, isActive ? 'SemiBold' : 'Regular', 'CENTER');
  });
}

// ── Screen 1: Login ───────────────────────────────────────────────────────────

async function buildLogin(x) {
  const f = frame('1 · Login', x, 0, W, H, C.bg);

  statusBar(f);

  // App icon — rounded rect with checkmark
  const iconBg = figma.createFrame();
  iconBg.name = 'App Icon';
  iconBg.resize(100, 100);
  iconBg.x = W / 2 - 50; iconBg.y = 200;
  iconBg.fills = [{ type: 'SOLID', color: C.text }];
  iconBg.cornerRadius = 24;
  f.appendChild(iconBg);
  // inner white bg
  rect(iconBg, 8, 18, 84, 64, C.white, 12);
  // checkmark symbol
  txt(iconBg, '✓', 30, 22, 40, 32, C.text, 'Bold', 'CENTER');
  // calendar dots row
  rect(iconBg, 20, 10, 8, 8, C.white, 4);
  rect(iconBg, 72, 10, 8, 8, C.white, 4);

  // App title
  txt(f, 'ToDo - 待辦清單', 20, 336, W - 40, 28, C.text, 'Bold', 'CENTER');

  // Subtitle
  txt(f, 'Task & Calendar', 20, 374, W - 40, 15, C.textTert, 'Regular', 'CENTER');

  // Google button
  const gBtn = frame('Google Button', 20, 430, W - 40, 56, C.bg);
  gBtn.cornerRadius = 12;
  gBtn.strokes = [{ type: 'SOLID', color: C.border }];
  gBtn.strokeWeight = 1;
  f.appendChild(gBtn);
  rect(gBtn, 20, 16, 24, 24, { r: 0.859, g: 0.925, b: 0.996 }, 4); // G icon placeholder
  txt(gBtn, 'G', 22, 18, 20, 16, C.googleBlue, 'Bold', 'CENTER');
  txt(gBtn, 'Sign in with Google', 56, 18, 220, 16, C.googleBlue, 'SemiBold');

  // Apple button
  const aBtn = frame('Apple Button', 20, 502, W - 40, 56, C.bg);
  aBtn.cornerRadius = 12;
  aBtn.strokes = [{ type: 'SOLID', color: C.border }];
  aBtn.strokeWeight = 1;
  f.appendChild(aBtn);
  rect(aBtn, 20, 14, 24, 26, C.text, 3); // Apple icon placeholder
  txt(aBtn, '', 22, 16, 20, 20, C.text, 'Regular', 'CENTER');
  txt(aBtn, 'Sign in with Apple', 56, 18, 220, 16, C.text, 'SemiBold');

  // Footer
  txt(f, 'By continuing, you agree to our Terms of Use and Privacy Policy.', 32, H - 80, W - 64, 13, C.textSec, 'Regular', 'CENTER');

  homeIndicator(f);
  return f;
}

// ── Screen 2: Task List (Calendar/Today) ─────────────────────────────────────

async function buildTaskList(x) {
  const f = frame('2 · Task List (Today)', x, 0, W, H, C.bgSecondary);

  statusBar(f);

  // Header
  rect(f, 0, 0, W, 96, C.bg);
  txt(f, 'Today', 20, 56, 160, 28, C.text, 'Bold');
  txt(f, 'Feb 19', 20, 60, 160, 14, C.textSec, 'Regular');

  // Header right buttons
  const addBtn = frame('Add Button', W - 50, 54, 36, 36, C.bgSecondary);
  addBtn.cornerRadius = 18;
  f.appendChild(addBtn);
  txt(addBtn, '+', 0, 3, 36, 24, C.primary, 'Regular', 'CENTER');

  const filterBtn = frame('Filter Button', W - 96, 54, 36, 36, C.bgSecondary);
  filterBtn.cornerRadius = 18;
  f.appendChild(filterBtn);
  txt(filterBtn, '≡', 0, 6, 36, 18, C.textSec, 'Regular', 'CENTER');

  rect(f, 0, 96, W, 0.5, C.divider);

  // Section header
  txt(f, 'TASKS', 20, 110, 120, 12, C.textTert, 'SemiBold');

  // Task items
  const tasks = [
    { title: 'Prepare weekly report', time: '9:00 AM', done: false, tagColor: C.error },
    { title: 'Reply to client email', time: '11:30 AM', done: true, tagColor: C.warning },
    { title: 'Lunch meeting', time: '12:30 PM', done: false, tagColor: C.success },
    { title: 'Code review session', time: '3:00 PM', done: false, tagColor: C.primary },
  ];

  let ty = 132;
  for (const task of tasks) {
    const card = frame(`Task: ${task.title}`, 16, ty, W - 32, 72, C.card);
    card.cornerRadius = 12;
    f.appendChild(card);

    // Left priority bar
    rect(card, 0, 0, 4, 72, task.tagColor, 0);

    // Checkbox
    if (task.done) {
      rect(card, 16, 24, 24, 24, C.primary, 12);
      txt(card, '✓', 16, 25, 24, 14, C.white, 'Bold', 'CENTER');
    } else {
      rect(card, 16, 24, 24, 24, C.bgTertiary, 12);
    }

    // Title
    const titleColor = task.done ? C.textTert : C.text;
    const titleWeight = task.done ? 'Regular' : 'SemiBold';
    txt(card, task.title, 52, 16, W - 90, 15, titleColor, titleWeight);

    // Time
    txt(card, task.time, 52, 38, 150, 13, C.textSec, 'Regular');

    // Chevron
    txt(card, '›', W - 76, 24, 16, 20, C.textTert, 'Regular');

    ty += 80;
  }

  // Upcoming section
  txt(f, 'UPCOMING', 20, ty + 4, 120, 12, C.textTert, 'SemiBold');
  ty += 28;

  const upcoming = [
    { title: 'Gym', time: 'Tomorrow 7:00 AM', tagColor: C.primary },
    { title: 'Dentist appointment', time: 'Feb 21 10:00 AM', tagColor: C.warning },
  ];
  for (const task of upcoming) {
    const card = frame(`Task: ${task.title}`, 16, ty, W - 32, 72, C.card);
    card.cornerRadius = 12;
    f.appendChild(card);
    rect(card, 0, 0, 4, 72, task.tagColor, 0);
    rect(card, 16, 24, 24, 24, C.bgTertiary, 12);
    txt(card, task.title, 52, 16, W - 90, 15, C.text, 'SemiBold');
    txt(card, task.time, 52, 38, 180, 13, C.textSec, 'Regular');
    txt(card, '›', W - 76, 24, 16, 20, C.textTert, 'Regular');
    ty += 80;
  }

  tabBar(f, 0);
  homeIndicator(f);
  return f;
}

// ── Screen 3: Create Task Modal ───────────────────────────────────────────────

async function buildCreateTask(x) {
  const f = frame('3 · Create Task (Modal)', x, 0, W, H, C.bgSecondary);

  // Dimmed background
  rect(f, 0, 0, W, H, C.text, 0, 0.4);

  // Modal sheet
  const modal = frame('Modal Sheet', 0, 280, W, 572, C.bg);
  modal.cornerRadius = 20;
  f.appendChild(modal);

  // Drag handle
  rect(modal, W / 2 - 20, 10, 40, 4, C.border, 2);

  // Title
  txt(modal, 'New Task', 20, 28, W - 40, 18, C.text, 'Bold', 'CENTER');

  // Close button
  rect(modal, W - 52, 20, 32, 32, C.bgSecondary, 16);
  txt(modal, '✕', W - 44, 24, 18, 16, C.textSec, 'Regular');

  let fy = 72;
  // Task title input
  txt(modal, 'Task Title', 20, fy, 120, 12, C.textTert, 'SemiBold');
  fy += 20;
  const titleInput = frame('Title Input', 20, fy, W - 40, 48, C.bg);
  titleInput.cornerRadius = 10;
  titleInput.strokes = [{ type: 'SOLID', color: C.primary }];
  titleInput.strokeWeight = 1.5;
  modal.appendChild(titleInput);
  txt(titleInput, 'e.g. Weekly meeting prep', 16, 14, W - 80, 16, C.textTert, 'Regular');
  fy += 60;

  // Date + Time row
  txt(modal, 'Date & Time', 20, fy, 120, 12, C.textTert, 'SemiBold');
  fy += 20;
  const dateInput = frame('Date Input', 20, fy, (W - 52) / 2, 48, C.bg);
  dateInput.cornerRadius = 10;
  dateInput.strokes = [{ type: 'SOLID', color: C.border }];
  dateInput.strokeWeight = 1;
  modal.appendChild(dateInput);
  txt(dateInput, '📅  Feb 19, 2026', 12, 14, (W - 52) / 2 - 24, 15, C.text, 'Regular');

  const timeInput = frame('Time Input', 20 + (W - 52) / 2 + 12, fy, (W - 52) / 2, 48, C.bg);
  timeInput.cornerRadius = 10;
  timeInput.strokes = [{ type: 'SOLID', color: C.border }];
  timeInput.strokeWeight = 1;
  modal.appendChild(timeInput);
  txt(timeInput, '⏰  9:00 AM', 12, 14, (W - 52) / 2 - 24, 15, C.text, 'Regular');
  fy += 60;

  // Priority
  txt(modal, 'Priority', 20, fy, 100, 12, C.textTert, 'SemiBold');
  fy += 20;
  const priorities = ['High', 'Medium', 'Low', 'None'];
  const priColors = [C.error, C.warning, C.success, C.bgTertiary];
  const priW = (W - 56) / 4;
  priorities.forEach((p, i) => {
    const pBtn = frame(`Priority ${p}`, 20 + i * (priW + 4), fy, priW, 36, i === 1 ? priColors[i] : C.bgSecondary);
    pBtn.cornerRadius = 8;
    modal.appendChild(pBtn);
    txt(pBtn, p, 0, 9, priW, 14, i === 1 ? C.white : C.textSec, i === 1 ? 'SemiBold' : 'Regular', 'CENTER');
  });
  fy += 48;

  // Reminder
  txt(modal, 'Reminder', 20, fy, 100, 12, C.textTert, 'SemiBold');
  fy += 20;
  const remInput = frame('Reminder Input', 20, fy, W - 40, 48, C.bg);
  remInput.cornerRadius = 10;
  remInput.strokes = [{ type: 'SOLID', color: C.border }];
  remInput.strokeWeight = 1;
  modal.appendChild(remInput);
  txt(remInput, '🔔  30 min before', 16, 14, W - 80, 15, C.text, 'Regular');
  txt(remInput, '›', W - 74, 14, 16, 20, C.textTert, 'Regular');
  fy += 60;

  // Save button
  const saveBtn = frame('Save Button', 20, fy, W - 40, 52, C.primary);
  saveBtn.cornerRadius = 14;
  modal.appendChild(saveBtn);
  txt(saveBtn, 'Save Task', 0, 15, W - 40, 18, C.white, 'SemiBold', 'CENTER');

  homeIndicator(f);
  return f;
}

// ── Screen 4: Settings ────────────────────────────────────────────────────────

async function buildSettings(x) {
  const f = frame('4 · Settings', x, 0, W, H, C.bgSecondary);

  statusBar(f);

  // Header
  rect(f, 0, 0, W, 96, C.bg);
  txt(f, 'Settings', 20, 56, W - 40, 22, C.text, 'Bold', 'CENTER');
  rect(f, 0, 96, W, 0.5, C.divider);

  let sy = 112;

  // Account section
  txt(f, 'ACCOUNT', 20, sy, 120, 12, C.textTert, 'SemiBold');
  sy += 24;

  const profileCard = frame('Profile Card', 16, sy, W - 32, 80, C.card);
  profileCard.cornerRadius = 12;
  f.appendChild(profileCard);
  // Avatar
  rect(profileCard, 16, 16, 48, 48, C.primaryBg, 24);
  txt(profileCard, 'A', 16, 20, 48, 22, C.primary, 'Bold', 'CENTER');
  txt(profileCard, 'Alan', 76, 16, 200, 17, C.text, 'SemiBold');
  txt(profileCard, 'alan@hububble.co', 76, 42, 240, 14, C.textSec, 'Regular');
  // Member badge
  rect(profileCard, W - 108, 26, 68, 24, C.primaryBg, 12);
  txt(profileCard, 'Free Plan', W - 108, 29, 68, 13, C.primary, 'SemiBold', 'CENTER');
  sy += 92;

  // Preferences section
  txt(f, 'PREFERENCES', 20, sy, 150, 12, C.textTert, 'SemiBold');
  sy += 24;

  const prefItems = [
    { icon: '🌐', label: 'Language', value: 'Traditional Chinese' },
    { icon: '🎨', label: 'Appearance', value: 'System' },
    { icon: '🔔', label: 'Notifications', value: '30, 10, 5 min' },
  ];

  const prefCard = frame('Preferences Card', 16, sy, W - 32, prefItems.length * 56, C.card);
  prefCard.cornerRadius = 12;
  f.appendChild(prefCard);
  for (let i = 0; i < prefItems.length; i++) {
    const item = prefItems[i];
    const iy = i * 56;
    txt(prefCard, `${item.icon}  ${item.label}`, 16, iy + 18, 180, 16, C.text, 'Regular');
    txt(prefCard, item.value, 0, iy + 19, W - 88, 14, C.textSec, 'Regular', 'RIGHT');
    txt(prefCard, '›', W - 68, iy + 18, 16, 20, C.textTert, 'Regular');
    if (i < prefItems.length - 1) rect(prefCard, 16, (i + 1) * 56, W - 64, 0.5, C.divider);
  }
  sy += prefItems.length * 56 + 20;

  // About section
  txt(f, 'ABOUT', 20, sy, 100, 12, C.textTert, 'SemiBold');
  sy += 24;

  const aboutItems = [
    { label: 'Version', value: '1.2.8 (Build 16)', hasChevron: false },
    { label: 'Check for Updates', value: '', hasChevron: true },
    { label: 'Terms of Use', value: '', hasChevron: true },
    { label: 'Privacy Policy', value: '', hasChevron: true },
    { label: 'Support', value: '', hasChevron: true },
    { label: 'Rate App ⭐', value: '', hasChevron: true },
  ];

  const aboutCard = frame('About Card', 16, sy, W - 32, aboutItems.length * 52, C.card);
  aboutCard.cornerRadius = 12;
  f.appendChild(aboutCard);
  for (let i = 0; i < aboutItems.length; i++) {
    const item = aboutItems[i];
    const iy = i * 52;
    txt(aboutCard, item.label, 16, iy + 16, 220, 16, C.text, 'Regular');
    if (item.value) {
      txt(aboutCard, item.value, 0, iy + 17, W - 80, 14, C.textSec, 'Regular', 'RIGHT');
    } else if (item.hasChevron) {
      txt(aboutCard, '›', W - 64, iy + 15, 16, 20, C.textTert, 'Regular');
    }
    if (i < aboutItems.length - 1) rect(aboutCard, 16, (i + 1) * 52, W - 64, 0.5, C.divider);
  }
  sy += aboutItems.length * 52 + 20;

  // Sign out
  const signOut = frame('Sign Out', 16, sy, W - 32, 52, C.card);
  signOut.cornerRadius = 12;
  f.appendChild(signOut);
  txt(signOut, 'Sign Out', 0, 14, W - 32, 18, C.error, 'SemiBold', 'CENTER');

  tabBar(f, 2);
  homeIndicator(f);
  return f;
}

// ── Screen 5: Terms of Use ────────────────────────────────────────────────────

async function buildTerms(x) {
  const f = frame('5 · Terms of Use', x, 0, W, H, C.bgSecondary);

  statusBar(f);

  // Header with back button
  rect(f, 0, 44, W, 64, C.bgSecondary);
  txt(f, '‹', 12, 52, 24, 28, C.primary, 'Regular');
  txt(f, 'Terms of Use', 20, 57, W - 40, 18, C.text, 'SemiBold', 'CENTER');
  txt(f, 'Last updated: January 1, 2024', 20, 83, W - 40, 12, C.textTert, 'Regular', 'CENTER');
  rect(f, 0, 104, W, 0.5, C.divider);

  let ty = 116;
  const sections = [
    { title: '1. Acceptance of Terms', body: 'By using this application, you agree to be bound by these Terms of Service.' },
    { title: '2. Service Description', body: 'This app provides to-do task management and calendar integration functionality.' },
    { title: '3. User Accounts', body: 'You must create an account to use all features of this service. Keep your credentials secure.' },
    { title: '4. User Content', body: 'You retain ownership of all content you create within the app. We do not claim ownership.' },
    { title: '5. Acceptable Use', body: 'You agree not to misuse the service or help anyone else do so.' },
    { title: '6. Privacy', body: 'Your use of this service is also governed by our Privacy Policy, incorporated by reference.' },
  ];

  for (const sec of sections) {
    const sCard = frame(sec.title, 16, ty, W - 32, 84, C.card);
    sCard.cornerRadius = 12;
    f.appendChild(sCard);
    txt(sCard, sec.title, 16, 12, W - 64, 15, C.text, 'SemiBold');
    txt(sCard, sec.body, 16, 36, W - 64, 13, C.textSec, 'Regular');
    ty += 96;
  }

  homeIndicator(f);
  return f;
}

// ── Screen 6: Privacy Policy ──────────────────────────────────────────────────

async function buildPrivacy(x) {
  const f = frame('6 · Privacy Policy', x, 0, W, H, C.bgSecondary);

  statusBar(f);

  // Header
  rect(f, 0, 44, W, 64, C.bgSecondary);
  txt(f, '‹', 12, 52, 24, 28, C.primary, 'Regular');
  txt(f, 'Privacy Policy', 20, 57, W - 40, 18, C.text, 'SemiBold', 'CENTER');
  txt(f, 'Last updated: January 1, 2024', 20, 83, W - 40, 12, C.textTert, 'Regular', 'CENTER');
  rect(f, 0, 104, W, 0.5, C.divider);

  let py = 116;
  const sections = [
    { title: '1. Information Collection', body: 'We collect your email address and usage data to improve the service experience.' },
    { title: '2. How We Use Your Data', body: 'Your data is used solely to provide and improve the app features and functionality.' },
    { title: '3. Data Storage', body: 'Your data is securely stored on Supabase cloud infrastructure with encryption.' },
    { title: '4. Data Sharing', body: 'We do not sell or share your personal data with third parties for marketing purposes.' },
    { title: '5. Your Rights', body: 'You can request deletion of your account and all associated data at any time.' },
    { title: '6. Contact Us', body: 'For privacy concerns, contact us at support@taskcal.app or via GitHub Issues.' },
  ];

  for (const sec of sections) {
    const sCard = frame(sec.title, 16, py, W - 32, 84, C.card);
    sCard.cornerRadius = 12;
    f.appendChild(sCard);
    txt(sCard, sec.title, 16, 12, W - 64, 15, C.text, 'SemiBold');
    txt(sCard, sec.body, 16, 36, W - 64, 13, C.textSec, 'Regular');
    py += 96;
  }

  homeIndicator(f);
  return f;
}

// ── Screen 7: Support ─────────────────────────────────────────────────────────

async function buildSupport(x) {
  const f = frame('7 · Support', x, 0, W, H, C.bgSecondary);

  statusBar(f);

  // Header
  rect(f, 0, 44, W, 64, C.bgSecondary);
  txt(f, '‹', 12, 52, 24, 28, C.primary, 'Regular');
  txt(f, 'Support', 20, 57, W - 40, 18, C.text, 'SemiBold', 'CENTER');
  rect(f, 0, 108, W, 0.5, C.divider);

  // Centered content
  txt(f, 'Support', 20, 200, W - 40, 28, C.text, 'Bold', 'CENTER');
  txt(f, 'If you encounter any issues or have\nsuggestions, contact us via GitHub Issues.', 40, 254, W - 80, 16, C.textSec, 'Regular', 'CENTER');

  // GitHub button
  const ghBtn = frame('GitHub Issues Button', 20, 344, W - 40, 56, C.primary);
  ghBtn.cornerRadius = 14;
  f.appendChild(ghBtn);
  txt(ghBtn, '🐙  Open GitHub Issues', 0, 17, W - 40, 18, C.white, 'SemiBold', 'CENTER');

  // Email button
  const emailBtn = frame('Email Button', 20, 412, W - 40, 56, C.bg);
  emailBtn.cornerRadius = 14;
  emailBtn.strokes = [{ type: 'SOLID', color: C.border }];
  emailBtn.strokeWeight = 1;
  f.appendChild(emailBtn);
  txt(emailBtn, '✉️  Email Support', 0, 17, W - 40, 18, C.primary, 'SemiBold', 'CENTER');

  // Version note
  txt(f, 'TaskCal v1.2.8 (Build 16)', 20, 500, W - 40, 13, C.textTert, 'Regular', 'CENTER');

  homeIndicator(f);
  return f;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Load Inter Regular first (required baseline)
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  loadedStyles.add('Regular');
  // Try to load other weights — skip if unavailable
  for (const style of ['Medium', 'SemiBold', 'Bold']) {
    try {
      await figma.loadFontAsync({ family: 'Inter', style });
      loadedStyles.add(style);
    } catch (e) {
      // Not available, txt() will fall back to a loaded style
    }
  }

  let xOffset = 0;

  const screens = [];
  screens.push(await buildLogin(xOffset));       xOffset += W + GAP;
  screens.push(await buildTaskList(xOffset));    xOffset += W + GAP;
  screens.push(await buildCreateTask(xOffset));  xOffset += W + GAP;
  screens.push(await buildSettings(xOffset));    xOffset += W + GAP;
  screens.push(await buildTerms(xOffset));       xOffset += W + GAP;
  screens.push(await buildPrivacy(xOffset));     xOffset += W + GAP;
  screens.push(await buildSupport(xOffset));

  figma.currentPage.selection = screens;
  figma.viewport.scrollAndZoomIntoView(screens);

  figma.closePlugin(`✅ Done! Generated ${screens.length} screens for Too-Doo-List`);
}

main().catch(err => {
  const msg = err ? (err.message || String(err)) : 'unknown error';
  figma.closePlugin('❌ Error: ' + msg);
});
