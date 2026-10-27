/* StudyPlus Plus Tools (25) — add-on feature pack.
   Separate script: injects one "Plus Tools (25)" button and one light-theme
   panel with 25 fully local study tools. No network calls. Storage only in
   studyplus-plus-vocab-v1 (cap 50) and studyplus-plus-exam-v1 (single date). */
(function () {
  'use strict';
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function $(id) { return document.getElementById(id); }
  function num(id) { var v = parseFloat($(id).value); return isNaN(v) ? null : v; }
  function fmt(n) { if (!isFinite(n)) return '-'; return String(Math.round(n * 10000) / 10000); }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }

  var CSS = ''
    + '#sp25-overlay{position:fixed;inset:0;background:rgba(28,26,21,.45);z-index:9999;display:none;overflow-y:auto;padding:22px 12px;font-family:Inter,system-ui,sans-serif}'
    + '#sp25-overlay.open{display:block}'
    + '.sp25-panel{background:#faf9f6;color:#1c1a15;max-width:1120px;margin:0 auto;border-radius:16px;padding:20px;box-shadow:0 18px 50px rgba(28,26,21,.3)}'
    + '.sp25-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}'
    + '.sp25-head h2{font-size:22px;margin:0;color:#1c1a15}'
    + '.sp25-head p{margin:2px 0 0;color:#5d574c;font-size:13px}'
    + '.sp25-close{background:#ffffff;border:1px solid rgba(31,27,18,.24);border-radius:10px;padding:8px 14px;font-weight:600;cursor:pointer;color:#1c1a15}'
    + '.sp25-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:14px}'
    + '.sp25-card{background:#ffffff;border:1px solid rgba(31,27,18,.12);border-radius:16px;padding:14px;box-shadow:0 4px 14px rgba(74,60,20,.06)}'
    + '.sp25-card h3{font-size:16px;margin:0 0 8px;color:#1c1a15}'
    + '.sp25-card label{display:block;font-size:12px;font-weight:600;color:#5d574c;margin-top:6px}'
    + '.sp25-in{width:100%;box-sizing:border-box;background:#f5f2ec;border:1px solid rgba(31,27,18,.14);border-radius:10px;padding:8px 10px;margin:3px 0;font-size:14px;color:#1c1a15;font-family:inherit}'
    + 'textarea.sp25-in{resize:vertical}'
    + '.sp25-btn{background:linear-gradient(135deg,#eec25e,#dfa92e);color:#171306;border:none;border-radius:10px;padding:9px 14px;font-weight:600;font-size:14px;cursor:pointer;margin:6px 6px 0 0;font-family:inherit}'
    + '.sp25-btn2{background:#ffffff;color:#1c1a15;border:1px solid rgba(31,27,18,.24);border-radius:10px;padding:9px 14px;font-weight:600;font-size:14px;cursor:pointer;margin:6px 6px 0 0;font-family:inherit}'
    + '.sp25-out{background:#f5f2ec;border:1px solid rgba(31,27,18,.08);border-radius:10px;padding:8px 10px;margin-top:9px;font-size:14px;white-space:pre-wrap;word-break:break-word;min-height:18px;color:#1c1a15}'
    + '.sp25-big{font-size:34px;font-weight:700;text-align:center;padding:6px 0;color:#1c1a15}'
    + '.sp25-list{margin:6px 0 0;padding-left:18px;font-size:14px}'
    + '.sp25-del{background:#ffffff;border:1px solid rgba(31,27,18,.24);border-radius:8px;padding:2px 8px;font-size:12px;cursor:pointer;margin-left:8px;color:#c0452f}'
    + '.sp25-row{display:flex;gap:6px}.sp25-row .sp25-in{flex:1}'
    + '.sp25-init{font-size:30px;font-weight:700;letter-spacing:6px;text-align:center;color:#b57f04;padding:4px 0}'
    + '.sp25-fcard{background:#fdf3d7;border:1px solid rgba(31,27,18,.24);border-radius:14px;min-height:90px;display:flex;align-items:center;justify-content:center;text-align:center;padding:14px;font-size:17px;cursor:pointer;margin-top:8px;color:#1c1a15}'
    + '.sp25-cols{display:flex;gap:10px}.sp25-col{flex:1;background:#ffffff;border:1px solid rgba(31,27,18,.12);border-radius:10px;padding:8px}'
    + '.sp25-col h4{margin:0 0 6px;font-size:13px;color:#b57f04}'
    + '.sp25-fixed{position:fixed;right:16px;bottom:16px;z-index:9998;background:linear-gradient(135deg,#eec25e,#dfa92e);color:#171306;border:none;border-radius:999px;padding:13px 20px;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 8px 24px rgba(74,60,20,.3);font-family:Inter,system-ui,sans-serif}';

  var H = '';
  H += '<div class="sp25-panel" role="dialog" aria-label="Plus Tools">';
  H += '<div class="sp25-head"><div><h2>Plus Tools</h2><p>25 extra study tools. Everything runs on this device.</p></div><button type="button" class="sp25-close" id="sp25-close">Close</button></div>';
  H += '<div class="sp25-grid">';

  /* 1 Pomodoro */
  H += '<section class="sp25-card"><h3>Pomodoro Focus Timer</h3>'
    + '<div class="sp25-big" id="sp25-pom-time">25:00</div>'
    + '<div class="sp25-out" id="sp25-pom-msg">Ready to study.</div>'
    + '<button type="button" class="sp25-btn2" id="sp25-pom-study">Study 25 min</button>'
    + '<button type="button" class="sp25-btn2" id="sp25-pom-break">Break 5 min</button>'
    + '<button type="button" class="sp25-btn" id="sp25-pom-start">Start</button>'
    + '<button type="button" class="sp25-btn2" id="sp25-pom-reset">Reset</button></section>';

  /* 2 Mental math */
  H += '<section class="sp25-card"><h3>Mental Math Drill</h3>'
    + '<div class="sp25-big" id="sp25-math-q" style="font-size:26px">Press New round</div>'
    + '<label>Your answer</label><input class="sp25-in" id="sp25-math-a" type="number" inputmode="decimal">'
    + '<button type="button" class="sp25-btn" id="sp25-math-check">Check answer</button>'
    + '<button type="button" class="sp25-btn2" id="sp25-math-new">New round</button>'
    + '<div class="sp25-out" id="sp25-math-out">Score: 0 of 0</div></section>';

  /* 3 Vocabulary */
  H += '<section class="sp25-card"><h3>Vocabulary Builder</h3>'
    + '<label>Word (max 60 characters)</label><input class="sp25-in" id="sp25-voc-w" maxlength="60">'
    + '<label>Meaning (max 200 characters)</label><input class="sp25-in" id="sp25-voc-m" maxlength="200">'
    + '<button type="button" class="sp25-btn" id="sp25-voc-add">Add word</button>'
    + '<ul class="sp25-list" id="sp25-voc-list"></ul>'
    + '<div class="sp25-out" id="sp25-voc-out">0 words saved (max 50).</div></section>';

  /* 4 Spelling */
  H += '<section class="sp25-card"><h3>Spelling Practice</h3>'
    + '<label>Definition — type the word it describes</label>'
    + '<div class="sp25-out" id="sp25-spe-def" style="margin-top:2px">Press Next word.</div>'
    + '<input class="sp25-in" id="sp25-spe-in" autocomplete="off">'
    + '<button type="button" class="sp25-btn" id="sp25-spe-check">Check spelling</button>'
    + '<button type="button" class="sp25-btn2" id="sp25-spe-next">Next word</button>'
    + '<div class="sp25-out" id="sp25-spe-out">Score: 0 right, 0 tried.</div></section>';

  /* 5 GPA */
  H += '<section class="sp25-card"><h3>GPA Calculator</h3>'
    + '<div id="sp25-gpa-rows"></div>'
    + '<button type="button" class="sp25-btn2" id="sp25-gpa-add">Add course row</button>'
    + '<button type="button" class="sp25-btn" id="sp25-gpa-calc">Calculate GPA</button>'
    + '<div class="sp25-out" id="sp25-gpa-out">Add your grades and credits, then calculate.</div></section>';

  /* 6 Percentage */
  H += '<section class="sp25-card"><h3>Percentage Calculator</h3>'
    + '<label>Part</label><input class="sp25-in" id="sp25-pct-part" type="number">'
    + '<label>Whole</label><input class="sp25-in" id="sp25-pct-whole" type="number">'
    + '<button type="button" class="sp25-btn" id="sp25-pct-b1">Part is what % of whole?</button>'
    + '<label>Percent (%)</label><input class="sp25-in" id="sp25-pct-p" type="number">'
    + '<label>Of number</label><input class="sp25-in" id="sp25-pct-n" type="number">'
    + '<button type="button" class="sp25-btn" id="sp25-pct-b2">Find % of number</button>'
    + '<div class="sp25-out" id="sp25-pct-out">Results appear here.</div></section>';

  /* 7 Fraction */
  H += '<section class="sp25-card"><h3>Fraction Helper</h3>'
    + '<label>Numerator</label><input class="sp25-in" id="sp25-fr-n" type="number">'
    + '<label>Denominator</label><input class="sp25-in" id="sp25-fr-d" type="number">'
    + '<button type="button" class="sp25-btn" id="sp25-fr-b">Simplify fraction</button>'
    + '<div class="sp25-out" id="sp25-fr-out">Results appear here.</div></section>';

  /* 8 Quadratic */
  H += '<section class="sp25-card"><h3>Quadratic Solver</h3>'
    + '<label>a</label><input class="sp25-in" id="sp25-q-a" type="number">'
    + '<label>b</label><input class="sp25-in" id="sp25-q-b" type="number">'
    + '<label>c</label><input class="sp25-in" id="sp25-q-c" type="number">'
    + '<button type="button" class="sp25-btn" id="sp25-q-btn">Solve ax^2 + bx + c = 0</button>'
    + '<div class="sp25-out" id="sp25-q-out">Results appear here.</div></section>';

  /* 9 Pythagorean */
  H += '<section class="sp25-card"><h3>Pythagorean Solver</h3>'
    + '<label>I know</label><select class="sp25-in" id="sp25-py-mode"><option value="ab">Legs a and b — find hypotenuse c</option><option value="ac">Leg a and hypotenuse c — find leg b</option></select>'
    + '<label>First side</label><input class="sp25-in" id="sp25-py-x" type="number">'
    + '<label>Second side</label><input class="sp25-in" id="sp25-py-y" type="number">'
    + '<button type="button" class="sp25-btn" id="sp25-py-b">Find missing side</button>'
    + '<div class="sp25-out" id="sp25-py-out">Results appear here.</div></section>';

  /* 10 Geometry */
  H += '<section class="sp25-card"><h3>Geometry Calculator</h3>'
    + '<label>Shape and measure</label><select class="sp25-in" id="sp25-geo-s">'
    + '<option value="circle-area">Circle — area (uses radius)</option>'
    + '<option value="circle-circ">Circle — circumference (uses radius)</option>'
    + '<option value="rect-area">Rectangle — area (length, width)</option>'
    + '<option value="rect-perim">Rectangle — perimeter (length, width)</option>'
    + '<option value="tri-area">Triangle — area (base, height)</option>'
    + '<option value="cyl-vol">Cylinder — volume (radius, height)</option></select>'
    + '<label>Dimension 1 (radius / length / base)</label><input class="sp25-in" id="sp25-geo-1" type="number">'
    + '<label>Dimension 2 (width / height, if needed)</label><input class="sp25-in" id="sp25-geo-2" type="number">'
    + '<button type="button" class="sp25-btn" id="sp25-geo-b">Calculate</button>'
    + '<div class="sp25-out" id="sp25-geo-out">Results appear here.</div></section>';

  /* 11 Molarity & pH */
  H += '<section class="sp25-card"><h3>Molarity and pH</h3>'
    + '<label>Moles of solute</label><input class="sp25-in" id="sp25-ch-moles" type="number" step="any">'
    + '<label>Liters of solution</label><input class="sp25-in" id="sp25-ch-liters" type="number" step="any">'
    + '<button type="button" class="sp25-btn" id="sp25-ch-mol">Calculate molarity</button>'
    + '<label>H+ concentration (mol/L, e.g. 0.001)</label><input class="sp25-in" id="sp25-ch-h" type="number" step="any">'
    + '<button type="button" class="sp25-btn" id="sp25-ch-ph">Calculate pH</button>'
    + '<div class="sp25-out" id="sp25-ch-out">Results appear here.</div></section>';

  /* 12 Periodic table */
  H += '<section class="sp25-card"><h3>Periodic Table Lookup</h3>'
    + '<label>Element symbol or name (first 20 elements, plus Fe, Cu, Zn, Ag, Au, I)</label>'
    + '<input class="sp25-in" id="sp25-pe-in" placeholder="Fe or iron">'
    + '<button type="button" class="sp25-btn" id="sp25-pe-b">Look up element</button>'
    + '<div class="sp25-out" id="sp25-pe-out">Results appear here.</div></section>';

  /* 13 Year facts */
  H += '<section class="sp25-card"><h3>Year Facts and Date Gap</h3>'
    + '<label>Year</label><input class="sp25-in" id="sp25-yr-y" type="number">'
    + '<button type="button" class="sp25-btn" id="sp25-yr-b">Get year facts</button>'
    + '<label>From date</label><input class="sp25-in" id="sp25-yr-d1" type="date">'
    + '<label>To date</label><input class="sp25-in" id="sp25-yr-d2" type="date">'
    + '<button type="button" class="sp25-btn2" id="sp25-yr-db">Days between dates</button>'
    + '<div class="sp25-out" id="sp25-yr-out">Results appear here.</div></section>';

  /* 14 Essay outline */
  H += '<section class="sp25-card"><h3>Essay Outline Builder</h3>'
    + '<label>Topic</label><input class="sp25-in" id="sp25-es-topic">'
    + '<label>Main point 1</label><input class="sp25-in" id="sp25-es-p1">'
    + '<label>Main point 2</label><input class="sp25-in" id="sp25-es-p2">'
    + '<label>Main point 3</label><input class="sp25-in" id="sp25-es-p3">'
    + '<button type="button" class="sp25-btn" id="sp25-es-b">Build outline</button>'
    + '<button type="button" class="sp25-btn2" id="sp25-es-copy">Copy outline</button>'
    + '<div class="sp25-out" id="sp25-es-out">Your outline appears here.</div></section>';

  /* 15 Thesis */
  H += '<section class="sp25-card"><h3>Thesis Statement Builder</h3>'
    + '<label>Your position</label><input class="sp25-in" id="sp25-th-pos" placeholder="school should start later">'
    + '<label>Reason 1</label><input class="sp25-in" id="sp25-th-r1">'
    + '<label>Reason 2</label><input class="sp25-in" id="sp25-th-r2">'
    + '<label>Reason 3</label><input class="sp25-in" id="sp25-th-r3">'
    + '<button type="button" class="sp25-btn" id="sp25-th-b">Build thesis statement</button>'
    + '<div class="sp25-out" id="sp25-th-out">Your thesis appears here.</div></section>';

  /* 16 Cornell notes */
  H += '<section class="sp25-card"><h3>Cornell Notes Template</h3>'
    + '<label>Topic</label><input class="sp25-in" id="sp25-co-topic">'
    + '<label>Notes (one idea per line)</label><textarea class="sp25-in" id="sp25-co-notes" rows="4"></textarea>'
    + '<button type="button" class="sp25-btn" id="sp25-co-b">Make Cornell template</button>'
    + '<div class="sp25-out" id="sp25-co-out">Your Cornell page appears here.</div></section>';

  /* 17 Mnemonic */
  H += '<section class="sp25-card"><h3>Mnemonic Maker</h3>'
    + '<label>Words to remember (up to 8, separated by spaces or commas)</label>'
    + '<input class="sp25-in" id="sp25-mn-in" placeholder="Mercury Venus Earth Mars">'
    + '<button type="button" class="sp25-btn" id="sp25-mn-b">Show initials</button>'
    + '<div class="sp25-init" id="sp25-mn-init"></div>'
    + '<div id="sp25-mn-lines"></div>'
    + '<button type="button" class="sp25-btn2" id="sp25-mn-combine">Combine my phrase</button>'
    + '<div class="sp25-out" id="sp25-mn-out">Your mnemonic appears here.</div></section>';

  /* 18 Feynman */
  H += '<section class="sp25-card"><h3>Feynman Coach</h3>'
    + '<label>1. The concept</label><textarea class="sp25-in" id="sp25-fe-1" rows="2"></textarea>'
    + '<label>2. Explain it simply, like to a 10-year-old</label><textarea class="sp25-in" id="sp25-fe-2" rows="2"></textarea>'
    + '<label>3. Where I get stuck</label><textarea class="sp25-in" id="sp25-fe-3" rows="2"></textarea>'
    + '<label>4. A simpler analogy</label><textarea class="sp25-in" id="sp25-fe-4" rows="2"></textarea>'
    + '<button type="button" class="sp25-btn" id="sp25-fe-b">Make my study card</button>'
    + '<div class="sp25-out" id="sp25-fe-out">Your study card appears here.</div></section>';

  /* 19 Reading speed */
  var RD_PASSAGE = 'Maya planted a small garden behind her school in early April. She chose tomato seeds because they grow quickly in warm sunlight. Every morning she watered the soil before classes began, and every Friday she measured each plant with a ruler. By the end of May, the tallest plant stood forty centimeters high. Maya recorded every measurement in a green notebook so she could compare the weeks. When the first tomatoes turned red in June, she shared them with her class. Her teacher, Ms. Lopez, said the garden showed how steady daily habits turn tiny seeds into real results that everyone can see and taste. Maya hoped next year the class would plant peppers and beans beside the tomatoes.';
  H += '<section class="sp25-card"><h3>Reading Speed Test</h3>'
    + '<div class="sp25-out" id="sp25-rd-pass" style="margin-top:2px">' + esc(RD_PASSAGE) + '</div>'
    + '<button type="button" class="sp25-btn" id="sp25-rd-start">Start reading</button>'
    + '<button type="button" class="sp25-btn2" id="sp25-rd-stop">Stop — I finished</button>'
    + '<label>Q1: When did Maya plant the garden?</label><select class="sp25-in" id="sp25-rd-q1"><option value="">Choose...</option><option value="a">Early April</option><option value="b">Late June</option><option value="c">Early January</option></select>'
    + '<label>Q2: What did Maya measure each plant with?</label><select class="sp25-in" id="sp25-rd-q2"><option value="">Choose...</option><option value="a">A scale</option><option value="b">A ruler</option><option value="c">A thermometer</option></select>'
    + '<label>Q3: What color was her notebook?</label><select class="sp25-in" id="sp25-rd-q3"><option value="">Choose...</option><option value="a">Blue</option><option value="b">Red</option><option value="c">Green</option></select>'
    + '<button type="button" class="sp25-btn" id="sp25-rd-check">Check answers</button>'
    + '<div class="sp25-out" id="sp25-rd-out">Press Start reading, read the passage, then press Stop.</div></section>';

  /* 20 Typing test */
  var TY_SENT = 'The quick brown fox jumps over the lazy dog while the curious students watch and learn.';
  H += '<section class="sp25-card"><h3>Typing Test</h3>'
    + '<label>Type this sentence exactly (timing starts on your first keystroke)</label>'
    + '<div class="sp25-out" id="sp25-ty-target" style="margin-top:2px">' + esc(TY_SENT) + '</div>'
    + '<textarea class="sp25-in" id="sp25-ty-in" rows="3"></textarea>'
    + '<button type="button" class="sp25-btn" id="sp25-ty-b">Check my score</button>'
    + '<div class="sp25-out" id="sp25-ty-out">Your WPM and accuracy appear here.</div></section>';

  /* 21 Exam countdown */
  H += '<section class="sp25-card"><h3>Exam Countdown</h3>'
    + '<label>Exam date</label><input class="sp25-in" id="sp25-ex-in" type="date">'
    + '<button type="button" class="sp25-btn" id="sp25-ex-b">Save and show countdown</button>'
    + '<div class="sp25-out" id="sp25-ex-out">No exam date saved yet.</div></section>';

  /* 22 Study planner */
  H += '<section class="sp25-card"><h3>Study Planner</h3>'
    + '<label>Total study minutes</label><input class="sp25-in" id="sp25-pl-min" type="number">'
    + '<label>Topics (comma-separated)</label><input class="sp25-in" id="sp25-pl-topics" placeholder="Math, History, Spanish">'
    + '<button type="button" class="sp25-btn" id="sp25-pl-b">Build my plan</button>'
    + '<div class="sp25-out" id="sp25-pl-out">Your time blocks appear here.</div></section>';

  /* 23 Chicago citation */
  H += '<section class="sp25-card"><h3>Chicago Citation (Bibliography)</h3>'
    + '<label>Author (Last, First)</label><input class="sp25-in" id="sp25-ci-au" placeholder="Smith, Jane">'
    + '<label>Book title</label><input class="sp25-in" id="sp25-ci-ti">'
    + '<label>Publisher</label><input class="sp25-in" id="sp25-ci-pub">'
    + '<label>Year published</label><input class="sp25-in" id="sp25-ci-yr" type="number">'
    + '<button type="button" class="sp25-btn" id="sp25-ci-b">Build Chicago entry</button>'
    + '<div class="sp25-out" id="sp25-ci-out">Your Chicago bibliography entry appears here.</div></section>';

  /* 24 Scientific notation */
  H += '<section class="sp25-card"><h3>Scientific Notation</h3>'
    + '<label>Standard number</label><input class="sp25-in" id="sp25-sc-n" type="number" step="any">'
    + '<button type="button" class="sp25-btn" id="sp25-sc-b1">Convert to scientific</button>'
    + '<label>Scientific form (e.g. 3.2e5)</label><input class="sp25-in" id="sp25-sc-s">'
    + '<button type="button" class="sp25-btn2" id="sp25-sc-b2">Convert to standard</button>'
    + '<div class="sp25-out" id="sp25-sc-out">Results appear here.</div></section>';

  /* 25 Flashcards quick-create */
  H += '<section class="sp25-card"><h3>Flashcards Quick-Create</h3>'
    + '<label>Front</label><input class="sp25-in" id="sp25-fc-f">'
    + '<label>Back</label><input class="sp25-in" id="sp25-fc-bk">'
    + '<button type="button" class="sp25-btn" id="sp25-fc-add">Add card (max 20)</button>'
    + '<div class="sp25-fcard" id="sp25-fc-card">No cards yet. Add one above, then click the card to flip it.</div>'
    + '<button type="button" class="sp25-btn2" id="sp25-fc-next">Next card</button>'
    + '<button type="button" class="sp25-btn2" id="sp25-fc-sh">Shuffle deck</button>'
    + '<div class="sp25-out" id="sp25-fc-out">Card 0 of 0</div></section>';

  H += '</div></div>';

  function init() {
    var style = document.createElement('style');
    style.id = 'sp25-style';
    style.textContent = CSS;
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.id = 'sp25-overlay';
    overlay.innerHTML = H;
    document.body.appendChild(overlay);

    function openPanel() { overlay.classList.add('open'); }
    function closePanel() { overlay.classList.remove('open'); }
    $('sp25-close').addEventListener('click', closePanel);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closePanel(); });

    var nav = document.querySelector('#side-nav');
    if (nav) {
      var nb = document.createElement('button');
      nb.type = 'button';
      nb.className = 'nav-btn';
      nb.id = 'sp25-open';
      nb.textContent = 'Plus Tools (25)';
      nb.addEventListener('click', openPanel);
      nav.appendChild(nb);
    } else {
      var fb = document.createElement('button');
      fb.type = 'button';
      fb.className = 'sp25-fixed';
      fb.id = 'sp25-open';
      fb.textContent = 'Plus Tools (25)';
      fb.addEventListener('click', openPanel);
      document.body.appendChild(fb);
    }

    /* ---------- 1. Pomodoro ---------- */
    var pom = { mode: 'study', left: 1500, timer: null, running: false };
    function pomShow() {
      var m = Math.floor(pom.left / 60), s = pom.left % 60;
      $('sp25-pom-time').textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
    function pomSet(mode) {
      pom.mode = mode; pom.left = mode === 'study' ? 1500 : 300;
      $('sp25-pom-msg').textContent = mode === 'study' ? 'Study time. Focus on one thing.' : 'Break time. Rest your eyes.';
      pomShow();
    }
    function pomStop() { if (pom.timer) { clearInterval(pom.timer); pom.timer = null; } pom.running = false; $('sp25-pom-start').textContent = 'Start'; }
    $('sp25-pom-study').addEventListener('click', function () { pomStop(); pomSet('study'); });
    $('sp25-pom-break').addEventListener('click', function () { pomStop(); pomSet('break'); });
    $('sp25-pom-reset').addEventListener('click', function () { pomStop(); pomSet(pom.mode); });
    $('sp25-pom-start').addEventListener('click', function () {
      if (pom.running) { pomStop(); $('sp25-pom-msg').textContent = 'Paused.'; return; }
      pom.running = true; $('sp25-pom-start').textContent = 'Pause';
      $('sp25-pom-msg').textContent = pom.mode === 'study' ? 'Studying. Timer running.' : 'On a break. Timer running.';
      pom.timer = setInterval(function () {
        pom.left--;
        if (pom.left <= 0) {
          if (pom.mode === 'study') { pom.mode = 'break'; pom.left = 300; $('sp25-pom-msg').textContent = 'Time for a break. 5 minutes.'; }
          else { pom.mode = 'study'; pom.left = 1500; $('sp25-pom-msg').textContent = 'Back to study. 25 minutes.'; }
        }
        pomShow();
      }, 1000);
    });
    pomShow();

    /* ---------- 2. Mental math ---------- */
    var mm = { ans: null, asked: 0, score: 0, done: false };
    function mmNext() {
      var ops = ['+', '-', 'x', '/'], op = ops[Math.floor(Math.random() * 4)], a, b;
      if (op === '/') { b = 2 + Math.floor(Math.random() * 11); mm.ans = 2 + Math.floor(Math.random() * 11); a = b * mm.ans; }
      else if (op === 'x') { a = 2 + Math.floor(Math.random() * 11); b = 2 + Math.floor(Math.random() * 11); mm.ans = a * b; }
      else if (op === '+') { a = 3 + Math.floor(Math.random() * 48); b = 3 + Math.floor(Math.random() * 48); mm.ans = a + b; }
      else { a = 10 + Math.floor(Math.random() * 60); b = 2 + Math.floor(Math.random() * (a - 2)); mm.ans = a - b; }
      $('sp25-math-q').textContent = a + ' ' + op + ' ' + b + ' = ?';
      $('sp25-math-a').value = '';
    }
    function mmNew() { mm.asked = 0; mm.score = 0; mm.done = false; $('sp25-math-out').textContent = 'Score: 0 of 0'; mmNext(); }
    $('sp25-math-new').addEventListener('click', mmNew);
    $('sp25-math-check').addEventListener('click', function () {
      if (mm.ans === null) { mmNew(); return; }
      if (mm.done) { $('sp25-math-out').textContent = 'Round finished. Final score: ' + mm.score + ' / 10. Press New round to play again.'; return; }
      var v = parseFloat($('sp25-math-a').value);
      mm.asked++;
      if (v === mm.ans) { mm.score++; $('sp25-math-out').textContent = 'Correct. Score: ' + mm.score + ' of ' + mm.asked; }
      else { $('sp25-math-out').textContent = 'Not quite — the answer was ' + mm.ans + '. Score: ' + mm.score + ' of ' + mm.asked; }
      if (mm.asked >= 10) { mm.done = true; $('sp25-math-out').textContent = 'Final score: ' + mm.score + ' / 10. Press New round to play again.'; $('sp25-math-q').textContent = 'Round complete'; }
      else { mmNext(); }
    });
    mmNew();

    /* ---------- 3. Vocabulary ---------- */
    var VOC_KEY = 'studyplus-plus-vocab-v1';
    function vocLoad() { try { var v = JSON.parse(localStorage.getItem(VOC_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
    function vocSave(list) { try { localStorage.setItem(VOC_KEY, JSON.stringify(list.slice(0, 50))); } catch (e) {} }
    function vocRender() {
      var list = vocLoad(), ul = $('sp25-voc-list');
      ul.innerHTML = '';
      list.forEach(function (item, i) {
        var li = document.createElement('li');
        var span = document.createElement('span');
        span.textContent = item.w + ' — ' + item.m;
        var del = document.createElement('button');
        del.type = 'button'; del.className = 'sp25-del'; del.textContent = 'Delete';
        del.addEventListener('click', function () { var l = vocLoad(); l.splice(i, 1); vocSave(l); vocRender(); });
        li.appendChild(span); li.appendChild(del); ul.appendChild(li);
      });
      $('sp25-voc-out').textContent = list.length + ' words saved (max 50).';
    }
    $('sp25-voc-add').addEventListener('click', function () {
      var w = $('sp25-voc-w').value.trim().slice(0, 60), m = $('sp25-voc-m').value.trim().slice(0, 200);
      if (!w || !m) { $('sp25-voc-out').textContent = 'Type both a word and its meaning first.'; return; }
      var list = vocLoad();
      if (list.length >= 50) { $('sp25-voc-out').textContent = 'Limit reached: 50 words max. Delete one to add more.'; return; }
      list.push({ w: w, m: m }); vocSave(list);
      $('sp25-voc-w').value = ''; $('sp25-voc-m').value = '';
      vocRender();
    });
    vocRender();

    /* ---------- 4. Spelling ---------- */
    var WORDS = [
      { w: 'necessary', d: 'Needed; you cannot do without it.' },
      { w: 'separate', d: 'Not joined together; apart from others.' },
      { w: 'occurred', d: 'It happened, at a particular time.' },
      { w: 'definitely', d: 'Certainly; without any doubt at all.' },
      { w: 'environment', d: 'The natural world around us: air, land and water.' },
      { w: 'government', d: 'The group of people who run a country.' },
      { w: 'knowledge', d: 'What you know from learning and experience.' },
      { w: 'beginning', d: 'The first part of something.' },
      { w: 'calendar', d: 'A chart showing the days, weeks and months of a year.' },
      { w: 'surprise', d: 'A sudden, unexpected event or feeling.' },
      { w: 'question', d: 'Something you ask to get information.' },
      { w: 'answer', d: 'A reply given when someone asks you something.' }
    ];
    var spe = { idx: 0, right: 0, tried: 0 };
    function speNext() { spe.idx = Math.floor(Math.random() * WORDS.length); $('sp25-spe-def').textContent = WORDS[spe.idx].d; $('sp25-spe-in').value = ''; }
    $('sp25-spe-next').addEventListener('click', speNext);
    $('sp25-spe-check').addEventListener('click', function () {
      var v = $('sp25-spe-in').value.trim().toLowerCase();
      if (!v) { $('sp25-spe-out').textContent = 'Type your spelling first.'; return; }
      spe.tried++;
      if (v === WORDS[spe.idx].w) { spe.right++; $('sp25-spe-out').textContent = 'Correct. Score: ' + spe.right + ' right, ' + spe.tried + ' tried.'; speNext(); }
      else { $('sp25-spe-out').textContent = 'Wrong. The word is spelled "' + WORDS[spe.idx].w + '". Score: ' + spe.right + ' right, ' + spe.tried + ' tried.'; }
    });
    speNext();

    /* ---------- 5. GPA ---------- */
    function gpaRow() {
      var row = document.createElement('div');
      row.className = 'sp25-row';
      var sel = document.createElement('select');
      sel.className = 'sp25-in sp25-gpa-g';
      [['4', 'A (4.0)'], ['3', 'B (3.0)'], ['2', 'C (2.0)'], ['1', 'D (1.0)'], ['0', 'F (0.0)']].forEach(function (o) {
        var opt = document.createElement('option'); opt.value = o[0]; opt.textContent = o[1]; sel.appendChild(opt);
      });
      var cr = document.createElement('input');
      cr.className = 'sp25-in sp25-gpa-c'; cr.type = 'number'; cr.min = '0'; cr.step = 'any'; cr.placeholder = 'Credits';
      row.appendChild(sel); row.appendChild(cr);
      $('sp25-gpa-rows').appendChild(row);
    }
    gpaRow(); gpaRow();
    $('sp25-gpa-add').addEventListener('click', gpaRow);
    $('sp25-gpa-calc').addEventListener('click', function () {
      var grades = document.querySelectorAll('.sp25-gpa-g'), credits = document.querySelectorAll('.sp25-gpa-c');
      var pts = 0, cr = 0;
      for (var i = 0; i < grades.length; i++) {
        var c = parseFloat(credits[i].value);
        if (!isNaN(c) && c > 0) { pts += parseFloat(grades[i].value) * c; cr += c; }
      }
      if (cr === 0) { $('sp25-gpa-out').textContent = 'Enter credits for at least one course.'; return; }
      $('sp25-gpa-out').textContent = 'Your GPA: ' + (pts / cr).toFixed(2) + ' (from ' + fmt(cr) + ' credits)';
    });

    /* ---------- 6. Percentage ---------- */
    $('sp25-pct-b1').addEventListener('click', function () {
      var p = num('sp25-pct-part'), w = num('sp25-pct-whole');
      if (p === null || w === null || w === 0) { $('sp25-pct-out').textContent = 'Enter a part and a non-zero whole.'; return; }
      $('sp25-pct-out').textContent = fmt(p) + ' is ' + fmt((p / w) * 100) + '% of ' + fmt(w);
    });
    $('sp25-pct-b2').addEventListener('click', function () {
      var p = num('sp25-pct-p'), n = num('sp25-pct-n');
      if (p === null || n === null) { $('sp25-pct-out').textContent = 'Enter a percent and a number.'; return; }
      $('sp25-pct-out').textContent = fmt(p) + '% of ' + fmt(n) + ' = ' + fmt((p / 100) * n);
    });

    /* ---------- 7. Fraction ---------- */
    $('sp25-fr-b').addEventListener('click', function () {
      var n = num('sp25-fr-n'), d = num('sp25-fr-d');
      if (n === null || d === null || d === 0 || Math.round(n) !== n || Math.round(d) !== d) { $('sp25-fr-out').textContent = 'Enter whole numbers and a non-zero denominator.'; return; }
      var g = gcd(n, d), sn = n / g, sd = d / g;
      if (sd < 0) { sn = -sn; sd = -sd; }
      var dec = parseFloat((n / d).toFixed(6));
      $('sp25-fr-out').textContent = n + '/' + d + ' simplifies to ' + sn + '/' + sd + '\nDecimal: ' + dec + '\nPercent: ' + fmt((n / d) * 100) + '%';
    });

    /* ---------- 8. Quadratic ---------- */
    $('sp25-q-btn').addEventListener('click', function () {
      var a = num('sp25-q-a'), b = num('sp25-q-b'), c = num('sp25-q-c');
      if (a === null || b === null || c === null || a === 0) { $('sp25-q-out').textContent = 'Enter a, b and c, with a not equal to 0.'; return; }
      var D = b * b - 4 * a * c;
      if (D < 0) { $('sp25-q-out').textContent = 'Discriminant: ' + fmt(D) + '\nNo real roots.'; return; }
      var sq = Math.sqrt(D), r1 = (-b + sq) / (2 * a), r2 = (-b - sq) / (2 * a);
      if (D === 0) { $('sp25-q-out').textContent = 'Discriminant: 0\nOne repeated root: ' + fmt(r1); return; }
      $('sp25-q-out').textContent = 'Discriminant: ' + fmt(D) + '\nRoots: ' + fmt(r1) + ' and ' + fmt(r2);
    });

    /* ---------- 9. Pythagorean ---------- */
    $('sp25-py-b').addEventListener('click', function () {
      var mode = $('sp25-py-mode').value, x = num('sp25-py-x'), y = num('sp25-py-y');
      if (x === null || y === null || x <= 0 || y <= 0) { $('sp25-py-out').textContent = 'Enter two positive side lengths.'; return; }
      if (mode === 'ab') { $('sp25-py-out').textContent = 'c = sqrt(' + fmt(x) + '^2 + ' + fmt(y) + '^2) = ' + fmt(Math.sqrt(x * x + y * y)); }
      else {
        if (y <= x) { $('sp25-py-out').textContent = 'The hypotenuse c must be longer than leg a.'; return; }
        $('sp25-py-out').textContent = 'b = sqrt(' + fmt(y) + '^2 - ' + fmt(x) + '^2) = ' + fmt(Math.sqrt(y * y - x * x));
      }
    });

    /* ---------- 10. Geometry ---------- */
    $('sp25-geo-b').addEventListener('click', function () {
      var s = $('sp25-geo-s').value, d1 = num('sp25-geo-1'), d2 = num('sp25-geo-2'), out = '';
      if (d1 === null || d1 <= 0) { $('sp25-geo-out').textContent = 'Enter a positive Dimension 1.'; return; }
      if (s === 'circle-area') out = 'Circle area = ' + fmt(Math.PI * d1 * d1);
      else if (s === 'circle-circ') out = 'Circle circumference = ' + fmt(2 * Math.PI * d1);
      else {
        if (d2 === null || d2 <= 0) { $('sp25-geo-out').textContent = 'This shape also needs a positive Dimension 2.'; return; }
        if (s === 'rect-area') out = 'Rectangle area = ' + fmt(d1 * d2);
        else if (s === 'rect-perim') out = 'Rectangle perimeter = ' + fmt(2 * (d1 + d2));
        else if (s === 'tri-area') out = 'Triangle area = ' + fmt(d1 * d2 / 2);
        else if (s === 'cyl-vol') out = 'Cylinder volume = ' + fmt(Math.PI * d1 * d1 * d2);
      }
      $('sp25-geo-out').textContent = out;
    });

    /* ---------- 11. Molarity & pH ---------- */
    $('sp25-ch-mol').addEventListener('click', function () {
      var mo = num('sp25-ch-moles'), li = num('sp25-ch-liters');
      if (mo === null || li === null || li === 0) { $('sp25-ch-out').textContent = 'Enter moles and a non-zero number of liters.'; return; }
      $('sp25-ch-out').textContent = 'Molarity = ' + fmt(mo / li) + ' M (' + fmt(mo) + ' mol / ' + fmt(li) + ' L)';
    });
    $('sp25-ch-ph').addEventListener('click', function () {
      var h = num('sp25-ch-h');
      if (h === null || h <= 0) { $('sp25-ch-out').textContent = 'Enter an H+ concentration above 0, like 0.001.'; return; }
      $('sp25-ch-out').textContent = 'pH = ' + fmt(-Math.log10(h)) + ' for H+ = ' + h + ' mol/L';
    });

    /* ---------- 12. Periodic table ---------- */
    var ELEMENTS = {
      h: [1, 'Hydrogen', 1.008, 'Nonmetal'], he: [2, 'Helium', 4.003, 'Noble gas'],
      li: [3, 'Lithium', 6.94, 'Alkali metal'], be: [4, 'Beryllium', 9.012, 'Alkaline earth metal'],
      b: [5, 'Boron', 10.81, 'Metalloid'], c: [6, 'Carbon', 12.011, 'Nonmetal'],
      n: [7, 'Nitrogen', 14.007, 'Nonmetal'], o: [8, 'Oxygen', 15.999, 'Nonmetal'],
      f: [9, 'Fluorine', 18.998, 'Halogen'], ne: [10, 'Neon', 20.180, 'Noble gas'],
      na: [11, 'Sodium', 22.990, 'Alkali metal'], mg: [12, 'Magnesium', 24.305, 'Alkaline earth metal'],
      al: [13, 'Aluminium', 26.982, 'Post-transition metal'], si: [14, 'Silicon', 28.085, 'Metalloid'],
      p: [15, 'Phosphorus', 30.974, 'Nonmetal'], s: [16, 'Sulfur', 32.06, 'Nonmetal'],
      cl: [17, 'Chlorine', 35.45, 'Halogen'], ar: [18, 'Argon', 39.948, 'Noble gas'],
      k: [19, 'Potassium', 39.098, 'Alkali metal'], ca: [20, 'Calcium', 40.078, 'Alkaline earth metal'],
      fe: [26, 'Iron', 55.845, 'Transition metal'], cu: [29, 'Copper', 63.546, 'Transition metal'],
      zn: [30, 'Zinc', 65.38, 'Transition metal'], ag: [47, 'Silver', 107.868, 'Transition metal'],
      au: [79, 'Gold', 196.967, 'Transition metal'], i: [53, 'Iodine', 126.904, 'Halogen']
    };
    var NAME2SYM = {};
    Object.keys(ELEMENTS).forEach(function (k) { NAME2SYM[ELEMENTS[k][1].toLowerCase()] = k; });
    NAME2SYM['aluminum'] = 'al';
    $('sp25-pe-b').addEventListener('click', function () {
      var q = $('sp25-pe-in').value.trim().toLowerCase();
      var sym = ELEMENTS[q] ? q : NAME2SYM[q];
      if (!sym) { $('sp25-pe-out').textContent = 'Not found in this mini table. Try one of the first 20 elements, or Fe, Cu, Zn, Ag, Au, I.'; return; }
      var e = ELEMENTS[sym], disp = sym.charAt(0).toUpperCase() + sym.slice(1);
      $('sp25-pe-out').textContent = e[1] + ' (' + disp + ')\nAtomic number: ' + e[0] + '\nAtomic mass: ' + e[2] + '\nType: ' + e[3];
    });

    /* ---------- 13. Year facts ---------- */
    $('sp25-yr-b').addEventListener('click', function () {
      var y = num('sp25-yr-y');
      if (y === null || Math.round(y) !== y || y <= 0) { $('sp25-yr-out').textContent = 'Enter a whole year, like 2026.'; return; }
      var century = Math.floor((y - 1) / 100) + 1;
      var decade = Math.floor(y / 10) * 10;
      var leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
      $('sp25-yr-out').textContent = y + ' is in century ' + century + ', in the ' + decade + 's decade.\nLeap year: ' + (leap ? 'yes' : 'no');
    });
    $('sp25-yr-db').addEventListener('click', function () {
      var v1 = $('sp25-yr-d1').value, v2 = $('sp25-yr-d2').value;
      if (!v1 || !v2) { $('sp25-yr-out').textContent = 'Pick both dates first.'; return; }
      var diff = Math.abs(new Date(v2 + 'T00:00:00') - new Date(v1 + 'T00:00:00'));
      $('sp25-yr-out').textContent = 'Days between: ' + Math.round(diff / 86400000);
    });

    /* ---------- 14. Essay outline ---------- */
    var lastOutline = '';
    $('sp25-es-b').addEventListener('click', function () {
      var t = $('sp25-es-topic').value.trim(), p1 = $('sp25-es-p1').value.trim(), p2 = $('sp25-es-p2').value.trim(), p3 = $('sp25-es-p3').value.trim();
      if (!t) { $('sp25-es-out').textContent = 'Enter a topic first.'; return; }
      lastOutline = 'Essay Outline: ' + t + '\n\nI. Introduction\n   - Hook and background\n   - Thesis: ' + t + '\nII. ' + (p1 || 'Main point 1') + '\n   - Evidence and example\nIII. ' + (p2 || 'Main point 2') + '\n   - Evidence and example\nIV. ' + (p3 || 'Main point 3') + '\n   - Evidence and example\nV. Conclusion\n   - Restate the thesis and finish strong';
      $('sp25-es-out').textContent = lastOutline;
    });
    $('sp25-es-copy').addEventListener('click', function () {
      var btn = $('sp25-es-copy');
      if (!lastOutline) { $('sp25-es-out').textContent = 'Build an outline first, then copy it.'; return; }
      function done() { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy outline'; }, 1500); }
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(lastOutline).then(done, function () { fallback(); done(); }); }
      else { fallback(); done(); }
      function fallback() {
        try {
          var ta = document.createElement('textarea');
          ta.value = lastOutline; document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta);
        } catch (e) {}
      }
    });

    /* ---------- 15. Thesis ---------- */
    function stripDot(s) { return s.replace(/\s+$/, '').replace(/\.+$/, ''); }
    $('sp25-th-b').addEventListener('click', function () {
      var pos = stripDot($('sp25-th-pos').value.trim());
      var rs = [$('sp25-th-r1').value.trim(), $('sp25-th-r2').value.trim(), $('sp25-th-r3').value.trim()].filter(function (x) { return x; }).map(stripDot);
      if (!pos || rs.length === 0) { $('sp25-th-out').textContent = 'Enter your position and at least one reason.'; return; }
      var joined = rs.length === 1 ? rs[0] : (rs.length === 2 ? rs[0] + ' and ' + rs[1] : rs[0] + ', ' + rs[1] + ', and ' + rs[2]);
      var cap = pos.charAt(0).toUpperCase() + pos.slice(1);
      $('sp25-th-out').textContent = cap + ' because ' + joined + '.';
    });

    /* ---------- 16. Cornell notes ---------- */
    $('sp25-co-b').addEventListener('click', function () {
      var topic = $('sp25-co-topic').value.trim();
      var lines = $('sp25-co-notes').value.split('\n').map(function (x) { return x.trim(); }).filter(function (x) { return x; });
      if (!lines.length) { $('sp25-co-out').textContent = 'Write at least one line of notes first.'; return; }
      var cues = lines.map(function (l) { return esc(l.split(/\s+/).slice(0, 3).join(' ')) + '?'; }).join('<br>');
      var notes = lines.map(esc).join('<br>');
      var html = '<strong>' + esc(topic || 'Cornell Notes') + '</strong>'
        + '<div class="sp25-cols" style="margin-top:8px"><div class="sp25-col"><h4>Cues</h4>' + cues + '</div>'
        + '<div class="sp25-col" style="flex:2"><h4>Notes</h4>' + notes + '</div></div>'
        + '<div style="margin-top:8px"><strong>Summary:</strong> ' + esc(lines[0]) + ' — cover the Notes column and use the Cues to test yourself.</div>';
      $('sp25-co-out').innerHTML = html;
    });

    /* ---------- 17. Mnemonic ---------- */
    var mnInitials = [];
    $('sp25-mn-b').addEventListener('click', function () {
      var words = $('sp25-mn-in').value.split(/[,\s]+/).filter(function (x) { return x; }).slice(0, 8);
      if (!words.length) { $('sp25-mn-out').textContent = 'Enter at least one word first.'; return; }
      mnInitials = words.map(function (w) { return w.charAt(0).toUpperCase(); });
      $('sp25-mn-init').textContent = mnInitials.join(' ');
      var box = $('sp25-mn-lines'); box.innerHTML = '';
      mnInitials.forEach(function (ch) {
        var inp = document.createElement('input');
        inp.className = 'sp25-in sp25-mn-word'; inp.placeholder = 'A word starting with ' + ch;
        box.appendChild(inp);
      });
      $('sp25-mn-out').textContent = 'Now type a fun word for each initial, then press Combine my phrase.';
    });
    $('sp25-mn-combine').addEventListener('click', function () {
      var inputs = document.querySelectorAll('.sp25-mn-word');
      if (!inputs.length) { $('sp25-mn-out').textContent = 'Press Show initials first.'; return; }
      var parts = [];
      inputs.forEach(function (i) { parts.push(i.value.trim()); });
      if (parts.some(function (x) { return !x; })) { $('sp25-mn-out').textContent = 'Fill in a word for every initial first.'; return; }
      $('sp25-mn-out').textContent = 'Your mnemonic: ' + parts.join(' ') + '\nIt stands for: ' + mnInitials.join(' ');
    });

    /* ---------- 18. Feynman coach ---------- */
    $('sp25-fe-b').addEventListener('click', function () {
      var steps = [
        ['Concept named', $('sp25-fe-1').value.trim()],
        ['Explained simply', $('sp25-fe-2').value.trim()],
        ['Stuck point found', $('sp25-fe-3').value.trim()],
        ['Analogy added', $('sp25-fe-4').value.trim()]
      ];
      var out = 'FEYNMAN STUDY CARD\n';
      out += '\nConcept: ' + (steps[0][1] || '(not written yet)');
      out += '\nSimple explanation: ' + (steps[1][1] || '(not written yet)');
      out += '\nWhere I get stuck: ' + (steps[2][1] || '(not written yet)');
      out += '\nAnalogy: ' + (steps[3][1] || '(not written yet)');
      out += '\n\nChecklist:';
      steps.forEach(function (s) { out += '\n' + (s[1] ? '[x] ' : '[ ] ') + s[0] + (s[1] ? ' — done' : ' — still to do'); });
      $('sp25-fe-out').textContent = out;
    });

    /* ---------- 19. Reading speed ---------- */
    var rdStart = null, rdWpm = null;
    var rdWords = RD_PASSAGE.split(/\s+/).length;
    $('sp25-rd-start').addEventListener('click', function () {
      rdStart = Date.now(); rdWpm = null;
      $('sp25-rd-out').textContent = 'Timer running. Read the passage, then press Stop.';
    });
    $('sp25-rd-stop').addEventListener('click', function () {
      if (!rdStart) { $('sp25-rd-out').textContent = 'Press Start reading first.'; return; }
      var mins = (Date.now() - rdStart) / 60000;
      rdWpm = Math.round(rdWords / Math.max(mins, 0.01));
      $('sp25-rd-out').textContent = 'Reading speed: ' + rdWpm + ' WPM (' + rdWords + ' words). Now answer the 3 questions and press Check answers.';
    });
    $('sp25-rd-check').addEventListener('click', function () {
      var answers = { 'sp25-rd-q1': 'a', 'sp25-rd-q2': 'b', 'sp25-rd-q3': 'c' };
      var lines = [], score = 0, i = 1;
      Object.keys(answers).forEach(function (id) {
        var v = $(id).value;
        if (v === answers[id]) { score++; lines.push('Q' + i + ': Right'); }
        else { lines.push('Q' + i + ': Wrong'); }
        i++;
      });
      var head = rdWpm !== null ? 'Reading speed: ' + rdWpm + ' WPM\n' : 'Tip: use Start and Stop to measure your WPM.\n';
      $('sp25-rd-out').textContent = head + lines.join('\n') + '\nComprehension score: ' + score + ' / 3';
    });

    /* ---------- 20. Typing test ---------- */
    var tyStart = null;
    $('sp25-ty-in').addEventListener('input', function () { if (!tyStart) tyStart = Date.now(); });
    $('sp25-ty-b').addEventListener('click', function () {
      var typed = $('sp25-ty-in').value;
      if (!typed.length || !tyStart) { $('sp25-ty-out').textContent = 'Type the sentence first, then check your score.'; return; }
      var secs = Math.max((Date.now() - tyStart) / 1000, 1);
      var correct = 0;
      for (var i = 0; i < Math.min(typed.length, TY_SENT.length); i++) { if (typed.charAt(i) === TY_SENT.charAt(i)) correct++; }
      var acc = Math.round((correct / typed.length) * 100);
      var wpm = Math.round((typed.length / 5) / (secs / 60));
      $('sp25-ty-out').textContent = 'Typing speed: ' + wpm + ' WPM\nAccuracy: ' + acc + '% (' + correct + ' of ' + typed.length + ' characters correct)';
    });

    /* ---------- 21. Exam countdown ---------- */
    var EXAM_KEY = 'studyplus-plus-exam-v1';
    function examShow() {
      var v = $('sp25-ex-in').value;
      if (!v) { $('sp25-ex-out').textContent = 'No exam date saved yet.'; return; }
      var target = new Date(v + 'T00:00:00').getTime(), now = Date.now(), diff = target - now;
      if (diff <= 0) { $('sp25-ex-out').textContent = 'Countdown for ' + v + ': that date has passed. Good luck with the next one.'; return; }
      var days = Math.floor(diff / 86400000), hours = Math.floor((diff % 86400000) / 3600000);
      $('sp25-ex-out').textContent = 'Exam on ' + v + ': ' + days + ' days and ' + hours + ' hours left.';
    }
    $('sp25-ex-b').addEventListener('click', function () {
      var v = $('sp25-ex-in').value;
      if (!v) { $('sp25-ex-out').textContent = 'Pick a date first.'; return; }
      try { localStorage.setItem(EXAM_KEY, v); } catch (e) {}
      examShow();
    });
    try {
      var saved = localStorage.getItem(EXAM_KEY);
      if (saved) { $('sp25-ex-in').value = saved; examShow(); }
    } catch (e) {}

    /* ---------- 22. Study planner ---------- */
    $('sp25-pl-b').addEventListener('click', function () {
      var total = num('sp25-pl-min');
      var topics = $('sp25-pl-topics').value.split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x; });
      if (total === null || total <= 0 || !topics.length) { $('sp25-pl-out').textContent = 'Enter total minutes and at least one topic.'; return; }
      total = Math.floor(total);
      var base = Math.floor(total / topics.length), rem = total % topics.length, t = 0, lines = [];
      topics.forEach(function (topic, i) {
        var len = base + (i < rem ? 1 : 0), start = t; t += len;
        lines.push('Block ' + (i + 1) + ': ' + topic + ' — minutes ' + start + ' to ' + t + ' (' + len + ' min)');
      });
      $('sp25-pl-out').textContent = lines.join('\n');
    });

    /* ---------- 23. Chicago citation ---------- */
    $('sp25-ci-b').addEventListener('click', function () {
      var au = $('sp25-ci-au').value.trim(), ti = $('sp25-ci-ti').value.trim(), pub = $('sp25-ci-pub').value.trim(), yr = $('sp25-ci-yr').value.trim();
      if (!au || !ti || !pub || !yr) { $('sp25-ci-out').textContent = 'Fill in author, title, publisher and year.'; return; }
      $('sp25-ci-out').innerHTML = 'Chicago (bibliography):<br>' + esc(au) + '. <i>' + esc(ti) + '</i>. ' + esc(pub) + ', ' + esc(yr) + '.';
    });

    /* ---------- 24. Scientific notation ---------- */
    $('sp25-sc-b1').addEventListener('click', function () {
      var n = num('sp25-sc-n');
      if (n === null) { $('sp25-sc-out').textContent = 'Enter a standard number first.'; return; }
      if (n === 0) { $('sp25-sc-out').textContent = '0 in scientific notation is 0.'; return; }
      var parts = n.toExponential(5).split('e');
      var mant = String(parseFloat(parts[0])), exp = parseInt(parts[1], 10);
      $('sp25-sc-out').textContent = fmt(n) + ' = ' + mant + 'e' + exp + '  (' + mant + ' x 10^' + exp + ')';
    });
    $('sp25-sc-b2').addEventListener('click', function () {
      var raw = $('sp25-sc-s').value.trim();
      var n = parseFloat(raw);
      if (!raw || isNaN(n)) { $('sp25-sc-out').textContent = 'Enter a value like 3.2e5.'; return; }
      $('sp25-sc-out').textContent = raw + ' = ' + String(n) + ' in standard form';
    });

    /* ---------- 25. Flashcards quick-create ---------- */
    var fc = { deck: [], idx: 0, flipped: false };
    function fcShow() {
      var card = $('sp25-fc-card');
      if (!fc.deck.length) {
        card.textContent = 'No cards yet. Add one above, then click the card to flip it.';
        $('sp25-fc-out').textContent = 'Card 0 of 0';
        return;
      }
      var c = fc.deck[fc.idx];
      card.textContent = (fc.flipped ? 'Back: ' : 'Front: ') + (fc.flipped ? c.b : c.f) + '  (click to flip)';
      $('sp25-fc-out').textContent = 'Card ' + (fc.idx + 1) + ' of ' + fc.deck.length;
    }
    $('sp25-fc-add').addEventListener('click', function () {
      var f = $('sp25-fc-f').value.trim(), b = $('sp25-fc-bk').value.trim();
      if (!f || !b) { $('sp25-fc-out').textContent = 'Type both a front and a back first.'; return; }
      if (fc.deck.length >= 20) { $('sp25-fc-out').textContent = 'Deck is full: 20 cards max in this quick deck.'; return; }
      fc.deck.push({ f: f, b: b });
      fc.idx = fc.deck.length - 1; fc.flipped = false;
      $('sp25-fc-f').value = ''; $('sp25-fc-bk').value = '';
      fcShow();
    });
    $('sp25-fc-card').addEventListener('click', function () { if (fc.deck.length) { fc.flipped = !fc.flipped; fcShow(); } });
    $('sp25-fc-next').addEventListener('click', function () { if (fc.deck.length) { fc.idx = (fc.idx + 1) % fc.deck.length; fc.flipped = false; fcShow(); } });
    $('sp25-fc-sh').addEventListener('click', function () {
      for (var i = fc.deck.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = fc.deck[i]; fc.deck[i] = fc.deck[j]; fc.deck[j] = t; }
      fc.idx = 0; fc.flipped = false; fcShow();
    });
    fcShow();
  }

  try {
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', function () { try { init(); } catch (e) {} }); }
    else { init(); }
  } catch (e) {}
})();
