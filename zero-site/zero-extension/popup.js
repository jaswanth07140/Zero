async function init(){
  const s = await chrome.storage.local.get(["zc_key","zc_last","zc_status"]);
  const keyEl = document.getElementById("key");
  keyEl.textContent = s.zc_key || "(no key yet — reload the extension)";
  const copy = () => {
    if(!s.zc_key) return;
    navigator.clipboard.writeText(s.zc_key).then(()=>{ keyEl.textContent = "Copied!"; setTimeout(()=>{keyEl.textContent=s.zc_key;},1200); });
  };
  keyEl.addEventListener("click", copy);
  document.getElementById("copy").addEventListener("click", copy);
  const idEl = document.getElementById("extid");
  const extId = (chrome.runtime && chrome.runtime.id) || "";
  idEl.textContent = extId || "(unavailable)";
  idEl.addEventListener("click", () => { if(extId) navigator.clipboard.writeText(extId); });
  const dot = document.getElementById("dot"), st = document.getElementById("status");
  if (s.zc_status === "ok" && s.zc_last) {
    const ago = Math.round((Date.now() - s.zc_last)/1000);
    dot.classList.add("ok");
    st.textContent = "Connected — last check " + ago + "s ago";
  } else if (s.zc_status === "offline") {
    st.textContent = "Offline — can't reach zero.page.gd right now";
  } else {
    st.textContent = "Starting up…";
  }
}
init();
