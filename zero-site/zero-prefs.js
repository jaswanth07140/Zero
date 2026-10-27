/* ============ Zero shared preferences: skills + schedules (100% client-side) ============
   Skills: on/off toggles for Zero's capabilities, localStorage "zero-skills-v1".
   Schedules: on-open digest schedules, localStorage "zero-schedules-v1".
   Nothing is ever sent to any server. All getters fail safe (defaults = all on). */
window.ZeroPrefs = (function(){
  "use strict";
  var SKILLS_KEY = "zero-skills-v1";
  var SCHED_KEY  = "zero-schedules-v1";
  var DEFAULT_SKILLS = {
    websearch: true,   // AI checks the live web for current facts (Zero AI chat)
    computer:  true,    // "computer:" mode drives your browser via the extension
    notebooks: true,    // Study notebooks in Zero AI
    mail:      true,    // Zero Mail send-only flow in Zero AI
    camera:    true,    // Camera / scan button on the homepage
    aisuggest: true     // AI-powered search suggestions as you type
  };
  function lsGet(k, d){
    try{ var v = localStorage.getItem(k); return (v === null || v === undefined) ? d : JSON.parse(v); }
    catch(e){ return d; }
  }
  function lsSet(k, v){
    try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){}
  }
  function getSkills(){
    var s = lsGet(SKILLS_KEY, null), out = {}, k;
    for(k in DEFAULT_SKILLS) out[k] = DEFAULT_SKILLS[k];
    if(s && typeof s === "object"){
      for(k in out){ if(typeof s[k] === "boolean") out[k] = s[k]; }
    }
    return out;
  }
  function skillOn(name){
    var s = getSkills();
    return (name in s) ? !!s[name] : true;
  }
  function setSkill(name, on){
    if(!(name in DEFAULT_SKILLS)) return;
    var s = getSkills(); s[name] = !!on; lsSet(SKILLS_KEY, s);
  }
  /* ---------- schedules ---------- */
  function uid(){
    return "sch" + Date.now().toString(36) + Math.floor(Math.random()*1e6).toString(36);
  }
  function getSchedules(){
    var s = lsGet(SCHED_KEY, []);
    return Array.isArray(s) ? s : [];
  }
  function saveSchedules(list){
    lsSet(SCHED_KEY, Array.isArray(list) ? list : []);
  }
  function todayStr(d){
    d = d || new Date();
    function p(n){ return ("0"+n).slice(-2); }
    return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate());
  }
  function hhmm(d){
    d = d || new Date();
    function p(n){ return ("0"+n).slice(-2); }
    return p(d.getHours()) + ":" + p(d.getMinutes());
  }
  /* Schedules due right now: enabled, scheduled time already passed today,
     and not already run today. Capped at 3 per call. */
  function dueSchedules(now){
    now = now || new Date();
    var nowHM = hhmm(now), today = todayStr(now), out = [];
    var list = getSchedules();
    for(var i=0;i<list.length && out.length<3;i++){
      var s = list[i];
      if(s && s.enabled && s.timeHHMM && s.timeHHMM <= nowHM && s.lastRun !== today) out.push(s);
    }
    return out;
  }
  /* Mark a schedule as run TODAY. Call when generation STARTS so a failed
     generation never retry-loops on the next page load. */
  function markRun(id){
    var list = getSchedules(), hit = false, today = todayStr();
    for(var i=0;i<list.length;i++){
      if(list[i] && list[i].id === id){ list[i].lastRun = today; hit = true; }
    }
    if(hit) saveSchedules(list);
  }
  return {
    DEFAULT_SKILLS: DEFAULT_SKILLS,
    getSkills: getSkills,
    skillOn: skillOn,
    setSkill: setSkill,
    getSchedules: getSchedules,
    saveSchedules: saveSchedules,
    dueSchedules: dueSchedules,
    markRun: markRun,
    todayStr: todayStr,
    uid: uid
  };
})();
