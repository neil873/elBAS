// ==================== SUPABASE CONFIG ====================
const SUPABASE_URL = 'https://jzwuzbxbcgcfpdfogwrp.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_xqJszcSrSzwVe60ou32qdw_pucnPlx1'  // ⚠️ GANTI DENGAN KEY ASLI LO!

let supabaseClient = null;

// Inisialisasi Supabase
async function initSupabase() {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase connected!');
        return true;
    }
    console.log('⏳ Menunggu Supabase...');
    setTimeout(() => initSupabase(), 500);
    return false;
}

// Panggil init saat halaman load
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
});

// Helper ambil data
async function getSupabase() {
    if (supabaseClient) return supabaseClient;
    await initSupabase();
    return supabaseClient;
}

// ==================== TOAST ====================
function showToast(msg, type = 'success') {
    const wrap = document.getElementById('toastWrap');
    if (!wrap) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${msg}`;
    wrap.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== BERITA ====================
let editingId = null;

async function loadBerita() {
    const sb = await getSupabase();
    if (!sb) {
        // Fallback ke localStorage
        const data = localStorage.getItem('beritaList');
        return data ? JSON.parse(data) : [];
    }
    const { data, error } = await sb.from('berita').select('*').order('id', { ascending: false });
    if (error) {
        console.error(error);
        return [];
    }
    return data || [];
}

async function renderBeritaList() {
    const berita = await loadBerita();
    const listEl = document.getElementById('adminList');
    const countEl = document.getElementById('countBerita');
    const totalEl = document.getElementById('totalBerita');
    
    if (countEl) countEl.textContent = `${berita.length} berita`;
    if (totalEl) totalEl.textContent = berita.length;
    if (!listEl) return;
    
    if (berita.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">Belum ada berita</div>';
        return;
    }
    
    listEl.innerHTML = berita.map(b => `
        <div class="berita-list-item">
            <img src="${b.gambar || 'img/default-berita.jpg'}" class="berita-thumb" onerror="this.src='img/default-berita.jpg'">
            <div class="berita-list-info">
                <h4>${escapeHtml(b.judul)}</h4>
                <p><i class="far fa-calendar"></i> ${b.tanggal} • ${b.kategori}</p>
            </div>
            <div class="berita-actions">
                <button class="btn btn-ghost btn-sm" onclick="editBerita(${b.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-red btn-sm" onclick="hapusBerita(${b.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

window.editBerita = async function(id) {
    const berita = await loadBerita();
    const item = berita.find(b => b.id === id);
    if (!item) return;
    editingId = id;
    document.getElementById('editId').value = id;
    document.getElementById('judul').value = item.judul || '';
    document.getElementById('tanggal').value = item.tanggal || '';
    document.getElementById('kategori').value = item.kategori || 'Kegiatan';
    document.getElementById('ringkas').value = item.ringkas || '';
    document.getElementById('isi').value = item.isi || '';
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Berita';
    document.getElementById('btnBatal').style.display = 'inline-flex';
    const preview = document.getElementById('imgPreview');
    if (preview && item.gambar) {
        preview.src = item.gambar;
        preview.style.display = 'block';
    }
    showToast('Data siap diedit', 'success');
};

window.batalEdit = function() {
    editingId = null;
    document.getElementById('editId').value = '';
    document.getElementById('judul').value = '';
    document.getElementById('tanggal').value = '';
    document.getElementById('kategori').value = 'Kegiatan';
    document.getElementById('ringkas').value = '';
    document.getElementById('isi').value = '';
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-plus"></i> Tambah Berita';
    document.getElementById('btnBatal').style.display = 'none';
    const preview = document.getElementById('imgPreview');
    if (preview) preview.style.display = 'none';
    document.getElementById('gambarFile').value = '';
};

window.simpanBerita = async function() {
    console.log('🔵 Tombol simpan diklik!');
    
    const judul = document.getElementById('judul').value.trim();
    const tanggal = document.getElementById('tanggal').value.trim();
    const kategori = document.getElementById('kategori').value;
    const ringkas = document.getElementById('ringkas').value.trim();
    const isi = document.getElementById('isi').value.trim();
    const gambarFile = document.getElementById('gambarFile').files[0];
    
    if (!judul || !tanggal || !ringkas || !isi) {
        showToast('Semua field harus diisi!', 'error');
        return;
    }
    
    // Fungsi buat simpan
    const doSave = async (gambarBase64) => {
        const sb = await getSupabase();
        if (editingId) {
            // Update
            if (sb) {
                const { error } = await sb.from('berita').update({ judul, tanggal, ringkas, isi, kategori, gambar: gambarBase64 }).eq('id', editingId);
                if (error) throw error;
            } else {
                // Fallback localStorage
                let berita = JSON.parse(localStorage.getItem('beritaList')) || [];
                const idx = berita.findIndex(b => b.id === editingId);
                if (idx !== -1) berita[idx] = { ...berita[idx], judul, tanggal, ringkas, isi, kategori, gambar: gambarBase64 };
                localStorage.setItem('beritaList', JSON.stringify(berita));
            }
            showToast('Berita diupdate!', 'success');
        } else {
            // Insert baru
            const newId = Date.now();
            if (sb) {
                const { error } = await sb.from('berita').insert([{ id: newId, judul, tanggal, ringkas, isi, kategori, gambar: gambarBase64 }]);
                if (error) throw error;
            } else {
                let berita = JSON.parse(localStorage.getItem('beritaList')) || [];
                berita.unshift({ id: newId, judul, tanggal, ringkas, isi, kategori, gambar: gambarBase64 });
                localStorage.setItem('beritaList', JSON.stringify(berita));
            }
            showToast('Berita ditambahkan!', 'success');
        }
        window.batalEdit();
        await renderBeritaList();
        document.getElementById('gambarFile').value = '';
    };
    
    if (gambarFile) {
        const reader = new FileReader();
        reader.onload = e => doSave(e.target.result);
        reader.readAsDataURL(gambarFile);
    } else {
        let gambar = '';
        if (editingId) {
            const berita = await loadBerita();
            const existing = berita.find(b => b.id === editingId);
            gambar = existing?.gambar || '';
        }
        doSave(gambar);
    }
};

window.hapusBerita = async function(id) {
    if (!confirm('Yakin hapus?')) return;
    const sb = await getSupabase();
    if (sb) {
        await sb.from('berita').delete().eq('id', id);
    } else {
        let berita = JSON.parse(localStorage.getItem('beritaList')) || [];
        berita = berita.filter(b => b.id !== id);
        localStorage.setItem('beritaList', JSON.stringify(berita));
    }
    showToast('Berita dihapus', 'success');
    await renderBeritaList();
};

// ==================== GALERI ====================
async function loadGaleri() {
    const sb = await getSupabase();
    if (!sb) {
        const data = localStorage.getItem('galeriList');
        return data ? JSON.parse(data) : [];
    }
    const { data, error } = await sb.from('galeri').select('*').order('id', { ascending: false });
    if (error) return [];
    return data || [];
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
        listEl.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">Belum ada foto</div>';
        return;
    }
    listEl.innerHTML = galeri.map(g => `
        <div class="galeri-admin-item">
            <img src="${g.gambar}" onerror="this.src='img/default-galeri.jpg'">
            <div class="galeri-admin-overlay">
                <button class="btn btn-red btn-sm" onclick="hapusGaleri(${g.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

window.previewImg = function(input) {
    const preview = document.getElementById('imgPreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; };
        reader.readAsDataURL(input.files[0]);
    }
};

window.previewGaleri = function(input) {
    const preview = document.getElementById('galeriPreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; };
        reader.readAsDataURL(input.files[0]);
    }
};

window.tambahGaleri = async function() {
    const file = document.getElementById('galeriFoto').files[0];
    const caption = document.getElementById('galeriCaption').value.trim();
    if (!file) { showToast('Pilih foto dulu!', 'error'); return; }
    const reader = new FileReader();
    reader.onload = async e => {
        const gambar = e.target.result;
        const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const newId = Date.now();
        const sb = await getSupabase();
        if (sb) {
            await sb.from('galeri').insert([{ id: newId, caption: caption || 'Foto Galeri', gambar, tanggal: today }]);
        } else {
            let galeri = JSON.parse(localStorage.getItem('galeriList')) || [];
            galeri.unshift({ id: newId, caption: caption || 'Foto Galeri', gambar, tanggal: today });
            localStorage.setItem('galeriList', JSON.stringify(galeri));
        }
        showToast('Foto ditambahkan!', 'success');
        document.getElementById('galeriFoto').value = '';
        document.getElementById('galeriCaption').value = '';
        const preview = document.getElementById('galeriPreview');
        if (preview) preview.style.display = 'none';
        await renderGaleriAdmin();
    };
    reader.readAsDataURL(file);
};

window.hapusGaleri = async function(id) {
    if (!confirm('Hapus foto ini?')) return;
    const sb = await getSupabase();
    if (sb) {
        await sb.from('galeri').delete().eq('id', id);
    } else {
        let galeri = JSON.parse(localStorage.getItem('galeriList')) || [];
        galeri = galeri.filter(g => g.id !== id);
        localStorage.setItem('galeriList', JSON.stringify(galeri));
    }
    showToast('Foto dihapus', 'success');
    await renderGaleriAdmin();
};

// ==================== UTILITY ====================
window.showTab = async function(tab) {
    const tabBerita = document.getElementById('tab-berita');
    const tabGaleri = document.getElementById('tab-galeri');
    const pageTitle = document.getElementById('pageTitle');
    if (tab === 'berita') {
        if (tabBerita) tabBerita.style.display = 'block';
        if (tabGaleri) tabGaleri.style.display = 'none';
        if (pageTitle) pageTitle.textContent = 'Kelola Berita';
        await renderBeritaList();
    } else {
        if (tabBerita) tabBerita.style.display = 'none';
        if (tabGaleri) tabGaleri.style.display = 'block';
        if (pageTitle) pageTitle.textContent = 'Kelola Galeri';
        await renderGaleriAdmin();
    }
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
        if ((tab === 'berita' && link.textContent.includes('Kelola Berita')) ||
            (tab === 'galeri' && link.textContent.includes('Kelola Galeri'))) {
            link.classList.add('active');
        }
    });
};

// Di dalam tag <script> atau di file admin.js, ganti fungsi toggleSidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

// Tambahin juga fungsi buat nutup sidebar kalau klik di luar
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.querySelector('.hamburger-btn');
    
    // Kalau sidebar kebuka dan yang diklik bukan sidebar atau hamburger
    if (sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(event.target) && !hamburger?.contains(event.target)) {
            sidebar.classList.remove('open');
        }
    }
});
window.logout = () => { if (confirm('Logout?')) { localStorage.removeItem('isAdmin'); location.href = 'login.html'; } };

// INIT
document.addEventListener('DOMContentLoaded', async () => {
    if (localStorage.getItem('isAdmin') !== 'true') {
        location.href = 'login.html';
        return;
    }
    if (!localStorage.getItem('beritaList')) localStorage.setItem('beritaList', JSON.stringify([]));
    if (!localStorage.getItem('galeriList')) localStorage.setItem('galeriList', JSON.stringify([]));
    await renderBeritaList();
    await renderGaleriAdmin();
    window.showTab('berita');
});