/* =========================================================
   FUNDAMENTAL OF SOUND
   - Accordion เปิด/ปิดเนื้อหา
   - เล่นเสียง Waveform Types
   - ปรับความถี่และฟังเสียง Sine Wave
   - วาดกราฟ Frequency
========================================================= */

(() => {
  // =======================================================
  // 1. ระบบ Accordion สำหรับเปิดและย่อเนื้อหา
  // =======================================================

  const sections = [...document.querySelectorAll('.content-section')];

  sections.forEach(section => {
    const button = section.querySelector('.accordion-button');

    if (!button) return;

    button.addEventListener('click', () => {
      const open = section.classList.toggle('open');

      button.setAttribute('aria-expanded', String(open));

      const symbol = button.querySelector('.accordion-symbol');

      if (symbol) {
        symbol.textContent = open ? '−' : '+';
      }
    });
  });


  // =======================================================
  // 2. ระบบเสียง Web Audio API
  // =======================================================

  let audioContext = null;
  let activeOscillator = null;
  let activeGain = null;

  // สร้าง AudioContext เมื่อมีการกดเล่นเสียงครั้งแรก
  function getContext() {
    if (!audioContext) {
      audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
    }

    return audioContext;
  }


  // หยุดเสียงที่กำลังเล่น
  function stopTone() {
    if (!activeOscillator) return;

    const oscillator = activeOscillator;
    const gain = activeGain;

    activeOscillator = null;
    activeGain = null;

    try {
      const ctx = getContext();
      const now = ctx.currentTime;

      // ค่อย ๆ ลดเสียงลงก่อนหยุด เพื่อไม่ให้เกิดเสียงกระตุก
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, 0.025);

      oscillator.stop(now + 0.12);

      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          gain.disconnect();
        } catch (error) {}
      };

    } catch (error) {}

    // คืนปุ่ม Play ของ Waveform Types
    document.querySelectorAll('.play-wave').forEach(button => {
      button.textContent = '▶';
    });
  }


  // เล่นเสียงตามชนิดของคลื่น
  function playTone(type, frequency = 220) {
    stopTone();

    const ctx = getContext();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    // Fade in เพื่อให้เสียงเริ่มอย่างนุ่มนวล
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.16,
      ctx.currentTime + 0.04
    );

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();

    activeOscillator = oscillator;
    activeGain = gain;
  }


  // =======================================================
  // 3. Waveform Types: Sine, Square, Sawtooth, Triangle
  // =======================================================

  document.querySelectorAll('.play-wave').forEach(button => {

    button.addEventListener('click', () => {

      const type = button.dataset.wave;

      // ถ้ากดปุ่มเดิมที่กำลังเล่นอยู่ ให้หยุดเสียง
      if (activeOscillator && button.textContent === 'Ⅱ') {
        stopTone();
        return;
      }

      playTone(type, 220);

      // แสดงสถานะ Pause
      button.textContent = 'Ⅱ';

    });

  });


  // =======================================================
  // 4. Frequency Slider และค่าความถี่
  // =======================================================

  const slider = document.getElementById('frequencySlider');
  const value = document.getElementById('frequencyValue');
  const readout = document.getElementById('frequencyReadout');
  const canvas = document.getElementById('frequencyCanvas');

  // ตรวจสอบว่ามีองค์ประกอบครบก่อนเริ่มทำงาน
  if (!slider || !canvas) return;

  const ctx2d = canvas.getContext('2d');


  // วาดกราฟคลื่นตามความถี่ที่เลือก
  function drawFrequency() {

    const width = canvas.width;
    const height = canvas.height;
    const hz = Number(slider.value);

    ctx2d.clearRect(0, 0, width, height);

    // เส้น Grid แนวนอน
    ctx2d.strokeStyle = 'rgba(169,157,255,.18)';
    ctx2d.lineWidth = 1;

    for (let i = 1; i < 5; i++) {

      const y = i * height / 5;

      ctx2d.beginPath();
      ctx2d.moveTo(0, y);
      ctx2d.lineTo(width, y);
      ctx2d.stroke();

    }

    // วาดเส้น Sine Wave
    ctx2d.strokeStyle = '#a99dff';
    ctx2d.lineWidth = 3;
    ctx2d.beginPath();

    // ความถี่สูงขึ้น จำนวนรอบคลื่นที่แสดงจะเพิ่มขึ้น
    const cycles = Math.max(
      1,
      Math.min(12, hz / 100)
    );

    for (let x = 0; x <= width; x++) {

      const y =
        height / 2 -
        Math.sin(
          (x / width) * Math.PI * 2 * cycles
        ) * height * 0.34;

      if (x === 0) {
        ctx2d.moveTo(x, y);
      } else {
        ctx2d.lineTo(x, y);
      }

    }

    ctx2d.stroke();


    // แสดงค่าความถี่บนหน้าเว็บ
    if (value) {
      value.textContent = `${hz} Hz`;
    }

    if (readout) {
      readout.textContent = `${hz} Hz`;
    }


    // ถ้ามีเสียงกำลังเล่น ให้เปลี่ยนความถี่แบบ Real-time
    if (activeOscillator) {

      activeOscillator.frequency.setTargetAtTime(
        hz,
        getContext().currentTime,
        0.015
      );

    }

  }


  // เมื่อเลื่อน Slider ให้วาดกราฟใหม่
  slider.addEventListener('input', drawFrequency);

  drawFrequency();


  // =======================================================
  // 5. ปุ่ม Play และ Stop ของ Frequency
  // =======================================================

  const playButton = document.getElementById('playFrequency');
  const stopButton = document.getElementById('stopFrequency');

  if (playButton) {

    playButton.addEventListener('click', () => {

      playTone('sine', Number(slider.value));

    });

  }

  if (stopButton) {

    stopButton.addEventListener('click', stopTone);

  }


  // =======================================================
  // 6. ปิดเสียงเมื่อออกจากหน้า
  // =======================================================

  window.addEventListener('pagehide', () => {

    stopTone();

    if (audioContext) {
      audioContext.close();
    }

  });

})();