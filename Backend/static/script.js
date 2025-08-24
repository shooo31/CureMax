(function () {
  'use strict';

  /* ================== ELEMENTS ================== */
  var chatBox   = document.getElementById('chat-box');
  var userInput = document.getElementById('user-input');
  var sendBtn   = document.getElementById('send-btn');
  var micBtn    = document.getElementById('mic-btn');
  var shareBtn  = document.getElementById('share-btn');
  var fileInput = document.getElementById('file-input');
  var cameraIn  = document.getElementById('camera-input');
  var ttsToggle = document.getElementById('voice-output');
  var mapFrame  = document.getElementById('map-frame');
  var themeToggle = document.getElementById('theme-toggle');

  // Reminders
  var medName = document.getElementById('med-name');
  var medDose = document.getElementById('med-dose');
  var medTime = document.getElementById('med-time');
  var medRepeat = document.getElementById('med-repeat');
  var addReminderBtn = document.getElementById('add-reminder');
  var reminderList = document.getElementById('reminder-list');

  // Quiz
  var quizCard   = document.getElementById('quiz-card');
  var quizQ      = document.getElementById('quiz-q');
  var quizOpts   = document.getElementById('quiz-opts');
  var quizNext   = document.getElementById('quiz-next');
  var quizRestart= document.getElementById('quiz-restart');
  var quizProgress = document.getElementById('quiz-progress');
  var quizScore  = document.getElementById('quiz-score');

  var newsList = document.getElementById('news-list');

  var historyArr = []; // chat history

  /* ================== THEME ================== */
  function setTheme(mode) {
    var isDark = mode === 'dark';
    if (isDark) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    if (themeToggle) themeToggle.setAttribute('aria-pressed', String(isDark));
    try { localStorage.setItem('curemax_theme', isDark ? 'dark' : 'light'); } catch (_e) {}
  }
  (function initTheme(){
    var saved = null;
    try { saved = localStorage.getItem('curemax_theme'); } catch (_e) {}
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
    } else {
      var prefersDark = (typeof window.matchMedia === 'function') &&
                        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  })();
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var cur = document.body.classList.contains('dark') ? 'dark' : 'light';
      setTheme(cur === 'dark' ? 'light' : 'dark');
    });
  }

  /* ================== CHAT ================== */
  function appendMessage(sender, text){
    if (!chatBox) return null;
    var div = document.createElement('div');
    div.className = sender === 'user' ? 'user-msg' : 'bot-msg';
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
  }
  function showTyping(){
    if (!chatBox) return null;
    var t = document.createElement('div');
    t.className = 'bot-msg typing';
    t.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    chatBox.appendChild(t);
    chatBox.scrollTop = chatBox.scrollHeight;
    return t;
  }
  function hideTyping(node){ if(node && node.parentNode){ node.parentNode.removeChild(node); } }
  async function typeWriter(el, text){
    if (!el) return;
    el.textContent = '';
    for (var i=0;i<text.length;i++){
      el.textContent += text[i];
      if (i%3===0) { await new Promise(function(r){ setTimeout(r,8); }); }
    }
  }
  function speak(text){
    if(!ttsToggle || !ttsToggle.checked) return;
    if(!('speechSynthesis' in window)) return;
    try{
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
    }catch(_){}
  }
  function maybeUpdateMap(text){
    if(!mapFrame || !text) return;
    var t = text.toLowerCase();
    var q = null;
    if (t.indexOf('nearest hospital')>-1 || t.indexOf('hospitals nearby')>-1 || t.indexOf('hospital near me')>-1 || t.indexOf('nearest hospitals')>-1) q='hospitals';
    else if (t.indexOf('doctor near')>-1 || t.indexOf('doctors near')>-1 || t.indexOf('doctor nearby')>-1 || t.indexOf('doctors nearby')>-1) q='doctors';
    else if (t.indexOf('clinic near')>-1 || t.indexOf('clinics near')>-1 || t.indexOf('clinic nearby')>-1 || t.indexOf('clinics nearby')>-1) q='clinics';
    if(q){
      var query = encodeURIComponent(q + ' near me, Mauritius');
      mapFrame.src = 'https://www.google.com/maps?q=' + query + '&output=embed';
    }
  }
  function isDuplicateBotReply(text){
    for(var i=historyArr.length-1;i>=0;i--){
      if(historyArr[i].role==='assistant') return historyArr[i].content.trim() === (text||'').trim();
    }
    return false;
  }

  async function sendMessage(){
    if (!userInput) return;
    var msg = (userInput.value||'').trim();
    if(!msg) return;
    appendMessage('user', msg);
    historyArr.push({role:'user', content:msg});
    userInput.value=''; maybeUpdateMap(msg);

    var typing = showTyping();
    try{
      var res = await fetch('/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:msg, history:historyArr})
      });
      var data = await res.json().catch(function(){ return {}; });
      hideTyping(typing);

      var reply = (data && (data.reply || data.message)) || 'Sorry - something went wrong processing that.';
      if(!isDuplicateBotReply(reply)){
        var el = appendMessage('bot',''); await typeWriter(el, reply);
        historyArr.push({role:'assistant', content:reply}); speak(reply); maybeUpdateMap(reply);
      }
    }catch(_){
      hideTyping(typing);
      appendMessage('bot','Warning: server error. Please try again.');
    }
  }
  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (userInput) userInput.addEventListener('keydown', function(e){ if(e.key==='Enter') sendMessage(); });

  /* ================== VOICE INPUT ================== */
  if (micBtn){
    micBtn.addEventListener('click', function(){
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if(!SR){ appendMessage('bot','Voice input is not supported in this browser.'); return; }
      try{
        var rec = new SR(); rec.lang='en-US'; rec.interimResults=false; rec.maxAlternatives=1;
        rec.onresult = function(e){ userInput.value = Array.from(e.results).map(function(r){return r[0].transcript;}).join(' '); sendMessage(); };
        rec.onerror = function(){}; rec.start();
      }catch(_){ appendMessage('bot','Could not start voice recognition.');}
    });
  }

  /* ================== SHARE MENU ================== */
  var menuEl = null;
  function closeMenu(){
    if (menuEl) { menuEl.remove(); menuEl=null; }
    document.removeEventListener('click', onDocClick, true);
  }
  function onDocClick(ev){ if(menuEl && !menuEl.contains(ev.target) && ev.target!==shareBtn) closeMenu(); }

  function buildShareMenu(){
    if(!shareBtn) return;
    if(menuEl){ closeMenu(); return; }
    var menu = document.createElement('div');
    menu.className = 'menu';
    var btnUpload = document.createElement('button');
    btnUpload.className = 'menu-item'; btnUpload.textContent='Upload image';
    var btnCamera = document.createElement('button');
    btnCamera.className = 'menu-item'; btnCamera.textContent='Take a photo';
    menu.appendChild(btnUpload); menu.appendChild(btnCamera);

    var rect = shareBtn.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.left = (rect.left + window.scrollX) + 'px';
    menu.style.top  = (rect.bottom + window.scrollY + 8) + 'px';
    menu.style.zIndex = '9999';
    document.body.appendChild(menu);
    menuEl = menu;

    btnUpload.addEventListener('click', function(){ closeMenu(); if (fileInput) fileInput.click(); });
    btnCamera.addEventListener('click', function(){ closeMenu(); if (cameraIn) cameraIn.click(); });

    setTimeout(function(){ document.addEventListener('click', onDocClick, true); }, 0);
  }
  if (shareBtn){
    shareBtn.addEventListener('click', function(e){ e.stopPropagation(); buildShareMenu(); });
  }

  function handlePickedFile(file){
    if(!file) return;
    appendMessage('user', '📷 Sent image: ' + file.name);
    var formData = new FormData();
    formData.append('image', file);
    var t = showTyping();
    fetch('/analyze_image',{ method:'POST', body: formData })
      .then(function(r){ return r.json(); }).catch(function(){ return {}; })
      .then(function(data){
        hideTyping(t);
        var reply = (data && data.reply) || 'I could not analyze that image.';
        if(!isDuplicateBotReply(reply)){
          var el = appendMessage('bot','');
          return typeWriter(el, reply).then(function(){
            historyArr.push({role:'assistant',content:reply});
            speak(reply);
          });
        }
      })
      .catch(function(){
        hideTyping(t);
        appendMessage('bot','Warning: image analysis failed. Try again.');
      });
  }
  if (fileInput){
    fileInput.addEventListener('change', function(){
      handlePickedFile(fileInput.files && fileInput.files[0]);
    });
  }
  if (cameraIn){
    cameraIn.addEventListener('change', function(){
      handlePickedFile(cameraIn.files && cameraIn.files[0]);
    });
  }

  /* ================== REMINDERS ================== */
  var LS_KEY = 'curemax_reminders_v1';
  function loadReminders(){
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch (_e) { return []; }
  }
  function saveReminders(list){
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (_e) {}
  }
  function renderReminders(){
    if (!reminderList) return;
    var arr = loadReminders();
    reminderList.innerHTML = '';
    if(!arr.length){
      var li0 = document.createElement('li');
      li0.className='muted';
      li0.textContent='No reminders yet.';
      reminderList.appendChild(li0);
      return;
    }
    arr.forEach(function(r,i){
      var li = document.createElement('li');
      li.innerHTML = '<strong>' + r.name + '</strong> &ndash; ' + (r.dose || '') +
                     ' at <strong>' + r.time + '</strong> ' + (r.repeat ? '(daily)' : '');
      var del = document.createElement('button');
      del.className='btn';
      del.style.marginLeft='8px';
      del.textContent='✕';
      del.addEventListener('click', function(){
        var all = loadReminders();
        all.splice(i,1); saveReminders(all); renderReminders();
      });
      li.appendChild(del);
      reminderList.appendChild(li);
    });
  }
  if (addReminderBtn){
    addReminderBtn.addEventListener('click', function(){
      var name = (medName && medName.value ? medName.value : '').trim();
      var dose = (medDose && medDose.value ? medDose.value : '').trim();
      var time = medTime ? medTime.value : '';
      var repeat = !!(medRepeat && medRepeat.checked);
      if(!name || !time) { alert('Please enter a medicine name and time.'); return; }
      var arr = loadReminders(); arr.push({name:name,dose:dose,time:time,repeat:repeat});
      saveReminders(arr); renderReminders();
      if (medName) medName.value=''; if (medDose) medDose.value='';
    });
    renderReminders();
  }

  /* ================== QUIZ ================== */
  if (quizCard && quizQ && quizOpts && quizNext && quizRestart && quizProgress && quizScore) {
    var QUESTIONS = [
      { q:'How much of your plate should be non-starchy vegetables for a balanced meal?',
        options:['One quarter','One third','One half','Three quarters'], answer:2,
        explain:'Aim for about half your plate veggies, a quarter protein, a quarter whole grains.' },
      { q:'Best first step for a nosebleed?',
        options:['Tilt head back','Pinch soft part of nose and lean forward','Lie flat','Pack with tissue high up'], answer:1,
        explain:'Pinch the soft part and lean forward for ~10 minutes.' },
      { q:'Which habit lowers heart-disease risk the most?',
        options:['Daily 20–30 min walk','High-dose vitamins','Sauna every day','Spot fat reduction'], answer:0,
        explain:'Regular moderate activity has one of the strongest protective effects.' },
      { q:'When should you seek urgent care for a headache?',
        options:['New worst-ever headache','Stiff neck and fever','Confusion or weakness','Any of these'], answer:3,
        explain:'Any red flag symptoms warrant urgent evaluation.' },
      { q:'How much water do most adults need (approx.)?',
        options:['1 cup/day','3–4 cups/day','6–8 cups/day','12–14 cups/day'], answer:2,
        explain:'Needs vary, but 6–8 cups is a common target unless your clinician advises otherwise.' },
      { q:'Which is a safe fever reducer for most people (unless told otherwise)?',
        options:['Acetaminophen','Arsenic','Antibiotics from a friend','Raw garlic'], answer:0,
        explain:'Use only approved medications as directed.' },
      { q:'Best way to read a prescription label?',
        options:['Only the medicine name matters','Check name, strength, timing, and cautions','Ignore warnings','Double dose if pain persists'], answer:1,
        explain:'Always check name, strength, timing, cautions; ask your pharmacist if unsure.' },
      { q:'Which snack best supports steady energy?',
        options:['Sugary drink','Chips only','Yogurt with nuts/fruit','Nothing all day'], answer:2,
        explain:'Protein + fiber helps steady blood sugar and fullness.' },
      { q:'How long should you wash hands?',
        options:['5 seconds','10 seconds','20 seconds','1 minute'], answer:2,
        explain:'Scrub with soap for ~20 seconds.' },
      { q:'Which action helps prevent medication errors?',
        options:['Keep meds in original containers','Mix pills in one jar','Skip labels','Use someone else’s meds'], answer:0,
        explain:'Original containers preserve correct labels and dosing.' }
    ];

    // simple shuffle
    QUESTIONS = QUESTIONS.sort(function(){ return Math.random()-0.5; });

    var idx = 0;
    var score = 0;
    var answered = false;

    function renderQuestion() {
      var q = QUESTIONS[idx];
      quizProgress.textContent = 'Question ' + (idx+1) + ' of ' + QUESTIONS.length;
      quizQ.textContent = q.q;
      quizOpts.innerHTML = '';
      quizScore.textContent = '';
      answered = false;
      quizNext.disabled = true;

      q.options.forEach(function(opt, i){
        var b = document.createElement('button');
        b.className = 'opt';
        b.textContent = opt;
        b.addEventListener('click', function(){
          if (answered) return;
          answered = true;
          if (i === q.answer) { b.classList.add('correct'); score++; }
          else {
            b.classList.add('wrong');
            // mark the correct one
            var kids = Array.from(quizOpts.children);
            kids[q.answer].classList.add('correct');
          }
          quizScore.textContent = q.explain;
          quizNext.disabled = false;
        });
        quizOpts.appendChild(b);
      });
    }

    function showSummary(){
      quizQ.textContent = 'Done!';
      quizOpts.innerHTML = '';
      quizProgress.textContent = 'Score';
      quizScore.textContent = 'You scored ' + score + ' out of ' + QUESTIONS.length + '.';
      quizNext.disabled = true;
    }

    quizNext.addEventListener('click', function(){
      if (idx < QUESTIONS.length - 1) {
        idx++;
        renderQuestion();
      } else {
        showSummary();
      }
    });

    quizRestart.addEventListener('click', function(){
      idx = 0; score = 0;
      QUESTIONS = QUESTIONS.sort(function(){ return Math.random()-0.5; });
      renderQuestion();
    });

    renderQuestion();
  }

  /* ================== NEWS ================== */
  async function loadNews(){
    if (!newsList) return;
    try{
      var res = await fetch('/static/health_news.json', {cache:'no-store'});
      if(!res.ok) throw new Error('no file');
      var items = await res.json();
      renderNews(items);
    }catch(_){
      renderNews([
        {title:'Healthy plate: simple portion guide', summary:'Half veggies, quarter protein, quarter whole grains. Add water or unsweetened tea.', url:'#'},
        {title:'When to seek urgent care for a headache', summary:'Worst-ever headache, stiff neck, confusion, new weakness or vision change need urgent evaluation.', url:'#'},
        {title:'Diabetes & walking', summary:'A 20–30 minute walk after meals can help lower post-meal glucose spikes.', url:'#'},
        {title:'Blood pressure at home', summary:'Measure at the same times daily, seated, back supported, arm at heart level, and record readings.', url:'#'}
      ]);
    }
  }
  function renderNews(items){
    if (!newsList) return;
    newsList.innerHTML='';
    items.slice(0,8).forEach(function(it){
      var li = document.createElement('li');
      li.innerHTML = '<a href="' + it.url + '" target="_blank" rel="noopener">' +
                     it.title + '</a><div class="muted">' + (it.summary||'') + '</div>';
      newsList.appendChild(li);
    });
  }
  loadNews();

})();