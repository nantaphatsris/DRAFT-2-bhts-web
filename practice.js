/* ================================================
   PRACTICE.JS
   Behind The Sound
   Theory + Practical Audio Player
================================================ */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  firebaseConfig
} from "./firebase-config.js";


/* ================================================
   1. FIREBASE AUTHENTICATION
================================================ */

const configIsReady = Object.values(firebaseConfig).every(
  value =>
    typeof value === "string" &&
    value.length > 0 &&
    !value.includes("PASTE_YOUR_")
);

let auth = null;

if (configIsReady) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} else {
  console.error("Firebase configuration is missing.");
}

let currentUser = null;

if (auth) {
  onAuthStateChanged(auth, user => {
    if (user) {
      currentUser = user;
    } else {
      currentUser = null;
      window.location.replace("login.html");
    }
  });
} else {
  console.warn("Authentication is not available.");
}


/* ================================================
   2. PAGE ELEMENTS
================================================ */

const practiceHome = document.getElementById("practiceHome");
const theoryPage = document.getElementById("theoryPage");
const practicalPage = document.getElementById("practicalPage");

const theoryButton = document.getElementById("theoryButton");
const practicalButton = document.getElementById("practicalButton");

const backFromTheory = document.getElementById("backFromTheory");
const backFromPractical = document.getElementById("backFromPractical");


/* ================================================
   3. PAGE NAVIGATION
================================================ */

function showPage(page) {

  practiceHome.hidden = true;
  theoryPage.hidden = true;
  practicalPage.hidden = true;

  page.hidden = false;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}

function showPracticeHome() {
  showPage(practiceHome);
}

theoryButton.addEventListener("click", () => {
  showPage(theoryPage);
  renderQuestion();
});

practicalButton.addEventListener("click", () => {
  showPage(practicalPage);
});

backFromTheory.addEventListener("click", showPracticeHome);

backFromPractical.addEventListener("click", () => {
  audioElement.pause();
  showPracticeHome();
});


/* ================================================
   4. THEORY QUESTION DATA
================================================ */

const questions = [

  {
    topic: "Fundamental of Sound",

    title: "เสียงเกิดขึ้นได้อย่างไร?",

    choices: [
      "การเคลื่อนที่ของแสงผ่านอากาศ",
      "การสั่นสะเทือนของวัตถุที่ทำให้เกิดคลื่นผ่านตัวกลาง",
      "การเปลี่ยนแปลงของอุณหภูมิเท่านั้น",
      "การสะท้อนของแสงจากพื้นผิว"
    ],

    answer: 1,

    explanation:
      "เสียงเกิดจากการสั่นสะเทือนของแหล่งกำเนิด ทำให้เกิดคลื่นเสียงเดินทางผ่านตัวกลาง เช่น อากาศ น้ำ หรือของแข็ง"
  },

  {
    topic: "Waveform",

    title: "Amplitude ของคลื่นเสียงมีความสัมพันธ์กับคุณสมบัติใดของเสียงมากที่สุด?",

    choices: [
      "ความดังของเสียง",
      "ความถี่ของเสียง",
      "ความเร็วในการเดินทางของเสียง",
      "ระยะเวลาของเสียง"
    ],

    answer: 0,

    explanation:
      "Amplitude คือขนาดของการเปลี่ยนแปลงของคลื่น โดยทั่วไปแอมพลิจูดที่มากขึ้นสัมพันธ์กับระดับความดังของเสียงที่มากขึ้น"
  },

  {
    topic: "Frequency",

    title: "เสียงที่มีความถี่สูงจะมีลักษณะอย่างไรเมื่อเทียบกับเสียงที่มีความถี่ต่ำ?",

    choices: [
      "มีระดับเสียงต่ำกว่า",
      "มีระดับเสียงสูงกว่า",
      "มีความดังมากกว่าเสมอ",
      "มีระยะเวลายาวกว่าเสมอ"
    ],

    answer: 1,

    explanation:
      "Frequency คือจำนวนรอบการสั่นต่อวินาที มีหน่วยเป็น Hertz (Hz) ความถี่สูงจะให้ความรู้สึกเป็นเสียงแหลม ส่วนความถี่ต่ำจะให้ความรู้สึกเป็นเสียงทุ้ม"
  },

  {
    topic: "EQ & Filter",

    title: "หากต้องการลดเสียงรบกวนย่านความถี่ต่ำ แต่ยังคงให้ความถี่สูงผ่านไปได้ ควรใช้เครื่องมือใด?",

    choices: [
      "Low-pass Filter",
      "High-pass Filter",
      "Compressor",
      "Reverb"
    ],

    answer: 1,

    explanation:
      "High-pass Filter ช่วยลดความถี่ที่ต่ำกว่าจุด Cutoff และปล่อยให้ความถี่สูงผ่านไปได้"
  },

  {
    topic: "Compressor",

    title: "Compressor ใช้สำหรับทำอะไรในการประมวลผลเสียง?",

    choices: [
      "เพิ่มเสียงสะท้อนให้กับเสียง",
      "เปลี่ยนเสียงโมโนให้เป็นสเตอริโอ",
      "ควบคุมช่วงระดับความดังของสัญญาณเสียง",
      "เปลี่ยนความถี่เสียงให้สูงขึ้น"
    ],

    answer: 2,

    explanation:
      "Compressor ช่วยควบคุม Dynamic Range โดยลดระดับสัญญาณที่มีความดังเกิน Threshold ตามค่าที่ตั้งไว้"
  }

];


/* ================================================
   5. QUIZ VARIABLES
================================================ */

let currentQuestion = 0;

let answers = Array(questions.length).fill(null);

let hasSubmitted = false;


/* ================================================
   6. QUIZ ELEMENTS
================================================ */

const questionText = document.getElementById("questionText");
const questionCount = document.getElementById("questionCount");

const answerList = document.getElementById("answerList");
const numberGrid = document.getElementById("numberGrid");

const answeredCount = document.getElementById("answeredCount");
const feedback = document.getElementById("feedback");

const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");
const submitButton = document.getElementById("submitButton");

const resultModal = document.getElementById("resultModal");
const resultScore = document.getElementById("resultScore");
const resultMessage = document.getElementById("resultMessage");
const explanationList = document.getElementById("explanationList");


/* ================================================
   7. RENDER QUESTION NUMBERS
================================================ */

function renderNumbers() {

  numberGrid.innerHTML = "";

  questions.forEach((question, index) => {

    const button = document.createElement("button");

    button.className = "question-number";
    button.textContent = index + 1;

    if (index === currentQuestion) {
      button.classList.add("current");
    }

    if (answers[index] !== null) {
      button.classList.add("answered");
    }

    button.addEventListener("click", () => {

      if (hasSubmitted) return;

      currentQuestion = index;
      renderQuestion();

    });

    numberGrid.appendChild(button);

  });

  const count = answers.filter(
    answer => answer !== null
  ).length;

  answeredCount.textContent =
    `${count} / ${questions.length} answered`;

}


/* ================================================
   8. RENDER QUESTION
================================================ */

function renderQuestion() {

  const question = questions[currentQuestion];

  questionCount.textContent =
    `QUESTION ${String(currentQuestion + 1).padStart(2, "0")} / ${String(questions.length).padStart(2, "0")}`;

  questionText.textContent = question.title;

  feedback.textContent = `TOPIC: ${question.topic}`;

  answerList.innerHTML = "";

  question.choices.forEach((choice, index) => {

    const button = document.createElement("button");

    button.className = "answer-option";

    button.textContent =
      `${String.fromCharCode(65 + index)}. ${choice}`;

    if (answers[currentQuestion] === index) {
      button.classList.add("selected");
    }

    button.disabled = hasSubmitted;

    button.addEventListener("click", () => {

      if (hasSubmitted) return;

      answers[currentQuestion] = index;

      renderQuestion();

    });

    answerList.appendChild(button);

  });

  previousButton.disabled =
    currentQuestion === 0;

  nextButton.disabled =
    currentQuestion === questions.length - 1;

  submitButton.disabled = hasSubmitted;

  renderNumbers();

}


/* ================================================
   9. PREVIOUS / NEXT
================================================ */

previousButton.addEventListener("click", () => {

  if (currentQuestion > 0 && !hasSubmitted) {

    currentQuestion--;

    renderQuestion();

  }

});


nextButton.addEventListener("click", () => {

  if (
    currentQuestion < questions.length - 1 &&
    !hasSubmitted
  ) {

    currentQuestion++;

    renderQuestion();

  }

});


/* ================================================
   10. CALCULATE SCORE
================================================ */

function calculateScore() {

  return answers.reduce((total, answer, index) => {

    if (answer === questions[index].answer) {
      return total + 1;
    }

    return total;

  }, 0);

}


/* ================================================
   11. SHOW RESULT
================================================ */

function showResult() {

  const score = calculateScore();

  resultScore.textContent =
    `${score} / ${questions.length}`;

  const percentage =
    Math.round((score / questions.length) * 100);

  if (percentage === 100) {

    resultMessage.textContent =
      "Excellent! You answered every question correctly.";

  } else if (percentage >= 60) {

    resultMessage.textContent =
      "Good job! Keep practicing to improve your understanding.";

  } else {

    resultMessage.textContent =
      "Keep learning! Review the explanations and try again.";

  }

  explanationList.innerHTML = "";

  questions.forEach((question, index) => {

    const item = document.createElement("div");

    item.className = "explanation-item";

    const isCorrect =
      answers[index] === question.answer;

    const heading = document.createElement("strong");

    heading.textContent =
      `Question ${index + 1} · ${isCorrect ? "Correct" : "Incorrect"}`;

    const explanation = document.createElement("p");

    explanation.textContent =
      `Correct answer: ${question.choices[question.answer]}. ${question.explanation}`;

    item.appendChild(heading);
    item.appendChild(explanation);

    explanationList.appendChild(item);

  });

  resultModal.classList.add("show");
  resultModal.setAttribute("aria-hidden", "false");

}


/* ================================================
   12. SUBMIT
================================================ */

submitButton.addEventListener("click", () => {

  if (hasSubmitted) return;

  const unanswered = answers.filter(
    answer => answer === null
  ).length;

  if (unanswered > 0) {

    alert(
      `You still have ${unanswered} unanswered question(s). Please complete all questions.`
    );

    return;

  }

  hasSubmitted = true;

  renderQuestion();

  showResult();

});


/* ================================================
   13. CLOSE RESULT
================================================ */

document.getElementById("closeResult")
  .addEventListener("click", () => {

    resultModal.classList.remove("show");
    resultModal.setAttribute("aria-hidden", "true");

    showPracticeHome();

  });


/* ================================================
   14. PRACTICAL AUDIO PLAYER
================================================ */

// Audio file list
const audioSamples = [
  {
    id: "sound-01",
    title: "Table Toob 1",
    src: "audio/crape 1-foley 6 table toob.mp3"
  },
  {
    id: "sound-02",
    title: "Table Toob 2",
    src: "audio/crape 2-foley 6 table toob.mp3"
  },
  {
    id: "sound-03",
    title: "Table Toob 3",
    src: "audio/crape 3-foley 6 table toob.mp3"
  },
  {
    id: "sound-04",
    title: "Trash Koh 1",
    src: "audio/crape 4-foley 1 trash koh.mp3"
  },
  {
    id: "sound-05",
    title: "Trash Koh 2",
    src: "audio/crape 5-foley 1 trash koh.mp3"
  },
  {
    id: "sound-06",
    title: "Trash Koh 3",
    src: "audio/crape 6-foley 1 trash koh.mp3"
   },
  {
    id: "sound-07",
    title: "Glass",
    src: "audio/Glass Horror.mp3"
  }
];


// Audio elements
const audioSelect = document.getElementById("audioSelect");
const audioElement = document.getElementById("audioElement");

const audioTitle = document.getElementById("audioTitle");
const audioStatus = document.getElementById("audioStatus");

const playButton = document.getElementById("playButton");

const audioProgress = document.getElementById("audioProgress");

const currentTimeDisplay = document.getElementById("currentTime");
const durationDisplay = document.getElementById("duration");


// Convert seconds to MM:SS
function formatTime(seconds) {

  if (!Number.isFinite(seconds)) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(remainingSeconds).padStart(2, "0")
  );

}


// Select audio file
audioSelect.addEventListener("change", () => {

  const selectedId = audioSelect.value;

  audioElement.pause();

  audioElement.removeAttribute("src");
  audioElement.load();

  audioProgress.value = 0;
  audioProgress.disabled = true;

  currentTimeDisplay.textContent = "00:00";
  durationDisplay.textContent = "00:00";

  playButton.disabled = true;
  playButton.textContent = "▶ Play";

  if (!selectedId) {

    audioTitle.textContent = "No Audio Selected";
    audioStatus.textContent =
      "Select an audio to start listening";

    return;

  }

  const selectedAudio = audioSamples.find(
    audio => audio.id === selectedId
  );

  if (!selectedAudio) return;

  audioTitle.textContent = selectedAudio.title;
  audioStatus.textContent = "Loading audio...";

  audioElement.src = selectedAudio.src;
  audioElement.load();

});


// Audio metadata loaded
audioElement.addEventListener("loadedmetadata", () => {

  durationDisplay.textContent =
    formatTime(audioElement.duration);

  audioProgress.disabled = false;
  playButton.disabled = false;

  audioStatus.textContent = "Ready to play";

});


// Audio loading error
audioElement.addEventListener("error", () => {

  if (!audioSelect.value) return;

  audioStatus.textContent =
    "Unable to load audio. Please check the file path.";

  playButton.disabled = true;
  audioProgress.disabled = true;

  console.error(
    "Audio file could not be loaded:",
    audioElement.currentSrc
  );

});


// Play / Pause
playButton.addEventListener("click", async () => {

  if (!audioElement.src) return;

  if (audioElement.paused) {

    try {

      await audioElement.play();

    } catch (error) {

      console.error("Audio playback error:", error);

      audioStatus.textContent =
        "Unable to play this audio.";

    }

  } else {

    audioElement.pause();

  }

});


// When audio starts
audioElement.addEventListener("play", () => {

  playButton.textContent = "Ⅱ Pause";
  audioStatus.textContent = "Playing";

});


// When audio pauses
audioElement.addEventListener("pause", () => {

  if (!audioElement.ended && audioElement.src) {

    playButton.textContent = "▶ Play";
    audioStatus.textContent = "Paused";

  }

});


// Update progress bar
audioElement.addEventListener("timeupdate", () => {

  if (!Number.isFinite(audioElement.duration)) return;

  const progress =
    (audioElement.currentTime / audioElement.duration) * 100;

  audioProgress.value = progress;

  currentTimeDisplay.textContent =
    formatTime(audioElement.currentTime);

});


// Seek audio
audioProgress.addEventListener("input", () => {

  if (!Number.isFinite(audioElement.duration)) return;

  audioElement.currentTime =
    (audioProgress.value / 100) * audioElement.duration;

});


// When audio ends
audioElement.addEventListener("ended", () => {

  playButton.textContent = "▶ Play";
  audioStatus.textContent = "Finished";

  audioProgress.value = 0;
  currentTimeDisplay.textContent = "00:00";

  audioElement.currentTime = 0;

});


/* ================================================
   15. SIDE MENU
================================================ */

const sideMenu = document.getElementById("sideMenu");
const backdrop = document.getElementById("menuBackdrop");

const menuToggle = document.getElementById("menuToggle");
const menuClose = document.getElementById("menuClose");


function toggleMenu(open) {

  sideMenu.classList.toggle("open", open);
  backdrop.classList.toggle("show", open);

  sideMenu.setAttribute(
    "aria-hidden",
    String(!open)
  );

  menuToggle.setAttribute(
    "aria-expanded",
    String(open)
  );

}


menuToggle.addEventListener("click", () => {
  toggleMenu(true);
});

menuClose.addEventListener("click", () => {
  toggleMenu(false);
});

backdrop.addEventListener("click", () => {
  toggleMenu(false);
});

document.addEventListener("keydown", event => {

  if (event.key === "Escape") {
    toggleMenu(false);
  }

});


/* ================================================
   16. LOG OUT
================================================ */

document.getElementById("logoutButton")
  .addEventListener("click", async () => {

    if (!auth) {
      window.location.href = "login.html";
      return;
    }

    try {

      await signOut(auth);

      window.location.replace("index.html");

    } catch (error) {

      console.error("Logout error:", error);

      alert("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");

    }

  });


/* ================================================
   17. INITIALIZE
================================================ */

showPracticeHome();

console.log("Practice page initialized successfully.");