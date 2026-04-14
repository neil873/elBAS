/**
 * BERITA.JS - FIXED VERSION
 * ✅ Fixed ID type matching
 * ✅ Proper data initialization
 */

let berita = JSON.parse(localStorage.getItem("berita")) || [];

if (berita.length === 0) {
  fetch("data/berita.json")
    .then(res => res.json())
    .then(data => {
      localStorage.setItem("berita", JSON.stringify(data));
      location.reload();
    })
    .catch(error => {
      console.error('Error loading berita data:', error);
    });
}

/* =====================
   SEMUA BERITA - RENDER
===================== */
function renderBerita(){
  const list = document.getElementById("berita-list");
  if (!list) return;

  // ✅ CLEAR innerHTML dulu sebelum isi ulang
  list.innerHTML = "";
  
  if (berita.length === 0) {
    list.innerHTML = "<p>Belum ada berita tersedia</p>";
    return;
  }

  berita.forEach(b => {
    // ✅ HANDLE missing image gracefully
    const gambar = b.gambar || 'img/placeholder.jpg';
    
    list.innerHTML += `
      <div class="berita-card">
        <img src="${gambar}" alt="${b.judul}" onerror="this.src='img/placeholder.jpg'">
        <h3>${escapeHtml(b.judul)}</h3>
        <small>${escapeHtml(b.tanggal)} • ${escapeHtml(b.kategori)}</small>
        <p>${escapeHtml(b.ringkas)}</p>
        <a href="berita-detail.html?id=${b.id}">Baca Selengkapnya</a>
      </div>
    `;
  });
}

/* =====================
   DETAIL BERITA
===================== */
const detail = document.getElementById("berita-detail");
if (detail) {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  
  if (!id) {
    detail.innerHTML = "<p>Berita tidak ditemukan</p>";
  } else {
    // ✅ FIXED: Convert URL param ke number untuk matching dengan data.id
    const beritaId = parseInt(id);
    
    // ✅ BETTER: Gunakan === strict equality setelah type conversion
    const b = berita.find(x => x.id === beritaId);

    if (b) {
      const gambar = b.gambar || 'img/placeholder.jpg';
      
      detail.innerHTML = `
        <article>
          <h1>${escapeHtml(b.judul)}</h1>
          <small>${escapeHtml(b.tanggal)} • ${escapeHtml(b.kategori)}</small>
          <img src="${gambar}" alt="${b.judul}" onerror="this.src='img/placeholder.jpg'">
          <p>${escapeHtml(b.isi)}</p>
        </article>
      `;
    } else {
      detail.innerHTML = "<p>Berita tidak ditemukan atau sudah dihapus</p>";
    }
  }
}

/* =====================
   UTILITY FUNCTIONS
===================== */
/**
 * ✅ Escape HTML special characters untuk prevent XSS
 * Gunakan ini untuk menampilkan user-generated content
 */
function escapeHtml(text) {
  if (!text) return '';
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ✅ Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  renderBerita();
});
