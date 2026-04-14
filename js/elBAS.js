/**
 * elBAS.js — Script utama eL-BAS Official
 * Satu file untuk semua halaman
 * Supabase: berita & galeri
 * =============================================
 */

// =============================================
// KONFIGURASI SUPABASE
// =============================================
const SUPA = {
  url: 'https://jzwuzbxbcgcfpdfogwrp.supabase.co',
  key: 'sb_publishable_xqJszcSrSzwVe60ou32qdw_pucnPlx1',
  headers() {
    return {
      'apikey': this.key,
      'Authorization': 'Bearer ' + this.key,
      'Content-Type': 'application/json'
    };
  },
  async get(table, params = '') {
    const res = await fetch(`${this.url}/rest/v1/${table}?${params}`, {
      headers: this.headers()
    });
    if (!res.ok) throw new Error(`Supabase error ${res.status}`);
    return res.json();
  }
};

// =============================================
// CACHE — pakai sessionStorage biar hemat request
// =============================================
const CACHE = {
  ttl: 5 * 60 * 1000, // 5 menit
  set(key, data) {
    try {
      sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch(e) {}
  },
  get(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts > this.ttl) { sessionStorage.removeItem(key); return null; }
      return parsed.data;
    } catch(e) { return null; }
  }
};

// =============================================
// LOADER UTILITY
// =============================================
function showLoader(el, msg = 'Memuat data...') {
  if (!el) return;
  el.innerHTML = `
    <div style="text-align:center;padding:48px 24px;color:#aaa">
      <div style="display:inline-block;width:36px;height:36px;border:3px solid #e0e0e0;border-top-color:#1B5E20;border-radius:50%;animation:spin .7s linear infinite;margin-bottom:14px"></div>
      <p style="font-size:.85rem">${msg}</p>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;
}

// =============================================
// HALAMAN: INDEX.HTML
// Tampil 3 berita terbaru + 6 galeri terbaru
// =============================================
async function initIndex() {
  await Promise.all([
    loadBeritaIndex(),
    loadGaleriIndex()
  ]);
}

async function loadBeritaIndex() {
  const grid = document.getElementById('beritaGrid');
  if (!grid) return;
  showLoader(grid);

  try {
    let data = CACHE.get('berita_all');
    if (!data) {
      data = await SUPA.get('berita', 'order=tanggal.desc&limit=3');
      CACHE.set('berita_all', data);
    } else {
      data = data.slice(0, 3);
    }
    renderBeritaCards(grid, data);
  } catch(e) {
    grid.innerHTML = '<div style="text-align:center;padding:32px;color:#aaa;font-size:.85rem">Gagal memuat berita.</div>';
  }
}

function renderBeritaCards(grid, data) {
  if (!data || !data.length) {
    grid.innerHTML = '<div style="text-align:center;padding:32px;color:#aaa;font-size:.85rem">Belum ada berita.</div>';
    return;
  }
  const bdg = k => k === 'Akademik' ? 'akademik' : k === 'Pesantren' ? 'pesantren' : k === 'Prestasi' ? 'prestasi' : '';
  grid.innerHTML = data.map((b, i) => `
    <div class="berita-card reveal" style="transition-delay:${i * 0.1}s">
      <div class="berita-img">
        ${b.gambar
          ? `<img src="${escHtml(b.gambar)}" alt="${escHtml(b.judul)}" loading="lazy" onerror="this.style.display='none'">`
          : `<div style="height:200px;background:rgba(27,94,32,.07);display:flex;align-items:center;justify-content:center;font-size:2.5rem">📰</div>`
        }
        <span class="berita-badge ${bdg(b.kategori)}">${escHtml(b.kategori || 'Berita')}</span>
      </div>
      <div class="berita-body">
        <p class="berita-date"><i class="far fa-calendar"></i> ${escHtml(b.tanggal || '')}</p>
        <h3>${escHtml(b.judul)}</h3>
        <p>${escHtml(b.ringkas || '')}</p>
        <a href="berita-detail.html?id=${encodeURIComponent(b.id)}" class="berita-read">
          Baca Selengkapnya <i class="fas fa-arrow-right"></i>
        </a>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

async function loadGaleriIndex() {
  const grid = document.getElementById('galeriGrid');
  if (!grid) return;

  try {
    let data = CACHE.get('galeri_all');
    if (!data) {
      data = await SUPA.get('galeri', 'order=created_at.desc&limit=6');
      CACHE.set('galeri_all', data);
    }
    const shown = data.slice(0, 6);
    grid.innerHTML = shown.map((g, i) => {
      const src = g.foto || g.url || g.image_url || g.gambar || '';
      const cap = g.caption || g.judul || g.title || '';
      return `
        <div class="galeri-item reveal" style="transition-delay:${(i * 0.08).toFixed(2)}s"
             onclick="openLightbox('${escAttr(src)}')">
          <img src="${escAttr(src)}" alt="${escAttr(cap)}" loading="lazy"
               onerror="this.parentElement.style.display='none'">
          <div class="galeri-caption">${escHtml(cap)}</div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.galeri-item').forEach(el => obs.observe(el));
  } catch(e) {}
}

// =============================================
// HALAMAN: BERITA.HTML
// =============================================
async function initBerita() {
  const el = document.getElementById('newsList');
  const sbEl = document.getElementById('sbList');
  if (!el) return;
  showLoader(el, 'Memuat berita...');

  try {
    let data = CACHE.get('berita_all');
    if (!data) {
      data = await SUPA.get('berita', 'order=tanggal.desc');
      CACHE.set('berita_all', data);
    }
    window.semuaBerita = data || [];
    renderBeritaList(data);
    if (sbEl) renderSidebar(sbEl, data);
  } catch(e) {
    el.innerHTML = '<div class="empty"><i class="fas fa-newspaper"></i><p>Gagal memuat berita.</p></div>';
  }
}

function renderBeritaList(data) {
  const el = document.getElementById('newsList');
  if (!el) return;
  if (!data || !data.length) {
    el.innerHTML = '<div class="empty"><i class="fas fa-newspaper"></i><p>Belum ada berita.</p></div>';
    return;
  }
  let html = '';
  data.forEach((b, i) => {
    if (i === 0) {
      html += `
        <div class="news-featured" onclick="location.href='berita-detail.html?id=${encodeURIComponent(b.id)}'" style="animation-delay:0s">
          ${b.gambar ? `<div class="news-featured-img"><img src="${escAttr(b.gambar)}" alt="${escAttr(b.judul)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=news-placeholder>📰</div>'"></div>` : ''}
          <span class="n-cat ${escAttr(b.kategori||'')}">${escHtml(b.kategori||'Berita')}</span>
          <a class="n-title" href="berita-detail.html?id=${encodeURIComponent(b.id)}" style="font-size:1.3rem;margin-top:6px;display:block">${escHtml(b.judul)}</a>
          <div class="n-meta" style="margin:6px 0">
            <span><i class="fas fa-user"></i> eL-BAS</span>
            <span><i class="fas fa-calendar"></i> ${escHtml(b.tanggal||'')}</span>
          </div>
          <p class="n-excerpt">${escHtml(b.ringkas||'')}</p>
        </div>`;
    } else {
      html += `
        <div class="news-item" onclick="location.href='berita-detail.html?id=${encodeURIComponent(b.id)}'" style="animation-delay:${i*0.05}s">
          <div class="news-thumb">
            ${b.gambar
              ? `<img src="${escAttr(b.gambar)}" alt="${escAttr(b.judul)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=news-placeholder>📰</div>'">`
              : '<div class="news-placeholder">📰</div>'}
          </div>
          <div class="news-body">
            <span class="n-cat ${escAttr(b.kategori||'')}">${escHtml(b.kategori||'Berita')}</span>
            <a class="n-title" href="berita-detail.html?id=${encodeURIComponent(b.id)}">${escHtml(b.judul)}</a>
            <div class="n-meta">
              <span><i class="fas fa-user"></i> eL-BAS</span>
              <span><i class="fas fa-calendar"></i> ${escHtml(b.tanggal||'')}</span>
            </div>
          </div>
        </div>`;
    }
  });
  el.innerHTML = html;
}

function renderSidebar(sbEl, data) {
  sbEl.innerHTML = (data||[]).slice(0,6).map(b => `
    <div class="sb-item" onclick="location.href='berita-detail.html?id=${encodeURIComponent(b.id)}'">
      <div class="sb-thumb">${b.gambar ? `<img src="${escAttr(b.gambar)}" loading="lazy" onerror="this.style.display='none'">` : ''}</div>
      <div class="sb-info">
        <a href="berita-detail.html?id=${encodeURIComponent(b.id)}">${escHtml(b.judul)}</a>
        <p><i class="fas fa-calendar" style="font-size:.62rem"></i> ${escHtml(b.tanggal||'')}</p>
      </div>
    </div>
  `).join('');
}

function filterBerita(kat, btn) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = kat === 'semua'
    ? (window.semuaBerita || [])
    : (window.semuaBerita || []).filter(b => b.kategori === kat);
  renderBeritaList(filtered);
}

// =============================================
// HALAMAN: BERITA-DETAIL.HTML
// =============================================
async function initBeritaDetail() {
  const id = new URLSearchParams(window.location.search).get('id');
  const el = document.getElementById('detailBerita');
  if (!el || !id) { showNotFound(); return; }
  showLoader(el, 'Memuat artikel...');

  try {
    let semua = CACHE.get('berita_all');
    if (!semua) {
      semua = await SUPA.get('berita', 'order=tanggal.desc');
      CACHE.set('berita_all', semua);
    }
    const data = (semua || []).find(b => String(b.id) === String(id));
    if (data) renderDetail(data, semua || []);
    else showNotFound();
  } catch(e) {
    showNotFound();
  }
}

function renderDetail(data, semua) {
  const id = new URLSearchParams(window.location.search).get('id');
  document.title = data.judul + ' — eL-BAS';
  const breadCat = document.getElementById('breadCat');
  if (breadCat) breadCat.textContent = (data.kategori || 'berita').toLowerCase();

  const isi = (data.isi || data.ringkas || '')
    .split('\n').map(p => p.trim() ? `<p>${escHtml(p)}</p>` : '').join('');

  document.getElementById('detailBerita').innerHTML = `
    <article class="article">
      <span class="a-cat ${escAttr(data.kategori||'')}">${escHtml(data.kategori||'Berita')}</span>
      <h1 class="a-title">${escHtml(data.judul)}</h1>
      <div class="a-meta">
        <span><i class="fas fa-user"></i> eL-BAS Official</span>
        <span><i class="fas fa-calendar-alt"></i> ${escHtml(data.tanggal||'')}</span>
        <span><i class="fas fa-folder"></i> ${escHtml(data.kategori||'Berita')}</span>
      </div>
      ${data.gambar ? `
        <div class="a-img">
          <img src="${escAttr(data.gambar)}" alt="${escAttr(data.judul)}" onerror="this.parentElement.style.display='none'">
        </div>
        <p class="a-caption">© Istimewa / eL-BAS Official</p>
      ` : ''}
      <div class="a-body">${isi}</div>
      <div class="a-share">
        <span class="share-label">Bagikan:</span>
        <a class="share-btn share-wa" href="https://wa.me/?text=${encodeURIComponent(data.judul+' '+location.href)}" target="_blank">
          <i class="fab fa-whatsapp"></i> WhatsApp
        </a>
        <a class="share-btn share-fb" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}" target="_blank">
          <i class="fab fa-facebook-f"></i> Facebook
        </a>
        <button class="share-btn share-back" onclick="location.href='berita.html'">
          <i class="fas fa-arrow-left"></i> Kembali
        </button>
      </div>
      ${semua.length > 1 ? `
        <div class="related">
          <div class="related-title">Baca Juga</div>
          <div class="related-grid">
            ${semua.filter(b => String(b.id) !== String(id)).slice(0,4).map(b => `
              <a class="r-item" href="berita-detail.html?id=${encodeURIComponent(b.id)}">
                <div class="r-thumb">${b.gambar ? `<img src="${escAttr(b.gambar)}" loading="lazy" onerror="this.style.display='none'">` : ''}</div>
                <div class="r-body">
                  <h4>${escHtml(b.judul)}</h4>
                  <p><i class="fas fa-calendar-alt" style="font-size:.62rem"></i> ${escHtml(b.tanggal||'')}</p>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </article>
  `;

  const sbEl = document.getElementById('sbList');
  if (sbEl) renderSidebar(sbEl, semua.filter(b => String(b.id) !== String(id)));
}

function showNotFound() {
  const el = document.getElementById('detailBerita');
  if (!el) return;
  el.innerHTML = `
    <div class="not-found">
      <i class="fas fa-newspaper"></i>
      <h3>Berita tidak ditemukan</h3>
      <p>Berita yang kamu cari tidak ada atau sudah dihapus.</p>
      <a href="berita.html"><i class="fas fa-arrow-left"></i> Kembali ke Berita</a>
    </div>
  `;
}

// =============================================
// INTERSECTION OBSERVER — untuk animasi reveal
// =============================================
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.05 });

// =============================================
// HALAMAN: GALERI.HTML
// =============================================
let _lbIdx = 0;

async function initGaleri() {
  const grid = document.getElementById('galeriGrid');
  const empty = document.getElementById('galeriEmpty');
  const countEl = document.getElementById('galeriCount');
  if (!grid) return;

  showLoader(grid, 'Memuat galeri...');

  try {
    let data = CACHE.get('galeri_all');
    if (!data) {
      data = await SUPA.get('galeri', 'order=created_at.desc');
      CACHE.set('galeri_all', data);
    }
    window.galeriData = data || [];

    if (countEl) countEl.textContent = window.galeriData.length + ' foto';

    if (!window.galeriData.length) {
      grid.style.display = 'none';
      if (empty) { empty.style.display = 'flex'; empty.style.display = 'block'; }
      return;
    }

    renderGaleriGrid();
  } catch(e) {
    console.error('Galeri error:', e);
    grid.innerHTML = '<div class="g-empty"><i class="fas fa-images"></i><p>Gagal memuat galeri.</p></div>';
  }
}

function renderGaleriGrid() {
  const grid = document.getElementById('galeriGrid');
  if (!grid || !window.galeriData) return;

  grid.innerHTML = window.galeriData.map((g, i) => {
    // Support kolom: foto | url | image_url | gambar
    const src = g.foto || g.url || g.image_url || g.gambar || '';
    const cap = g.caption || g.judul || g.title || '';
    return `
      <div class="g-item" style="transition-delay:${(i * 0.05).toFixed(2)}s" onclick="openLb(${i})">
        <img src="${escAttr(src)}" alt="${escAttr(cap)}" loading="lazy"
             onerror="this.parentElement.style.display='none'">
        <div class="g-overlay">
          <div class="g-overlay-content">
            <span class="g-caption-text">${escHtml(cap)}</span>
            <span class="g-zoom"><i class="fas fa-expand"></i></span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.g-item').forEach(el => obs.observe(el));
}

// setView — toggle masonry / uniform grid
function setView(mode) {
  const grid = document.getElementById('galeriGrid');
  if (!grid) return;
  grid.className = mode === 'masonry' ? 'g-masonry' : 'g-uniform';
  document.getElementById('btnMasonry')?.classList.toggle('active', mode === 'masonry');
  document.getElementById('btnUniform')?.classList.toggle('active', mode === 'uniform');
}

// =============================================
// LIGHTBOX
// =============================================
function _getGaleriSrc(g) {
  return g.foto || g.url || g.image_url || g.gambar || '';
}
function _getGaleriCap(g) {
  return g.caption || g.judul || g.title || '';
}

function openLb(idx) {
  _lbIdx = idx;
  _showLbPhoto();
  const lb = document.getElementById('lightbox');
  if (lb) { lb.classList.add('active'); document.body.style.overflow = 'hidden'; }
}

function closeLb() {
  const lb = document.getElementById('lightbox');
  if (lb) { lb.classList.remove('active'); document.body.style.overflow = ''; }
}

function _showLbPhoto() {
  const data = window.galeriData || [];
  if (!data.length) return;
  const g = data[_lbIdx];
  const img = document.getElementById('lbImg');
  const cap = document.getElementById('lbCaption');
  const ctr = document.getElementById('lbCounter');
  if (img) img.src = _getGaleriSrc(g);
  if (cap) cap.textContent = _getGaleriCap(g);
  if (ctr) ctr.textContent = (_lbIdx + 1) + ' / ' + data.length;
}

function prevPhoto(e) {
  e && e.stopPropagation();
  const len = (window.galeriData || []).length;
  _lbIdx = (_lbIdx - 1 + len) % len;
  _showLbPhoto();
}

function nextPhoto(e) {
  e && e.stopPropagation();
  const len = (window.Data || []).length;
  _lbIdx = (_lbIdx + 1) % len;
  _showLbPhoto();
}

function handleLbClick(e) {
  if (e.target === document.getElementById('lightbox')) closeLb();
}

// Keyboard nav lightbox
document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  if (!lb || !lb.classList.contains('active')) return;
  if (e.key === 'ArrowLeft') prevPhoto();
  else if (e.key === 'ArrowRight') nextPhoto();
  else if (e.key === 'Escape') closeLb();
});

// =============================================
// SANITASI — cegah XSS
// =============================================
function escHtml(str) {
  return String(str||'')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escAttr(str) {
  return String(str||'').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// =============================================
// FUNGSI KHUSUS UNTUK INDEX.HTML
// =============================================

// NAVBAR SCROLL
function initNavbarScroll() {
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// MOBILE MENU
function initMobileMenu() {
  window.toggleMenu = function() {
    document.getElementById('navMobile')?.classList.toggle('open');
    document.getElementById('hamburger')?.classList.toggle('open');
  };
  window.closeMenu = function() {
    document.getElementById('navMobile')?.classList.remove('open');
    document.getElementById('hamburger')?.classList.remove('open');
  };
}

// COUNTER ANIMATION (untuk angka di hero)
function initCounterAnimation() {
  function animateCount(el, target, suffix) {
    let v = 0, dur = 1800, step = target / (dur / 16);
    const t = setInterval(() => {
      v += step;
      if (v >= target) { el.textContent = target + suffix; clearInterval(t); }
      else el.textContent = Math.floor(v) + suffix;
    }, 16);
  }

  const cObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCount(e.target, +e.target.dataset.target, e.target.dataset.suffix || '');
        cObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-target]').forEach(el => cObs.observe(el));
}

// ACTIVE NAV HIGHLIGHT
function initActiveNav() {
  const navSections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    const y = window.scrollY + 90;
    navSections.forEach(s => {
      const a = document.querySelector(`.nav-links a[href="#${s.id}"]`);
      if (a) a.classList.toggle('active', y >= s.offsetTop && y < s.offsetTop + s.offsetHeight);
    });
  });
}

// LIGHTBOX UNTUK INDEX (overwrite)
function initIndexLightbox() {
  window.openLightbox = function(src) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    if (img && lb) { img.src = src; lb.classList.add('active'); document.body.style.overflow = 'hidden'; }
  };

  window.closeLightbox = function() {
    const lb = document.getElementById('lightbox');
    if (lb) { lb.classList.remove('active'); document.body.style.overflow = ''; }
  };

  document.getElementById('lightbox')?.addEventListener('click', e => { 
    if (e.target === e.currentTarget) window.closeLightbox(); 
  });
}

// INIT SEMUA FUNGSI INDEX
function initIndexSpecific() {
  initNavbarScroll();
  initMobileMenu();
  initCounterAnimation();
  initActiveNav();
  initIndexLightbox();
}

// Panggil initIndexSpecific hanya jika di halaman index
if (window.location.pathname.split('/').pop() === 'index.html' || window.location.pathname === '/' || window.location.pathname === '') {
  document.addEventListener('DOMContentLoaded', () => {
    initIndexSpecific();
  });
}
// =============================================
// AUTO INIT — detect halaman aktif
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname.split('/').pop() || 'index.html';

  if (path === '' || path === 'index.html') initIndex();
  else if (path === 'berita.html') initBerita();
  else if (path === 'berita-detail.html') initBeritaDetail();
  else if (path === 'galeri.html') initGaleri();
});
