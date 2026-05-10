// ================================================================
// ADMIN.JS — SECURE VERSION
// ✅ Auth via Supabase session (bukan localStorage flag)
// ✅ No credentials di client
// ✅ Anti-tampering session check
// ✅ Auto logout on session expire
// ================================================================

const SUPABASE_URL = 'https://jzwuzbxbcgcfpdfogwrp.supabase.co';
// Ganti dengan anon key dari: Supabase Dashboard → Project Settings → API → anon public
const SUPABASE_ANON_KEY = 'GANTI_DENGAN_ANON_KEY_DARI_SUPABASE_DASHBOARD';

let sb = null;
let currentUser = null;

// ================================================================
// INIT — Cek session PERTAMA sebelum render apapun
// ================================================================
async function initAdmin() {
  // Sembunyiin konten dulu sebelum auth check selesai (anti flash)
  document.body.style.visibility = 'hidden';

  try {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        storageKey: '__elb_auth',
        storage: sessionStorage,
        autoRefreshToken: true
      }
    });

    const { data: { session }, error } = await sb.auth.getSession();

    if (error || !session || !session.user) {
      // Tidak ada session valid → kick ke login
      hardRedirectLogin();
      return;
    }

    // ✅ Session valid
    currentUser = session.user;
    const meta = currentUser.user_metadata || {};
    const role = meta.role || 'admin';
    const name = meta.name || currentUser.email?.split('@')[0] || 'Admin';

    // Render user info di topbar
    renderUserInfo(name, role);

    // Listen session change (logout dari tab lain, expired, dll)
    sb.auth.onAuthStateChange((event, sess) => {
      if (event === 'SIGNED_OUT' || !sess) {
        hardRedirectLogin();
      }
    });

    // Auto session check tiap 60 detik
    setInterval(async () => {
      const { data: { session: s } } = await sb.auth.getSession();
      if (!s) hardRedirectLogin();
    }, 60000);

    // Tampilkan konten
    document.body.style.visibility = 'visible';

    // Init data
    await Promise.all([renderBeritaList(), renderGaleriAdmin()]);
    showTab('berita');

  } catch (err) {
    console.error('Init error:', err);
    hardRedirectLogin();
  }
}

function hardRedirectLogin() {
  // Hard replace (bukan href) biar ga bisa back button bypass
  sessionStorage.clear();
  window.location.replace('login.html');
}

function renderUserInfo(name, role) {
  const badge = document.querySelector('.topbar-badge');
  if (badge) {
    badge.innerHTML = `<i class="fas fa-circle" style="font-size:.5rem;vertical-align:middle;color:#4caf50"></i> ${escapeHtml(name)} <span style="opacity:.6;font-size:.7em">(${escapeHtml(role)})</span>`;
  }
}

// ================================================================
// LOGOUT — Proper Supabase signOut
// ================================================================
window.logout = async function() {
  if (!confirm('Yakin ingin logout?')) return;
  try {
    await sb?.auth.signOut();
  } catch {}
  sessionStorage.clear();
  window.location.replace('login.html');
};

// ================================================================
// TOAST
// ================================================================
function showToast(msg, type = 'success') {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const safe = escapeHtml(msg);
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${safe}`;
  wrap.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ================================================================
// XSS PROTECTION
// ================================================================
function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeInput(str, maxLen = 2000) {
  return String(str || '').trim().slice(0, maxLen);
}

// ================================================================
// SUPABASE HELPER
// ================================================================
async function getSB() {
  if (sb) return sb;
  throw new Error('Supabase not initialized');
}

// ================================================================
// BERITA — CRUD
// ================================================================
let editingId = null;

async function loadBerita() {
  try {
    const client = await getSB();
    const { data, error } = await client
      .from('berita')
      .select('id, judul, tanggal, kategori, ringkas, isi, gambar, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('loadBerita:', err);
    showToast('Gagal load berita', 'error');
    return [];
  }
}

async function renderBeritaList() {
  const berita = await loadBerita();
  const listEl = document.getElementById('adminList');
  const countEl = document.getElementById('countBerita');
  const totalEl = document.getElementById('totalBerita');
  const bulanEl = document.getElementById('bulanIni');

  if (countEl) countEl.textContent = `${berita.length} berita`;
  if (totalEl) totalEl.textContent = berita.length;

  // Hitung berita bulan ini
  if (bulanEl) {
    const now = new Date();
    const bulanIni = berita.filter(b => {
      if (!b.created_at) return false;
      const d = new Date(b.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    bulanEl.textContent = bulanIni;
  }

  if (!listEl) return;

  if (berita.length === 0) {
    listEl.innerHTML = '<div style="text-align:center;padding:40px;color:#999;font-size:.85rem"><i class="fas fa-inbox" style="display:block;font-size:2rem;margin-bottom:8px;opacity:.3"></i>Belum ada berita</div>';
    return;
  }

  listEl.innerHTML = berita.map(b => `
    <div class="berita-list-item">
      <img src="${escapeHtml(b.gambar || 'img/default-berita.jpg')}" class="berita-thumb"
           onerror="this.src='img/default-berita.jpg'" loading="lazy" alt="">
      <div class="berita-list-info">
        <h4>${escapeHtml(b.judul)}</h4>
        <p><i class="far fa-calendar"></i> ${escapeHtml(b.tanggal)} &bull; <span class="badge badge-green">${escapeHtml(b.kategori)}</span></p>
      </div>
      <div class="berita-actions">
        <button class="btn btn-ghost btn-sm" onclick="editBerita(${Number(b.id)})" title="Edit" aria-label="Edit berita"><i class="fas fa-edit"></i></button>
        <button class="btn btn-red btn-sm" onclick="hapusBerita(${Number(b.id)})" title="Hapus" aria-label="Hapus berita"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

window.editBerita = async function(id) {
  id = Number(id);
  if (!Number.isInteger(id) || id <= 0) return;

  const berita = await loadBerita();
  const item = berita.find(b => Number(b.id) === id);
  if (!item) { showToast('Berita tidak ditemukan', 'error'); return; }

  editingId = id;
  document.getElementById('editId').value = id;
  document.getElementById('judul').value = item.judul || '';
  document.getElementById('tanggal').value = item.tanggal || '';
  document.getElementById('kategori').value = item.kategori || 'Kegiatan';
  document.getElementById('ringkas').value = item.ringkas || '';
  document.getElementById('isi').value = item.isi || '';
  document.getElementById('formTitle').textContent = 'Edit Berita';
  document.getElementById('btnBatal').style.display = 'inline-flex';

  const preview = document.getElementById('imgPreview');
  if (preview && item.gambar) { preview.src = item.gambar; preview.style.display = 'block'; }

  // Scroll ke form
  document.getElementById('judul').scrollIntoView({ behavior: 'smooth', block: 'center' });
  showToast('Data siap diedit');
};

window.batalEdit = function() {
  editingId = null;
  ['editId','judul','tanggal','ringkas','isi'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const kat = document.getElementById('kategori');
  if (kat) kat.value = 'Kegiatan';
  document.getElementById('formTitle').textContent = 'Tambah Berita';
  document.getElementById('btnBatal').style.display = 'none';
  const preview = document.getElementById('imgPreview');
  if (preview) preview.style.display = 'none';
  const fileInput = document.getElementById('gambarFile');
  if (fileInput) fileInput.value = '';
};

window.simpanBerita = async function() {
  const judul   = sanitizeInput(document.getElementById('judul')?.value, 300);
  const tanggal = sanitizeInput(document.getElementById('tanggal')?.value, 100);
  const kategori= sanitizeInput(document.getElementById('kategori')?.value, 50);
  const ringkas = sanitizeInput(document.getElementById('ringkas')?.value, 500);
  const isi     = sanitizeInput(document.getElementById('isi')?.value, 10000);
  const file    = document.getElementById('gambarFile')?.files[0];

  // Validasi
  if (!judul || !tanggal || !ringkas || !isi) {
    showToast('Semua field wajib diisi!', 'error'); return;
  }
  if (judul.length < 5) { showToast('Judul terlalu pendek', 'error'); return; }

  // Validasi file gambar
  if (file) {
    const allowed = ['image/jpeg','image/png','image/webp','image/gif'];
    if (!allowed.includes(file.type)) { showToast('Format gambar tidak didukung (JPG/PNG/WEBP/GIF)', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Ukuran gambar max 5MB', 'error'); return; }
  }

  const doSave = async (gambarBase64) => {
    try {
      const client = await getSB();
      const payload = { judul, tanggal, ringkas, isi, kategori };
      if (gambarBase64) payload.gambar = gambarBase64;

      if (editingId) {
        const { error } = await client.from('berita').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('Berita diupdate!');
      } else {
        const { error } = await client.from('berita').insert([payload]);
        if (error) throw error;
        showToast('Berita ditambahkan!');
      }
      window.batalEdit();
      await renderBeritaList();
    } catch (err) {
      console.error('simpanBerita:', err);
      showToast('Gagal menyimpan: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = e => doSave(e.target.result);
    reader.onerror = () => showToast('Gagal baca file', 'error');
    reader.readAsDataURL(file);
  } else {
    let gambar = '';
    if (editingId) {
      const berita = await loadBerita();
      gambar = berita.find(b => Number(b.id) === editingId)?.gambar || '';
    }
    await doSave(gambar);
  }
};

window.hapusBerita = async function(id) {
  id = Number(id);
  if (!Number.isInteger(id) || id <= 0) return;
  if (!confirm('Yakin hapus berita ini? Aksi tidak bisa dibatalkan.')) return;
  try {
    const client = await getSB();
    const { error } = await client.from('berita').delete().eq('id', id);
    if (error) throw error;
    showToast('Berita dihapus');
    await renderBeritaList();
  } catch (err) {
    console.error('hapusBerita:', err);
    showToast('Gagal hapus: ' + (err.message || 'Unknown'), 'error');
  }
};

// ================================================================
// GALERI — CRUD
// ================================================================
async function loadGaleri() {
  try {
    const client = await getSB();
    const { data, error } = await client
      .from('galeri')
      .select('id, caption, gambar, tanggal, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('loadGaleri:', err);
    return [];
  }
}

async function renderGaleriAdmin() {
  const galeri = await loadGaleri();
  const listEl = document.getElementById('galeriAdminList');
  const countEl = document.getElementById('countGaleri');
  const totalEl = document.getElementById('totalGaleri');
  if (countEl) countEl.textContent = `${galeri.length} foto`;
  if (totalEl) totalEl.textContent = galeri.length;
  if (!listEl) return;

  if (galeri.length === 0) {
    listEl.innerHTML = '<div style="text-align:center;padding:40px;color:#999;font-size:.85rem"><i class="fas fa-image" style="display:block;font-size:2rem;margin-bottom:8px;opacity:.3"></i>Belum ada foto</div>';
    return;
  }

  listEl.innerHTML = galeri.map(g => `
    <div class="galeri-admin-item">
      <img src="${escapeHtml(g.gambar)}" onerror="this.src='img/default-galeri.jpg'" loading="lazy" alt="${escapeHtml(g.caption)}">
      <div class="galeri-admin-overlay">
        <button class="btn btn-red btn-sm" onclick="hapusGaleri(${Number(g.id)})" title="Hapus foto" aria-label="Hapus foto"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

window.previewImg = function(input) {
  const preview = document.getElementById('imgPreview');
  if (!input.files?.[0] || !preview) return;
  const file = input.files[0];
  if (file.size > 5 * 1024 * 1024) { showToast('Gambar max 5MB', 'error'); input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; };
  reader.readAsDataURL(file);
};

window.previewGaleri = function(input) {
  const preview = document.getElementById('galeriPreview');
  if (!input.files?.[0] || !preview) return;
  const file = input.files[0];
  if (file.size > 5 * 1024 * 1024) { showToast('Foto max 5MB', 'error'); input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; };
  reader.readAsDataURL(file);
};

window.tambahGaleri = async function() {
  const file = document.getElementById('galeriFoto')?.files[0];
  const caption = sanitizeInput(document.getElementById('galeriCaption')?.value || 'Foto Galeri', 200);
  if (!file) { showToast('Pilih foto dulu!', 'error'); return; }

  const allowed = ['image/jpeg','image/png','image/webp','image/gif'];
  if (!allowed.includes(file.type)) { showToast('Format tidak didukung (JPG/PNG/WEBP/GIF)', 'error'); return; }
  if (file.size > 5 * 1024 * 1024) { showToast('Foto max 5MB', 'error'); return; }

  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const gambar = e.target.result;
      const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const client = await getSB();
      const { error } = await client.from('galeri').insert([{ caption, gambar, tanggal: today }]);
      if (error) throw error;
      showToast('Foto ditambahkan!');
      document.getElementById('galeriFoto').value = '';
      document.getElementById('galeriCaption').value = '';
      const prev = document.getElementById('galeriPreview');
      if (prev) prev.style.display = 'none';
      await renderGaleriAdmin();
    } catch (err) {
      console.error('tambahGaleri:', err);
      showToast('Gagal tambah foto: ' + (err.message || 'Unknown'), 'error');
    }
  };
  reader.onerror = () => showToast('Gagal baca file', 'error');
  reader.readAsDataURL(file);
};

window.hapusGaleri = async function(id) {
  id = Number(id);
  if (!Number.isInteger(id) || id <= 0) return;
  if (!confirm('Hapus foto ini?')) return;
  try {
    const client = await getSB();
    const { error } = await client.from('galeri').delete().eq('id', id);
    if (error) throw error;
    showToast('Foto dihapus');
    await renderGaleriAdmin();
  } catch (err) {
    console.error('hapusGaleri:', err);
    showToast('Gagal hapus foto', 'error');
  }
};

// ================================================================
// TAB & SIDEBAR
// ================================================================
window.showTab = async function(tab) {
  const tabs = { berita: 'tab-berita', galeri: 'tab-galeri' };
  const titles = { berita: 'Kelola Berita', galeri: 'Kelola Galeri' };

  Object.entries(tabs).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = key === tab ? 'block' : 'none';
  });

  const pt = document.getElementById('pageTitle');
  if (pt) pt.textContent = titles[tab] || '';

  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.classList.remove('active');
    const txt = link.textContent || '';
    if ((tab === 'berita' && txt.includes('Kelola Berita')) ||
        (tab === 'galeri' && txt.includes('Kelola Galeri'))) {
      link.classList.add('active');
    }
  });

  if (tab === 'berita') await renderBeritaList();
  else if (tab === 'galeri') await renderGaleriAdmin();

  // Tutup sidebar mobile
  document.getElementById('sidebar')?.classList.remove('open');
};

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}

document.addEventListener('click', e => {
  const sidebar = document.getElementById('sidebar');
  const hamburger = document.querySelector('.hamburger-btn');
  if (sidebar?.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      !hamburger?.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

// ================================================================
// START
// ================================================================
document.addEventListener('DOMContentLoaded', initAdmin);
