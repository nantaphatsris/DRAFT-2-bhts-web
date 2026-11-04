// =========================================================
// PRETEST.JS - แบบทดสอบ 5 ข้อ พร้อมเสียงเดโม่สร้างด้วย Web Audio API
// ข้อ 1-2 เป็นความรู้ / ข้อ 3-5 เป็นการฟังเสียง 3 ประเภท
// เสียงทั้งหมดเป็นเดโม่ที่สร้างจากโค้ด ไม่ต้องใช้ไฟล์ MP3/WAV
// =========================================================

// ตรวจสอบสมาชิกและใช้ปุ่ม Log Out จริงเมื่อมีการตั้งค่า Firebase แล้ว
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const configIsReady = Object.values(firebaseConfig).every((value) =>
  typeof value === "string" && value.length > 0 && !value.includes("PASTE_YOUR_")
);
let auth = null;
if (configIsReady) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  onAuthStateChanged(auth, (user) => { if (!user) window.location.replace("login.html"); });
} else {
  console.warn("ยังไม่ได้ตั้งค่า Firebase: ทดสอบหน้า Pre-test ในโหมดเดโม่ได้ แต่ระบบสมาชิกยังไม่ทำงาน");
}

const questions = [
  {
    type: "text",
    title: "Frequency มีความสัมพันธ์กับคุณสมบัติใดของเสียง?",
    choices: ["Pitch (ระดับเสียงสูง–ต่ำ)", "Volume (ความดัง)", "Reverb (เสียงก้อง)"],
    answer: 0
  },
  {
    type: "text",
    title: "Amplitude ที่เพิ่มขึ้นโดยทั่วไปส่งผลอย่างไรต่อเสียง?",
    choices: ["เสียงดังขึ้น", "เสียงสูงขึ้น", "เสียงก้องนานขึ้น"],
    answer: 0
  },
  {
    type: "audio", sound: "knock", title: "เสียงเคาะแบบใดมี Impact มากที่สุด ฟังแล้วรู้สึกหนักแน่นและมีพลัง?",
    choices: ["Audio A", "Audio B", "Audio C"], answer: 2,
    note: "ชุดเสียงเดโม่: เสียงเคาะประตู 3 คาแรกเตอร์"
  },
  {
    type: "audio", sound: "metal", title: "เสียงกระทบโลหะตัวเลือกใดฟังดูนุ่มนวลที่สุด?",
    choices: ["Audio A", "Audio B", "Audio C"], answer: 1,
    note: "ชุดเสียงเดโม่: เสียงโลหะกระทบ 3 คาแรกเตอร์"
  },
  {
    type: "audio", sound: "clap", title: "เสียงปรบมือตัวเลือกใดมีความก้องลึกและมีมิติมากที่สุด?",
    choices: ["Audio A", "Audio B", "Audio C"], answer: 0,
    note: "ชุดเสียงเดโม่: เสียงปรบมือ 3 คาแรกเตอร์"
  }
];

let currentQuestion = 0;
const answers = Array(questions.length).fill(null);
let audioContext;
let activeSources = [];

const questionText = document.getElementById("questionText");
const questionCount = document.getElementById("questionCount");
const answerList = document.getElementById("answerList");
const numberGrid = document.getElementById("numberGrid");
const answeredCount = document.getElementById("answeredCount");
const feedback = document.getElementById("feedback");
const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");

function stopCurrentAudio() {
  activeSources.forEach((source) => { try { source.stop(); } catch (_) {} });
  activeSources = [];
}
function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

// สร้างเสียง noise สั้น ๆ สำหรับเสียงเคาะ/กระทบ/ปรบมือ
function makeNoise(ctx, duration, filterType, cutoff, gainValue, destination, startTime) {
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = cutoff;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  source.connect(filter).connect(gain).connect(destination);
  source.start(startTime);
  source.stop(startTime + duration + 0.02);
  activeSources.push(source);
}

// เพิ่มเสียงก้องจำลองแบบง่าย เพื่อให้เปรียบเทียบความรู้สึกของเสียงได้
function makeEcho(ctx, input, wet, delaySeconds, repeats = 3) {
  const output = ctx.createGain();
  output.gain.value = 1;
  input.connect(output);
  let previous = input;
  for (let i = 0; i < repeats; i++) {
    const delay = ctx.createDelay(1);
    delay.delayTime.value = delaySeconds;
    const gain = ctx.createGain();
    gain.gain.value = wet * Math.pow(0.55, i);
    previous.connect(delay).connect(gain).connect(output);
    previous = delay;
  }
  return output;
}

function playDemo(soundType, variant) {
  stopCurrentAudio();
  const ctx = getAudioContext();
  const now = ctx.currentTime + 0.03;
  const master = ctx.createGain();
  master.gain.value = 0.78;
  const echoOut = makeEcho(ctx, master, variant === "hollow" ? 0.55 : variant === "soft" ? 0.12 : 0.2, variant === "hollow" ? 0.17 : 0.11, 4);
  echoOut.connect(ctx.destination);

  const profiles = {
    hollow: { gain:0.55, cutoff:520, body:125, decay:0.75, echo:true, attack:0.012 },
    soft:   { gain:0.32, cutoff:850, body:210, decay:0.28, echo:false, attack:0.045 },
    impact: { gain:0.95, cutoff:5200, body:85, decay:0.22, echo:false, attack:0.003 }
  };
  const p = profiles[variant];

  if (soundType === "knock") {
    makeNoise(ctx, variant === "impact" ? 0.10 : 0.18, "lowpass", p.cutoff, p.gain, master, now);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.setValueAtTime(p.body, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(45, p.body * 0.65), now + p.decay);
    gain.gain.setValueAtTime(p.gain, now); gain.gain.exponentialRampToValueAtTime(0.001, now + p.decay);
    osc.connect(gain).connect(master); osc.start(now); osc.stop(now + p.decay + 0.02); activeSources.push(osc);
  } else if (soundType === "metal") {
    [1, 2.76, 5.4].forEach((ratio, index) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = 430 * ratio;
      const volume = p.gain * (index === 0 ? 0.42 : 0.19);
      gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(0.001, now + (variant === "soft" ? 0.32 : variant === "hollow" ? 1.0 : 0.48));
      osc.connect(gain).connect(master); osc.start(now); osc.stop(now + 1.05); activeSources.push(osc);
    });
    makeNoise(ctx, 0.035, "highpass", variant === "soft" ? 1200 : 6500, p.gain * 0.35, master, now);
  } else if (soundType === "clap") {
    makeNoise(ctx, variant === "hollow" ? 0.24 : 0.12, "bandpass", variant === "soft" ? 900 : variant === "hollow" ? 650 : 2400, p.gain, master, now);
    if (variant === "hollow") {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = 145;
      gain.gain.setValueAtTime(0.34, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc.connect(gain).connect(master); osc.start(now); osc.stop(now + 0.92); activeSources.push(osc);
    }
  }
}

function renderNumbers() {
  numberGrid.innerHTML = "";
  questions.forEach((_, index) => {
    const button = document.createElement("button");
    button.className = "question-number";
    if (index === currentQuestion) button.classList.add("current");
    if (answers[index] !== null) button.classList.add("answered");
    button.textContent = index + 1;
    button.addEventListener("click", () => { currentQuestion = index; renderQuestion(); });
    numberGrid.appendChild(button);
  });
  const count = answers.filter((answer) => answer !== null).length;
  answeredCount.textContent = `${count} / ${questions.length} answered`;
}

function renderQuestion() {
  stopCurrentAudio();
  const question = questions[currentQuestion];
  questionCount.textContent = `QUESTION ${String(currentQuestion + 1).padStart(2, "0")} / 05`;
  questionText.textContent = question.title;
  answerList.innerHTML = "";
  feedback.textContent = question.note || "";

  question.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = "answer-option" + (answers[currentQuestion] === index ? " selected" : "");
    if (question.type === "audio") {
      button.innerHTML = `<span>${choice}</span><span class="play-icon" aria-hidden="true">▶</span>`;
      button.addEventListener("click", () => {
        if (answers[currentQuestion] === index) {
          playDemo(question.sound, ["hollow", "soft", "impact"][index]);
        } else {
          answers[currentQuestion] = index;
          renderQuestion();
          playDemo(question.sound, ["hollow", "soft", "impact"][index]);
        }
      });
      // ปุ่มฟังและเลือกคำตอบอยู่ในแถวเดียวกันตามแบบภาพ
    } else {
      button.classList.add("text-option");
      button.textContent = choice;
      button.addEventListener("click", () => { answers[currentQuestion] = index; renderQuestion(); });
    }
    answerList.appendChild(button);
  });

  previousButton.disabled = currentQuestion === 0;
  nextButton.disabled = currentQuestion === questions.length - 1;
  renderNumbers();
}

previousButton.addEventListener("click", () => { if (currentQuestion > 0) { currentQuestion--; renderQuestion(); } });
nextButton.addEventListener("click", () => { if (currentQuestion < questions.length - 1) { currentQuestion++; renderQuestion(); } });
document.getElementById("submitButton").addEventListener("click", () => {
  const unanswered = answers.filter((answer) => answer === null).length;
  if (unanswered > 0) { alert(`ยังตอบไม่ครบ ${unanswered} ข้อ กรุณาตอบให้ครบก่อน Submit`); return; }
  stopCurrentAudio();
  const score = answers.reduce((total, answer, index) => total + (answer === questions[index].answer ? 1 : 0), 0);
  document.getElementById("resultText").textContent = `Your score: ${score} / ${questions.length}`;
  document.getElementById("resultModal").classList.add("show");
  document.getElementById("resultModal").setAttribute("aria-hidden", "false");
});
document.getElementById("closeResult").addEventListener("click", () => { window.location.href = "learning.html"; });

// เมนูด้านขวาบน
const sideMenu = document.getElementById("sideMenu");
const backdrop = document.getElementById("menuBackdrop");
function toggleMenu(open) { sideMenu.classList.toggle("open", open); backdrop.classList.toggle("show", open); }
document.getElementById("menuToggle").addEventListener("click", () => toggleMenu(true));
document.getElementById("menuClose").addEventListener("click", () => toggleMenu(false));
backdrop.addEventListener("click", () => toggleMenu(false));
document.getElementById("practiceLink").addEventListener("click", (event) => { event.preventDefault(); alert("Practice จะเปิดใช้งานเมื่อสร้างบทเรียนเรียบร้อยแล้ว"); });
document.getElementById("posttestLink").addEventListener("click", (event) => { event.preventDefault(); alert("Post-test จะเปิดหลังจากทำบทเรียนเรียบร้อยแล้ว"); });
document.getElementById("logoutButton").addEventListener("click", async () => {
  if (auth) {
    try { await signOut(auth); window.location.replace("index.html"); }
    catch (error) { console.error(error); alert("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง"); }
  } else {
    window.location.href = "login.html";
  }
});

renderQuestion();
