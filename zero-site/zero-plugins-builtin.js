/* Zero built-in plugins. Loaded after zero-plugins.js. */
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

/* ---------- 1. Calculator ---------- */
ZP.register({
  id: "calculator",
  name: "Calculator",
  desc: "Type math like 12*8 or sqrt(144) in the search box for instant answers",
  icon: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="12" x2="8.01" y2="12"/><line x1="12" y1="12" x2="12.01" y2="12"/><line x1="16" y1="12" x2="16.01" y2="12"/><line x1="8" y1="16" x2="8.01" y2="16"/><line x1="12" y1="16" x2="12.01" y2="16"/><line x1="16" y1="16" x2="16.01" y2="16"/>'),
  _handler: null,
  onEnable: function(){
    var self = this;
    this._handler = function(e){
      var q = (e && e.detail && e.detail.query) || "";
      var m = q.trim().match(/^(?:calc\s+)?([0-9+\-*/().\s^%!sqrt]+)$/i);
      if(!m) return;
      var expr = m[1].replace(/\^/g, "**").replace(/sqrt\(/gi, "Math.sqrt(");
      if(!/^[0-9+\-*/().\s*%Math.sqrt]+$/.test(expr.replace(/\*\*/g, "*"))) return;
      try{
        // eslint-disable-next-line no-eval
        var val = eval(expr);
        if(typeof val === "number" && isFinite(val)){
          e.detail.results.unshift({
            type: "plugin", plugin: "calculator",
            title: String(Math.round(val * 1e10) / 1e10),
            snippet: m[1].trim() + " =",
            url: ""
          });
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

/* ---------- 2. Unit Converter ---------- */
ZP.register({
  id: "converter",
  name: "Unit Converter",
  desc: "Convert units: try '5 miles to km' or '100 f to c'",
  icon: svg('<path d="M4 7h13l-3-3"/><path d="M20 17H7l3 3"/>'),
  _handler: null,
  onEnable: function(){
    var units = {
      // length (to meters)
      "mm":0.001,"cm":0.01,"m":1,"km":1000,"in":0.0254,"ft":0.3048,"yd":0.9144,"mi":1609.344,
      "mile":1609.344,"miles":1609.344,"inch":0.0254,"inches":0.0254,"foot":0.3048,"feet":0.3048,
      // weight (to kg)
      "g":0.001,"kg":1,"oz":0.0283495,"lb":0.453592,"lbs":0.453592,"pound":0.453592,"pounds":0.453592,
      // volume (to liters)
      "ml":0.001,"l":1,"gal":3.78541,"floz":0.0295735
    };
    this._handler = function(e){
      var q = ((e && e.detail && e.detail.query) || "").trim().toLowerCase();
      var m = q.match(/^([\d.]+)\s*([a-z]+)\s+(?:to|in)\s+([a-z]+)$/);
      if(!m) return;
      var val = parseFloat(m[1]), from = m[2], to = m[3];
      // temperature special case
      var t = null;
      if((from==="c"||from==="f"||from==="k") && (to==="c"||to==="f"||to==="k")){
        var c = from==="c"?val : from==="f"?(val-32)*5/9 : val-273.15;
        t = to==="c"?c : to==="f"?c*9/5+32 : c+273.15;
        e.detail.results.unshift({type:"plugin",plugin:"converter",
          title: String(Math.round(t*100)/100)+" °"+to.toUpperCase(),
          snippet: m[1]+" °"+from.toUpperCase()+" =", url:""});
        return;
      }
      if(units[from] && units[to]){
        var out = val * units[from] / units[to];
        e.detail.results.unshift({type:"plugin",plugin:"converter",
          title: String(Math.round(out*10000)/10000)+" "+m[3],
          snippet: m[1]+" "+m[2]+" =", url:""});
      }
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 3. QR Code ---------- */
ZP.register({
  id: "qrcode",
  name: "QR Code",
  desc: "Type 'qr hello' to generate a QR code instantly",
  icon: svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><line x1="14" y1="14" x2="21" y2="14"/><line x1="14" y1="18" x2="18" y2="18"/><line x1="18" y1="18" x2="21" y2="21"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      var q = ((e && e.detail && e.detail.query) || "").trim();
      var m = q.match(/^qr\s+(.+)$/i);
      if(!m) return;
      var data = encodeURIComponent(m[1]);
      e.detail.results.unshift({type:"plugin",plugin:"qrcode",
        title: "QR code for: " + m[1].slice(0, 60),
        snippet: '<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data='+data+'" alt="QR code" style="width:180px;height:180px;border-radius:8px">',
        url:"", html:true});
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 4. Timer ---------- */
var _timerInt = null;
ZP.register({
  id: "timer",
  name: "Timer",
  desc: "Type 'timer 5 min' for a countdown with an alarm",
  icon: svg('<circle cx="12" cy="13" r="8"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="9" y1="2" x2="15" y2="2"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      var q = ((e && e.detail && e.detail.query) || "").trim().toLowerCase();
      var m = q.match(/^timer\s+(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?$/);
      if(!m) return;
      var n = parseInt(m[1],10), unit = m[2]||"m";
      var secs = /h/.test(unit)?n*3600 : /s/.test(unit)?n : n*60;
      if(_timerInt) clearInterval(_timerInt);
      var end = Date.now() + secs*1000;
      var label = n+" "+(unit[0]==="h"?"hour(s)":unit[0]==="s"?"second(s)":"minute(s)");
      e.detail.results.unshift({type:"plugin",plugin:"timer",
        title: "Timer set: "+label,
        snippet: '<span id="zp-timer" style="font-size:28px;font-weight:700">--:--</span>',
        url:"", html:true});
      setTimeout(function(){
        var el = document.getElementById("zp-timer");
        if(!el) return;
        _timerInt = setInterval(function(){
          var left = Math.max(0, Math.round((end-Date.now())/1000));
          var mm = Math.floor(left/60), ss = left%60;
          el.textContent = mm+":"+String(ss).padStart(2,"0");
          if(left<=0){
            clearInterval(_timerInt);
            try{ new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQn+Gq7yOeA==").play(); }catch(err){}
            el.textContent = "Done!";
          }
        }, 500);
      }, 100);
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
    if(_timerInt){ clearInterval(_timerInt); _timerInt = null; }
  }
});

/* ---------- 5. Word Counter ---------- */
ZP.register({
  id: "wordcount",
  name: "Word Counter",
  desc: "Type 'count: your text here' to count words and characters",
  icon: svg('<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      var q = ((e && e.detail && e.detail.query) || "");
      var m = q.match(/^count:\s*(.+)$/is);
      if(!m) return;
      var t = m[1].trim();
      var words = t.split(/\s+/).filter(Boolean).length;
      e.detail.results.unshift({type:"plugin",plugin:"wordcount",
        title: words+" words · "+t.length+" characters",
        snippet: "Text analyzed", url:""});
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

/* ---------- 6. Color Picker ---------- */
ZP.register({
  id: "colors",
  name: "Color Tools",
  desc: "Type 'color #a8894e' for hex/RGB/HSL values and preview",
  icon: svg('<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.4" fill="currentColor"/><circle cx="14" cy="9" r="1.4" fill="currentColor"/><circle cx="10" cy="15" r="1.4" fill="currentColor"/>'),
  _handler: null,
  onEnable: function(){
    this._handler = function(e){
      var q = ((e && e.detail && e.detail.query) || "").trim();
      var m = q.match(/^color\s+#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
      if(!m) return;
      var h = m[1].length===3 ? m[1].split("").map(function(c){return c+c;}).join("") : m[1];
      var r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
      e.detail.results.unshift({type:"plugin",plugin:"colors",
        title: "#"+h.toUpperCase(),
        snippet: '<span style="display:inline-block;width:44px;height:44px;border-radius:10px;background:#'+h+';vertical-align:middle;margin-right:10px;border:1px solid rgba(0,0,0,.15)"></span>RGB('+r+', '+g+', '+b+')',
        url:"", html:true});
    };
    document.addEventListener("zero-search-query", this._handler);
  },
  onDisable: function(){
    if(this._handler) document.removeEventListener("zero-search-query", this._handler);
    this._handler = null;
  }
});

})();
