// script.js – 안심거래 client logic
// -------------------------------------------------
// This script powers the entire single‑page app using plain JavaScript.
// Data is persisted in the browser's LocalStorage (no backend required).
// -------------------------------------------------

// ---------- Utility Functions ----------
const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

// Simple UUID generator for IDs
function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

// LocalStorage helpers
function load(key, fallback) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ----- Data Structures -----
let users = load('ansim_users', []); // [{id,email,passwordHash}]
let sellers = load('ansim_sellers', []); // [{id,nickname,contact}]
let reports = load('ansim_reports', []); // [{id,sellerId,reason,details,createdAt}]
let currentUser = load('ansim_currentUser', null);

// Pre‑populate some sellers for demo purposes
if (sellers.length === 0) {
  sellers = [
    { id: generateId(), nickname: 'kim123', contact: '010-1111-2222' },
    { id: generateId(), nickname: 'lee_seller', contact: '010-3333-4444' },
    { id: generateId(), nickname: 'park_market', contact: '010-5555-6666' }
  ];
  save('ansim_sellers', sellers);
}

// -------------------------------------------------
// UI Rendering Helpers
// -------------------------------------------------
function clearMain() {
  $('#main').innerHTML = '';
}

function showSection(sectionHtml) {
  clearMain();
  $('#main').innerHTML = `<div class="card">${sectionHtml}</div>`;
}

function updateNavVisibility() {
  const loggedIn = !!currentUser;
  // Show/hide nav buttons based on auth state
  $('[data-section="login"]').style.display = loggedIn ? 'none' : 'inline-block';
  $('[data-section="register"]').style.display = loggedIn ? 'none' : 'inline-block';
  $('[data-section="search"]').style.display = loggedIn ? 'inline-block' : 'none';
  $('[data-section="report"]').style.display = loggedIn ? 'inline-block' : 'none';
  $('#logoutBtn').style.display = loggedIn ? 'inline-block' : 'none';
}

// -------------------------------------------------
// Authentication Flow
// -------------------------------------------------
function renderLogin() {
  const html = `
    <h2>로그인</h2>
    <form id="loginForm">
      <label>이메일</label>
      <input type="email" id="loginEmail" required />
      <label>비밀번호</label>
      <input type="password" id="loginPwd" required />
      <button type="submit" class="action-btn">로그인</button>
    </form>
    <p id="loginMsg" style="color:#f66; margin-top:0.5rem;"></p>
  `;
  showSection(html);
  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const pwd = $('#loginPwd').value.trim();
    const user = users.find(u => u.email === email && u.passwordHash === btoa(pwd));
    const msg = $('#loginMsg');
    if (user) {
      currentUser = { id: user.id, email: user.email };
      save('ansim_currentUser', currentUser);
      msg.textContent = '';
      updateNavVisibility();
      renderWelcome();
    } else {
      msg.textContent = '이메일 또는 비밀번호가 올바르지 않습니다.';
    }
  });
}

function renderRegister() {
  const html = `
    <h2>회원가입</h2>
    <form id="registerForm">
      <label>이메일</label>
      <input type="email" id="regEmail" required />
      <label>비밀번호</label>
      <input type="password" id="regPwd" required />
      <button type="submit" class="action-btn">가입하기</button>
    </form>
    <p id="regMsg" style="color:#f66; margin-top:0.5rem;"></p>
  `;
  showSection(html);
  $('#registerForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#regEmail').value.trim();
    const pwd = $('#regPwd').value.trim();
    const msg = $('#regMsg');
    if (users.some(u => u.email === email)) {
      msg.textContent = '이미 사용 중인 이메일입니다.';
      return;
    }
    const newUser = { id: generateId(), email, passwordHash: btoa(pwd) };
    users.push(newUser);
    save('ansim_users', users);
    msg.style.color = '#6dd5fa';
    msg.textContent = '회원가입 성공! 이제 로그인해주세요.';
  });
}

function logout() {
  currentUser = null;
  localStorage.removeItem('ansim_currentUser');
  updateNavVisibility();
  renderWelcome();
}

function renderWelcome() {
  const html = `
    <h2>안심거래에 오신 것을 환영합니다${currentUser ? ', ' + currentUser.email : ''}!</h2>
    <p>상단 메뉴에서 원하는 기능을 선택하세요.</p>
  `;
  showSection(html);
}

// -------------------------------------------------
// Seller Search & Report Viewing
// -------------------------------------------------
function renderSearch() {
  const html = `
    <h2>판매자 조회</h2>
    <form id="searchForm">
      <label>닉네임 또는 연락처</label>
      <input type="text" id="searchQuery" placeholder="예) kim123 혹은 010-1111-2222" required />
      <button type="submit" class="action-btn">검색</button>
    </form>
    <div id="searchResult" style="margin-top:1rem;"></div>
  `;
  showSection(html);
  $('#searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('#searchQuery').value.trim().toLowerCase();
    const matched = sellers.filter(s =>
      s.nickname.toLowerCase().includes(q) || s.contact.replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, ''))
    );
    const container = $('#searchResult');
    if (matched.length === 0) {
      container.innerHTML = '<p>검색 결과가 없습니다.</p>';
      return;
    }
    // Show first match (for simplicity) with report summary
    const seller = matched[0];
    const sellerReports = reports.filter(r => r.sellerId === seller.id);
    const count = sellerReports.length;
    const recent = sellerReports.slice(-3).reverse();
    let reportHtml = '';
    recent.forEach(r => {
      reportHtml += `<div class="report-item"><div class="report-title">${r.reason}</div><div>${r.details}</div><small>${new Date(r.createdAt).toLocaleString()}</small></div>`;
    });
    container.innerHTML = `
      <div class="card" style="margin-top:0.5rem;">
        <h3>판매자: ${seller.nickname}</h3>
        <p>연락처: ${seller.contact}</p>
        <p>신고 건수: ${count}</p>
        <h4>최근 신고</h4>
        ${reportHtml || '<p>없음</p>'}
      </div>
    `;
  });
}

// -------------------------------------------------
// Report Registration
// -------------------------------------------------
function renderReportForm() {
  const html = `
    <h2>신고 등록</h2>
    <form id="reportForm">
      <label>판매자 닉네임 또는 연락처</label>
      <input type="text" id="repSeller" required placeholder="예) kim123" />
      <label>신고 사유</label>
      <input type="text" id="repReason" required />
      <label>상세 내용</label>
      <textarea id="repDetails" rows="4" required></textarea>
      <button type="submit" class="action-btn">제출</button>
    </form>
    <p id="repMsg" style="color:#6dd5fa; margin-top:0.5rem;"></p>
  `;
  showSection(html);
  $('#reportForm').addEventListener('submit', e => {
    e.preventDefault();
    const query = $('#repSeller').value.trim().toLowerCase();
    let seller = sellers.find(s =>
      s.nickname.toLowerCase() === query || s.contact.replace(/[^0-9]/g, '') === query.replace(/[^0-9]/g, '')
    );
    const msg = $('#repMsg');

    // 존재하지 않는 가상의 판매자인 경우 자동으로 신규 생성 등록
    if (!seller) {
      const isContact = /^[0-9-]{9,15}$/.test(query.replace(/[^0-9-]/g, ''));
      const newSellerId = generateId();

      seller = {
        id: newSellerId,
        nickname: isContact ? `가상판매자_${Math.floor(Math.random() * 9000 + 1000)}` : $('#repSeller').value.trim(),
        contact: isContact ? $('#repSeller').value.trim() : '010-0000-0000'
      };

      sellers.push(seller);
      save('ansim_sellers', sellers);
    }

    const newReport = {
      id: generateId(),
      sellerId: seller.id,
      reason: $('#repReason').value.trim(),
      details: $('#repDetails').value.trim(),
      createdAt: new Date().toISOString()
    };
    reports.push(newReport);
    save('ansim_reports', reports);
    msg.style.color = '#6dd5fa';
    msg.textContent = `신고가 완료되었습니다. (판매자명: ${seller.nickname})`;
    // optional: clear form
    e.target.reset();
  });
}

// -------------------------------------------------
// Event Listeners – Navigation
// -------------------------------------------------
function bindNav() {
  $$('#nav button[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.getAttribute('data-section');
      switch (section) {
        case 'login':
          renderLogin();
          break;
        case 'register':
          renderRegister();
          break;
        case 'search':
          renderSearch();
          break;
        case 'report':
          renderReportForm();
          break;
      }
    });
  });
  $('#logoutBtn').addEventListener('click', logout);
}

// -------------------------------------------------
// Initialization
// -------------------------------------------------
function init() {
  updateNavVisibility();
  bindNav();
  renderWelcome();
}

document.addEventListener('DOMContentLoaded', init);
