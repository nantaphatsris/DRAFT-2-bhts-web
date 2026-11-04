/* =========================================================
   LEARNING.JS — Firebase, Popup ต้อนรับ และเมนูของหน้า Learning
   ========================================================= */

// 1) นำเครื่องมือ Firebase ที่ต้องใช้เข้ามา
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// 2) เชื่อม JavaScript กับ Element ที่อยู่ใน HTML
const welcomeToast = document.getElementById("welcomeToast");
const toastUserName = document.getElementById("toastUserName");
const logoutButton = document.getElementById("logoutButton");
const pretestBanner = document.getElementById("pretestBanner");

// 3) ตรวจสอบว่ามีการกรอก Firebase Config แล้ว
const configIsReady = Object.values(firebaseConfig).every((value) =>
  typeof value === "string" && value.length > 0 && !value.includes("PASTE_YOUR_")
);

if (!configIsReady) {
  console.error("Firebase configuration is missing. Please check firebase-config.js.");
} else {
  // เริ่มต้น Firebase Authentication และ Firestore
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // 4) แสดง Popup ต้อนรับสมาชิกเป็นเวลา 4.5 วินาที
  function showWelcomePopup(name) {
    if (!welcomeToast || !toastUserName) return;

    toastUserName.textContent = name;
    welcomeToast.setAttribute("aria-hidden", "false");
    welcomeToast.classList.remove("show");

    // บังคับให้ Browser วาดสถานะเริ่มต้นก่อนเริ่ม Animation รอบใหม่
    requestAnimationFrame(() => welcomeToast.classList.add("show"));

    // เมื่อ Animation จบ ให้ซ่อน Popup จากโปรแกรมอ่านหน้าจอด้วย
    window.setTimeout(() => {
      welcomeToast.classList.remove("show");
      welcomeToast.setAttribute("aria-hidden", "true");
    }, 4600);
  }

  // 5) ตรวจสอบสถานะ Login ก่อนให้เข้าหน้านี้
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace("login.html");
      return;
    }

    // ใช้ชื่อจาก Authentication ก่อน หากไม่มีชื่อจะใช้ส่วนหน้าอีเมล
    let displayName = user.displayName || user.email?.split("@")[0] || "Learner";

    // อ่านโปรไฟล์และสถานะ Pre Test ของสมาชิกจาก Firestore
    try {
      const profileRef = doc(db, "users", user.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const profile = profileSnap.data();

        // ถ้ามีชื่อที่บันทึกใน Firestore ให้ใช้ชื่อนั้น
        if (profile.displayName) displayName = profile.displayName;

        // ซ่อนแถบ Pre Test เฉพาะเมื่อเอกสารระบุว่าทำเสร็จแล้ว
        // ตอนบันทึกผล Pre Test ให้ตั้งค่า preTestCompleted: true
        if (pretestBanner && profile.preTestCompleted === true) {
          pretestBanner.hidden = true;
        }
      }
    } catch (error) {
      // หากอ่านโปรไฟล์ไม่ได้ หน้าเว็บยังเปิดได้ โดยใช้ชื่อจาก Authentication
      console.error("ไม่สามารถโหลดโปรไฟล์ได้:", error);
    }

    showWelcomePopup(displayName);
  });

  // 6) ระบบ Log Out: ออกจาก Firebase แล้วกลับหน้าแรก
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      try {
        await signOut(auth);
        window.location.replace("index.html");
      } catch (error) {
        console.error("ออกจากระบบไม่สำเร็จ:", error);
        logoutButton.disabled = false;
        alert("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
      }
    });
  }
}

// 7) ควบคุมเมนูสามขีด เปิด/ปิดเมนูด้านข้าง
const menuToggle = document.getElementById("menuToggle");
const menuClose = document.getElementById("menuClose");
const sideMenu = document.getElementById("sideMenu");
const menuBackdrop = document.getElementById("menuBackdrop");

function openMenu() {
  sideMenu?.classList.add("open");
  menuBackdrop?.classList.add("show");
  sideMenu?.setAttribute("aria-hidden", "false");
  menuToggle?.setAttribute("aria-expanded", "true");
}

function closeMenu() {
  sideMenu?.classList.remove("open");
  menuBackdrop?.classList.remove("show");
  sideMenu?.setAttribute("aria-hidden", "true");
  menuToggle?.setAttribute("aria-expanded", "false");
}

menuToggle?.addEventListener("click", openMenu);
menuClose?.addEventListener("click", closeMenu);
menuBackdrop?.addEventListener("click", closeMenu);

// กด Escape เพื่อปิดเมนูได้ด้วย
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});