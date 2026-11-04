/* =========================================================
   SIGNAL PROCESSING LAB

   เครื่องมือทดลองเสียง:
   1. EQ
   2. Filter
   3. Compressor
   4. Volume / Gain
   5. Reverb
   6. Delay
   7. Pitch Shifter

   ใช้ Web Audio API ประมวลผลเสียงจริง
========================================================= */

(() => {

  const $ = id => document.getElementById(id);


  // =======================================================
  // 1. ACCORDION
  // =======================================================

  document.querySelectorAll('.content-section').forEach((section, index) => {

    // เปิดหัวข้อแรกไว้เป็นค่าเริ่มต้น
    if (index === 0) {
      section.classList.add('open');
    }

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
  // 2. AUDIO VARIABLES
  // =======================================================

  let ac = null;
  let analyser = null;
  let meterFrame = null;

  let nodes = {};

  let filterType = 'lowpass';


  // =======================================================
  // 3. สร้าง Reverb Impulse Response
  // =======================================================

  function makeImpulse(ctx, seconds, decay) {

    const length = Math.max(
      1,
      Math.floor(ctx.sampleRate * seconds)
    );

    const buffer = ctx.createBuffer(
      2,
      length,
      ctx.sampleRate
    );

    for (let channel = 0; channel < 2; channel++) {

      const data = buffer.getChannelData(channel);

      for (let i = 0; i < length; i++) {

        data[i] =
          (Math.random() * 2 - 1) *
          Math.pow(1 - i / length, decay);

      }

    }

    return buffer;

  }


  // =======================================================
  // 4. INITIALIZE AUDIO ENGINE
  // =======================================================

  function initAudio() {

    if (ac) return;

    ac = new (
      window.AudioContext || window.webkitAudioContext
    )();


    // -------------------------------------------------------
    // Sound Source
    // ใช้ Sawtooth เป็นเสียงต้นฉบับสำหรับทดลอง Effect
    // -------------------------------------------------------

    const source = ac.createOscillator();

    source.type = 'sawtooth';
    source.frequency.value = 110;


    // -------------------------------------------------------
    // EQ: 4 Bands
    // -------------------------------------------------------

    const eq = [
      'lowshelf',
      'peaking',
      'peaking',
      'highshelf'
    ].map((type, index) => {

      const node = ac.createBiquadFilter();

      node.type = type;

      node.frequency.value = [
        120,
        500,
        2500,
        8000
      ][index];

      if (index === 1 || index === 2) {
        node.Q.value = 1;
      }

      return node;

    });


    // -------------------------------------------------------
    // Filter
    // -------------------------------------------------------

    const filter = ac.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    filter.Q.value = 0.7;


    // -------------------------------------------------------
    // Compressor
    // -------------------------------------------------------

    const compressor = ac.createDynamicsCompressor();

    compressor.threshold.value = -24;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.18;


    // -------------------------------------------------------
    // Gain และ Makeup Gain
    // -------------------------------------------------------

    const inputGain = ac.createGain();
    const makeupGain = ac.createGain();

    inputGain.gain.value = 1;
    makeupGain.gain.value = 1;


    // -------------------------------------------------------
    // Reverb
    // -------------------------------------------------------

    const convolver = ac.createConvolver();

    convolver.buffer = makeImpulse(ac, 2, 2.2);

    const reverbWet = ac.createGain();
    const reverbDry = ac.createGain();

    reverbWet.gain.value = 0.25;
    reverbDry.gain.value = 1;


    // -------------------------------------------------------
    // Delay
    // -------------------------------------------------------

    const delay = ac.createDelay(2);

    delay.delayTime.value = 0.35;

    const feedback = ac.createGain();
    feedback.gain.value = 0.35;

    const delayWet = ac.createGain();
    delayWet.gain.value = 0.25;

    const dryGain = ac.createGain();
    dryGain.gain.value = 1;


    // -------------------------------------------------------
    // Master Output
    // -------------------------------------------------------

    const master = ac.createGain();

    master.gain.value = 0.8;


    // -------------------------------------------------------
    // Audio Meter
    // -------------------------------------------------------

    analyser = ac.createAnalyser();

    analyser.fftSize = 1024;


    // =======================================================
    // 5. CONNECT AUDIO SIGNAL CHAIN
    // =======================================================

    /*
      Source
        ↓
      EQ
        ↓
      Filter
        ↓
      Compressor
        ↓
      Input Gain
        ↓
      Makeup Gain
        ↓
      Effects
        ↓
      Master
        ↓
      Meter
        ↓
      Speaker
    */

    let chain = source;

    eq.forEach(node => {

      chain.connect(node);
      chain = node;

    });

    chain.connect(filter);

    filter.connect(compressor);

    compressor.connect(inputGain);

    inputGain.connect(makeupGain);


    // Dry signal
    makeupGain.connect(dryGain);

    dryGain.connect(master);


    // Delay Send
    makeupGain.connect(delay);

    delay.connect(delayWet);

    delayWet.connect(master);

    delay.connect(feedback);

    feedback.connect(delay);


    // Reverb Send
    makeupGain.connect(convolver);

    convolver.connect(reverbWet);

    reverbWet.connect(master);

    makeupGain.connect(reverbDry);

    reverbDry.connect(master);


    // Master Output
    master.connect(analyser);

    analyser.connect(ac.destination);


    // เก็บ Node ทั้งหมดไว้สำหรับปรับค่าภายหลัง
    nodes = {

      source,
      eq,
      filter,
      compressor,

      inputGain,
      makeupGain,

      dryGain,

      delay,
      feedback,
      delayWet,

      convolver,
      reverbWet,
      reverbDry,

      master

    };


    // เริ่มเสียงต้นฉบับ
    source.start();

    runMeter();

  }


  // =======================================================
  // 6. LEVEL METER
  // =======================================================

  function runMeter() {

    if (!analyser) return;

    const data = new Uint8Array(
      analyser.frequencyBinCount
    );

    analyser.getByteTimeDomainData(data);

    let sum = 0;

    for (const value of data) {

      const sample = (value - 128) / 128;

      sum += sample * sample;

    }

    const rms = Math.sqrt(sum / data.length);

    const db = rms > 0
      ? 20 * Math.log10(rms)
      : -Infinity;


    // ปรับความสูงของ Meter
    const meter = $('levelMeter');

    if (meter) {

      meter.style.height =
        `${Math.max(0, Math.min(100, (db + 48) / 48 * 100))}%`;

    }


    // แสดงค่า dB
    const meterValue = $('meterValue');

    if (meterValue) {

      meterValue.textContent =
        Number.isFinite(db)
          ? `${db.toFixed(1)} dB`
          : '−∞ dB';

    }

    meterFrame = requestAnimationFrame(runMeter);

  }


  // =======================================================
  // 7. START / STOP AUDIO
  // =======================================================

  function start() {

    initAudio();

    if (ac.state === 'suspended') {
      ac.resume();
    }

    const status = $('audioStatus');

    if (status) {
      status.textContent = 'Audio is running';
    }

  }


  function stop() {

    if (ac && ac.state === 'running') {
      ac.suspend();
    }

    const status = $('audioStatus');

    if (status) {
      status.textContent = 'Audio is stopped';
    }

  }


  if ($('startAudio')) {
    $('startAudio').addEventListener('click', start);
  }

  if ($('stopAudio')) {
    $('stopAudio').addEventListener('click', stop);
  }

  if ($('tone440')) {
    $('tone440').addEventListener('click', start);
  }

  if ($('stopTone')) {
    $('stopTone').addEventListener('click', stop);
  }


  // =======================================================
  // 8. CONTROL BINDING
  // =======================================================

  /*
    เชื่อม Slider กับ Audio Parameter จริง

    id       = id ของ Slider
    output   = id ของตัวเลขที่แสดง
    formatter = รูปแบบตัวเลข
    setter   = วิธีปรับเสียงจริง
  */

  const bind = (
    id,
    output,
    formatter,
    setter
  ) => {

    const input = $(id);
    const out = $(output);

    if (!input || !out) return;

    const update = () => {

      const value = Number(input.value);

      out.textContent = formatter(value);

      if (ac) {
        setter(value);
      }

      drawAll();

    };

    input.addEventListener('input', update);

    update();

  };


  const db = value =>
    `${value > 0 ? '+' : ''}${value} dB`;


  // =======================================================
  // 9. EQ
  // =======================================================

  [
    'lowGain',
    'lowMidGain',
    'highMidGain',
    'highGain'

  ].forEach((id, index) => {

    const outputs = [
      'lowOut',
      'lowMidOut',
      'highMidOut',
      'highOut'
    ];

    bind(
      id,
      outputs[index],
      db,
      value => {

        if (nodes.eq) {

          nodes.eq[index].gain.setTargetAtTime(
            value,
            ac.currentTime,
            0.02
          );

        }

      }
    );

  });


  // =======================================================
  // 10. FILTER
  // =======================================================

  document.querySelectorAll('[data-filter]').forEach(button => {

    button.addEventListener('click', () => {

      document.querySelectorAll('[data-filter]').forEach(btn => {

        btn.classList.toggle(
          'active',
          btn === button
        );

      });

      filterType = button.dataset.filter;

      if (nodes.filter) {
        nodes.filter.type = filterType;
      }

      drawAll();

    });

  });


  // Cutoff Frequency
  bind(
    'cutoff',
    'cutoffOut',
    value => `${value} Hz`,
    value => {

      if (nodes.filter) {

        nodes.filter.frequency.setTargetAtTime(
          value,
          ac.currentTime,
          0.02
        );

      }

    }
  );


  // Resonance
  bind(
    'resonance',
    'qOut',
    value => value.toFixed(1),
    value => {

      if (nodes.filter) {

        nodes.filter.Q.setTargetAtTime(
          value,
          ac.currentTime,
          0.02
        );

      }

    }
  );


  // =======================================================
  // 11. COMPRESSOR
  // =======================================================

  bind(
    'threshold',
    'thresholdOut',
    value => `${value} dB`,
    value => {

      if (nodes.compressor) {

        nodes.compressor.threshold.setTargetAtTime(
          value,
          ac.currentTime,
          0.02
        );

      }

    }
  );


  bind(
    'ratio',
    'ratioOut',
    value => `${value}:1`,
    value => {

      if (nodes.compressor) {

        nodes.compressor.ratio.setTargetAtTime(
          value,
          ac.currentTime,
          0.02
        );

      }

    }
  );


  bind(
    'attack',
    'attackOut',
    value => `${value} ms`,
    value => {

      if (nodes.compressor) {

        nodes.compressor.attack.setTargetAtTime(
          value / 1000,
          ac.currentTime,
          0.02
        );

      }

    }
  );


  bind(
    'release',
    'releaseOut',
    value => `${value} ms`,
    value => {

      if (nodes.compressor) {

        nodes.compressor.release.setTargetAtTime(
          value / 1000,
          ac.currentTime,
          0.02
        );

      }

    }
  );


  // Makeup Gain
  bind(
    'makeup',
    'makeupOut',
    db,
    value => {

      if (nodes.makeupGain) {

        nodes.makeupGain.gain.setTargetAtTime(
          Math.pow(10, value / 20),
          ac.currentTime,
          0.02
        );

      }

    }
  );


  // =======================================================
  // 12. VOLUME / GAIN
  // =======================================================

  bind(
    'inputGain',
    'gainOut',
    db,
    value => {

      if (nodes.inputGain) {

        nodes.inputGain.gain.setTargetAtTime(
          Math.pow(10, value / 20),
          ac.currentTime,
          0.02
        );

      }

    }
  );


  bind(
    'outputVolume',
    'volumeOut',
    value => `${value}%`,
    value => {

      if (nodes.master) {

        nodes.master.gain.setTargetAtTime(
          value / 100,
          ac.currentTime,
          0.02
        );

      }

    }
  );


  // =======================================================
  // 13. REVERB
  // =======================================================

  bind(
    'roomSize',
    'roomOut',
    value => `${value}%`,
    value => {

      if (nodes.convolver) {

        nodes.convolver.buffer = makeImpulse(
          ac,
          0.4 + value / 100 * 5,
          2.8 - Number($('damping').value) / 100 * 2
        );

      }

    }
  );


  bind(
    'decay',
    'decayOut',
    value => `${value.toFixed(1)} s`,
    value => {

      if (nodes.convolver) {

        nodes.convolver.buffer = makeImpulse(
          ac,
          value,
          2.8 - Number($('damping').value) / 100 * 2
        );

      }

    }
  );


  bind(
    'damping',
    'dampingOut',
    value => `${value}%`,
    value => {

      if (nodes.convolver) {

        nodes.convolver.buffer = makeImpulse(
          ac,
          Number($('decay').value),
          2.8 - value / 100 * 2
        );

      }

    }
  );


  bind(
    'reverbWet',
    'reverbWetOut',
    value => `${value}%`,
    value => {

      if (nodes.reverbWet) {

        nodes.reverbWet.gain.setTargetAtTime(
          value / 100,
          ac.currentTime,
          0.02
        );

      }

    }
  );


  bind(
    'reverbDry',
    'reverbDryOut',
    value => `${value}%`,
    value => {

      if (nodes.reverbDry) {

        nodes.reverbDry.gain.setTargetAtTime(
          value / 100,
          ac.currentTime,
          0.02
        );

      }

    }
  );


  // =======================================================
  // 14. DELAY
  // =======================================================

  bind(
    'delayTime',
    'delayTimeOut',
    value => `${value} ms`,
    value => {

      if (nodes.delay) {

        nodes.delay.delayTime.setTargetAtTime(
          value / 1000,
          ac.currentTime,
          0.02
        );

      }

    }
  );


  bind(
    'feedback',
    'feedbackOut',
    value => `${value}%`,
    value => {

      if (nodes.feedback) {

        nodes.feedback.gain.setTargetAtTime(
          value / 100,
          ac.currentTime,
          0.02
        );

      }

    }
  );


  bind(
    'delayWet',
    'delayWetOut',
    value => `${value}%`,
    value => {

      if (nodes.delayWet) {

        nodes.delayWet.gain.setTargetAtTime(
          value / 100,
          ac.currentTime,
          0.02
        );

      }

    }
  );


  bind(
    'delayDry',
    'delayDryOut',
    value => `${value}%`,
    value => {

      if (nodes.dryGain) {

        nodes.dryGain.gain.setTargetAtTime(
          value / 100,
          ac.currentTime,
          0.02
        );

      }

    }
  );


  // =======================================================
  // 15. PITCH SHIFTER
  // =======================================================

  const pitchSlider = $('pitchShift');

  if (pitchSlider) {

    pitchSlider.addEventListener('input', event => {

      const value = Number(event.target.value);

      if ($('pitchValue')) {

        $('pitchValue').textContent =
          `${value > 0 ? '+' : ''}${value} semitones`;

      }

      if ($('pitchNote')) {

        $('pitchNote').textContent =
          value === 0
            ? 'Original pitch'
            : value > 0
              ? 'Higher pitch'
              : 'Lower pitch';

      }

      if (nodes.source && ac) {

        nodes.source.detune.setTargetAtTime(
          value * 100,
          ac.currentTime,
          0.02
        );

      }

    });

  }


  // =======================================================
  // 16. DAW STYLE GRAPH
  // =======================================================

  function plot(id, fn, mode = 'response') {

    const canvas = $(id);

    if (!canvas) return;

    const graph = canvas.getContext('2d');

    const width = canvas.width;
    const height = canvas.height;

    graph.clearRect(0, 0, width, height);


    // Background
    graph.fillStyle = '#080711';

    graph.fillRect(0, 0, width, height);


    // Grid แนวตั้ง
    graph.strokeStyle = '#29233f';
    graph.lineWidth = 1;

    for (let i = 0; i <= 8; i++) {

      const x = i * width / 8;

      graph.beginPath();
      graph.moveTo(x, 0);
      graph.lineTo(x, height);
      graph.stroke();

    }


    // Grid แนวนอน
    for (let i = 0; i <= 4; i++) {

      const y = i * height / 4;

      graph.beginPath();
      graph.moveTo(0, y);
      graph.lineTo(width, y);
      graph.stroke();

    }


    // Graph Labels
    graph.fillStyle = '#81799d';
    graph.font = '12px DM Sans';

    graph.fillText('+12 dB', 8, 14);
    graph.fillText('0 dB', 8, height / 2 - 5);
    graph.fillText('−12 dB', 8, height - 8);


    // เส้นกราฟ
    graph.strokeStyle = '#a99dff';
    graph.lineWidth = 3;

    graph.beginPath();

    for (let x = 0; x < width; x++) {

      const t = x / (width - 1);

      const frequency = 20 * Math.pow(1000, t);

      const y = fn(frequency, t, height);

      if (x === 0) {
        graph.moveTo(x, y);
      } else {
        graph.lineTo(x, y);
      }

    }

    graph.stroke();

  }


  // =======================================================
  // 17. UPDATE ALL GRAPHS
  // =======================================================

  function drawAll() {

    // -------------------------
    // EQ Graph
    // -------------------------

    const gains = [
      'lowGain',
      'lowMidGain',
      'highMidGain',
      'highGain'
    ].map(id => $(id) ? Number($(id).value) : 0);


    plot(
      'eqCanvas',
      (frequency, t, height) => {

        let gain = 0;

        const centers = [
          120,
          500,
          2500,
          8000
        ];

        centers.forEach((center, index) => {

          const width =
            index === 0 || index === 3
              ? 1.1
              : 0.45;

          gain += gains[index] *
            Math.exp(
              -Math.pow(
                Math.log(frequency / center) / width,
                2
              ) / 2
            );

        });

        return height / 2 - gain / 15 * height * 0.42;

      }
    );


    // -------------------------
    // Filter Graph
    // -------------------------

    const cutoff = $('cutoff')
      ? Number($('cutoff').value)
      : 1000;

    const resonance = $('resonance')
      ? Number($('resonance').value)
      : 0.7;


    plot(
      'filterCanvas',
      (frequency, t, height) => {

        let value = 0;

        if (filterType === 'lowpass') {

          value = -Math.max(
            0,
            20 * Math.log10(frequency / cutoff)
          ) * 1.1;

        } else if (filterType === 'highpass') {

          value = -Math.max(
            0,
            20 * Math.log10(cutoff / frequency)
          ) * 1.1;

        } else {

          value = -Math.abs(
            20 * Math.log10(frequency / cutoff)
          ) * 1.1;

        }

        value = Math.max(
          -36,
          Math.min(12, value)
        );

        if (Math.abs(Math.log(frequency / cutoff)) < 0.12) {

          value += Math.min(
            10,
            resonance * 0.7
          );

        }

        return height / 2 - value / 36 * height * 0.42;

      }
    );


    // -------------------------
    // Compressor Graph
    // -------------------------

    const threshold = $('threshold')
      ? Number($('threshold').value)
      : -24;

    const ratio = $('ratio')
      ? Number($('ratio').value)
      : 4;


    plot(
      'compressorCanvas',
      (frequency, t, height) => {

        const input = -60 + t * 60;

        const output =
          input > threshold
            ? threshold + (input - threshold) / ratio
            : input;

        return height - ((output + 60) / 60) * height * 0.9;

      }
    );


    // -------------------------
    // Reverb Graph
    // -------------------------

    plot(
      'reverbCanvas',
      (frequency, t, height) => {

        return height * 0.15 +
          Math.pow(t, 1.4) * height * 0.7;

      }
    );


    // -------------------------
    // Delay Graph
    // -------------------------

    plot(
      'delayCanvas',
      (frequency, t, height) => {

        return height * 0.5 +
          Math.sin(t * 42) *
          Math.exp(-t * 3) *
          height * 0.35;

      }
    );

  }


  // วาดกราฟเริ่มต้น
  drawAll();


  // =======================================================
  // 18. CLEAN UP
  // =======================================================

  window.addEventListener('pagehide', () => {

    if (meterFrame) {
      cancelAnimationFrame(meterFrame);
    }

    if (ac) {
      ac.close();
    }

  });


  // =======================================================
  // หมายเหตุ:
  // เมนูด้านข้างและ Firebase session ใช้ learning.js เดิม
  // ไม่ต้องเขียนระบบ Login ซ้ำในไฟล์นี้
  // =======================================================

})();