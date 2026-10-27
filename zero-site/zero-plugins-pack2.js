/* Zero plugins pack 2 — 25 extra instant-answer tools.
   Loaded after zero-plugins.js and zero-plugins-builtin.js.
   Every plugin is self-contained, works fully on-device, and
   answers through the "zero-search-query" document event. */
(function(){
"use strict";
var ZP = window.ZeroPlugins;
if(!ZP || !ZP.register) return;

function esc(s){
  return String(s==null?"":s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function svg(paths){
  return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg>';
}
function fmt(n, dec){
  if(typeof n !== "number" || !isFinite(n)) return "";
  var d = (dec == null ? 2 : dec);
  var s = n.toFixed(d);
  if(s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
}
function money(n){ return (typeof n === "number" && isFinite(n)) ? n.toFixed(2) : ""; }
function pad2(n){ return String(n).padStart(2, "0"); }
function push(e, id, title, snippet, html){
  var r = {type:"plugin", plugin:id, title:title, snippet:snippet, url:""};
  if(html) r.html = true;
  e.detail.results.unshift(r);
}
function parseISODate(s){
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return null;
  var y = +m[1], mo = +m[2], d = +m[3];
  var dt = new Date(Date.UTC(y, mo - 1, d));
  if(dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
function todayUTC(){
  var n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}
function gcd(a, b){ a = Math.abs(a); b = Math.abs(b); while(b){ var t = a % b; a = b; b = t; } return a || 1; }

/* ---------- 1. Percentage ---------- */
ZP.register({
  id: "percentage",
  name: "Percentage",
  desc: "Type '15% of 240' for an instant percentage answer",
  icon: svg('<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^([\d.]+)\s*%\s+of\s+([\d.]+)$/i);
        if(!m) return;
        var pct = parseFloat(m[1]), base = parseFloat(m[2]);
        if(!isFinite(pct) || !isFinite(base) || pct < 0 || pct > 100000 || Math.abs(base) > 1e15) return;
        var out = pct / 100 * base;
        push(e, "percentage", fmt(out, 4), esc(m[1]) + "% of " + esc(m[2]) + " =");
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 2. Tip calculator ---------- */
ZP.register({
  id: "tipcalc",
  name: "Tip Calculator",
  desc: "Type 'tip 18% on 64' for the tip amount and total",
  icon: svg('<rect x="5" y="3" width="14" height="18" rx="2"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^tip\s+([\d.]+)%\s+on\s+\$?([\d.]+)$/i);
        if(!m) return;
        var pct = parseFloat(m[1]), bill = parseFloat(m[2]);
        if(!isFinite(pct) || !isFinite(bill) || pct < 0 || pct > 1000 || bill < 0 || bill > 1e9) return;
        var tip = bill * pct / 100, total = bill + tip;
        push(e, "tipcalc", "$" + money(total) + " total", "Tip: $" + money(tip) + " (" + esc(m[1]) + "% on $" + money(bill) + ")");
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 3. Age calculator ---------- */
ZP.register({
  id: "agecalc",
  name: "Age Calculator",
  desc: "Type 'age 2010-05-04' to get the age in years",
  icon: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^age\s+(\d{4}-\d{2}-\d{2})$/i);
        if(!m) return;
        var dob = parseISODate(m[1]);
        if(!dob) return;
        var now = todayUTC();
        if(dob.getTime() > now.getTime()) return;
        var years = now.getUTCFullYear() - dob.getUTCFullYear();
        var moDiff = now.getUTCMonth() - dob.getUTCMonth();
        if(moDiff < 0 || (moDiff === 0 && now.getUTCDate() < dob.getUTCDate())) years--;
        if(years < 0 || years > 150) return;
        push(e, "agecalc", years + (years === 1 ? " year old" : " years old"), "Born " + esc(m[1]));
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 4. Date difference ---------- */
ZP.register({
  id: "datediff",
  name: "Date Difference",
  desc: "Type 'days between 2026-01-01 and 2026-12-31'",
  icon: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 15h8"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^days\s+between\s+(\d{4}-\d{2}-\d{2})\s+and\s+(\d{4}-\d{2}-\d{2})$/i);
        if(!m) return;
        var a = parseISODate(m[1]), b = parseISODate(m[2]);
        if(!a || !b) return;
        var days = Math.abs(Math.round((b.getTime() - a.getTime()) / 86400000));
        push(e, "datediff", days + (days === 1 ? " day" : " days"), esc(m[1]) + " to " + esc(m[2]));
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 5. Days until ---------- */
ZP.register({
  id: "daysuntil",
  name: "Days Until",
  desc: "Type 'days until 2027-01-01' for a countdown in days",
  icon: svg('<circle cx="12" cy="12" r="9"/><line x1="12" y1="7" x2="12" y2="12"/><line x1="12" y1="12" x2="16" y2="14"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^days\s+until\s+(\d{4}-\d{2}-\d{2})$/i);
        if(!m) return;
        var target = parseISODate(m[1]);
        if(!target) return;
        var diff = Math.round((target.getTime() - todayUTC().getTime()) / 86400000);
        var note = diff >= 0 ? "from today" : "that date has passed";
        push(e, "daysuntil", diff + (Math.abs(diff) === 1 ? " day" : " days"), "Until " + esc(m[1]) + " (" + note + ")");
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 6. BMI ---------- */
ZP.register({
  id: "bmi",
  name: "BMI Calculator",
  desc: "Type 'bmi 70kg 175cm' for a BMI value and category",
  icon: svg('<path d="M12 3v3"/><rect x="5" y="6" width="14" height="15" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^bmi\s+([\d.]+)\s*kg\s+([\d.]+)\s*cm$/i);
        if(!m) return;
        var kg = parseFloat(m[1]), cm = parseFloat(m[2]);
        if(!isFinite(kg) || !isFinite(cm) || kg < 10 || kg > 500 || cm < 50 || cm > 300) return;
        var h = cm / 100, val = kg / (h * h);
        var cat = val < 18.5 ? "Underweight" : val < 25 ? "Normal" : val < 30 ? "Overweight" : "Obese";
        push(e, "bmi", fmt(val, 1) + " · " + cat, esc(m[1]) + " kg, " + esc(m[2]) + " cm · general info only — not medical advice");
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 7. Loan payment ---------- */
ZP.register({
  id: "loan",
  name: "Loan Payment",
  desc: "Type 'loan 10000 5% 36' (amount, annual %, months)",
  icon: svg('<rect x="3" y="6" width="18" height="13" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="7" y1="15" x2="11" y2="15"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^loan\s+([\d.]+)\s+([\d.]+)%\s+(\d+)$/i);
        if(!m) return;
        var p = parseFloat(m[1]), rate = parseFloat(m[2]), n = parseInt(m[3], 10);
        if(!isFinite(p) || !isFinite(rate) || !isFinite(n) || p <= 0 || p > 1e9 || rate < 0 || rate > 100 || n < 1 || n > 600) return;
        var r = rate / 100 / 12;
        var pay = r === 0 ? p / n : p * r / (1 - Math.pow(1 + r, -n));
        push(e, "loan", "$" + money(pay) + " / month", "$" + money(p) + " at " + esc(m[2]) + "% for " + esc(m[3]) + " months · total $" + money(pay * n));
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 8. Compound interest ---------- */
ZP.register({
  id: "compound",
  name: "Compound Interest",
  desc: "Type 'compound 1000 5% 10' (principal, %, years)",
  icon: svg('<path d="M4 19a9 9 0 0 1 16 0"/><line x1="4" y1="19" x2="20" y2="19"/><path d="M12 10V5"/><path d="M9 7l3-2 3 2"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^compound\s+([\d.]+)\s+([\d.]+)%\s+([\d.]+)$/i);
        if(!m) return;
        var p = parseFloat(m[1]), rate = parseFloat(m[2]), yrs = parseFloat(m[3]);
        if(!isFinite(p) || !isFinite(rate) || !isFinite(yrs) || p < 0 || p > 1e12 || rate < 0 || rate > 100 || yrs < 0 || yrs > 200) return;
        var fin = p * Math.pow(1 + rate / 100, yrs);
        if(!isFinite(fin)) return;
        push(e, "compound", "$" + money(fin), "$" + money(p) + " at " + esc(m[2]) + "% for " + esc(m[3]) + " years · interest $" + money(fin - p));
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 9. Discount ---------- */
ZP.register({
  id: "discount",
  name: "Discount",
  desc: "Type '25% off 80' for the sale price and savings",
  icon: svg('<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.6"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^([\d.]+)%\s+off\s+\$?([\d.]+)$/i);
        if(!m) return;
        var pct = parseFloat(m[1]), price = parseFloat(m[2]);
        if(!isFinite(pct) || !isFinite(price) || pct < 0 || pct > 100 || price < 0 || price > 1e12) return;
        var saved = price * pct / 100, fin = price - saved;
        push(e, "discount", "$" + money(fin), "You save $" + money(saved) + " (" + esc(m[1]) + "% off $" + money(price) + ")");
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 10. Sales tax ---------- */
ZP.register({
  id: "salestax",
  name: "Sales Tax",
  desc: "Type 'tax 8% on 120' for the tax amount and total",
  icon: svg('<rect x="5" y="3" width="14" height="18" rx="2"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><path d="M9 17l6-2"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^tax\s+([\d.]+)%\s+on\s+\$?([\d.]+)$/i);
        if(!m) return;
        var pct = parseFloat(m[1]), amt = parseFloat(m[2]);
        if(!isFinite(pct) || !isFinite(amt) || pct < 0 || pct > 1000 || amt < 0 || amt > 1e12) return;
        var tax = amt * pct / 100, total = amt + tax;
        push(e, "salestax", "$" + money(total) + " total", "Tax: $" + money(tax) + " (" + esc(m[1]) + "% on $" + money(amt) + ")");
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 11. Binary ---------- */
ZP.register({
  id: "binary",
  name: "Binary Converter",
  desc: "Type 'binary 42' or '42 in binary'",
  icon: svg('<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/><line x1="11" y1="7" x2="17" y2="7"/><line x1="17" y1="7" x2="17" y2="13"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^binary\s+(\d+)$/i) || q.match(/^(\d+)\s+in\s+binary$/i);
        if(!m) return;
        var n = Number(m[1]);
        if(!isFinite(n) || n < 0 || n > 9007199254740991) return;
        push(e, "binary", n.toString(2), esc(m[1]) + " in binary =");
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 12. Hex ---------- */
ZP.register({
  id: "hex",
  name: "Hex Converter",
  desc: "Type 'hex 255' to convert a number to hexadecimal",
  icon: svg('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><line x1="12" y1="12" x2="12" y2="12.01"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^hex\s+(\d+)$/i);
        if(!m) return;
        var n = Number(m[1]);
        if(!isFinite(n) || n < 0 || n > 9007199254740991) return;
        push(e, "hex", n.toString(16).toUpperCase(), esc(m[1]) + " in hex =");
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 13. Roman numerals ---------- */
ZP.register({
  id: "roman",
  name: "Roman Numerals",
  desc: "Type 'roman 1994' or 'roman MCMXCIV' to convert either way",
  icon: svg('<line x1="6" y1="4" x2="6" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="18" y1="4" x2="18" y2="20"/>'),
  _handler: null,
  onEnable: function(){
    var table = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
    function toRoman(n){
      var s = "";
      table.forEach(function(pair){ while(n >= pair[0]){ s += pair[1]; n -= pair[0]; } });
      return s;
    }
    function fromRoman(s){
      var vals = {I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
      var total = 0;
      for(var i = 0; i < s.length; i++){
        var cur = vals[s[i]], nxt = i + 1 < s.length ? vals[s[i + 1]] : 0;
        if(cur == null || nxt == null) return null;
        total += cur < nxt ? -cur : cur;
      }
      return total;
    }
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var mNum = q.match(/^roman\s+(\d+)$/i);
        if(mNum){
          var n = parseInt(mNum[1], 10);
          if(!isFinite(n) || n < 1 || n > 3999) return;
          push(e, "roman", toRoman(n), esc(mNum[1]) + " in Roman numerals =");
          return;
        }
        var mRom = q.match(/^roman\s+([IVXLCDM]+)$/i);
        if(mRom){
          var up = mRom[1].toUpperCase();
          var val = fromRoman(up);
          if(val == null || val < 1 || val > 3999 || toRoman(val) !== up) return;
          push(e, "roman", String(val), esc(up) + " as a number =");
        }
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 14. Random number ---------- */
ZP.register({
  id: "random",
  name: "Random Number",
  desc: "Type 'random between 1 and 100'",
  icon: svg('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.3" fill="currentColor"/><circle cx="15" cy="15" r="1.3" fill="currentColor"/><circle cx="15" cy="9" r="1.3" fill="currentColor"/><circle cx="9" cy="15" r="1.3" fill="currentColor"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^random\s+between\s+(-?\d+)\s+and\s+(-?\d+)$/i);
        if(!m) return;
        var lo = parseInt(m[1], 10), hi = parseInt(m[2], 10);
        if(!isFinite(lo) || !isFinite(hi) || lo >= hi || (hi - lo) > 1e12) return;
        var n = lo + Math.floor(Math.random() * (hi - lo + 1));
        push(e, "random", String(n), "Random between " + esc(m[1]) + " and " + esc(m[2]));
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 15. Dice & coin ---------- */
ZP.register({
  id: "dice",
  name: "Dice & Coin",
  desc: "Type 'flip a coin', 'roll a dice' or 'roll 2d6'",
  icon: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>'),
  _handler: null,
  onEnable: function(){
    function rollDie(sides){ return 1 + Math.floor(Math.random() * sides); }
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim().toLowerCase();
        if(q === "flip a coin" || q === "flip coin"){
          push(e, "dice", Math.random() < 0.5 ? "Heads" : "Tails", "Coin flip");
          return;
        }
        if(q === "roll a dice" || q === "roll a die" || q === "roll dice" || q === "roll die"){
          push(e, "dice", String(rollDie(6)), "Dice roll (1-6)");
          return;
        }
        var m = q.match(/^roll\s+(\d+)d(\d+)$/);
        if(m){
          var count = parseInt(m[1], 10), sides = parseInt(m[2], 10);
          if(!isFinite(count) || !isFinite(sides) || count < 1 || count > 100 || sides < 2 || sides > 1000) return;
          var rolls = [], sum = 0;
          for(var i = 0; i < count; i++){ var r = rollDie(sides); rolls.push(r); sum += r; }
          push(e, "dice", String(sum), "Rolls: " + rolls.join(" + ") + " (" + esc(m[1]) + "d" + esc(m[2]) + ")");
        }
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 16. Password generator ---------- */
ZP.register({
  id: "passwordgen",
  name: "Password Generator",
  desc: "Type 'password 16' to generate a password on this device",
  icon: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.4" fill="currentColor"/>'),
  _handler: null,
  onEnable: function(){
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+";
    function gen(len){
      var out = "";
      try{
        if(window.crypto && window.crypto.getRandomValues){
          var arr = new Uint32Array(len);
          window.crypto.getRandomValues(arr);
          for(var i = 0; i < len; i++) out += chars[arr[i] % chars.length];
          return out;
        }
      }catch(err){}
      for(var j = 0; j < len; j++) out += chars[Math.floor(Math.random() * chars.length)];
      return out;
    }
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^password\s+(\d+)$/i);
        if(!m) return;
        var len = parseInt(m[1], 10);
        if(!isFinite(len) || len < 4 || len > 128) return;
        push(e, "passwordgen", gen(len), "Generated on-device — not stored anywhere. Copy it now if you need it.");
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 17. Case converter ---------- */
ZP.register({
  id: "caseconv",
  name: "Case Converter",
  desc: "Type 'uppercase hello world', 'lowercase HELLO' or 'titlecase hello world'",
  icon: svg('<path d="M5 18L10 6l5 12"/><line x1="6.8" y1="14" x2="13.2" y2="14"/><path d="M15 18l4-7 4 7" transform="translate(-3 0) scale(0.8) translate(4 4)"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var mUp = q.match(/^uppercase\s+(.+)$/is);
        if(mUp){ push(e, "caseconv", esc(mUp[1].toUpperCase()), "Uppercase"); return; }
        var mLo = q.match(/^lowercase\s+(.+)$/is);
        if(mLo){ push(e, "caseconv", esc(mLo[1].toLowerCase()), "Lowercase"); return; }
        var mTi = q.match(/^titlecase\s+(.+)$/is);
        if(mTi){
          var t = mTi[1].toLowerCase().replace(/(^|\s)(\S)/g, function(all, sp, ch){ return sp + ch.toUpperCase(); });
          push(e, "caseconv", esc(t), "Title Case");
        }
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 18. Reverse text ---------- */
ZP.register({
  id: "reverse",
  name: "Reverse Text",
  desc: "Type 'reverse hello' to flip text backwards",
  icon: svg('<path d="M4 8h13l-3-3"/><path d="M20 16H7l3 3"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^reverse\s+(.+)$/is);
        if(!m) return;
        var rev = m[1].split("").reverse().join("");
        push(e, "reverse", esc(rev), "Reversed text");
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 19. Reading time ---------- */
ZP.register({
  id: "readingtime",
  name: "Reading Time",
  desc: "Type 'reading time: your text' for words and reading minutes",
  icon: svg('<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z"/><path d="M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "");
        var m = q.match(/^reading\s+time:\s*(.+)$/is);
        if(!m) return;
        var t = m[1].trim();
        if(!t) return;
        var words = t.split(/\s+/).filter(Boolean).length;
        var mins = words / 200;
        push(e, "readingtime", words + (words === 1 ? " word" : " words") + " · " + fmt(mins, 2) + " min read", "At 200 words per minute · " + t.length + " characters");
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 20. Time zone converter ---------- */
ZP.register({
  id: "tzconv",
  name: "Time Zone Converter",
  desc: "Type '3pm est to pst' or '15:00 utc to est'",
  icon: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/>'),
  _handler: null,
  onEnable: function(){
    var offsets = {est:-5, edt:-4, cst:-6, cdt:-5, mst:-7, mdt:-6, pst:-8, pdt:-7, utc:0, gmt:0, bst:1, ist:5.5};
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim().toLowerCase();
        var m = q.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+([a-z]{2,4})\s+to\s+([a-z]{2,4})$/);
        if(!m) return;
        var from = m[4], to = m[5];
        if(!(from in offsets) || !(to in offsets)) return;
        var hour = parseInt(m[1], 10), min = m[2] ? parseInt(m[2], 10) : 0;
        if(!isFinite(hour) || !isFinite(min) || min < 0 || min > 59) return;
        if(m[3]){
          if(hour < 1 || hour > 12) return;
          hour = (hour % 12) + (m[3] === "pm" ? 12 : 0);
        } else if(hour < 0 || hour > 23) return;
        var raw = hour * 60 + min - offsets[from] * 60 + offsets[to] * 60;
        var shift = Math.floor(raw / 1440);
        var wrapped = ((raw % 1440) + 1440) % 1440;
        var hh = Math.floor(wrapped / 60), mm = wrapped % 60;
        var shiftNote = shift === 1 ? " (+1 day)" : shift === -1 ? " (-1 day)" : "";
        push(e, "tzconv", pad2(hh) + ":" + pad2(mm) + " " + to.toUpperCase(),
          esc(m[1] + (m[2] ? ":" + m[2] : "") + (m[3] || "")) + " " + from.toUpperCase() + " =" + shiftNote + " · offsets are standard approximations");
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 21. Data sizes ---------- */
ZP.register({
  id: "datasize",
  name: "Data Size Converter",
  desc: "Type '500 mb to gb' or '2 gb to mb' (1000-based)",
  icon: svg('<rect x="4" y="4" width="16" height="6" rx="1"/><rect x="4" y="14" width="16" height="6" rx="1"/><line x1="8" y1="7" x2="8.01" y2="7"/><line x1="8" y1="17" x2="8.01" y2="17"/>'),
  _handler: null,
  onEnable: function(){
    var pow = {b:0, kb:1, mb:2, gb:3, tb:4};
    var label = {b:"B", kb:"KB", mb:"MB", gb:"GB", tb:"TB"};
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim().toLowerCase();
        var m = q.match(/^([\d.]+)\s*(b|kb|mb|gb|tb)\s+to\s+(b|kb|mb|gb|tb)$/);
        if(!m) return;
        var val = parseFloat(m[1]);
        if(!isFinite(val) || val < 0 || val > 1e15) return;
        var out = val * Math.pow(1000, pow[m[2]] - pow[m[3]]);
        push(e, "datasize", fmt(out, 4) + " " + label[m[3]], esc(m[1]) + " " + label[m[2]] + " = · 1000-based units");
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 22. Speed ---------- */
ZP.register({
  id: "speed",
  name: "Speed Converter",
  desc: "Type '60 mph to kmh' or '100 kmh to mph'",
  icon: svg('<path d="M4 15a8 8 0 1 1 16 0"/><line x1="12" y1="15" x2="16" y2="9"/><line x1="4" y1="19" x2="20" y2="19"/>'),
  _handler: null,
  onEnable: function(){
    var toMs = {mph:0.44704, kmh:1000 / 3600, ms:1};
    var norm = {"mph":"mph", "kmh":"kmh", "km/h":"kmh", "m/s":"ms", "ms":"ms"};
    var label = {mph:"mph", kmh:"km/h", ms:"m/s"};
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim().toLowerCase();
        var m = q.match(/^([\d.]+)\s*(mph|km\/h|kmh|m\/s|ms)\s+to\s+(mph|km\/h|kmh|m\/s|ms)$/);
        if(!m) return;
        var val = parseFloat(m[1]);
        if(!isFinite(val) || val < 0 || val > 1e9) return;
        var f = norm[m[2]], t = norm[m[3]];
        if(!f || !t) return;
        var out = val * toMs[f] / toMs[t];
        push(e, "speed", fmt(out, 2) + " " + label[t], esc(m[1]) + " " + label[f] + " =");
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 23. Cooking measures ---------- */
ZP.register({
  id: "cooking",
  name: "Cooking Measures",
  desc: "Type '2 cups to ml', '3 tbsp to ml' or '1 tsp to ml'",
  icon: svg('<path d="M5 3h14v6a7 7 0 0 1-14 0z"/><line x1="12" y1="16" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/>'),
  _handler: null,
  onEnable: function(){
    var toMl = {cup:236.588, cups:236.588, tbsp:14.7868, tablespoon:14.7868, tablespoons:14.7868, tsp:4.92892, teaspoon:4.92892, teaspoons:4.92892};
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim().toLowerCase();
        var m = q.match(/^([\d.]+)\s*(cups?|tbsp|tablespoons?|tsp|teaspoons?)\s+to\s+ml$/);
        if(m){
          var val = parseFloat(m[1]);
          if(!isFinite(val) || val < 0 || val > 1e6) return;
          var out = val * toMl[m[2]];
          push(e, "cooking", fmt(out, 2) + " ml", esc(m[1]) + " " + esc(m[2]) + " =");
          return;
        }
        var r = q.match(/^([\d.]+)\s*ml\s+to\s+(cups?|tbsp|tablespoons?|tsp|teaspoons?)$/);
        if(r){
          var v2 = parseFloat(r[1]);
          if(!isFinite(v2) || v2 < 0 || v2 > 1e9) return;
          var o2 = v2 / toMl[r[2]];
          push(e, "cooking", fmt(o2, 4) + " " + r[2], esc(r[1]) + " ml =");
        }
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 24. Fraction ---------- */
ZP.register({
  id: "fraction",
  name: "Fraction Helper",
  desc: "Type 'fraction 3/4' for decimal, percent and simplified form",
  icon: svg('<line x1="5" y1="12" x2="19" y2="12"/><circle cx="12" cy="6" r="1.4" fill="currentColor"/><circle cx="12" cy="18" r="1.4" fill="currentColor"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var m = q.match(/^fraction\s+(-?\d+)\s*\/\s*(\d+)$/i);
        if(!m) return;
        var num = parseInt(m[1], 10), den = parseInt(m[2], 10);
        if(!isFinite(num) || !isFinite(den) || den === 0 || Math.abs(num) > 1e12 || den > 1e12) return;
        var dec = num / den;
        var pct = dec * 100;
        var g = gcd(num, den);
        var simp = (num / g) + "/" + (den / g);
        if(den / g === 1) simp = String(num / g);
        push(e, "fraction", fmt(dec, 6) + " · " + fmt(pct, 2) + "%", "Simplified: " + simp + " (" + esc(m[1]) + "/" + esc(m[2]) + ")");
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 25. Base64 ---------- */
ZP.register({
  id: "base64",
  name: "Base64",
  desc: "Type 'base64 hello' to encode or 'base64 decode aGVsbG8=' to decode",
  icon: svg('<path d="M8 6l-5 6 5 6"/><path d="M16 6l5 6-5 6"/>'),
  _handler: null,
  onEnable: function(){
    function encodeUtf8(str){
      if(typeof TextEncoder !== "undefined" && typeof btoa !== "undefined"){
        var bytes = new TextEncoder().encode(str);
        var bin = "";
        bytes.forEach(function(b){ bin += String.fromCharCode(b); });
        return btoa(bin);
      }
      return btoa(unescape(encodeURIComponent(str)));
    }
    function decodeUtf8(b64){
      var bin = atob(b64);
      if(typeof TextDecoder !== "undefined"){
        var bytes = new Uint8Array(bin.length);
        for(var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder().decode(bytes);
      }
      return decodeURIComponent(escape(bin));
    }
    this._handler = function(e){
      try{
        var q = ((e && e.detail && e.detail.query) || "").trim();
        var mDec = q.match(/^base64\s+decode\s+(.+)$/is);
        if(mDec){
          var raw = mDec[1].trim();
          if(!/^[A-Za-z0-9+/=\s]+$/.test(raw)) return;
          var decoded = decodeUtf8(raw.replace(/\s+/g, ""));
          push(e, "base64", esc(decoded), "Base64 decoded");
          return;
        }
        var mEnc = q.match(/^base64\s+(.+)$/is);
        if(mEnc){
          if(mEnc[1].length > 5000) return;
          push(e, "base64", encodeUtf8(mEnc[1]), "Base64 encoded");
        }
      }catch(err){}
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

})();
