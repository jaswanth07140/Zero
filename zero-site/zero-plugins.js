/* Zero Plugins — lightweight plugin system for the Zero homepage.
   Plugins are toggleable features that enhance search or add tools.
   Enabled state persists in localStorage (zero-plugins-enabled).
   Each plugin: {id, name, desc, icon(svg), onEnable(), onDisable()} */
(function(){
"use strict";

var STORE_KEY = "zero-plugins-enabled";

window.ZeroPlugins = window.ZeroPlugins || {};
var ZP = window.ZeroPlugins;

ZP.registry = {};
ZP.enabled = {};

// Register a plugin
ZP.register = function(def){
  if(!def || !def.id) return;
  ZP.registry[def.id] = def;
};

// Load enabled set from storage
ZP.load = function(){
  try{
    var raw = localStorage.getItem(STORE_KEY);
    if(raw){
      var arr = JSON.parse(raw);
      if(Array.isArray(arr)){
        arr.forEach(function(id){ if(ZP.registry[id]) ZP.enabled[id] = true; });
      }
    }
  }catch(e){}
};

// Save enabled set
ZP.save = function(){
  try{
    localStorage.setItem(STORE_KEY, JSON.stringify(Object.keys(ZP.enabled)));
  }catch(e){}
};

ZP.isEnabled = function(id){ return !!ZP.enabled[id]; };

ZP.enable = function(id){
  var p = ZP.registry[id];
  if(!p || ZP.enabled[id]) return false;
  ZP.enabled[id] = true;
  try{ if(typeof p.onEnable === "function") p.onEnable(); }catch(e){}
  ZP.save();
  ZP.render();
  return true;
};

ZP.disable = function(id){
  var p = ZP.registry[id];
  if(!p || !ZP.enabled[id]) return false;
  delete ZP.enabled[id];
  try{ if(typeof p.onDisable === "function") p.onDisable(); }catch(e){}
  ZP.save();
  ZP.render();
  return true;
};

ZP.toggle = function(id){
  return ZP.isEnabled(id) ? ZP.disable(id) : ZP.enable(id);
};

// Boot enabled plugins (called after all plugins registered)
ZP.boot = function(){
  ZP.load();
  Object.keys(ZP.enabled).forEach(function(id){
    var p = ZP.registry[id];
    if(p){ try{ if(typeof p.onEnable === "function") p.onEnable(); }catch(e){} }
  });
};

// Render the plugin browser panel
ZP.render = function(){
  var list = document.getElementById("pluginList");
  if(!list) return;
  list.innerHTML = "";
  var ids = Object.keys(ZP.registry).sort(function(a,b){
    return ZP.registry[a].name.localeCompare(ZP.registry[b].name);
  });
  if(!ids.length){
    list.innerHTML = '<div class="plugin-empty">No plugins available yet.</div>';
    return;
  }
  ids.forEach(function(id){
    var p = ZP.registry[id];
    var on = ZP.isEnabled(id);
    var row = document.createElement("div");
    row.className = "plugin-row" + (on ? " on" : "");
    row.innerHTML =
      '<div class="plugin-icon">' + (p.icon || "🧩") + "</div>" +
      '<div class="plugin-meta"><div class="plugin-name">' + escapeHtml(p.name) + "</div>" +
      '<div class="plugin-desc">' + escapeHtml(p.desc || "") + "</div></div>" +
      '<button class="plugin-toggle" data-pid="' + escapeHtml(id) + '" aria-label="' + (on ? "Disable " : "Enable ") + escapeHtml(p.name) + '">' +
      (on ? "✓" : "+") + "</button>";
    list.appendChild(row);
  });
  list.querySelectorAll(".plugin-toggle").forEach(function(btn){
    btn.addEventListener("click", function(e){
      e.stopPropagation();
      ZP.toggle(btn.getAttribute("data-pid"));
    });
  });
  var count = document.getElementById("pluginCount");
  if(count){
    var n = Object.keys(ZP.enabled).length;
    count.textContent = n ? n + " enabled" : "Browse plugins";
  }
};

function escapeHtml(s){
  return String(s==null?"":s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}

// Panel open/close
ZP.openPanel = function(){
  var p = document.getElementById("pluginPanel");
  if(p){ p.removeAttribute("hidden"); ZP.render(); }
};
ZP.closePanel = function(){
  var p = document.getElementById("pluginPanel");
  if(p) p.setAttribute("hidden", "");
};
ZP.togglePanel = function(){
  var p = document.getElementById("pluginPanel");
  if(!p) return;
  if(p.hasAttribute("hidden")) ZP.openPanel(); else ZP.closePanel();
};

})();
