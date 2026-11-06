(() => {
  'use strict';

  // Multiple official + public streams for maximum reliability (never loses connection)
  const STREAMS = [
    'https://s3.radio.co/s97f38db97/listen',                          // Official Radio.co (primary)
    'https://stream-155.zeno.fm/3gdtad95608uv',                      // Zeno.fm mirror
    'http://station.voscast.com/5ca3d6cd7c777/',                     // Voscast (shared by ministry)
    'https://stream-155.zeno.fm/3gdtad95608uv?zs=WOywo-IiRiexGZXqWFKejQ', // Zeno alt
    'https://s3.radio.co/s97f38db97/listen'                          // Primary again as last resort
  ];

  const player = document.getElementById('player');
  const btnPlay = document.getElementById('btnPlay');
  const btnMute = document.getElementById('btnMute');
  const btnShare = document.getElementById('btnShare');
  const volume = document.getElementById('volume');
  const statusEl = document.getElementById('status');
  const trackTitle = document.getElementById('trackTitle');
  const visualizer = document.getElementById('visualizer');
  const timerBtns = document.getElementById('timerBtns');
  const alarmTime = document.getElementById('alarmTime');
  const btnSetAlarm = document.getElementById('btnSetAlarm');
  const btnCancelAlarm = document.getElementById('btnCancelAlarm');
  const alarmStatus = document.getElementById('alarmStatus');
  const installBanner = document.getElementById('installBanner');
  const btnInstall = document.getElementById('btnInstall');

  let currentStreamIndex = 0;
  let isPlaying = false;
  let sleepTimerId = null;
  let sleepEndTime = null;
  let alarmTimeoutId = null;
  let deferredPrompt = null;
  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;
  let animFrame = null;

  // ---------- Daily verse ----------
  const verses = [
    { ref: 'John 14:6', text: 'Jesus said to him, “I am the way, and the truth, and the life. No one comes to the Father except through me.”' },
    { ref: 'Revelation 22:20', text: 'He who testifies to these things says, “Surely I am coming soon.” Amen. Come, Lord Jesus!' },
    { ref: 'Matthew 24:44', text: 'Therefore you also must be ready, for the Son of Man is coming at an hour you do not expect.' },
    { ref: 'Hebrews 12:14', text: 'Strive for peace with everyone, and for the holiness without which no one will see the Lord.' },
    { ref: 'Acts 3:19', text: 'Repent therefore, and turn back, that your sins may be blotted out.' },
    { ref: 'Isaiah 40:3', text: 'A voice cries: “In the wilderness prepare the way of the Lord; make straight in the desert a highway for our God.”' },
    { ref: 'Revelation 16:15', text: 'Behold, I am coming like a thief! Blessed is the one who stays awake, keeping his garments on, that he may not go about naked and be seen exposed!' },
    { ref: '1 Thessalonians 5:23', text: 'Now may the God of peace himself sanctify you completely, and may your whole spirit and soul and body be kept blameless at the coming of our Lord Jesus Christ.' },
    { ref: '2 Peter 3:11-12', text: 'What sort of people ought you to be in lives of holiness and godliness, waiting for and hastening the coming of the day of God.' },
    { ref: 'Luke 21:28', text: 'Now when these things begin to take place, straighten up and raise your heads, because your redemption is drawing near.' },
    { ref: 'Matthew 25:13', text: 'Watch therefore, for you know neither the day nor the hour.' },
    { ref: 'Revelation 3:11', text: 'I am coming soon. Hold fast what you have, so that no one may seize your crown.' },
    { ref: 'Joel 2:12-13', text: 'Yet even now,” declares the Lord, “return to me with all your heart, with fasting, with weeping, and with mourning; and rend your hearts and not your garments.”' },
    { ref: 'Malachi 3:1', text: 'Behold, I send my messenger, and he will prepare the way before me. And the Lord whom you seek will suddenly come to his temple.' }
  ];
  const dayIndex = Math.floor(Date.now() / 86400000) % verses.length;
  document.getElementById('verseRef').textContent = verses[dayIndex].ref;
  document.getElementById('verseText').textContent = verses[dayIndex].text;

  // ---------- Status helper ----------
  function setStatus(msg, type = '') {
    statusEl.textContent = msg;
    statusEl.className = 'status ' + type;
  }

  // ---------- Stream management ----------
  function loadStream(index = 0) {
    currentStreamIndex = index % STREAMS.length;
    player.src = STREAMS[currentStreamIndex];
    player.load();
    // Keep a clear station title; source is secondary
    trackTitle.textContent = 'Jesus is Lord Radio — Live';
    const meta = document.getElementById('songMeta');
    if (meta) {
      const sourceName = currentStreamIndex === 0 ? 'Official Stream' :
                         currentStreamIndex === 1 || currentStreamIndex === 3 ? 'Zeno Mirror' :
                         currentStreamIndex === 2 ? 'Voscast Mirror' : 'Backup Stream';
      meta.textContent = sourceName + ' · 105.3 / 105.9 FM';
    }
  }

  function play() {
    if (!player.src) loadStream(0);
    const p = player.play();
    if (p !== undefined) {
      p.then(() => {
        isPlaying = true;
        btnPlay.innerHTML = '⏹';
        btnPlay.setAttribute('aria-label', 'Stop');
        setStatus('Live • Streaming', 'ok');
        trackTitle.textContent = 'Jesus is Lord Radio — Live';
        updateMediaSession();
        startVisualizer();
      }).catch(err => {
        console.warn(err);
        setStatus('Trying next stream…', 'error');
        // Cycle through all streams
        loadStream(currentStreamIndex + 1);
        setTimeout(play, 900);
      });
    }
  }

  function pause() {
    player.pause();
    isPlaying = false;
    btnPlay.innerHTML = '▶';
    btnPlay.setAttribute('aria-label', 'Play');
    setStatus('Stopped');
    stopVisualizer();
  }

  btnPlay.addEventListener('click', () => {
    if (isPlaying) pause();
    else play();
  });

  // Aggressive auto-reconnect on any stream failure
  player.addEventListener('error', () => {
    setStatus('Stream error – switching source…', 'error');
    loadStream(currentStreamIndex + 1);
    if (isPlaying) setTimeout(play, 700);
  });

  player.addEventListener('waiting', () => setStatus('Buffering…'));
  player.addEventListener('playing', () => setStatus('Live • Streaming', 'ok'));
  player.addEventListener('stalled', () => {
    setStatus('Reconnecting…');
    // Try next source if stalled too long
    setTimeout(() => {
      if (player.readyState < 3 && isPlaying) {
        loadStream(currentStreamIndex + 1);
        play();
      }
    }, 8000);
  });

  // ---------- Volume & mute ----------
  volume.addEventListener('input', () => {
    player.volume = parseFloat(volume.value);
    btnMute.textContent = player.volume === 0 ? '🔇' : '🔊';
  });
  btnMute.addEventListener('click', () => {
    if (player.volume > 0) {
      player.dataset.prevVol = player.volume;
      player.volume = 0;
      volume.value = 0;
      btnMute.textContent = '🔇';
    } else {
      player.volume = parseFloat(player.dataset.prevVol || 0.85);
      volume.value = player.volume;
      btnMute.textContent = '🔊';
    }
  });

  // ---------- Sleep timer ----------
  timerBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    const min = parseInt(btn.dataset.min, 10);
    timerBtns.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    if (min === 0) {
      clearTimeout(sleepTimerId);
      sleepTimerId = null;
      sleepEndTime = null;
      setStatus(isPlaying ? 'Live • Streaming' : 'Ready to play');
      return;
    }
    btn.classList.add('active');
    clearTimeout(sleepTimerId);
    sleepEndTime = Date.now() + min * 60 * 1000;
    sleepTimerId = setTimeout(() => {
      pause();
      setStatus('Sleep timer ended', 'ok');
      timerBtns.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    }, min * 60 * 1000);
    setStatus(`Sleep in ${min} min`);
  });

  // ---------- Alarm (simple) ----------
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  btnSetAlarm.addEventListener('click', () => {
    requestNotificationPermission();
    const val = alarmTime.value;
    if (!val) {
      alarmStatus.textContent = 'Pick a time first';
      return;
    }
    const [h, m] = val.split(':').map(Number);
    const now = new Date();
    let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const ms = target - now;
    clearTimeout(alarmTimeoutId);
    alarmTimeoutId = setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification('Jesus is Lord Radio', {
          body: 'Time to listen – preparing for the Messiah',
          icon: 'logo.webp',
          tag: 'jil-alarm'
        });
      }
      play();
      alarmStatus.textContent = 'Alarm fired – now playing';
    }, ms);
    const timeStr = target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    alarmStatus.textContent = `Alarm set for ${timeStr}`;
  });

  btnCancelAlarm.addEventListener('click', () => {
    clearTimeout(alarmTimeoutId);
    alarmTimeoutId = null;
    alarmStatus.textContent = 'Alarm cancelled';
  });

  // ---------- Share ----------
  btnShare.addEventListener('click', async () => {
    const data = {
      title: 'Jesus is Lord Radio',
      text: 'Listening to Jesus is Lord Radio – Preparing the Way for the Return of the Messiah',
      url: window.location.href
    };
    if (navigator.share) {
      try { await navigator.share(data); } catch (_) {}
    } else {
      navigator.clipboard?.writeText(data.url + ' – ' + data.text);
      setStatus('Link copied', 'ok');
    }
  });

  // ---------- Media Session ----------
  function updateMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Jesus is Lord Radio',
      artist: 'Ministry of Repentance & Holiness',
      album: 'Live from Nakuru',
      artwork: [
        { src: 'logo.webp', sizes: '300x300', type: 'image/webp' }
      ]
    });
    navigator.mediaSession.setActionHandler('play', play);
    navigator.mediaSession.setActionHandler('pause', pause);
    navigator.mediaSession.setActionHandler('stop', pause);
  }

  // ---------- Visualizer ----------
  function startVisualizer() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      sourceNode = audioCtx.createMediaElementSource(player);
      sourceNode.connect(analyser);
      analyser.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const ctx = visualizer.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      animFrame = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      const w = visualizer.width = visualizer.clientWidth * devicePixelRatio;
      const h = visualizer.height = visualizer.clientHeight * devicePixelRatio;
      ctx.clearRect(0, 0, w, h);
      const barWidth = (w / bufferLength) * 1.6;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * h * 0.85;
        const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
        gradient.addColorStop(0, '#c9a227');
        gradient.addColorStop(1, '#e8d48b');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, h - barHeight, barWidth, barHeight);
        x += barWidth + 2;
      }
    }
    draw();
  }

  function stopVisualizer() {
    if (animFrame) cancelAnimationFrame(animFrame);
    const ctx = visualizer.getContext('2d');
    ctx.clearRect(0, 0, visualizer.width, visualizer.height);
  }

  // ---------- PWA install ----------
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBanner.classList.add('show');
  });

  btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') installBanner.classList.remove('show');
    deferredPrompt = null;
  });

  window.addEventListener('appinstalled', () => {
    installBanner.classList.remove('show');
  });

  // ---------- Service Worker ----------
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.warn);
  }


  // ---------- Record live stream as MP3 ----------
  const btnRecord = document.getElementById('btnRecord');
  const recordStatus = document.getElementById('recordStatus');
  let isRecording = false;
  let mp3Encoder = null;
  let mp3Data = [];
  let recProcessor = null;
  let recSampleRate = 44100;

  function updateRecordUI(recording) {
    isRecording = recording;
    if (!btnRecord) return;
    if (recording) {
      btnRecord.classList.add('recording');
      btnRecord.textContent = '⏹';
      btnRecord.title = 'Stop recording';
      btnRecord.setAttribute('aria-label', 'Stop recording');
      if (recordStatus) recordStatus.textContent = 'Recording MP3…';
    } else {
      btnRecord.classList.remove('recording');
      btnRecord.textContent = '⏺';
      btnRecord.title = 'Record live stream (MP3)';
      btnRecord.setAttribute('aria-label', 'Record');
    }
  }

  function floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  async function ensureAudioGraph() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    if (!sourceNode) {
      sourceNode = audioCtx.createMediaElementSource(player);
      sourceNode.connect(audioCtx.destination);
    }
    return audioCtx;
  }

  async function startRecording() {
    if (typeof lamejs === 'undefined') {
      if (recordStatus) recordStatus.textContent = 'MP3 encoder not loaded. Check internet.';
      return;
    }
    if (!player.src || player.paused) {
      play();
      await new Promise(r => setTimeout(r, 1200));
    }
    try {
      const ctx = await ensureAudioGraph();
      recSampleRate = ctx.sampleRate;
      mp3Data = [];

      // LAME MP3 encoder: mono, 128 kbps
      mp3Encoder = new lamejs.Mp3Encoder(1, recSampleRate, 128);

      // ScriptProcessor captures PCM from the live stream
      const bufferSize = 4096;
      recProcessor = ctx.createScriptProcessor(bufferSize, 1, 1);
      sourceNode.connect(recProcessor);
      recProcessor.connect(ctx.destination);

      recProcessor.onaudioprocess = (e) => {
        if (!isRecording || !mp3Encoder) return;
        const input = e.inputBuffer.getChannelData(0);
        const samples = floatTo16BitPCM(input);
        const mp3buf = mp3Encoder.encodeBuffer(samples);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
      };

      updateRecordUI(true);
      setStatus('Recording MP3…', 'ok');
    } catch (err) {
      console.warn(err);
      if (recordStatus) recordStatus.textContent = 'Could not start MP3 recording.';
      updateRecordUI(false);
    }
  }

  function stopRecording() {
    if (!isRecording) {
      updateRecordUI(false);
      return;
    }
    try {
      if (recProcessor) {
        recProcessor.onaudioprocess = null;
        try { recProcessor.disconnect(); } catch (_) {}
        recProcessor = null;
      }
      if (mp3Encoder) {
        const end = mp3Encoder.flush();
        if (end.length > 0) mp3Data.push(end);
        mp3Encoder = null;
      }

      // Build MP3 blob and download
      const blob = new Blob(mp3Data, { type: 'audio/mpeg' });
      mp3Data = [];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = 'JIL-Radio-' + stamp + '.mp3';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      if (recordStatus) recordStatus.textContent = 'MP3 saved to downloads.';
      setTimeout(() => { if (recordStatus && !isRecording) recordStatus.textContent = ''; }, 4500);
      setStatus('Recording saved (MP3)', 'ok');
    } catch (err) {
      console.warn(err);
      if (recordStatus) recordStatus.textContent = 'Error saving MP3.';
    }
    updateRecordUI(false);
  }

  if (btnRecord) {
    btnRecord.addEventListener('click', () => {
      if (isRecording) stopRecording();
      else startRecording();
    });
  }


  // ---------- Theme Toggle (Dark / Light) ----------
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('jil-theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light');
    if (themeToggle) themeToggle.textContent = '🌙';
  }
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light');
      const isLight = document.body.classList.contains('light');
      themeToggle.textContent = isLight ? '🌙' : '☀️';
      localStorage.setItem('jil-theme', isLight ? 'light' : 'dark');
    });
  }

  // ---------- Back button ----------
  const btnBack = document.getElementById('btnBack');
  function goBack() {
    // Prefer native Android WebView bridge if present
    if (window.AndroidBridge && typeof window.AndroidBridge.goBack === 'function') {
      window.AndroidBridge.goBack();
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Standalone PWA / no history — minimize impact
      setStatus('You are on the home screen of the radio', 'ok');
    }
  }
  if (btnBack) btnBack.addEventListener('click', goBack);

  // Android hardware back button support (when running inside WebView)
  document.addEventListener('backbutton', function (e) {
    e.preventDefault();
    goBack();
  }, false);

  // Also listen for popstate / visibility for better WebView behavior
  window.addEventListener('popstate', () => {
    // allow normal history navigation
  });

  // ---------- Prayer Request ----------
  const prayerText = document.getElementById('prayerText');
  const btnPray = document.getElementById('btnPray');
  const btnClearPrayer = document.getElementById('btnClearPrayer');
  const prayerStatus = document.getElementById('prayerStatus');

  btnPray.addEventListener('click', () => {
    const text = (prayerText.value || '').trim();
    if (!text) {
      prayerStatus.textContent = 'Please write your prayer request first.';
      return;
    }
    // Open email client with the request (user can send to ministry)
    const subject = encodeURIComponent('Prayer Request from Jesus is Lord Radio App');
    const body = encodeURIComponent('Prayer Request:\n\n' + text + '\n\n---\nSent via the Jesus is Lord Radio PWA\nPreparing the Way for the Return of the Messiah');
    window.location.href = 'mailto:jesusislord.fmradio@gmail.com?subject=' + subject + '&body=' + body;
    prayerStatus.textContent = 'Opening email… May the Lord hear your prayer.';
    // Also save locally as backup
    try {
      const saved = JSON.parse(localStorage.getItem('jil-prayers') || '[]');
      saved.push({ text, date: new Date().toISOString() });
      localStorage.setItem('jil-prayers', JSON.stringify(saved.slice(-20)));
    } catch (_) {}
  });

  btnClearPrayer.addEventListener('click', () => {
    prayerText.value = '';
    prayerStatus.textContent = '';
  });

  // ---------- Share Testimony ----------
  document.getElementById('btnTestimony').addEventListener('click', async () => {
    const data = {
      title: 'My Testimony – Jesus is Lord Radio',
      text: 'I have been blessed listening to Jesus is Lord Radio (Preparing the Way for the Return of the Messiah). The teachings on repentance and holiness have strengthened my walk with the Lord.\n\nListen live: https://japhethog.github.io/jesus-is-lord-radio-now/\n\n#JesusIsLord #PrepareTheWay',
      url: 'https://japhethog.github.io/jesus-is-lord-radio-now/'
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(data.text);
        setStatus('Testimony text copied – paste it anywhere to share!', 'ok');
      } catch (_) {
        setStatus('Could not share automatically. Please copy manually.', 'error');
      }
    }
  });

  // ---------- Splash Screen ----------
  const splash = document.getElementById('splash');
  function hideSplash() {
    if (splash) {
      splash.classList.add('hide');
      setTimeout(() => { if (splash) splash.remove(); }, 800);
    }
  }
  // Hide after short branding moment or when audio starts
  setTimeout(hideSplash, 2200);
  player.addEventListener('playing', hideSplash, { once: true });

  // Initial load
  loadStream(0);
  player.volume = parseFloat(volume.value);
  updateMediaSession();
})();
