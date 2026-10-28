// Giá trị mặc định, sẽ bị ghi đè bởi customize.json và tham số URL (?name=...&age=...)
const DEFAULTS = {
  name: "Bạn Hiền",
  age: "",
  candles: 5,
  music: "",
  giftSteps: ["Từ từ đã... 🤭", "Gần tới rồi...", "Thêm chút nữa thôi!", "Hộp cuối, thề luôn 🤞"],
  giftImage: "",
  giftText: "Chúc bạn sinh nhật thật vui! 🎉",
  photos: [],
  letter: ["Chúc mừng sinh nhật nhé!"],
  signature: "",
  thanksLink: ""
};

let CFG = { ...DEFAULTS };

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

async function loadConfig() {
  try {
    const res = await fetch("customize.json", { cache: "no-store" });
    if (res.ok) CFG = { ...DEFAULTS, ...(await res.json()) };
  } catch (e) {
    // Mở file trực tiếp (file://) thì không đọc được JSON, dùng mặc định
  }
  const params = new URLSearchParams(location.search);
  if (params.get("name")) CFG.name = params.get("name");
  if (params.get("age")) CFG.age = params.get("age");
}

/* ================= ÂM THANH (tự tổng hợp, không cần file) ================= */
const Sound = (() => {
  let ctx = null;
  let master, sfx, music;
  let loopTimer = null;
  let fileAudio = null;
  let muted = false;

  function init() {
    if (ctx) return ctx.resume();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    sfx = ctx.createGain();
    sfx.gain.value = 0.7;
    sfx.connect(master);
  }

  function tone(freq, t, dur, { type = "triangle", vol = 0.3, out = sfx, to } = {}) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur, { freq = 1200, to, q = 1, vol = 0.5 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(sfx);
    src.start(t);
  }

  const now = () => (ctx ? ctx.currentTime : 0);

  const fx = {
    pop: () => { noise(0.08, { freq: 2500, q: 0.7, vol: 0.6 }); tone(600, now(), 0.1, { to: 150, vol: 0.3 }); },
    ding: () => { tone(1318.5, now(), 0.8, { type: "sine", vol: 0.25 }); tone(1975.5, now() + 0.08, 0.9, { type: "sine", vol: 0.15 }); },
    boing: () => tone(180, now(), 0.35, { type: "sine", to: 520, vol: 0.35 }),
    whoosh: () => noise(0.7, { freq: 300, to: 2500, q: 2, vol: 0.7 }),
    buzz: () => tone(110, now(), 0.35, { type: "sawtooth", vol: 0.15 }),
    blip: () => tone(880, now(), 0.06, { type: "square", vol: 0.05 }),
    horn: () => {
      // tiếng kèn tiệc "toe toe"
      [0, 0.18].forEach((d) => tone(466, now() + d, 0.16, { type: "sawtooth", vol: 0.12 }));
      tone(466, now() + 0.36, 0.6, { type: "sawtooth", vol: 0.12, to: 494 });
    }
  };

  // Giai điệu "Happy Birthday" (dân gian, không bản quyền): [tần số, số phách]
  const MELODY = [
    [392, .75], [392, .25], [440, 1], [392, 1], [523.25, 1], [493.88, 2],
    [392, .75], [392, .25], [440, 1], [392, 1], [587.33, 1], [523.25, 2],
    [392, .75], [392, .25], [783.99, 1], [659.25, 1], [523.25, 1], [493.88, 1], [440, 2],
    [698.46, .75], [698.46, .25], [659.25, 1], [523.25, 1], [587.33, 1], [523.25, 3]
  ];
  // Bè trầm: [tần số, phách bắt đầu, số phách]
  const BASS = [
    [130.81, 1, 3], [98, 4, 3], [98, 7, 3], [130.81, 10, 3],
    [130.81, 13, 3], [87.31, 16, 3], [130.81, 20, 2], [98, 22, 1.5], [130.81, 23.5, 2.5]
  ];
  const BEAT = 0.42;
  const LOOP_BEATS = 28;

  function scheduleLoop() {
    const t0 = ctx.currentTime + 0.1;
    let b = 0;
    MELODY.forEach(([f, d]) => {
      tone(f, t0 + b * BEAT, d * BEAT * 0.95, { vol: 0.22, out: music });
      tone(f * 2, t0 + b * BEAT, d * BEAT * 0.6, { type: "sine", vol: 0.04, out: music });
      b += d;
    });
    BASS.forEach(([f, s, d]) => tone(f, t0 + s * BEAT, d * BEAT, { type: "sine", vol: 0.25, out: music }));
    loopTimer = setTimeout(scheduleLoop, LOOP_BEATS * BEAT * 1000);
  }

  function startMusic() {
    if (!ctx) return;
    stopMusic();
    if (CFG.music) {
      if (!fileAudio) {
        fileAudio = new Audio(CFG.music);
        fileAudio.loop = true;
        fileAudio.volume = 0.5;
        // File nhạc lỗi thì quay về nhạc tự tổng hợp
        fileAudio.addEventListener("error", () => { CFG.music = ""; fileAudio = null; startMusic(); });
      }
      fileAudio.muted = muted;
      fileAudio.currentTime = 0;
      fileAudio.play().catch(() => {});
      return;
    }
    music = ctx.createGain();
    music.gain.value = 0.9;
    music.connect(master);
    scheduleLoop();
  }

  function stopMusic() {
    clearTimeout(loopTimer);
    if (fileAudio) fileAudio.pause();
    if (music && ctx) {
      const old = music;
      old.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => old.disconnect(), 600);
      music = null;
    }
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 1;
    if (fileAudio) fileAudio.muted = muted;
    return muted;
  }

  return { init, fx, startMusic, stopMusic, toggleMute, get ctx() { return ctx; } };
})();

/* ================= Tiện ích ================= */
function boom(big = true) {
  if (typeof confetti !== "function") return;
  const colors = ["#ff6f9c", "#ffd166", "#8ecae6", "#b8e0d2", "#cdb4db"];
  confetti({ particleCount: big ? 160 : 70, spread: 100, origin: { y: 0.6 }, colors });
  if (big) {
    setTimeout(() => {
      confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.8 }, colors });
      confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.8 }, colors });
    }, 250);
  }
}

function go(id) {
  $$(".scene").forEach((s) => s.classList.toggle("active", s.id === id));
  Sound.fx.whoosh();
  if (SCENE_ENTER[id]) SCENE_ENTER[id]();
}

function makeBalloons() {
  const bg = $("#bg");
  for (let i = 0; i < 8; i++) {
    const img = document.createElement("img");
    img.src = `img/ballon${(i % 3) + 1}.svg`;
    img.alt = "";
    img.style.left = `${rand(0, 92)}%`;
    img.style.width = `${rand(40, 75)}px`;
    img.style.animationDuration = `${rand(14, 24)}s`;
    img.style.animationDelay = `${-rand(0, 20)}s`;
    bg.appendChild(img);
  }
}

/* ================= MÀN 1: Trò đùa ================= */
async function runPrank() {
  $("#prankText").textContent = CFG.age
    ? `Phát hiện ${CFG.name} vừa chính thức lên ${CFG.age} tuổi!`
    : `Phát hiện ${CFG.name} vừa già thêm 1 tuổi!`;

  const msgs = [
    [0, "Đang khởi động máy đếm tuổi..."],
    [15, "Đang đếm số nếp nhăn..."],
    [35, "Đang tra cứu sổ hộ khẩu..."],
    [55, "Đang so sánh với ảnh năm ngoái..."],
    [75, "Hmm... có vẻ không ổn lắm..."],
    [92, "Đang chờ bạn chấp nhận sự thật..."]
  ];
  for (let p = 0; p <= 99; p++) {
    $("#barFill").style.width = `${p}%`;
    $("#barPct").textContent = p;
    const m = msgs.filter(([at]) => p >= at).pop();
    $("#barMsg").textContent = m[1];
    await wait(p > 90 ? 120 : rand(15, 55));
  }
  await wait(1200);
  $("#prankActions").classList.remove("hidden");
}

function setupPrankButtons() {
  const yes = $("#btnYes");
  const no = $("#btnNo");
  const noTexts = ["Chắc chưa? 🤨", "Bắt được không? 😜", "Hụt rồi!", "Chạy đằng trời 🏃", "Mệt chưa?", "Thôi được, tôi già 😭"];
  let tries = 0;

  function runAway(e) {
    if (tries >= noTexts.length - 1) return;
    if (e) e.preventDefault();
    Sound.init();
    Sound.fx.boing();
    no.classList.add("running");
    const w = no.offsetWidth;
    const h = no.offsetHeight;
    no.style.left = `${rand(10, window.innerWidth - w - 10)}px`;
    no.style.top = `${rand(60, window.innerHeight - h - 20)}px`;
    no.textContent = noTexts[tries];
    tries++;
  }

  function accept() {
    Sound.init();
    Sound.fx.horn();
    boom(false);
    Sound.startMusic();
    $("#btnMute").classList.remove("hidden");
    no.classList.add("hidden");
    setTimeout(() => go("s-cake"), 900);
  }

  no.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") runAway(); });
  no.addEventListener("touchstart", runAway, { passive: false });
  no.addEventListener("click", () => (tries >= noTexts.length - 1 ? accept() : runAway()));
  yes.addEventListener("click", accept);
}

/* ================= MÀN 2: Thổi nến ================= */
const cake = { lit: 0, done: false, stream: null, raf: 0 };

function setupCake() {
  const n = Math.max(1, Math.min(10, parseInt(CFG.candles, 10) || 5));
  const box = $("#candles");
  box.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const c = document.createElement("div");
    c.className = "candle";
    c.innerHTML = '<div class="flame"></div><div class="smoke"></div>';
    c.style.height = `${rand(40, 52)}px`;
    c.addEventListener("click", () => blowOut(c));
    box.appendChild(c);
  }
  cake.lit = n;
}

function blowOut(candle) {
  if (!candle || candle.classList.contains("out") || cake.done) return;
  candle.classList.add("out");
  Sound.fx.pop();
  cake.lit--;
  if (cake.lit <= 0) allOut();
}

async function allOut() {
  cake.done = true;
  stopMic();
  $("#btnMic").classList.add("hidden");
  $("#meter").classList.add("hidden");
  $("#cakeHint").textContent = "Điều ước đã được gửi đi 🌠";
  await wait(500);
  boom(true);
  Sound.fx.horn();
  Sound.startMusic();
  $("#hbd").classList.remove("hidden");
  setTimeout(() => boom(false), 1500);
}

async function startMic() {
  const btn = $("#btnMic");
  try {
    Sound.init();
    cake.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
  } catch (e) {
    btn.classList.add("hidden");
    $("#cakeHint").innerHTML = "Không bật được micro 😅 Không sao, <b>chạm vào từng ngọn nến</b> để thổi nhé!";
    return;
  }
  // Tạm tắt nhạc để micro không nghe nhầm tiếng loa
  Sound.stopMusic();
  btn.classList.add("hidden");
  $("#meter").classList.remove("hidden");
  $("#cakeHint").innerHTML = "Giờ thì <b>thổi thật mạnh</b> vào micro nào! 💨";

  const ctx = Sound.ctx;
  const src = ctx.createMediaStreamSource(cake.stream);
  const an = ctx.createAnalyser();
  an.fftSize = 1024;
  src.connect(an);
  const data = new Float32Array(an.fftSize);
  let acc = 0;
  let last = performance.now();

  const loop = (t) => {
    const dt = (t - last) / 1000;
    last = t;
    an.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    const rms = Math.sqrt(sum / data.length);
    $("#meterFill").style.width = `${Math.min(100, rms * 400)}%`;

    // Thổi càng mạnh, nến tắt càng nhanh
    if (rms > 0.08) acc += dt * (rms > 0.25 ? 3 : 1);
    else acc = Math.max(0, acc - dt);
    if (acc > 0.25) {
      acc = 0;
      const lit = [...$$(".candle:not(.out)")];
      blowOut(lit[Math.floor(Math.random() * lit.length)]);
    }
    if (!cake.done) cake.raf = requestAnimationFrame(loop);
  };
  cake.raf = requestAnimationFrame(loop);
}

function stopMic() {
  cancelAnimationFrame(cake.raf);
  if (cake.stream) cake.stream.getTracks().forEach((t) => t.stop());
  cake.stream = null;
}

/* ================= MÀN 3: Hộp quà ================= */
function setupGift() {
  const gift = $("#gift");
  const steps = CFG.giftSteps || [];
  let idx = 0;
  let scale = 1;
  let hue = 340;
  let busy = false;

  async function onTap() {
    if (busy) return;
    busy = true;
    gift.classList.remove("shake");
    void gift.offsetWidth;
    gift.classList.add("shake");

    if (idx < steps.length) {
      Sound.fx.boing();
      await wait(500);
      gift.classList.remove("shake");
      scale *= 0.82;
      hue = (hue + 70) % 360;
      gift.style.setProperty("--s", scale);
      gift.style.setProperty("--hue", hue);
      $("#giftCaption").textContent = `${steps[idx]} (chạm tiếp)`;
      Sound.fx.blip();
      idx++;
      busy = false;
      return;
    }

    await wait(400);
    gift.classList.add("open");
    Sound.fx.ding();
    boom(true);
    $("#giftCaption").textContent = "Tèn ten! 🎉";
    await wait(800);
    gift.parentElement.classList.add("hidden");
    const img = $("#giftImg");
    if (CFG.giftImage) img.src = CFG.giftImage;
    else {
      const emo = document.createElement("div");
      emo.className = "big-emoji";
      emo.textContent = "🧸";
      img.replaceWith(emo);
    }
    $("#giftText").textContent = CFG.giftText;
    $("#giftReveal").classList.remove("hidden");
  }

  gift.addEventListener("click", onTap);
  gift.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") onTap(); });
}

/* ================= MÀN 4: Ảnh ================= */
function showPhotos() {
  const wrap = $("#polaroids");
  if (wrap.childElementCount) return;
  const emojis = ["🤪", "🙈", "😴", "🍜", "🥳", "😎", "🤡", "🐷"];
  const photos = (CFG.photos && CFG.photos.length) ? CFG.photos : [{ caption: "Thêm ảnh vào customize.json nhé!" }];

  photos.forEach((p, i) => {
    const card = document.createElement("figure");
    card.className = "polaroid";
    card.style.margin = "0";
    card.style.setProperty("--r", `${rand(-7, 7).toFixed(1)}deg`);
    card.style.animationDelay = `${0.3 + i * 0.45}s`;

    let ph;
    if (p.src) {
      ph = document.createElement("img");
      ph.src = p.src;
      ph.alt = p.caption || "";
    } else {
      ph = document.createElement("div");
      ph.textContent = emojis[i % emojis.length];
    }
    ph.className = "ph";
    const cap = document.createElement("p");
    cap.textContent = p.caption || "";
    card.append(ph, cap);
    wrap.appendChild(card);
    setTimeout(() => Sound.fx.pop(), (0.3 + i * 0.45 + 0.5) * 1000);
  });

  setTimeout(() => $("#btnToLetter").classList.remove("hidden"), (0.3 + photos.length * 0.45 + 0.8) * 1000);
}

/* ================= MÀN 5: Thư ================= */
function setupLetter() {
  const env = $("#envelope");
  let opened = false;
  let skip = false;

  async function open() {
    if (opened) return;
    opened = true;
    env.classList.add("open");
    Sound.fx.ding();
    await wait(900);
    env.classList.add("hidden");
    $("#envHint").classList.add("hidden");
    $("#letter").classList.remove("hidden");
    $("#letter").addEventListener("click", () => (skip = true));
    await typeLetter();
  }

  async function typeText(el, text) {
    el.classList.add("caret");
    for (const ch of text) {
      if (skip) break;
      el.textContent += ch;
      if (ch !== " " && Math.random() < 0.3) Sound.fx.blip();
      await wait(ch === "," || ch === "." ? 220 : 38);
    }
    el.textContent = text;
    el.classList.remove("caret");
  }

  async function typeLetter() {
    const body = $("#letterBody");
    const paras = Array.isArray(CFG.letter) ? CFG.letter : [String(CFG.letter)];
    for (const text of paras) {
      const p = document.createElement("p");
      body.appendChild(p);
      await typeText(p, text);
      if (!skip) await wait(300);
    }
    if (CFG.signature) await typeText($("#letterSign"), `— ${CFG.signature}`);
    $("#letterActions").classList.remove("hidden");
    boom(false);
  }

  env.addEventListener("click", open);
  env.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") open(); });

  $("#btnReplay").addEventListener("click", () => location.reload());
  if (CFG.thanksLink) {
    const t = $("#btnThanks");
    t.href = CFG.thanksLink;
    t.classList.remove("hidden");
  }
}

const SCENE_ENTER = {
  "s-photos": showPhotos
};

/* ================= Khởi động ================= */
(async function main() {
  await loadConfig();
  document.title = `Chúc mừng sinh nhật ${CFG.name}! 🎂`;
  $$(".js-name").forEach((el) => (el.textContent = CFG.name));

  makeBalloons();
  setupPrankButtons();
  setupCake();
  setupGift();
  setupLetter();

  $("#btnMic").addEventListener("click", startMic);
  $$("[data-next]").forEach((b) => b.addEventListener("click", () => go(b.dataset.next)));
  $("#btnMute").addEventListener("click", (e) => {
    const m = Sound.toggleMute();
    e.currentTarget.textContent = m ? "🔇" : "🔊";
  });

  runPrank();
})();
