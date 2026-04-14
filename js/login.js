/**
 * LOGIN.JS - FIXED VERSION
 * ✅ Input validation
 * ✅ Input trimming
 * ✅ Error clearing
 */

let loginAttempts = 0;
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 300000; // 5 minutes

function loginAdmin(){
  const username = document.getElementById("username").value.trim();  // ✅ TRIM
  const password = document.getElementById("password").value.trim();  // ✅ TRIM
  const error = document.getElementById("errorLogin");
  
  // ✅ RESET ERROR sebelum validasi baru
  error.textContent = "";
  error.style.display = "none";

  // ✅ VALIDASI INPUT TIDAK KOSONG
  if (!username || !password) {
    error.textContent = "Username dan password wajib diisi!";
    error.style.display = "block";
    return;
  }

  // ✅ RATE LIMITING - Prevent brute force
  if (loginAttempts >= MAX_ATTEMPTS) {
    error.textContent = "Terlalu banyak percobaan login gagal. Coba lagi nanti.";
    error.style.display = "block";
    return;
  }

  const ADMIN_USER = "admin";
  const ADMIN_PASS = "12345";

  if(username === ADMIN_USER && password === ADMIN_PASS){
    loginAttempts = 0; // ✅ RESET counter on success
    localStorage.setItem("isAdmin", "true");
    window.location.href = "admin.html";
  } else {
    loginAttempts++; // ✅ INCREMENT counter on fail
    error.textContent = `Username atau password salah! (Percobaan ${loginAttempts}/${MAX_ATTEMPTS})`;
    error.style.display = "block";
  }
}

// ✅ OPTIONAL: Clear error when user starts typing
document.addEventListener('DOMContentLoaded', function() {
  const inputs = document.querySelectorAll('#username, #password');
  inputs.forEach(input => {
    input.addEventListener('focus', function() {
      const error = document.getElementById("errorLogin");
      if (error) {
        error.textContent = "";
        error.style.display = "none";
      }
    });
  });
});
