/* =========================================================
   LOGIN PAGE — login.js
   Cek kredensial hardcoded, simpan sesi ke sessionStorage,
   redirect ke index.html kalau sukses.
   ========================================================= */

(() => {
  "use strict";

  const VALID_NAME = "habbit";
  const VALID_PASSWORD = "admin10";
  const SESSION_KEY = "habitTracker_session";

  const form = document.getElementById("loginForm");
  const nameInput = document.getElementById("loginName");
  const passwordInput = document.getElementById("loginPassword");
  const errorBox = document.getElementById("loginError");
  const toggleEyeBtn = document.getElementById("toggleEyeBtn");
  const eyeIcon = document.getElementById("eyeIcon");

  // kalau udah login (sesi masih aktif di tab ini), langsung lempar ke index
  if (sessionStorage.getItem(SESSION_KEY) === "true") {
    window.location.href = "../index.html";
    return;
  }

  function showError() {
    errorBox.classList.remove("hidden");
    errorBox.classList.remove("shake");
    void errorBox.offsetWidth; // restart animasi
    errorBox.classList.add("shake");
    passwordInput.value = "";
    passwordInput.focus();
  }

  function hideError() {
    errorBox.classList.add("hidden");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const password = passwordInput.value;

    if (name === VALID_NAME && password === VALID_PASSWORD) {
      hideError();
      sessionStorage.setItem(SESSION_KEY, "true");
      sessionStorage.setItem("habitTracker_userName", name);
      window.location.href = "../index.html";
    } else {
      showError();
    }
  });

  // toggle show/hide password
  toggleEyeBtn.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";

    eyeIcon.innerHTML = isHidden
      ? `<path d="M3 3l18 18M10.6 10.6a3 3 0 004.24 4.24M9.5 5.2A10.6 10.6 0 0112 5c6.5 0 10 7 10 7a16.6 16.6 0 01-3.4 4.3M6.6 6.6A16.7 16.7 0 002 12s3.5 7 10 7c1.3 0 2.5-.2 3.6-.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>`;
  });

  // hilangin error pas user mulai ngetik ulang
  [nameInput, passwordInput].forEach((el) => {
    el.addEventListener("input", hideError);
  });
})();