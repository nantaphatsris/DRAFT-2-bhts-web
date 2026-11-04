
// =========================================================
// AUTH.JS - ระบบสมัครสมาชิกและเข้าสู่ระบบด้วย Firebase
// =========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

// =========================================================
// FIREBASE CONFIGURATION
// =========================================================

const configIsReady = Object.values(firebaseConfig).every((value) =>
  typeof value === "string" &&
  value.length > 0 &&
  !value.includes("PASTE_YOUR_")
);

let auth = null;
let db = null;

if (configIsReady) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

// =========================================================
// MESSAGE & LOADING
// =========================================================

function showFormMessage(message, isSuccess = false) {
  const messageBox = document.getElementById("formMessage");

  if (!messageBox) return;

  messageBox.textContent = message;
  messageBox.classList.toggle("success", isSuccess);
}

function setLoading(button, isLoading, normalText) {
  if (!button) return;

  button.disabled = isLoading;
  button.textContent = isLoading ? "Please wait..." : normalText;
}

// =========================================================
// ERROR MESSAGE
// =========================================================

function getFriendlyError(error) {
  const code = error?.code || "";

  const messages = {
    "auth/email-already-in-use":
      "อีเมลนี้ถูกใช้สมัครแล้ว ลองเข้าสู่ระบบแทนได้เลย",

    "auth/invalid-email":
      "รูปแบบอีเมลไม่ถูกต้อง",

    "auth/weak-password":
      "รหัสผ่านไม่ปลอดภัยพอ กรุณาใช้ 6 ตัวอักษรขึ้นไป",

    "auth/invalid-credential":
      "อีเมลหรือรหัสผ่านไม่ถูกต้อง",

    "auth/user-not-found":
      "ไม่พบบัญชีนี้ กรุณาตรวจสอบอีเมลหรือสมัครสมาชิก",

    "auth/wrong-password":
      "รหัสผ่านไม่ถูกต้อง",

    "auth/too-many-requests":
      "มีการลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่",

    "permission-denied":
      "Firebase Firestore Rules ยังไม่อนุญาตให้บันทึกข้อมูล"
  };

  return messages[code] ||
    "เกิดข้อผิดพลาด กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง";
}

// =========================================================
// SIGN UP
// =========================================================

const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!configIsReady) {
      showFormMessage("ยังไม่ได้ตั้งค่า Firebase กรุณาตรวจสอบ firebase-config.js");
      return;
    }

    const name = document.getElementById("displayName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const submitButton = document.getElementById("signupSubmit");

    if (password !== confirmPassword) {
      showFormMessage("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    if (name.length < 2) {
      showFormMessage("กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร");
      return;
    }

    setLoading(submitButton, true, "Create Account");
    showFormMessage("");

    try {
      const userCredential =
        await createUserWithEmailAndPassword(auth, email, password);

      const user = userCredential.user;

      // บันทึกชื่อสมาชิก
      await updateProfile(user, {
        displayName: name
      });

      // บันทึกโปรไฟล์ลง Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: name,
        email: user.email,
        createdAt: serverTimestamp()
      });

      // สมัครสำเร็จ เข้าหน้า Learning ทันที
      window.location.href = "learning.html";

    } catch (error) {
      showFormMessage(getFriendlyError(error));
      setLoading(submitButton, false, "Create Account");
    }
  });
}

// =========================================================
// LOG IN
// =========================================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!configIsReady) {
      showFormMessage("ยังไม่ได้ตั้งค่า Firebase กรุณาตรวจสอบ firebase-config.js");
      return;
    }

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const submitButton = document.getElementById("loginSubmit");

    setLoading(submitButton, true, "Log In");
    showFormMessage("");

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // เข้าหน้า Learning ทันทีโดยไม่แสดงข้อความสำเร็จ
      window.location.href = "learning.html";

    } catch (error) {
      showFormMessage(getFriendlyError(error));
      setLoading(submitButton, false, "Log In");
    }
  });
}
