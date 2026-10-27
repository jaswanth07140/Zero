"use strict";
try{localStorage.removeItem("zero-profile-v1");}catch(e){} /* privacy: wipe any previously stored learning data */
try{localStorage.removeItem("sk_chats_v1");}catch(e){} /* user removed chat history: wipe any stored chats */
/* Zero Sidekick v1.1.0 — native side panel. No iframe.
   All AI traffic goes through the token-gated relay:
   https://zero.page.gd/panel-api.php  (X-Zero-Panel + X-Zero-Target headers). */
var RELAY="https://zero.page.gd/panel-api.php";
var PANEL_TOKEN="ffnfuWKQVd-iMpNLZcgJhP-V0oyZW3Ab0rpQE0AIbU4";
function relayHeaders(target,json){
  var h={"X-Zero-Panel":PANEL_TOKEN,"X-Zero-Target":target};
  if(json)h["Content-Type"]="application/json";
  return h;
}

/* ================= Zero lineup (self-update) — slim mirror ================= */
window.ZeroLineup=(function(){
  var CK="zero-lineup-v1",SK="zero-lineup-sig",TTL=86400000,live=null;
  function sigOf(lu){return lu.map(function(p){return p.provider+":"+(p.models||[]).join(",");}).join("|");}
  function adopt(lu){live={};lu.forEach(function(p){if(p&&p.provider){live[String(p.provider)]=(p.models||[]).map(String);}});}
  function has(p,m){return !!(live&&live[p]&&live[p].indexOf(m)>=0);}
  function pick(p,m){return has(p,m)?{provider:p,model:m,temp:0.7}:null;}
  function sets(){
    if(!live)return null;
    var s={fast:[],balanced:[],deep:[]},i,pm,x;
    var fastP=[["groq","openai/gpt-oss-20b"],["pollinations","openai"],["groq","qwen/qwen3.8-27b"]];
    var balP=[["groq","openai/gpt-oss-120b"],["groq","openai/gpt-oss-20b"],["groq","qwen/qwen3.8-27b"],["cerebras","gpt-oss-120b"],["cerebras","qwen-3-32b"],["openrouter","meta-llama/llama-3.3-70b-instruct:free"],["mistral","mistral-small-latest"],["pollinations","openai"]];
    for(i=0;i<fastP.length;i++){pm=fastP[i];x=pick(pm[0],pm[1]);if(x)s.fast.push(x);}
    for(i=0;i<balP.length;i++){pm=balP[i];x=pick(pm[0],pm[1]);if(x)s.balanced.push(x);}
    Object.keys(live).forEach(function(p){live[p].forEach(function(m){s.deep.push({provider:p,model:m,temp:0.7});});});
    return s;
  }
  function toastSafe(m){toast(m);}
  function refresh(){
    var cached=null;
    try{cached=JSON.parse(localStorage.getItem(CK));}catch(e){}
    var fresh=cached&&cached.ts&&(Date.now()-cached.ts)<TTL&&cached.lineup;
    if(fresh){adopt(cached.lineup);return;}
    if(cached&&cached.lineup)adopt(cached.lineup);
    fetchT(RELAY,{method:"GET",headers:relayHeaders("lineup")},15000).then(function(r){return r.json();}).then(function(d){
      if(!d||d.ok!==true||!d.lineup||!d.lineup.length)return;
      var sig=sigOf(d.lineup),prev=null;
      try{prev=localStorage.getItem(SK);}catch(e){}
      adopt(d.lineup);
      try{localStorage.setItem(CK,JSON.stringify({ts:Date.now(),lineup:d.lineup}));localStorage.setItem(SK,sig);}catch(e){}
      if(prev&&prev!==sig)toastSafe("Zero refreshed its AI lineup");
    }).catch(function(){});
  }
  try{refresh();}catch(e){}
  return{sets:sets,refresh:refresh};
})();

/* ================= helpers ================= */
function $(id){return document.getElementById(id);}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
var toastT=null;
function toast(m){var t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove("show");},2600);}
/* Tiny safe syntax highlighter for fenced code blocks (no library).
   Input is already HTML-escaped, so wrapping tokens in spans can't break markup.
   Copy button uses innerText, so spans don't affect copied code. */
function skHL(code,lang){
  var L=String(lang||"").toLowerCase();
  var fam={js:"c",javascript:"c",jsx:"c",ts:"c",typescript:"c",json:"c",java:"c",
    c:"c",h:"c",cpp:"c","c++":"c",cc:"c",cs:"c","c#":"c",go:"c",rust:"c",rs:"c",
    php:"c",swift:"c",kotlin:"c",kt:"c",scala:"c",dart:"c",
    py:"h",python:"h",rb:"h",ruby:"h",sh:"h",bash:"h",zsh:"h",fish:"h",
    yml:"h",yaml:"h",toml:"h",ini:"h",sql:"s"}[L];
  if(!fam)return code;
  var KW={
    c:"break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|function|if|implements|import|in|instanceof|interface|let|new|null|package|private|protected|public|return|static|super|switch|this|throw|true|false|try|typeof|undefined|var|void|while|with|yield|async|await|of|struct|sizeof|typedef|namespace|using|virtual|override|self",
    h:"False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|self|do|done|then|fi|esac|echo|exit|end|require|include|local|function",
    s:"select|from|where|and|or|not|insert|into|values|update|set|delete|create|table|join|left|right|inner|outer|on|group|by|order|having|limit|as|distinct|union|all|like|is|null|primary|key|index|view|alter|drop|count|sum|avg|min|max"
  }[fam];
  var str="(&quot;(?:[^&]|&(?!quot;))*?&quot;|'[^'\\n]*?'|`[^`\\n]*?`)";
  var num="\\b(\\d+(?:\\.\\d+)?)\\b";
  var kwd="\\b("+KW+")\\b";
  var re=fam==="c"?new RegExp("(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|"+str+"|"+num+"|"+kwd,"g")
        :fam==="h"?new RegExp("(#[^\\n]*)|"+str+"|"+num+"|"+kwd,"g")
        :new RegExp("(--[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|"+str+"|"+num+"|"+kwd,"gi"); // SQL is case-insensitive
  return code.replace(re,function(m,com,st,nu,kw){
    if(com)return '<span class="tok-c">'+com+'</span>';
    if(st)return '<span class="tok-s">'+st+'</span>';
    if(nu)return '<span class="tok-n">'+nu+'</span>';
    return '<span class="tok-k">'+kw+'</span>';
  });
}
/* Editorial markdown renderer (v3.1.0) — neat, organized answers:
   real headings, porcelain tables, callouts, nested lists, code headers. */
function md(src){
  // Extract graph/email blocks BEFORE escaping, so their JSON stays valid.
  var _graph=[],_email=[];
  src=src.replace(/```graph[ \t]*\n?([\s\S]*?)```/g,function(m,j){_graph.push(j.trim());return "\n GRAPH"+(_graph.length-1)+" \n";});
  src=src.replace(/```email[ \t]*\n?([\s\S]*?)```/g,function(m,j){_email.push(j.trim());return "\n EMAIL"+(_email.length-1)+" \n";});
  var h=esc(src);
  var _urls=[];
  h=h.replace(/(https?:\/\/[^\s<")]+)/g,function(m){_urls.push(m);return " URL"+(_urls.length-1)+" ";});
  function unurl(s){return s.replace(/ URL(\d+) /g,function(m,i){return _urls[parseInt(i,10)]||m;});}
  function linkify(s){return s.replace(/ URL(\d+) /g,function(m,i){var u=_urls[parseInt(i,10)];return '<a href="'+u+'" target="_blank" rel="noopener">'+u+'</a>';});}
  function inline(s){
    s=s.replace(/`([^`\n]+)`/g,"<code>$1</code>");
    s=s.replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>");
    s=s.replace(/(^|[^*\w])\*([^*\n]+)\*/g,"$1<i>$2</i>");
    return linkify(s);
  }
  var _code=[];
  function _pushCode(l,c){_code.push({l:l,c:unurl(c.replace(/^\n+|\n+$/g,""))});return "\n CODE"+(_code.length-1)+" \n";}
  h=h.replace(/```[ \t]*(\w*)[ \t]*\n([\s\S]*?)```/g,function(m,l,c){return _pushCode(l,c);});
  // Unclosed fence (AI forgot the closing ```): treat the rest as a code block
  // instead of dumping raw backticks into the message.
  h=h.replace(/```[ \t]*(\w*)[ \t]*\n([\s\S]*)$/,function(m,l,c){return _pushCode(l,c);});
  function codeBlock(cb){
    var n=cb.c.split("\n").length;
    var pre="<pre><code>"+skHL(cb.c,cb.l)+"</code></pre>";
    if(n>24)pre='<details class="sk-code-long"><summary>Show code ('+n+' lines)</summary>'+pre+"</details>";
    return '<div class="sk-code"><div class="sk-code-h"><span>'+esc(cb.l||"code")+'</span><button class="sk-code-c" data-codebtn="1">Copy</button></div>'+pre+"</div>";
  }
  function listBlock(ls){
    var items=ls.map(function(l){
      var m=l.match(/^(\s*)([-*]|\d+\.)\s+([\s\S]*)$/);
      var lvl=Math.min(4,Math.floor(m[1].replace(/\t/g,"  ").length/2));
      var ord=/\d/.test(m[2]),c=m[3],check=null;
      var cm=c.match(/^\[( ?[xX]?)\]\s+([\s\S]*)$/);
      if(cm){check=cm[1].toLowerCase()==="x";c=cm[2];}
      return {lvl:lvl,ord:ord,check:check,html:inline(c)};
    });
    var out="",stack=[];
    function open(t,l){out+="<"+t+">";stack.push({tag:t,lvl:l});}
    items.forEach(function(it){
      var tag=it.ord?"ol":"ul";
      if(!stack.length){open(tag,0);out+="<li>";}
      else{
        var top=stack[stack.length-1];
        if(it.lvl>top.lvl){open(tag,it.lvl);out+="<li>";}
        else{
          while(stack.length&&stack[stack.length-1].lvl>it.lvl){out+="</li></"+stack.pop().tag+">";}
          top=stack[stack.length-1];
          if(top.tag!==tag){out+="</li></"+stack.pop().tag+">";open(tag,it.lvl);out+="<li>";}
          else{out+="</li><li>";}
        }
      }
      if(it.check!==null)out+='<label class="sk-check"><input type="checkbox"'+(it.check?" checked":"")+' disabled><span>'+it.html+"</span></label>";
      else out+=it.html;
    });
    while(stack.length){out+="</li></"+stack.pop().tag+">";}
    return out;
  }
  var lines=h.split("\n"),out=[],i=0;
  function isRow(l){return /^\s*\|.*\|\s*$/.test(l);}
  function isItem(l){return /^\s*(?:[-*]|\d+\.)\s+/.test(l);}
  function isQuote(l){return /^\s*&gt;/.test(l);}
  function isHead(l){return /^\s*#{1,4}\s/.test(l);}
  function isHr(l){return /^\s*---+\s*$/.test(l);}
  function isCode(l){return /^\s* CODE\d+ \s*$/.test(l);}
  function isGraph(l){return /^\s* GRAPH\d+ \s*$/.test(l);}
  function isEmail(l){return /^\s* EMAIL\d+ \s*$/.test(l);}
  while(i<lines.length){
    var ln=lines[i];
    if(!ln.trim()){i++;continue;}
    var hm=ln.match(/^\s*(#{1,4})\s*(.+)$/);
    if(hm){
      var htag=hm[1].length>=4?"h4":hm[1].length===3?"h3":"h2";
      out.push("<"+htag+' class="sk-h">'+inline(hm[2].trim())+"</"+htag+">");i++;continue;
    }
    if(isHr(ln)){out.push('<hr class="sk-hr">');i++;continue;}
    var gm=ln.match(/ GRAPH(\d+) /);
    if(gm&&isGraph(ln)){out.push(skGraphBlock(_graph[parseInt(gm[1],10)]));i++;continue;}
    var em=ln.match(/ EMAIL(\d+) /);
    if(em&&isEmail(ln)){out.push(skEmailCard(_email[parseInt(em[1],10)]));i++;continue;}
    var cm=ln.match(/ CODE(\d+) /);
    if(cm&&isCode(ln)){out.push(codeBlock(_code[parseInt(cm[1],10)]));i++;continue;}
    if(isRow(ln)&&i+1<lines.length&&/^\s*\|[\s:|\-]+\|\s*$/.test(lines[i+1])){
      var head=ln.trim().split("|").slice(1,-1).map(function(c){return inline(c.trim());});
      i+=2;var rows=[];
      while(i<lines.length&&isRow(lines[i])){rows.push(lines[i].trim().split("|").slice(1,-1).map(function(c){return inline(c.trim());}));i++;}
      out.push('<div class="sk-twrap"><table class="sk-t"><thead><tr>'+head.map(function(c){return "<th>"+c+"</th>";}).join("")+"</tr></thead><tbody>"+
        rows.map(function(r){return "<tr>"+r.map(function(c){return "<td>"+c+"</td>";}).join("")+"</tr>";}).join("")+"</tbody></table></div>");
      continue;
    }
    if(isQuote(ln)){
      var qs=[];
      while(i<lines.length&&isQuote(lines[i])){qs.push(lines[i].replace(/^\s*&gt;\s?/,""));i++;}
      out.push('<div class="sk-callout">'+qs.map(function(q){return "<p>"+inline(q)+"</p>";}).join("")+"</div>");
      continue;
    }
    if(isItem(ln)){
      var ls=[];
      while(i<lines.length&&isItem(lines[i])){ls.push(lines[i]);i++;}
      out.push(listBlock(ls));
      continue;
    }
    var ps=[];
    while(i<lines.length&&lines[i].trim()&&!isItem(lines[i])&&!isQuote(lines[i])&&!isHead(lines[i])&&!isHr(lines[i])&&!isCode(lines[i])&&!isGraph(lines[i])&&!isEmail(lines[i])){ps.push(lines[i]);i++;}
    out.push("<p>"+ps.map(inline).join("<br>")+"</p>");
  }
  return out.join("");
}
function skCopyCode(btn){
  try{
    var code=btn.closest(".sk-code").querySelector("code").innerText||"";
    function done(){btn.textContent="Copied ✓";setTimeout(function(){btn.textContent="Copy";},1400);}
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(code).then(done,done);
    else done();
  }catch(e){}
}
/* ================= graphs (v3.2.0) =================
   The AI emits ```graph fenced blocks with one-line JSON; this renders
   them as styled SVG (functions, bars, lines). No libraries, no eval of
   raw text — the math goes through a tiny validated tokenizer. */
var _skGraphN=0;
/* Safe math compiler: validated tokenizer + AST interpreter.
   No eval, no new Function — clean under the extension CSP. */
function skCompileFn(expr){
  var FN={sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,
    sqrt:Math.sqrt,abs:Math.abs,ln:Math.log,log:Math.log10,exp:Math.exp,floor:Math.floor,
    ceil:Math.ceil,round:Math.round,max:Math.max,min:Math.min,pow:Math.pow};
  var s=String(expr||"").toLowerCase().replace(/\s+/g,"").replace(/\^/g,"**");
  if(!s)throw new Error("empty");
  var toks=[],i=0;
  function isD(c){return (c>="0"&&c<="9")||c===".";}
  while(i<s.length){
    var c=s[i];
    if(isD(c)){var n="";while(i<s.length&&isD(s[i]))n+=s[i++];if(!/[0-9]/.test(n))throw new Error("bad number");toks.push({t:"n",v:n});continue;}
    if(c==="x"){toks.push({t:"x"});i++;continue;}
    if(c>="a"&&c<="z"){var w="";while(i<s.length&&s[i]>="a"&&s[i]<="z")w+=s[i++];
      if(w==="pi"){toks.push({t:"n",v:"Math.PI"});continue;}
      if(w==="e"){toks.push({t:"n",v:"Math.E"});continue;}
      if(!FN[w])throw new Error("unknown fn "+w);
      toks.push({t:"f",v:w});continue;}
    if("+-*/()".indexOf(c)>=0){if(c==="*"&&s[i+1]==="*"){toks.push({t:"o",v:"**"});i+=2;continue;}toks.push({t:"o",v:c});i++;continue;}
    if(c===","){toks.push({t:"o",v:","});i++;continue;}
    throw new Error("bad char");
  }
  if(!toks.length)throw new Error("empty");
  var out=[];
  function isVal(t){return t&&(t.t==="n"||t.t==="x"||(t.t==="o"&&t.v===")"));}
  function startsVal(t){return t&&(t.t==="n"||t.t==="x"||t.t==="f"||(t.t==="o"&&t.v==="("));}
  for(var k=0;k<toks.length;k++){out.push(toks[k]);if(isVal(toks[k])&&startsVal(toks[k+1]))out.push({t:"o",v:"*"});}
  var p=0;
  function peek(){return out[p];}
  function next(){return out[p++];}
  function parseE(){var l=parseT();for(;;){var t=peek();if(t&&t.t==="o"&&(t.v==="+"||t.v==="-")){next();var r=parseT();l={op:t.v,a:l,b:r};}else return l;}}
  function parseT(){var l=parseU();for(;;){var t=peek();if(t&&t.t==="o"&&(t.v==="*"||t.v==="/")){next();var r=parseU();l={op:t.v,a:l,b:r};}else return l;}}
  function parseF(){var l=parseP();var t=peek();if(t&&t.t==="o"&&t.v==="**"){next();var r=parseU();l={op:"**",a:l,b:r};}return l;}
  function parseU(){var t=peek();if(t&&t.t==="o"&&(t.v==="+"||t.v==="-")){next();var v=parseU();return t.v==="+"?v:{op:"neg",a:v};}return parseF();}
  function parseP(){
    var t=next();
    if(!t)throw new Error("unexpected end");
    if(t.t==="n")return{num:(t.v==="Math.PI")?Math.PI:(t.v==="Math.E"?Math.E:parseFloat(t.v))};
    if(t.t==="x")return{x:1};
    if(t.t==="f"){
      var o=next();if(!o||o.t!=="o"||o.v!=="(")throw new Error("fn needs (");
      var args=[];
      if(!(peek()&&peek().t==="o"&&peek().v===")")){for(;;){args.push(parseE());var c2=peek();if(c2&&c2.t==="o"&&c2.v===","){next();continue;}break;}}
      var cl=next();if(!cl||cl.t!=="o"||cl.v!==")")throw new Error("fn needs )");
      return{fn:t.v,args:args};
    }
    if(t.t==="o"&&t.v==="("){var e=parseE();var cl2=next();if(!cl2||cl2.t!=="o"||cl2.v!==")")throw new Error("parens");return e;}
    throw new Error("syntax");
  }
  var ast=parseE();
  if(p<out.length)throw new Error("trailing input");
  function ev(n,x){
    if(n.num!==undefined)return n.num;
    if(n.x)return x;
    if(n.fn){var f=FN[n.fn];if(!f)throw new Error("fn");return f.apply(null,n.args.map(function(a){return ev(a,x);}));}
    if(n.op==="neg")return -ev(n.a,x);
    var a=ev(n.a,x),b=ev(n.b,x);
    switch(n.op){case "+":return a+b;case "-":return a-b;case "*":return a*b;case "/":return a/b;case "**":return Math.pow(a,b);}
    throw new Error("op");
  }
  return function(x){return ev(ast,x);};
}

function skTickFmt(v){
  if(v===0)return "0";
  var a=Math.abs(v);
  if(a>=10000||(a<0.001&&a>0))return v.toExponential(1).replace("e","×10^");
  return String(parseFloat(v.toPrecision(3)));
}
function skGraphBlock(raw){
  function fallback(msg){
    return '<div class="sk-graph"><div class="sk-graph-t">Graph'+(msg?' <span style="color:var(--muted);font-weight:400">· '+esc(msg)+"</span>":"")+
      '</div><div style="padding:2px 15px 13px;font-size:12px;color:var(--muted)">Couldn\'t draw this one — the numbers didn\'t parse.</div></div>';
  }
  var d=null;
  try{d=JSON.parse(raw);}catch(e){return fallback();}
  if(!d||typeof d!=="object")return fallback();
  var gid="skg"+(++_skGraphN);
  var W=340,H=238,PL=36,PR=10,PT=10,PB=26,iw=W-PL-PR,ih=H-PT-PB;
  var title=esc(String(d.title||""));
  function wrap(inner){
    return '<div class="sk-graph">'+(title?'<div class="sk-graph-t">'+title+"</div>":"")+
      '<svg viewBox="0 0 '+W+" "+H+'" role="img" aria-label="'+title+'">'+inner+"</svg></div>";
  }
  function grid(x0,x1,y0,y1,X,Y){
    var s="";
    for(var i=0;i<=4;i++){
      var gx=x0+(x1-x0)*i/4,gy=y0+(y1-y0)*i/4;
      s+='<line class="g-grid" x1="'+X(gx).toFixed(1)+'" y1="'+PT+'" x2="'+X(gx).toFixed(1)+'" y2="'+(PT+ih)+'"/>';
      s+='<line class="g-grid" x1="'+PL+'" y1="'+Y(gy).toFixed(1)+'" x2="'+(PL+iw)+'" y2="'+Y(gy).toFixed(1)+'"/>';
      s+='<text class="g-tick" x="'+(X(gx)-9).toFixed(1)+'" y="'+(PT+ih+16)+'">'+skTickFmt(gx)+"</text>";
      s+='<text class="g-tick" x="4" y="'+(Y(gy)+3).toFixed(1)+'">'+skTickFmt(gy)+"</text>";
    }
    return s;
  }
  function axes(x0,x1,y0,y1,X,Y){
    var s="";
    if(y0<0&&y1>0)s+='<line class="g-axis" x1="'+PL+'" y1="'+Y(0).toFixed(1)+'" x2="'+(PL+iw)+'" y2="'+Y(0).toFixed(1)+'"/>';
    if(x0<0&&x1>0)s+='<line class="g-axis" x1="'+X(0).toFixed(1)+'" y1="'+PT+'" x2="'+X(0).toFixed(1)+'" y2="'+(PT+ih)+'"/>';
    return s;
  }
  /* ---- y = f(x) ---- */
  if(d.kind==="function"||d.fn){
    var f;
    try{f=skCompileFn(d.fn);}catch(e){return fallback("bad formula");}
    var xr=d.x||[-6,6],xmin=xr[0],xmax=xr[1];
    if(!(xmin<xmax))return fallback("bad x range");
    var N=140,pts=[],i;
    for(i=0;i<=N;i++){var x=xmin+(xmax-xmin)*i/N,y;
      try{y=f(x);}catch(e){y=NaN;}
      pts.push(isFinite(y)&&Math.abs(y)<1e6?y:NaN);}
    var ys=pts.filter(isFinite);
    if(!ys.length)return fallback("nothing to plot");
    var ymin=Math.min.apply(null,ys),ymax=Math.max.apply(null,ys);
    if(ymin===ymax){ymin-=1;ymax+=1;}
    var pad=(ymax-ymin)*0.12;ymin-=pad;ymax+=pad;
    var X=function(x){return PL+(x-xmin)/(xmax-xmin)*iw;};
    var Y=function(y){return PT+ih-(y-ymin)/(ymax-ymin)*ih;};
    var path="",pen=false;
    for(i=0;i<pts.length;i++){
      if(!isFinite(pts[i])){pen=false;continue;}
      path+=(pen?"L":"M")+X(xmin+(xmax-xmin)*i/N).toFixed(1)+" "+Y(pts[i]).toFixed(1);
      pen=true;
    }
    var s=grid(xmin,xmax,ymin,ymax,X,Y)+axes(xmin,xmax,ymin,ymax,X,Y);
    s+='<path class="g-curve" d="'+path+'"/>';
    (d.points||[]).forEach(function(p){
      if(!p||!isFinite(p[0])||!isFinite(p[1]))return;
      var px=X(p[0]),py=Y(p[1]);
      if(px<PL-4||px>PL+iw+4||py<PT-4||py>PT+ih+4)return;
      s+='<circle class="g-pt" cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="4.5"/>';
      s+='<text class="g-plbl" x="'+(px+8).toFixed(1)+'" y="'+(py-7).toFixed(1)+'">('+skTickFmt(p[0])+", "+skTickFmt(p[1])+")</text>";
    });
    return wrap(s);
  }
  /* ---- bars ---- */
  if(d.kind==="bar"){
    var labels=(d.labels||[]).map(String),vals=d.values||[];
    if(!vals.length||!vals.every(isFinite))return fallback();
    var vmax=Math.max.apply(null,vals.concat([0])),vmin=Math.min.apply(null,vals.concat([0]));
    if(vmax===vmin)vmax+=1;
    var bw=iw/vals.length;
    var Xb=function(k){return PL+k/vals.length*iw;};
    var Yb=function(v){return PT+ih-(v-vmin)/(vmax-vmin)*ih;};
    var zeroY=Yb(0),g2,sg='<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d8bff"/><stop offset="1" stop-color="#0a5cf0"/></linearGradient></defs>';
    for(g2=0;g2<=4;g2++){var gv=vmin+(vmax-vmin)*g2/4;
      sg+='<line class="g-grid" x1="'+PL+'" y1="'+Yb(gv).toFixed(1)+'" x2="'+(PL+iw)+'" y2="'+Yb(gv).toFixed(1)+'"/>';
      sg+='<text class="g-tick" x="4" y="'+(Yb(gv)+3).toFixed(1)+'">'+skTickFmt(gv)+"</text>";}
    vals.forEach(function(v,k2){
      var bx=Xb(k2)+bw*0.18,bwid=bw*0.64,by=Math.min(Yb(v),zeroY),bh=Math.abs(Yb(v)-zeroY);
      sg+='<rect class="g-bar" x="'+bx.toFixed(1)+'" y="'+by.toFixed(1)+'" width="'+bwid.toFixed(1)+'" height="'+Math.max(bh,1.5).toFixed(1)+'" rx="4" fill="url(#'+gid+')"/>';
      sg+='<text class="g-plbl" text-anchor="middle" x="'+(bx+bwid/2).toFixed(1)+'" y="'+(by-5).toFixed(1)+'">'+esc(String(v))+"</text>";
      sg+='<text class="g-tick" text-anchor="middle" x="'+(bx+bwid/2).toFixed(1)+'" y="'+(PT+ih+16)+'">'+esc((labels[k2]||"").slice(0,10))+"</text>";
    });
    return wrap(sg);
  }
  /* ---- line / points ---- */
  if(d.kind==="line"){
    var Lpts=d.points||[];
    if(d.values)Lpts=d.values.map(function(v,k3){return [k3,v];});
    Lpts=Lpts.filter(function(p){return p&&isFinite(p[0])&&isFinite(p[1]);});
    if(Lpts.length<2)return fallback();
    var xs=Lpts.map(function(p){return p[0];}),ly=Lpts.map(function(p){return p[1];});
    var x0=Math.min.apply(null,xs),x1=Math.max.apply(null,xs);
    var y0=Math.min.apply(null,ly),y1=Math.max.apply(null,ly);
    if(x0===x1){x0-=1;x1+=1;} if(y0===y1){y0-=1;y1+=1;}
    x0-=(x1-x0)*0.06;x1+=(x1-x0)*0.06;y0-=(y1-y0)*0.12;y1+=(y1-y0)*0.12;
    var XL=function(x){return PL+(x-x0)/(x1-x0)*iw;};
    var YL=function(y){return PT+ih-(y-y0)/(y1-y0)*ih;};
    var s2=grid(x0,x1,y0,y1,XL,YL)+axes(x0,x1,y0,y1,XL,YL);
    s2+='<path class="g-curve" d="'+Lpts.map(function(p,k4){return (k4?"L":"M")+XL(p[0]).toFixed(1)+" "+YL(p[1]).toFixed(1);}).join("")+'"/>';
    Lpts.forEach(function(p){s2+='<circle class="g-pt" cx="'+XL(p[0]).toFixed(1)+'" cy="'+YL(p[1]).toFixed(1)+'" r="3.5"/>';});
    if(d.labels)d.labels.forEach(function(lb,k5){if(k5>=Lpts.length)return;var p=Lpts[k5];
      s2+='<text class="g-tick" text-anchor="middle" x="'+XL(p[0]).toFixed(1)+'" y="'+(PT+ih+16)+'">'+esc(String(lb).slice(0,10))+"</text>";});
    return wrap(s2);
  }
  return fallback("unknown graph kind");
}

/* ================= Zero Mail in the Sidekick (v3.3.0) =================
   The AI drafts the email and emits a ```email JSON block; the panel shows
   a review card. Nothing sends until the viewer presses "Send it".
   Sending goes through the viewer's own Gmail in a fresh tab of its own. */
var _skEmailN=0;
window._skEmails={};
function skEmailCard(raw){
  var d=null,parseErr=false;
  try{d=JSON.parse(raw);}catch(e){parseErr=true;}
  if(parseErr||!d||!d.to){
    // Never silently drop the AI's email — show the raw draft so nothing is lost.
    return '<div class="sk-email"><div class="sk-email-t">Email draft</div>'+
      '<div style="font-size:12px;color:var(--muted);margin-bottom:8px;line-height:1.5">I couldn\'t read the send details on this one, so here\'s the draft as written — copy it into Gmail yourself:</div>'+
      '<pre style="white-space:pre-wrap;font-size:12px;line-height:1.5;margin:0">'+esc(String(raw||"")).slice(0,2000)+'</pre></div>';
  }
  var n=(_skEmailN++);
  window._skEmails[n]={to:String(d.to||""),subject:String(d.subject||""),body:String(d.body||"")};
  return '<div class="sk-email" data-ecard="'+n+'"><div class="sk-email-t">Ready to send</div>'+
    '<label class="sk-email-l">To<input class="sk-email-f" data-ef="to" value="'+esc(String(d.to||""))+'" autocomplete="off"></label>'+
    '<label class="sk-email-l">Subject<input class="sk-email-f" data-ef="subject" value="'+esc(String(d.subject||""))+'" autocomplete="off"></label>'+
    '<label class="sk-email-l">Message<textarea class="sk-email-f" data-ef="body" rows="4">'+esc(String(d.body||""))+'</textarea></label>'+
    '<div class="sk-email-btns"><button class="sk-fchip" data-esend="'+n+'">Send it</button>'+
    '<button class="sk-fchip" data-egmail="'+n+'">Open in Gmail</button></div>'+
    '<div class="sk-email-note">You review everything above — nothing sends until you press <b>Send it</b>. Zero sends from your Gmail, in a tab of its own.</div>'+
    '<div class="sk-email-status" style="display:none"></div></div>';
}
function skEmailReadCard(n){
  var d=window._skEmails[n];if(!d)return null;
  var card=document.querySelector('.sk-email[data-ecard="'+n+'"]');
  if(card){
    var t=card.querySelector('[data-ef="to"]'),s=card.querySelector('[data-ef="subject"]'),b=card.querySelector('[data-ef="body"]');
    if(t)d.to=t.value.trim();if(s)d.subject=s.value;if(b)d.body=b.value;
  }
  return {d:d,card:card};
}
function skEmailStatus(card,msg,kind){
  if(!card)return;
  var el=card.querySelector(".sk-email-status");
  if(!el)return;
  el.style.display="block";
  el.textContent=msg;
  el.style.color=kind==="ok"?"var(--blue)":kind==="err"?"#c33":"var(--muted)";
}
function skEmailComposeUrl(d){
  return "https://mail.google.com/mail/?view=cm&fs=1"+
    "&to="+encodeURIComponent(d.to)+
    "&su="+encodeURIComponent(d.subject||"")+
    "&body="+encodeURIComponent(d.body||"");
}
function skEmailOpenGmail(n){
  var r=skEmailReadCard(n);if(!r||!r.d)return;
  try{chrome.tabs.create({url:skEmailComposeUrl(r.d),active:true});}catch(e){}
  toast("Gmail opened — press Send there when ready.");
}
async function skEmailSend(n){
  var r=skEmailReadCard(n);if(!r||!r.d)return;
  var d=r.d,card=r.card;
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.to||"")){
    skEmailStatus(card,"That email address doesn't look right — fix it above and try again.","err");return;
  }

  skEmailStatus(card,"Opening Gmail in a new tab…");
  var tab=null;
  try{tab=await new Promise(function(res){try{chrome.tabs.create({url:skEmailComposeUrl(d),active:true},function(t){res(t||null);});}catch(e){res(null);}});}catch(e){}
  if(!tab||!tab.id){skEmailStatus(card,"Couldn't open Gmail. Try again in a moment.","err");return;}
  try{await skWaitLoad(tab.id,15000);}catch(e){}
  // Not logged into Gmail? Bail out gracefully (never attempt a login).
  var login=null;
  try{
    var lr=await chrome.scripting.executeScript({target:{tabId:tab.id},func:function(){
      return /accounts\.google\.com/.test(location.href)||!!document.querySelector('input[type="email"]');
    }});
    login=lr&&lr[0]&&lr[0].result;
  }catch(e){}
  if(login){skEmailStatus(card,"You're not signed into Gmail in this browser — sign in on that tab, then press Send it again.","err");return;}
  // Wait for the compose window, then click its Send button.
  skEmailStatus(card,"Composing…");
  var clicked=false;
  for(var i=0;i<25;i++){
    try{
      var cr=await chrome.scripting.executeScript({target:{tabId:tab.id},func:function(){
        var btns=document.querySelectorAll('div[role="button"]');
        for(var k=0;k<btns.length;k++){
          var b=btns[k];
          var al=String(b.getAttribute("aria-label")||"");
          var tx=String(b.innerText||"").trim().toLowerCase();
          if(/^send/i.test(al)||tx==="send"){
            if(b.closest('div[role="dialog"]')||document.querySelector('div[aria-label*="New Message"]')){b.click();return "clicked";}
          }
        }
        return "waiting";
      }});
      if(cr&&cr[0]&&cr[0].result==="clicked"){clicked=true;break;}
    }catch(e){}
    await new Promise(function(rr){setTimeout(rr,1000);});
  }
  if(!clicked){skEmailStatus(card,"Gmail didn't show a compose window — the tab is still open, check it.","err");return;}
  // Confirm it actually went out.
  skEmailStatus(card,"Sending…");
  var ok=false;
  for(var j=0;j<12;j++){
    try{
      var vr=await chrome.scripting.executeScript({target:{tabId:tab.id},func:function(){
        var t=document.body?document.body.innerText:"";
        if(/message sent|has been sent/i.test(t))return true;
        if(!document.querySelector('div[role="dialog"]'))return "closed";
        return false;
      }});
      var st=vr&&vr[0]&&vr[0].result;
      if(st===true||st==="closed"){ok=true;break;}
    }catch(e){}
    await new Promise(function(rr){setTimeout(rr,1000);});
  }
  if(ok)skEmailStatus(card,"Sent — it's in your Gmail sent folder.", "ok");
  else skEmailStatus(card,"I couldn't confirm it sent — the Gmail tab is still open, take a look.", "err");
}

/* ============ Zero brain (self-improvement) — server-driven config ============
   Zero can improve the Sidekick's instructions without a reinstall: this
   fetches sidekick-config.json from zero.page.gd (24h cache, baked-in
   prompts stay as fallback). The daily self-upgrade pass edits that file
   to tune behavior, add capabilities, and fix prompt bugs — no update
   notifier, no reinstall. */
window.ZeroBrain=(function(){
  var CK="sk-brain-v1",TTL=86400000,URL="https://zero.page.gd/sidekick-config.json";
  var brain={sys_addendum:"",planner_addendum:""};
  function adopt(c){
    if(!c||typeof c!=="object")return;
    if(typeof c.sys_addendum==="string")brain.sys_addendum=c.sys_addendum.slice(0,4000);
    if(typeof c.planner_addendum==="string")brain.planner_addendum=c.planner_addendum.slice(0,2000);
  }
  function refresh(){
    var cached=null;
    try{cached=JSON.parse(localStorage.getItem(CK));}catch(e){}
    if(cached&&cached.ts&&(Date.now()-cached.ts)<TTL&&cached.cfg){adopt(cached.cfg);return;}
    if(cached&&cached.cfg)adopt(cached.cfg);
    fetch(URL,{cache:"no-store",credentials:"include"}).then(function(r){return r.json();}).then(function(c){
      if(!c||typeof c!=="object")return;
      adopt(c);
      try{localStorage.setItem(CK,JSON.stringify({ts:Date.now(),cfg:{sys_addendum:brain.sys_addendum,planner_addendum:brain.planner_addendum}}));}catch(e){}
    }).catch(function(){});
  }
  try{refresh();}catch(e){}
  return{
    sys:function(){return brain.sys_addendum||"";},
    planner:function(){return brain.planner_addendum||"";}
  };
})();

function fetchT(url,opts,ms){
  ms=ms||15000;
  opts=opts||{};
  if(!opts.credentials)opts.credentials="include"; // send zero.page.gd cookies so the host's bot check passes
  return new Promise(function(res,rej){
    var to=setTimeout(function(){rej(new Error("timeout"));},ms);
    fetch(url,opts).then(function(r){clearTimeout(to);res(r);},function(e){clearTimeout(to);rej(e);});
  });
}

/* ================= state ================= */
var zhist=[];              // {role, text} last exchanges
var attachedImg=null;      // screenshot / uploaded image dataURL
var sharedTabs=[];          // [{id,title,url,_auto?,_tmp?}] shares; _auto=panel auto-share, _tmp=doSend one-message share
function tabAttached(){return sharedTabs.length>0;}
var busy=false;

/* ================= native tab context (no bridge needed) ================= */
/* Concurrent currentTab() callers are coalesced onto a single chrome.tabs.query
   so check-then-act sequences (auto-share vs doSend's temp share) can't interleave
   and produce duplicates. All waiters get the same snapshot, in call order. */
var skCurTabWaiters=null;
function currentTab(cb){
  if(skCurTabWaiters){skCurTabWaiters.push(cb);return;}
  skCurTabWaiters=[cb];
  function done(result){
    var ws=skCurTabWaiters;skCurTabWaiters=null;
    for(var i=0;i<ws.length;i++){try{ws[i](result);}catch(e){}}
  }
  try{
    if(typeof chrome!=="undefined"&&chrome.tabs&&chrome.tabs.query){
      chrome.tabs.query({active:true,lastFocusedWindow:true},function(tabs){
        var t=tabs&&tabs[0];
        var u=(t&&t.url)||"";
        // A fresh new-tab page has no scriptable content, but it IS shareable:
        // text extraction is skipped for it and the screenshot path is used.
        var isNewTab=/^chrome:\/\/newtab\/?$/i.test(u)||/^about:blank$/i.test(u);
        if(t&&u&&(isNewTab||(u.indexOf("chrome://")!==0&&u.indexOf("chrome-extension://")!==0))){
          done({id:t.id,title:String(t.title||(isNewTab?"New Tab":"")).slice(0,120),url:String(u).slice(0,300)});
        }else{done(null);}
      });
      return;
    }
  }catch(e){}
  done(null);
}
/* Auto-share the current tab when the panel opens, and keep it fresh when the viewer switches tabs. */
function skAutoShareCurrent(){
  try{
    currentTab(function(t){
      // Drop any previous auto-share (manual pins are always kept).
      sharedTabs=sharedTabs.filter(function(x){return !x._auto;});
      if(!t){
        // Not a shareable page (chrome://, extension page, no tab...): stop
        // claiming a share instead of leaving a stale chip behind.
        renderShareBar();
        return;
      }
      var tid=String(t.id!=null?t.id:t.url),turl=String(t.url||"");
      // A manual pin for this tab already covers it: refresh it and don't add a second chip.
      for(var i=0;i<sharedTabs.length;i++){
        var e=sharedTabs[i];
        if(!e._auto&&!e._tmp&&(String(e.id)===tid||(turl&&String(e.url)===turl))){
          e.title=String(t.title||e.title||"Untitled").slice(0,120);
          e.url=turl.slice(0,300);
          renderShareBar();
          return;
        }
      }
      // The auto share supersedes a temp share of the same tab (doSend may have
      // added one while this query was in flight): absorb it, don't duplicate it.
      sharedTabs=sharedTabs.filter(function(x){return !(x._tmp&&x.url===turl);});
      sharedTabs.push({id:tid,title:String(t.title||"Untitled").slice(0,120),url:turl.slice(0,300),_auto:true});
      renderShareBar();
    });
  }catch(e){}
}
// Share the current tab as soon as the panel opens
try{ skAutoShareCurrent(); }catch(e){}
// Keep it in sync when the viewer switches tabs while the panel is open
try{
  if(typeof chrome!=="undefined" && chrome.tabs && chrome.tabs.onActivated){
    chrome.tabs.onActivated.addListener(function(){ skAutoShareCurrent(); });
    // The active tab can navigate without switching: keep the share honest.
    if(chrome.tabs.onUpdated){
      chrome.tabs.onUpdated.addListener(function(tabId,info){
        if(info&&(info.url||info.title))skAutoShareCurrent();
      });
    }
    // A closed tab can't stay shared.
    if(chrome.tabs.onRemoved){
      chrome.tabs.onRemoved.addListener(function(tabId){
        var sid=String(tabId),changed=false;
        sharedTabs=sharedTabs.filter(function(x){
          if(!x._auto&&!x._tmp&&String(x.id)===sid){changed=true;return false;}
          return true;
        });
        if(changed)renderShareBar();
      });
    }
  }
}catch(e){}

/* ================= tab chip ================= */
var SVG_DOC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
function renderTabChip(){renderShareBar();}
function renderShareBar(){
  var row=$("ctxrow");
  if(!sharedTabs.length){row.className="";row.innerHTML="";return;}
  row.className="show";
  row.innerHTML="";
  sharedTabs.forEach(function(t){
    var c=document.createElement("div");c.className="ctxchip";
    c.innerHTML=SVG_DOC+'<span class="share-t">Sharing &ldquo;'+esc(t.title)+'&rdquo;</span>';
    var x=document.createElement("button");x.textContent="×";x.setAttribute("aria-label","Stop sharing this tab");
    x.onclick=function(){skUnshareTab(t.id);};
    c.appendChild(x);row.appendChild(c);
  });
}
/* <all_urls> is always granted — just verify scripting works. */
async function skEnsureTabAccess(){
  try{
    var tab=await skActiveTab();
    if(tab&&tab.id){
      await chrome.scripting.executeScript({target:{tabId:tab.id},func:function(){return true;}});
      return true;
    }
  }catch(e){}
  return false;
}

/* Single source of truth for "can we script this URL?" */
function skIsScriptable(url){
  if(!url)return false;
  if(/^(chrome|chrome-extension|edge|about|view-source):/i.test(url))return false;
  if(/^https:\/\/chrome\.google\.com\/webstore/i.test(url))return false;
  return /^https?:/i.test(url);
}

/* Secure safe: for sensitive values the user explicitly wants filled.
   Masked input, used once, never displayed, never stored, never logged. */
function skAskSafeInput(label){
  return new Promise(function(res){
    var ov=document.createElement("div");
    ov.style.cssText="position:fixed;inset:0;background:rgba(10,10,20,.55);backdrop-filter:blur(8px);z-index:200;display:flex;align-items:center;justify-content:center;animation:pop .25s cubic-bezier(.22,1,.36,1)";
    ov.innerHTML='<div style="background:var(--card);border:1px solid var(--line-strong);border-radius:20px;padding:22px;width:86%;max-width:320px;box-shadow:0 16px 48px rgba(0,0,0,.3)">'+
      '<div style="font-weight:800;font-size:14px;margin-bottom:6px;letter-spacing:-.2px">🔒 Secure input</div>'+
      '<div style="font-size:12.5px;color:var(--muted);line-height:1.5;margin-bottom:14px">'+esc(label||"Enter the sensitive value. It won't be shown or saved.")+'</div>'+
      '<input type="password" id="skSafeField" style="width:100%;border:1px solid var(--line-strong);border-radius:12px;padding:11px 14px;font-size:14px;background:var(--bg);color:var(--ink);outline:none;margin-bottom:14px" placeholder="Type here…" autocomplete="off" />'+
      '<div style="display:flex;gap:10px">'+
      '<button id="skSafeCancel" style="flex:1;border:1px solid var(--line);background:none;border-radius:999px;padding:10px;font-size:13px;font-weight:600;cursor:pointer;color:var(--muted)">Cancel</button>'+
      '<button id="skSafeGo" style="flex:1;border:none;background:linear-gradient(135deg,var(--blue),var(--blue-d));color:#fff;border-radius:999px;padding:10px;font-size:13px;font-weight:700;cursor:pointer">Use once</button>'+
      '</div></div>';
    document.body.appendChild(ov);
    var field=ov.querySelector("#skSafeField");
    field.focus();
    function done(val){
      ov.remove();
      res(val||null);
    }
    ov.querySelector("#skSafeCancel").onclick=function(){done(null);};
    ov.querySelector("#skSafeGo").onclick=function(){done(field.value);};
    field.onkeydown=function(e){if(e.key==="Enter")done(field.value);};
    ov.onclick=function(e){if(e.target===ov)done(null);};
  });
}

/* ============ PRIVACY LOCK ============
   Zero NEVER touches passwords, usernames, emails, or any login credentials.
   This is enforced in code, not just in prompts. */
function skIsCredentialField(el){
  if(!el)return true;
  var tp=String(el.type||"").toLowerCase();
  if(tp==="password")return true;
  var id=String(el.id||"").toLowerCase();
  var name=String(el.name||"").toLowerCase();
  var ph=String(el.placeholder||"").toLowerCase();
  var ac=String(el.autocomplete||"").toLowerCase();
  var combined=id+" "+name+" "+ph+" "+ac;
  // Passwords
  if(/pass(word|phrase)|passwd|pwd/.test(combined))return true;
  // Usernames / logins
  if(/user(name)?|login|signin|sign-in|account/.test(combined))return true;
  // Emails (often used as usernames)
  if(tp==="email"||/e-?mail/.test(combined))return true;
  // Other credentials
  if(/secret|token|api[-_]?key|auth/.test(combined))return true;
  // Autocomplete hints
  if(/current-password|new-password|username/.test(ac))return true;
  return false;
}
function skIsLoginForm(el){
  if(!el||!el.form)return false;
  try{
    var inputs=el.form.querySelectorAll("input");
    for(var i=0;i<inputs.length;i++){
      if(String(inputs[i].type||"").toLowerCase()==="password")return true;
    }
  }catch(e){}
  return false;
}

function skShareTab(tab){
  var id=String(tab.id!=null?tab.id:tab.url);
  var url=String(tab.url||"");
  for(var i=0;i<sharedTabs.length;i++){
    var e=sharedTabs[i];
    if(String(e.id)===id||(url&&String(e.url)===url)){
      // Already shared: pinning the auto-shared tab promotes it to a manual
      // pin (survives tab switches); otherwise it's a no-op, never a duplicate.
      if(e._auto){delete e._auto;renderShareBar();}
      return;
    }
  }
  sharedTabs.push({id:id,title:String(tab.title||"Untitled").slice(0,120),url:url.slice(0,300)});
  renderShareBar();
}
function skUnshareTab(id){
  id=String(id);
  sharedTabs=sharedTabs.filter(function(t){return String(t.id)!==id;});
  renderShareBar();
}
/* Find the share entry backing a tab object ({id,url}) or a legacy raw id/url.
   Matches by tab id OR url so numeric chrome tab ids and url-keyed shares
   round-trip correctly through the attach menu. */
function skShareEntryFor(tab){
  var id=null,url=null;
  if(tab&&typeof tab==="object"){
    id=tab.id!=null?String(tab.id):null;
    url=tab.url?String(tab.url):null;
  }else{
    id=String(tab);url=String(tab);
  }
  if(id===null&&url===null)return null;
  for(var i=0;i<sharedTabs.length;i++){
    var e=sharedTabs[i];
    if((id!==null&&String(e.id)===id)||(url!==null&&String(e.url)===url))return e;
  }
  return null;
}
function skIsShared(id){
  return !!skShareEntryFor(id);
}

/* ================= image attach ================= */
function attachImage(dataUrl,cb){
  var img=new Image();
  img.onerror=function(){
    window._skDiag.imgErr="failed to load image data";
    toast("Couldn't process that image — try another.");
    attachedImg=null;$("imgrow").className="";
    if(cb)cb();
  };
  img.onload=function(){
    var max=1280,w=img.width,h=img.height;
    if(w>max){h=Math.round(h*max/w);w=max;}
    var c=document.createElement("canvas");c.width=w;c.height=h;
    c.getContext("2d").drawImage(img,0,0,w,h);
    attachedImg=c.toDataURL("image/jpeg",0.85);
    $("imgthumb").src=attachedImg;
    $("imgrow").className="show";
    if(cb)cb();
  };
  img.src=dataUrl;
}
$("imgx").onclick=function(){attachedImg=null;$("imgrow").className="";};

/* ================= messages ================= */
var skSpeaking=false;
function skStamp(){var d=new Date(),h=d.getHours(),m=("0"+d.getMinutes()).slice(-2),ap=h>=12?"PM":"AM";h=h%12||12;return h+":"+m+" "+ap;}
var SVG_COPY='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
var SVG_SPK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>';
var SVG_RETRY='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
/* ================= LaTeX math rendering (KaTeX, bundled) ================= */
function skRenderMath(root){
  if(!root) return;
  // Fallback: if KaTeX didn't load, at least make \frac readable as plain text.
  function fallback(t){
    return t.replace(/\\displaystyle\s*/g,"")
      .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g,"$1/$2")
      .replace(/\\[()\[\]]/g,"").replace(/\$\$/g,"");
  }
  if(!window.katex){
    // Same code/pre skip as the KaTeX path: never mangle LaTeX shown in code blocks.
    var w0=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
      var p=n.parentNode;
      while(p&&p!==root){
        var tn=p.tagName;
        if(tn==="CODE"||tn==="PRE"||tn==="SCRIPT"||tn==="STYLE"||tn==="TEXTAREA")return NodeFilter.FILTER_REJECT;
        p=p.parentNode;
      }
      return (/\\\(|\\\[|\$\$/).test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;
    }}),ns0=[];
    while(w0.nextNode())ns0.push(w0.currentNode);
    ns0.forEach(function(n){ n.nodeValue=fallback(n.nodeValue); });
    return;
  }
  // Collect text nodes, skipping code/pre/script/style.
  var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
    acceptNode:function(n){
      var p=n.parentNode;
      while(p&&p!==root){
        var tn=p.tagName;
        if(tn==="CODE"||tn==="PRE"||tn==="SCRIPT"||tn==="STYLE"||tn==="TEXTAREA")return NodeFilter.FILTER_REJECT;
        p=p.parentNode;
      }
      return (/\\\(|\\\[|\$\$/).test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;
    }
  });
  var nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  // Patterns: display $$..$$, \[..\], then inline \(..\)
  var pats=[
    {re:/\$\$([\s\S]+?)\$\$/,disp:true},
    {re:/\\\[([\s\S]+?)\\\]/,disp:true},
    {re:/\\\(([\s\S]+?)\\\)/,disp:false}
  ];
  nodes.forEach(function(n){
    var frag=document.createDocumentFragment(),txt=n.nodeValue,any=false;
    // Process ALL formulas in this text node, not just the first
    while(true){
      var best=null,bestPat=null;
      for(var pi=0;pi<pats.length;pi++){
        var mm=pats[pi].re.exec(txt);
        if(mm&&(!best||mm.index<best.index)){best=mm;bestPat=pats[pi];}
      }
      if(!best)break;
      any=true;
      var before=txt.slice(0,best.index),after=txt.slice(best.index+best[0].length);
      if(before) frag.appendChild(document.createTextNode(before));
      var sp=document.createElement("span");
      try{
        katex.render(best[1],sp,{displayMode:bestPat.disp,throwOnError:false});
      }catch(e){ sp.textContent=fallback(best[1]); }
      frag.appendChild(sp);
      txt=after;
    }
    if(txt) frag.appendChild(document.createTextNode(txt));
    if(any) n.parentNode.replaceChild(frag,n);
  });
}
function addMsg(role,html,noCopy){
  var g=$("greet");if(g)g.style.display="none";
  var ch=$("chips");if(ch)ch.style.display="none";
  var m=$("msgs");
  var nearBottom=(m.scrollHeight-m.scrollTop-m.clientHeight)<140;
  var d=document.createElement("div");
  d.className="msg "+(role==="user"?"u":"a");
  d.setAttribute("dir","auto"); // RTL/Arabic/Hebrew messages render correctly
  d.innerHTML=html;
  if(role==="ai")skRenderMath(d);
  if(role==="ai"&&!noCopy&&html.indexOf("typing")<0){
    var f=document.createElement("div");f.className="sk-foot";
    f.innerHTML='<button class="sk-act" data-a="copy">'+SVG_COPY+'<span>Copy</span></button>'+
      '<button class="sk-act" data-a="listen">'+SVG_SPK+'<span>Listen</span></button>'+
      '<button class="sk-act sk-retry" data-a="retry">'+SVG_RETRY+'<span>Retry</span></button>'+
      '<span class="sk-time">'+skStamp()+'</span>';
    d.appendChild(f);
    f.querySelector('[data-a="copy"]').onclick=function(e){
      e.stopPropagation();
      var c=d.cloneNode(true),ff=c.querySelector(".sk-foot");if(ff)ff.remove();
      var t=c.innerText||"",lbl=f.querySelector('[data-a="copy"] span');
      function done2(){lbl.textContent="Copied";setTimeout(function(){lbl.textContent="Copy";},1200);}
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done2,done2);
      else done2();
    };
    f.querySelector('[data-a="listen"]').onclick=function(e){e.stopPropagation();skListen(this,d);};
    f.querySelector('[data-a="retry"]').onclick=function(e){e.stopPropagation();skRetry();};
  }
  m.appendChild(d);
  skRefreshRetry();
  /* Always scroll to bottom for new user prompts and completed AI answers;
     only respect nearBottom for streaming/typing updates */
  var isTyping=html.indexOf("typing")>=0;
  if(role==="user"||!isTyping)m.scrollTop=m.scrollHeight;
  else if(nearBottom)m.scrollTop=m.scrollHeight;
  skToggleDown();
  return d;
}
/* Only the latest AI answer offers Retry */
function skRefreshRetry(){
  var rs=document.querySelectorAll("#msgs .msg.a .sk-retry");
  for(var i=0;i<rs.length;i++)rs[i].style.display=(i===rs.length-1)?"":"none";
}
function skRetry(){
  if(busy)return;
  for(var i=zhist.length-1;i>=0;i--){
    if(zhist[i].role==="user"){$("qin").value=zhist[i].text;doSend();return;}
  }
}
/* Retry button on failure cards: re-sends the last user message via skRetry. */
function skErrRetryBtn(d){
  var b=document.createElement("button");
  b.className="sk-act sk-retry";
  b.style.marginTop="8px";
  b.innerHTML=SVG_RETRY+'<span>Retry</span>';
  b.onclick=function(){try{d.remove();}catch(e){}skRetry();};
  d.appendChild(b);
}
/* Read the answer aloud (built-in, free). Tapping again stops. */
function skListen(btn,box){
  try{
    if(skSpeaking){speechSynthesis.cancel();skSpeaking=false;btn.querySelector("span").textContent="Listen";return;}
    var c=box.cloneNode(true),ff=c.querySelector(".sk-foot");if(ff)ff.remove();
    var txt=(c.innerText||"").slice(0,1500);
    if(!txt.trim())return;
    var u=new SpeechSynthesisUtterance(txt);u.rate=1.03;
    u.onend=u.onerror=function(){skSpeaking=false;try{btn.querySelector("span").textContent="Listen";}catch(e){}};
    speechSynthesis.cancel();speechSynthesis.speak(u);skSpeaking=true;
    btn.querySelector("span").textContent="Stop";
  }catch(e){toast("Couldn't play audio here.");}
}
/* Contextual follow-up chips after each real answer */
function skFollowups(answer,box){
  document.querySelectorAll(".sk-follow").forEach(function(x){x.remove();});
  var sug=[];
  if(String(answer).length>500)sug.push("Summarize the key points");
  sug.push("Explain it more simply");
  if(/\n\s*([-*]|\d+\.)\s+/.test(answer)||/\|[^|\n]+\|/.test(answer))sug.push("Turn this into a checklist");
  else sug.push("Give me an example");
  sug=sug.slice(0,3);
  var row=document.createElement("div");row.className="sk-follow";
  sug.forEach(function(s){
    var b=document.createElement("button");b.className="sk-fchip";b.textContent=s;
    b.onclick=function(){row.remove();$("qin").value=s;doSend();};
    row.appendChild(b);
  });
  box.parentNode.insertBefore(row,box.nextSibling);
  var m=$("msgs");m.scrollTop=m.scrollHeight;skToggleDown();
}
/* Jump-to-latest pill */
function skToggleDown(){
  var m=$("msgs"),b=$("skDown");if(!m||!b)return;
  b.classList.toggle("show",(m.scrollHeight-m.scrollTop-m.clientHeight)>260);
}
function addTyping(){return addMsg("ai",'<span class="typing"><span></span><span></span><span></span></span>');}

/* ================= suggestion chips ================= */
var SVG_SPARK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>';
var SVG_CAM='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>';
var SVG_BOOK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>';
var SVG_PEN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
var SVG_GRAPH='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3v18h18"/><path d="M7 15l4-6 4 3 4-7"/></svg>';
var CHIPS=[
  {icon:SVG_CAM,label:"Explain my screen",fn:function(){shareScreen("What\u2019s on my screen? Explain it in simple terms.");}},
  {icon:SVG_DOC,label:"Summarize this tab",fn:function(){ask("Please summarize the key points of what I'm looking at, in a few short bullets.",true);}},
  {icon:SVG_BOOK,label:"Help me study",fn:function(){ask("I want to study. Ask me what subject and what I need help with, then teach me.",false);}},
  {icon:SVG_PEN,label:"Write it better",fn:function(){ask("Help me write something better. Ask me what it's for first.",false);}},
  {icon:SVG_GRAPH,label:"Graph it",fn:function(){$("qin").value="Graph y = 2x + 2";$("qin").focus();}},
  {icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 22h8M12 18v4"/></svg>',label:"Drive my browser",fn:function(){$("qin").value="";$("qin").placeholder="Tell Zero what to do, e.g. go to google.com…";$("qin").focus();toast("Tell Zero a task — it will drive your browser.");}}
];
function skRenderChips(){
  var box=$("chips");if(!box)return;box.innerHTML="";
  CHIPS.forEach(function(c){
    var b=document.createElement("button");b.className="chip";
    b.innerHTML=c.icon+"<span>"+esc(c.label)+"</span>";
    b.onclick=c.fn;box.appendChild(b);
  });
}
skRenderChips();

/* ================= composer actions ================= */
$("btnShare").onclick=function(){shareScreen(null);};
/* Robust screen capture: explicitly target the current window so the
   side-panel context doesn't confuse Chrome about which tab is visible. */
function skCaptureVisible(format, quality, cb){
  function tryCapture(windowId, opts, done){
    try{
      var args=windowId?[windowId, opts]:[opts];
      chrome.tabs.captureVisibleTab.apply(chrome.tabs, args.concat([function(dataUrl){
        var err=(chrome.runtime&&chrome.runtime.lastError)?chrome.runtime.lastError:null;
        if(err||!dataUrl){done(null, err?String(err.message||err):"capture returned empty");}
        else{done(dataUrl, null);}
      }]));
    }catch(e){done(null, String(e&&e.message||e));}
  }
  try{
    chrome.tabs.query({active:true, lastFocusedWindow:true}, function(tabs){
      var t=tabs&&tabs[0];
      if(!t||!t.id){cb(null, "no active tab"); return;}
      var url=t.url||"";
      // chrome.tabs.captureVisibleTab is NOT subject to the scripting
      // restrictions — it can capture a fresh new-tab page just fine. Only
      // scripting (executeScript) is blocked there, and that stays gated in
      // skIsScriptable / skExtractPageText.
      var capturable=skIsScriptable(url)||/^chrome:\/\/newtab\/?$/i.test(url)||/^about:blank$/i.test(url);
      if(!capturable){cb(null, "can't capture this page type"); return;}
      var opts={format:format||"png"};
      if(opts.format==="jpeg")opts.quality=quality||85;
      // Try with explicit windowId first, fall back to default
      tryCapture(t.windowId, opts, function(dataUrl, err){
        if(dataUrl){cb(dataUrl, null);}
        else{tryCapture(null, opts, cb);}
      });
    });
  }catch(e){cb(null, String(e&&e.message||e));}
}

function shareScreen(presetQ){
  var sb=$("btnShare");sb.classList.add("busy");
  if(presetQ){$("qin").value=presetQ;}
  function done(){sb.classList.remove("busy");}
  try{
    if(typeof chrome!=="undefined"&&chrome.tabs&&chrome.tabs.captureVisibleTab){
      skCaptureVisible("png", 0, function(dataUrl, errMsg){
        done();
        if(errMsg||!dataUrl){
          window._skDiag.captureErr="shareScreen: "+(errMsg||"unknown");
          toast("Couldn't capture the screen — try again.");
          return;
        }
        attachImage(dataUrl);
        toast("Screen attached — ask Zero about it.");
      });
      setTimeout(done,10000);
      return;
    }
  }catch(e){}
  done();
  toast("Screen capture needs the Zero Sidekick extension context.");
}
/* ================= attach menu ================= */
function skToggleAttach(show){
  var m=$("attachMenu");
  var willShow=typeof show==="boolean"?show:!m.classList.contains("open");
  document.querySelectorAll(".attachmenu.open").forEach(function(x){x.classList.remove("open");});
  if(willShow){m.classList.add("open");skFillAttachTabs();}
}
function skFillAttachTabs(){
  var box=$("amTabs");box.innerHTML="";
  try{
    chrome.tabs.query({lastFocusedWindow:true},function(tabs){
      // No slice limit: list every tab so none are ever missing; the menu scrolls.
      (tabs||[]).forEach(function(t){
        var tu=t.url||"";
        var isNewTab=/^chrome:\/\/newtab\/?$/i.test(tu)||/^about:blank$/i.test(tu);
        if(!tu||!(/^https?:/i.test(tu)||isNewTab))return;
        var b=document.createElement("button");b.className="am-item";
        var isCur=t.active;
        var shared=!!skShareEntryFor(t);
        b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>'+
          '<span class="am-t">'+esc(t.title||"Untitled")+'<span class="am-sub">'+(isCur?"Current tab":esc((t.url||"").replace(/^https?:\/\//,"").split("/")[0]))+'</span></span>'+
          '<span class="am-check" style="visibility:'+(shared?"visible":"hidden")+'">✓</span>';
        b.onclick=function(){
          var e=skShareEntryFor(t);
          if(e){skUnshareTab(e.id);}
          else{skShareTab({id:t.id,title:t.title,url:t.url});toast("Tab shared — ask Zero about it.");}
          skFillAttachTabs();
        };
        box.appendChild(b);
      });
    });
  }catch(e){}
}
$("btnPlus").onclick=function(e){e.stopPropagation();skToggleAttach();};
$("amScreen").onclick=function(){skToggleAttach(false);shareScreen(null);};
$("amUpload").onclick=function(){skToggleAttach(false);$("filepick").click();};
$("amNewChat").onclick=function(){
  skToggleAttach(false);
  zhist=[];sharedTabs=[];attachedImg=null;
  $("msgs").innerHTML='<div class="greet" id="greet"><div class="mark">0</div><div class="big">Ready when you are.</div><div class="sub">Ask anything, attach a tab, or tell Zero to do something in your browser.</div></div><div class="chips" id="chips"></div>';
  renderTabChip();skRenderChips();
  toast("New chat started.");
};
document.addEventListener("click",function(e){
  if(!e.target.closest("#attachMenu")&&!e.target.closest("#btnPlus"))skToggleAttach(false);
});
$("filepick").addEventListener("change",function(){
  var f=$("filepick").files[0];$("filepick").value="";
  if(!f||f.type.indexOf("image/")!==0)return;
  var r=new FileReader();
  r.onload=function(){attachImage(r.result);toast("Image attached.");};
  r.readAsDataURL(f);
});
var qin=$("qin");
qin.addEventListener("input",function(){qin.style.height="auto";qin.style.height=Math.min(120,qin.scrollHeight)+"px";});
qin.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();doSend();}});
$("send").onclick=doSend;
$("msgs").addEventListener("scroll",skToggleDown);
$("msgs").addEventListener("click",function(e){
  var t=e.target&&e.target.closest?e.target:null;
  if(!t)return;
  var b=t.closest(".sk-code-c");
  if(b){skCopyCode(b);return;}
  var es=t.closest("[data-esend]");
  if(es){skEmailSend(es.getAttribute("data-esend"));return;}
  var eg=t.closest("[data-egmail]");
  if(eg){skEmailOpenGmail(eg.getAttribute("data-egmail"));return;}
});
$("skDown").onclick=function(){var m=$("msgs");m.scrollTop=m.scrollHeight;skToggleDown();};

function ask(text,useTab){
  if(useTab){
    currentTab(function(t){
      if(t)skShareTab({id:t.id,title:t.title,url:t.url});
      $("qin").value=text;doSend();
    });
    return;
  }
  $("qin").value=text;doSend();
}

/* ================= AI send (via token-gated relay) ================= */
var SYS_BASE="You are Zero, a sharp and genuinely smart AI assistant living in a browser side panel. Think before you answer \u2014 for anything beyond a simple question, reason step by step internally, check your logic against what you can see in any shared tab, then answer. Never guess when you can reason. Match length to the question: one-liners get short answers, casual chat gets 1-2 warm sentences, only complex questions earn structured answers. Never invent dates, statistics, names, or URLs \u2014 if you\u2019re unsure, show your reasoning and mark the uncertain part. Plain markdown only, no raw HTML tags. Never introduce yourself or say \u2018Zero here\u2019 \u2014 the viewer already knows who you are, just answer naturally. If the viewer shared a screenshot or a tab, ground every claim in what you actually see \u2014 real names, numbers, and text from the page, never generic descriptions. When the viewer corrects you, do not defend the wrong answer: name what you got wrong, fix it, and never repeat that mistake in this conversation. For anything longer than a quick reply, keep it scannable: use ## headings for sections, short bullet lists, tables when listing items with details or comparing things, and bold for key terms. Never a wall of plain text.";
function skIsMath(text){
  // Strip full dates first so "what happened on 10/20/2026" isn't read as division.
  // (A bare "12/25" still counts — it's indistinguishable from the fraction 12/25.)
  var t=String(text||"").replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g," ");
  // Explicit math words
  if(/\b(solve|calculate|compute|evaluate|simplify|factor|expand|derive|integrate|differentiate)\b/i.test(t)) return true;
  // LaTeX delimiters
  if(/\\\(|\\\[|\$\$/.test(t)) return true;
  // Math symbols with numbers: equations, fractions, etc.
  if(/\d\s*[+\-*/^=]\s*\d/.test(t)) return true;
  // Percentages and word operators: "what is 15% of 240", "what is 7 plus 8"
  if(/\d\s*%/.test(t)) return true;
  if(/\b\d+\s*(plus|minus|times|divided\s+by|over)\s*\d+/i.test(t)) return true;
  // Common math notation
  if(/\\frac|\\sqrt|\\sum|\\int|\\lim|x\^\d|\d+\/\d+/.test(t)) return true;
  return false;
}
function skIsCodeFix(text){
  var t=String(text||"");
  if(/```/.test(t))return true;
  if(!/\b(fix|debug|broken|error|not working|what'?s wrong)\b/i.test(t))return false;
  return /[{};=<>\[\]]/.test(t)||/\b(def |function |=>|import |return |const |let |var |print\(|console\.|if ?\(|for ?\()/.test(t);
}
var EMAIL_SYS="EMAIL: If the viewer wants to SEND an email (not just read or draft one) and you know the recipient's email address, write the email and output a ```email block with one-line JSON: {\"to\":\"a@b.com\",\"subject\":\"...\",\"body\":\"...\"}. The body is plain text; use \\n for line breaks. Then stop writing — the panel shows a review card with a Send button. If you don't know the address, ask for it instead of guessing. Never invent email addresses. For plain 'draft an email' requests with no sending intent, just write the draft as normal text.";
var CODEFIX_SYS="CODE FIX MODE: The viewer pasted code and wants it fixed or debugged. Do this: (1) one short line naming the bug and why it happens — no lecture, (2) the COMPLETE corrected code in one fenced block (same language as the original), ready to copy-paste, (3) at most 3 short bullets on what changed and why. Change only what is needed to fix the bug: keep their variable names, style, and structure; don't rewrite the whole thing or add features they didn't ask for. If several fixes are plausible, apply the most likely one and say what to check if it still fails. If the message turns out to have no actual code in it, ignore this format and just answer the question normally. Never invent error messages or stack traces the viewer didn't show you.";
var MATH_SYS="MATH: This is a math question. Work it out STEP BY STEP — show every step of your reasoning clearly. Do NOT jump straight to the answer. For arithmetic: break it into small steps and double-check each one. For algebra: show each transformation. For word problems: first write down what you know, then set up the equation, then solve. After getting an answer, verify it by plugging it back in or estimating. Use LaTeX for all math: inline \\(...\\) and display \\[...\\]. If the question has a diagram or image, describe what you see in it first, then solve. Never guess a math answer — if you cannot work it out reliably, say which step you are unsure about.";
var SMALLTALK=/^(hi+|hey+|hello+|yo|sup|how are you( doing)?( today)?|how'?s it going|what'?s up|thanks|thank you|thx|good ?(morning|afternoon|evening|night)|bye+|goodbye|good ?night|see you( later)?|who are you)\s*[?!.]*$/i;
var HARD_FAST=[{provider:"groq",model:"openai/gpt-oss-20b",temp:0.7},{provider:"pollinations",model:"openai",temp:0.7},{provider:"groq",model:"qwen/qwen3.8-27b",temp:0.7}];
var HARD_BAL=[{provider:"groq",model:"openai/gpt-oss-120b",temp:0.7},{provider:"groq",model:"openai/gpt-oss-20b",temp:0.7},{provider:"groq",model:"qwen/qwen3.8-27b",temp:0.7},{provider:"cerebras",model:"gpt-oss-120b",temp:0.7},{provider:"openrouter",model:"meta-llama/llama-3.3-70b-instruct:free",temp:0.7},{provider:"mistral",model:"mistral-small-latest",temp:0.7},{provider:"pollinations",model:"openai",temp:0.7}];
var HARD_ALL=HARD_BAL.concat([{provider:"cerebras",model:"qwen-3-32b",temp:0.7},{provider:"openrouter",model:"openrouter/free",temp:0.7}]);

function doSend(){
  if(busy)return;
  busy=true;try{$("send").disabled=true;}catch(e){}
  try{if(window.speechSynthesis)speechSynthesis.cancel();skSpeaking=false;}catch(e){}
  document.querySelectorAll(".sk-follow").forEach(function(x){x.remove();});
  // If the message starts with @, share the current tab just for this message.
  // "Solve it" auto-context: short tab-deictic messages ("solve it", "do these",
  // "summarize this", "what is this"...) auto-share the visible tab too, so the
  // viewer never has to press the share button first.
  var rawStart=qin.value.trim();
  // Auto-share: Zero always sees whatever tab you're on — no @, no share
  // button, no special phrasing needed. The share is temporary (this message
  // only); pinned shares from the + menu still work on top of it. Skipped
  // for task-mode requests (they drive their own fresh tab), smalltalk
  // (kept instant), and when an image is already attached.
  var noAutoShare=attachedImg||(!skForceChatOnce&&skLooksLikeTask(rawStart))||SMALLTALK.test(rawStart);
  if(!noAutoShare){
    currentTab(function(t){
      if(t&&!skIsShared(t)){
        // Temporary share for this message only
        sharedTabs.push({id:"_tmp_"+Date.now(),title:String(t.title||"").slice(0,120),url:String(t.url||"").slice(0,300),_tmp:true});
      }
      doSendCapture();
    });
    return;
  }
  doSendCapture();
}
/* (skLooksLikeSolveIt retired: auto-share above covers every message now.) */
/* Extract readable text from the current tab via scripting.
   More reliable than screenshots for @tab context — gives the AI real text. */
function skExtractPageText(cb){
  skEnsureTabAccess().then(function(ok){
    if(!ok){window._skDiag.pageTextErr="no tab access";cb(null);return;}
    try{
      chrome.tabs.query({active:true, lastFocusedWindow:true}, function(tabs){
        var t=tabs&&tabs[0];
        if(!t||!t.id){cb(null);return;}
        var url=t.url||"";
        if(!skIsScriptable(url)){cb(null);return;}
        chrome.scripting.executeScript({
          target:{tabId:t.id},
          func:function(){
            var text=(document.body?document.body.innerText:"").slice(0,6000);
            return {title:document.title, text:text};
          }
        }, function(results){
          var err=chrome.runtime&&chrome.runtime.lastError;
          if(err||!results||!results[0]){cb(null);}
          else{cb(results[0].result);}
        });
      });
    }catch(e){cb(null);}
  }).catch(function(){cb(null);});
}

function doSendCapture(){
  // @ tab: get the actual page content so Zero can see it, not just the title.
  // Tries text extraction first (reliable), falls back to screenshot.
  // VISUAL MEMORY: if this tab needed a screenshot last time (diagram/image),
  // keep using screenshots so follow-ups don't lose the visual context.
  function needShot(cb){
    skCaptureVisible("jpeg",85,function(dataUrl,errMsg){
      if(!errMsg&&dataUrl){
        // Remember this tab as visual — follow-ups will screenshot again
        try{
          var st=sharedTabs[0];
          if(st&&st.url) window._skVisualTab=st.url;
        }catch(e){}
        attachImage(dataUrl,function(){doSendNow();});
      }
      else{
        window._skDiag.captureErr="screenshot: "+(errMsg||"empty capture result");
        toast("Couldn't capture the tab — answering from the page info instead.");
        doSendNow();
      }
    });
  }
  if(tabAttached()&&!attachedImg){
    window._skPageText=null;
    // If last time this tab needed a screenshot, skip text extraction
    var visualUrl=null;
    try{ visualUrl=window._skVisualTab; }catch(e){}
    var curUrl=null;
    try{ curUrl=sharedTabs[0]&&sharedTabs[0].url; }catch(e){}
    if(visualUrl&&curUrl&&visualUrl===curUrl){
      needShot();
      return;
    }
    skExtractPageText(function(pageData){
      if(pageData&&pageData.text&&pageData.text.trim().length>50){
        window._skPageText=pageData.text;
        doSendNow();
      }else{
        needShot();
      }
    });
    return;
  }
  doSendNow();
}
function doSendNow(){
  var text=qin.value.trim();
  if(!text&&!attachedImg){
    // Clean temp shares even on early return
    sharedTabs=sharedTabs.filter(function(t){return !t._tmp;});
    busy=false;try{$("send").disabled=false;}catch(e){}return;
  }
  // Task mode: browser-control requests go to the computer engine, not chat.
  // (skForceChatOnce: the viewer explicitly overrode routing via "Not a task?")
  var _forceChat=skForceChatOnce;skForceChatOnce=false;
  if(!_forceChat&&!attachedImg&&skLooksLikeTask(text)){qin.value="";qin.style.height="auto";busy=false;try{$("send").disabled=false;}catch(e){}skRunTask(text);return;}
  if(attachedImg&&!text)text="What\u2019s in this image?";
  // @ tab: leading @ shares the current tab for this message
  var wantTab=tabAttached()||/^@\s*/.test(text);
  text=text.replace(/^@\s*/,"");
  var img=attachedImg;attachedImg=null;$("imgrow").className="";
  qin.value="";qin.style.height="auto";

  var sys=SYS_BASE+EMAIL_SYS;
  try{var _brainSys=window.ZeroBrain&&window.ZeroBrain.sys();if(_brainSys)sys+="\n\n"+_brainSys;}catch(_be){}
  var codeFix=skIsCodeFix(text);
  if(codeFix)sys+="\n\n"+CODEFIX_SYS;
  if(skIsMath(text))sys+="\n\n"+MATH_SYS;
  if(wantTab&&sharedTabs.length){
    // Refresh tab titles/URLs (they may have navigated since sharing)
    try{
      var _fresh=sharedTabs.slice();
      // Note: async refresh happens in doSendCapture; use cached here
    }catch(e){}
    sys+="\n\nThe viewer is sharing "+sharedTabs.length+" tab"+(sharedTabs.length>1?"s":"")+" for context:";
    sharedTabs.forEach(function(t,i){
      sys+="\n"+(i+1)+'. "'+t.title+'" ('+t.url+")";
    });
    var pageText=window._skPageText;
    if(pageText){
      sys+="\n\nHere is the actual text content from the currently visible tab — base your answer on what you see here, naming the real items, courses, or content, not a generic description:\n---\n"+String(pageText).slice(0,5000)+"\n---";
    } else if(img){
      sys+=" A screenshot of the currently visible tab is attached — base your answer on what you actually see in it, naming the real items, courses, or content visible, not a generic description of that kind of page.";
    } else {
      sys+=" Use their titles and URLs when relevant.";
    }
    // _skPageText already reset after use above
  }

  var userContent=img?[{type:"text",text:text},{type:"image_url",image_url:{url:img}}]:text;
  var msgs=[{role:"system",content:sys}];
  zhist.slice(-10).forEach(function(m){msgs.push({role:m.role==="user"?"user":"assistant",content:String(m.text).slice(0,2000)});});
  msgs.push({role:"user",content:userContent});

  addMsg("user",(img?'<img class="att" src="'+img+'" alt="attached">':"")+(wantTab&&sharedTabs.length?'<div style="font-size:11px;opacity:.75;margin-bottom:6px">'+sharedTabs.map(function(t){return "@ "+esc(t.title);}).join(" · ")+'</div>':"")+esc(text));
  zhist.push({role:"user",text:text});
  // Remove temporary @-shares (keep pinned ones)
  var hadTmp=false;
  sharedTabs=sharedTabs.filter(function(t){if(t._tmp){hadTmp=true;return false;}return true;});
  if(hadTmp)renderShareBar();
  try{$("send").disabled=true;}catch(e){}
  var level=$("lvl").value||"balanced";

  // Stash for heal-retry (inputs are cleared before the race)
  var _stashText=text, _stashImg=img, _stashWantTab=wantTab;
  var _healed=false;
  function doneFail(){
    busy=false;$("send").disabled=false;
    // If the host is challenging our own connection check, try to auto-heal
    // once before giving up. Gated on the SELF-TEST (not lastFail): if the
    // self-test is clean but a model call failed, opening another heal tab
    // can't fix it — healing again there would loop forever, so show the
    // honest error instead.
    if(skIsChallenge(window._skDiag.selfTest)&&!_healed){
      _healed=true;
      var healMsg=addMsg("ai",'<span style="font-size:12.5px;color:var(--muted)">Clearing a connection check… one moment.</span>',true);
      skEnsureCookie().then(function(ok){
        healMsg.remove();
        if(ok){
          // The load-time update check may have failed during the challenge —
          // re-check now that the connection is clean.
          try{skCheckUpdate();}catch(e){}
          // Restore stashed inputs and re-run
          qin.value=_stashText;
          attachedImg=_stashImg;
          if(_stashImg){$("imgthumb").src=_stashImg;$("imgrow").className="show";}
          doSend();
        }
        else{
          var d=document.createElement("div");d.className="err";
          d.innerHTML="Zero's host wants your browser to prove it's not a bot. Open <b>zero.page.gd</b> in a regular tab once, then try again here."+
            '<details class="skdet"><summary>Details</summary><pre>'+esc(skDiagHTML())+'</pre></details>';
          skErrRetryBtn(d);
          $("msgs").appendChild(d);$("msgs").scrollTop=$("msgs").scrollHeight;
        }
      });
      return;
    }
    var d=document.createElement("div");d.className="err";
    var msg=skChallengeHit()
      ? "Zero's host wants your browser to prove it's not a bot. Open <b>zero.page.gd</b> in a regular tab once, then try again here."
      : "Zero couldn't reach its AI models right now. Check your connection and try again.";
    d.innerHTML=msg+
      '<details class="skdet"><summary>Details</summary><pre>'+esc(skDiagHTML())+'</pre></details>';
    skErrRetryBtn(d);
    $("msgs").appendChild(d);$("msgs").scrollTop=$("msgs").scrollHeight;
  }
  function finish(answer,sources){
    busy=false;$("send").disabled=false;
    zhist.push({role:"ai",text:String(answer).slice(0,4000)});
    zhist=zhist.slice(-20);
    
    var box=addMsg("ai",md(answer));
    if(sources&&sources.length){
      var s=document.createElement("div");s.className="srcs";
      sources.slice(0,6).forEach(function(x){
        var a=document.createElement("a");a.className="src";a.target="_blank";a.rel="noopener";
        a.href=x.url||"#";a.textContent=String(x.title||x.url||"source").slice(0,40);
        s.appendChild(a);
      });
      box.appendChild(s);
    }
    if(String(answer).length>120){try{skFollowups(String(answer),box);}catch(e){}}
  }

  // small-talk fast path
  if(SMALLTALK.test(text)&&!img){
    var t0=addTyping();
    fetchT(RELAY,{method:"POST",headers:relayHeaders("single",true),
      body:JSON.stringify({provider:"groq",model:"openai/gpt-oss-20b",temp:0.7,max_tokens:200,
        messages:[{role:"system",content:"You are Zero, a warm friendly AI assistant. The user just said something casual. Reply in 1-2 short sentences, warm and natural with a little personality. No lists, no headings."},{role:"user",content:text}]})},15000)
      .then(function(r){return r.json();}).then(function(j){
        t0.remove();
        finish(j.answer||j.text||"Hey! I'm here and ready — what can I do for you?");
      }).catch(function(){t0.remove();doneFail();});
    return;
  }

  var t1=addTyping();
  var liveSets=(window.ZeroLineup&&window.ZeroLineup.sets)?window.ZeroLineup.sets():null;
  function liveOr(l,h){return(l&&l.length)?l:h;}
  var models=level==="fast"?liveOr(liveSets&&liveSets.fast,HARD_FAST)
    :level==="deep"?liveOr(liveSets&&liveSets.deep,HARD_ALL)
    :liveOr(liveSets&&liveSets.balanced,HARD_BAL);
  // Vision: when an image is attached, only race models that can actually see.
  // Prefer the live lineup's vision-capable models; fall back to hardcoded.
  if(img){
    var visionPool=[];
    if(liveSets&&liveSets.balanced){
      liveSets.balanced.forEach(function(m){
        if(m.provider==="pollinations"||m.provider==="mistral")visionPool.push(m);
      });
    }
    models=visionPool.length?visionPool:[{provider:"pollinations",model:"openai",temp:0.7},{provider:"mistral",model:"mistral-small-latest",temp:0.7}];
  }
  if(!models||!models.length){t1.remove();doneFail();return;}

  // Speed (<5s): first valid answer wins and shows immediately. No synth
  // merge pass — the ensemble conferring is what made answers slow.
  var fullPool=liveOr(liveSets&&liveSets.balanced,HARD_BAL);
  function runRace(raceModels, raceMsgs, onAllFail){
    var done=false,settled=0;
    var hardTo=setTimeout(function(){if(!done){done=true;onAllFail();}},20000);
    raceModels.forEach(function(m){
      var _payload={messages:raceMsgs,model:m.model,temp:m.temp,provider:m.provider};
      if(codeFix)_payload.max_tokens=4000; // code fixes need room: never cut the fixed code off
      fetchT(RELAY,{method:"POST",headers:relayHeaders("single",true),
        body:JSON.stringify(_payload)},15000)
        .then(function(r){return r.text().then(function(t){return {status:r.status,ct:r.headers.get("content-type")||"",body:t};});})
        .then(function(rd){
          var d=null;try{d=JSON.parse(rd.body);}catch(e){}
          settled++;
          if(done)return;
          if(d&&d.answer&&String(d.answer).length>10){
            done=true;clearTimeout(hardTo);t1.remove();
            finish(String(d.answer),[]);
          }else{
            if(!window._skDiag.lastFail)window._skDiag.lastFail={ok:true,status:rd.status,ct:rd.ct,body:rd.body.slice(0,220)};
            if(settled>=raceModels.length){done=true;clearTimeout(hardTo);onAllFail();}
          }
        })
        .catch(function(e){settled++;if(!window._skDiag.lastFail)window._skDiag.lastFail={ok:false,error:String(e&&e.message||e)};if(!done&&settled>=raceModels.length){done=true;clearTimeout(hardTo);onAllFail();}});
    });
  }
  runRace(models, msgs, function(){
    // "Unlimited" fallback: the vision-only race failed with a screenshot
    // attached. Run ONE more race on the full pool with the image stripped
    // (tab titles + page text stay) instead of giving up with a red error.
    if(img&&!skChallengeHit()){
      var msgs2=[{role:"system",content:sys+" (Note: the tab screenshot could not be processed — answer from the tab titles and page text above.)"}];
      // zhist already holds the current user message as its last entry — take
      // history without it, then append the current message once, text-only.
      zhist.slice(0,-1).slice(-10).forEach(function(m){msgs2.push({role:m.role==="user"?"user":"assistant",content:String(m.text).slice(0,2000)});});
      msgs2.push({role:"user",content:text});
      runRace(fullPool, msgs2, function(){t1.remove();doneFail();});
    }else{
      t1.remove();doneFail();
    }
  });
}

/* ================= updates feed ================= */
function timeAgo(ts){
  var s=Math.floor(Date.now()/1000-ts);
  if(s<60)return"just now";
  if(s<3600)return Math.floor(s/60)+"m ago";
  if(s<86400)return Math.floor(s/3600)+"h ago";
  return Math.floor(s/86400)+"d ago";
}
function loadUpdates(){
  fetchT(RELAY,{method:"GET",headers:relayHeaders("upgrades")},15000)
  .then(function(r){return r.text().then(function(t){return {status:r.status,ct:r.headers.get("content-type")||"",body:t};});})
  .then(function(rd){
    var d=null;try{d=JSON.parse(rd.body);}catch(e){}
    if(!d||!d.upgrades){
      if(!window._skDiag.lastFail)window._skDiag.lastFail={ok:true,status:rd.status,ct:rd.ct,body:rd.body.slice(0,220)};
      throw new Error("bad-updates");
    }
    var el=$("updList");
    var list=d.upgrades||[];
    if(!list.length){el.innerHTML='<div style="font-size:13px;color:var(--muted)">No upgrades logged yet — check back after Zero updates itself.</div>';return;}
    el.innerHTML="";
    list.slice(0,20).forEach(function(u){
      var d2=document.createElement("div");d2.className="upd";
      d2.innerHTML='<span class="k">'+esc(u.kind||"update")+'</span><span>'+esc(u.detail||"")+'</span><div class="t">'+timeAgo(u.ts||0)+'</div>';
      el.appendChild(d2);
    });
  }).catch(function(e){
    if(!window._skDiag.lastFail&&e&&e.message)window._skDiag.lastFail={ok:false,error:String(e.message)};
    $("updList").innerHTML='<div style="font-size:13px;color:var(--muted)">Couldn\'t load the upgrade feed.</div>'+
      '<details class="skdet"><summary>Details</summary><pre style="font-size:10.5px;white-space:pre-wrap">'+esc(skDiagHTML())+'</pre></details>';
  });
}
function closeOvs(){$("ovUpdates").classList.remove("open");}
$("btnUpdates").onclick=function(e){e.stopPropagation();var o=$("ovUpdates");var was=o.classList.contains("open");closeOvs();if(!was){o.classList.add("open");loadUpdates();}};
document.addEventListener("click",function(e){if(!e.target.closest(".ov")&&!e.target.closest(".hbtn"))closeOvs();});

/* ================= self-update notifier =================
   Chrome only auto-updates extensions from the Web Store, and Zero Sidekick
   is installed unpacked (no store fee) — so it cannot update itself silently.
   Instead it checks a tiny version file on zero.page.gd and shows a one-tap
   download banner when a newer build exists. Most fixes ship server-side and
   need no reinstall at all. */
var SK_VER_URL="https://zero.page.gd/sidekick-version.json";
var SK_ZIP_URL="https://zero.page.gd/zero-sidekick.zip";
function skNewer(a,b){
  var pa=String(a).split("."),pb=String(b).split(".");
  for(var i=0;i<Math.max(pa.length,pb.length);i++){
    var x=parseInt(pa[i]||"0",10),y=parseInt(pb[i]||"0",10);
    if(x>y)return true;if(x<y)return false;
  }
  return false;
}
function skShowUpdate(v){
  if(document.getElementById("skUpd"))return;
  // Only trust an https: download URL from the version file; otherwise fall
  // back to the canonical zip URL (never link the version.json file itself).
  var dl=(v&&/^https:/i.test(String(v.url||"")))?v.url:SK_ZIP_URL;
  var d=document.createElement("div");d.id="skUpd";
  d.innerHTML='<div class="sk-upd-in"><span class="sk-upd-t">Sidekick '+esc(v.version||"")+' is out — grab it for the latest fixes.</span>'+
    '<a class="sk-upd-btn" href="'+esc(dl)+'" target="_blank" rel="noopener">Download</a>'+
    '<button class="sk-upd-x" id="skUpdX" aria-label="Dismiss">✕</button></div>'+
    '<div class="sk-upd-sub">Unzip it, then at chrome://extensions remove the old Zero Sidekick and Load unpacked the new folder.</div>';
  document.body.insertBefore(d,document.body.firstChild);
  document.getElementById("skUpdX").onclick=function(){d.remove();};
}
function skCheckUpdate(){
  var cur="1.1.1";
  try{cur=chrome.runtime.getManifest().version||cur;}catch(e){}
  fetch(SK_VER_URL,{cache:"no-store",credentials:"include"}).then(function(r){return r.json();}).then(function(v){
    if(v&&v.version&&skNewer(String(v.version),cur))skShowUpdate(v);
  }).catch(function(){});
}
try{skCheckUpdate();}catch(e){}

/* ================= connection diagnostics (v1.1.2) =================
   When a relay call fails, capture exactly what came back (status,
   content-type, first chars of the body) so the cause can be read from
   a screenshot. Also runs a one-time self-test on load. */
window._skDiag={selfTest:"not run yet",lastFail:null};
function skDiagFetch(url,opts){
  opts=opts||{};opts.credentials="include";
  return fetch(url,opts).then(function(r){
    return r.text().then(function(t){
      return {ok:true,status:r.status,ct:r.headers.get("content-type")||"",body:t.slice(0,220)};
    });
  }).catch(function(e){return {ok:false,error:String(e&&e.message||e)};});
}
function skSelfTest(){
  skDiagFetch(RELAY,{method:"GET"}).then(function(d){
    window._skDiag.selfTest=d;
  });
}
function skIsChallenge(x){
  return !!(x&&x.ok&&/aes\.js|toNumbers/.test(x.body||""));
}
function skDiagHTML(){
  var d=window._skDiag;
  function fmt(x){
    if(!x)return "—";
    if(x.ok)return "HTTP "+x.status+" ("+x.ct+") body: "+x.body;
    return "NETWORK ERROR: "+x.error;
  }
  return "self-test (no token, expects 403 JSON): "+fmt(d.selfTest)+
    "\nlast failed call: "+fmt(d.lastFail)+
    (d.captureErr?"\ntab capture error: "+d.captureErr:"");
}
function skChallengeHit(){
  var d=window._skDiag;
  return skIsChallenge(d.selfTest)||skIsChallenge(d.lastFail);
}
/* Auto-heal the bot challenge: if the host is challenging our API calls,
   silently open a background tab so the real browser clears it, then close it.
   The user never has to open the site manually. */
var SK_FIXING=false, SK_FIX_WAITERS=[];
var SK_LAST_HEAL=0, SK_HEAL_FAILS=0;
async function skEnsureCookie(){
  // Backoff: don't spam heals if they keep failing
  var now=Date.now();
  if(SK_HEAL_FAILS>=2&&(now-SK_LAST_HEAL)<300000)return false;
  // If a heal is already running, wait for it instead of failing
  if(SK_FIXING){
    return new Promise(function(res){
      SK_FIX_WAITERS.push(res);
      setTimeout(function(){res(false);}, 25000);
    });
  }
  if(SK_FIXING)return false;
  SK_FIXING=true;
  try{
    var t=await skDiagFetch(RELAY,{method:"GET"});
    window._skDiag.selfTest=t;
    if(t.ok&&!/aes\.js|toNumbers/.test(t.body||"")){
      SK_FIXING=false;
      SK_FIX_WAITERS.forEach(function(r){try{r(true);}catch(e){}});
      SK_FIX_WAITERS=[];
      return true;
    }
    // Challenged: let a real (background) tab complete it.
    var tab=await new Promise(function(res){
      try{chrome.tabs.create({url:"https://zero.page.gd/",active:false},function(tb){res(tb||null);});}
      catch(e){res(null);}
    });
    if(!tab||!tab.id){
      SK_FIXING=false;
      SK_FIX_WAITERS.forEach(function(r){try{r(false);}catch(e){}});
      SK_FIX_WAITERS=[];
      return false;
    }
    await skWaitLoad(tab.id,20000);
    try{chrome.tabs.remove(tab.id);}catch(e){}
    var t2=await skDiagFetch(RELAY,{method:"GET"});
    window._skDiag.selfTest=t2;
    SK_FIXING=false;
    var ok=t2.ok&&!/aes\.js|toNumbers/.test(t2.body||"");
    SK_LAST_HEAL=Date.now();
    if(ok)SK_HEAL_FAILS=0;else SK_HEAL_FAILS++;
    SK_FIX_WAITERS.forEach(function(r){try{r(ok);}catch(e){}});
    SK_FIX_WAITERS=[];
    return ok;
  }catch(e){
    SK_FIXING=false;
    SK_FIX_WAITERS.forEach(function(r){try{r(false);}catch(e){}});
    SK_FIX_WAITERS=[];
    return false;
  }
}
try{skEnsureCookie();}catch(e){}
try{skSelfTest();}catch(e){}
/* ================= Task mode — Zero drives YOUR browser directly =================
   No second extension, no pairing key, no relay. The Sidekick is already an
   extension in your browser, so it drives your tabs itself with a live feed.
   Safety: credential values are never read or displayed; credential fields are
   listed without values so they can only be filled via the viewer's secure
   masked input; never logs in as someone else, never buys/pays. */
function skLooksLikeTask(t){
  var s=String(t||"").trim();
  if(/^computer\s*:/i.test(s))return true;
  if(!s||s.length>220)return false;
  if(/^(hi+|hey|hello|thanks|thank you|bye)\b/i.test(s))return false;
  // Idioms that only sound like navigation ("go to sleep" is chat, not a task)
  if(/^(go|goto|navigate|head)\s+to\s+(sleep|bed|hell)\b/i.test(s))return false;
  var pats=[
    /^(go|goto|navigate|head)\s+to\s+/i,
    /^(open|visit|launch)\s+\S+\s*$/i, // "open gmail" — a bare site/app name only
    /^(open|visit|launch)\s+.+?\s+and\s+(play|search|type|click|find|look|scroll)\b/i, // "open youtube and play X" — driving
    /\btype\s+.+\s+in(to)?\s+the\s+(search|address)\s+(box|bar|field)\b/i,
    /\b(search|look\s+up)\s+.+\s+on\s+(google|youtube|amazon|bing)\b/i,
    /\bclick\s+(the|on)\s+/i,
    /\bfill\s+(in|out)\s+(the|this)\s+/i,
    /\bscroll\s+(down|up)\s+(the\s+)?page\b/i,
    /\b(book|find|get)\s+me\s+(a\s+)?(flight|hotel|ticket)/i,
    /\bdo\s+(this|it)\s+for\s+me\b/i
  ];
  for(var i=0;i<pats.length;i++){if(pats[i].test(s))return true;}
  return false;
}
function skActiveTab(){
  return new Promise(function(res){
    try{chrome.tabs.query({active:true,lastFocusedWindow:true},function(ts){res(ts&&ts[0]||null);});}
    catch(e){res(null);}
  });
}
function skWaitLoad(tabId,ms){
  ms=ms||12000;
  return new Promise(function(res){
    var done=false;
    function h(id,info){
      if(id===tabId&&info.status==="complete"){fin();}
    }
    function fin(){
      if(!done){done=true;try{chrome.tabs.onUpdated.removeListener(h);}catch(e){}res();}
    }
    try{chrome.tabs.onUpdated.addListener(h);}catch(e){}
    setTimeout(fin,ms);
  });
}
/* Drive the current tab directly. Every action runs locally — no relay. */
async function skTabExec(cmd,taskTabId){
  var tab=null;
  if(taskTabId){
    try{tab=await new Promise(function(res){try{chrome.tabs.get(taskTabId,function(t){res(t||null);});}catch(e){res(null);}});}catch(e2){}
  }else{
    tab=await skActiveTab();
  }
  if(!tab||!tab.id)throw new Error("no task tab");
  var url=tab.url||"";
  if(!skIsScriptable(url)&&cmd.action!=="navigate")
    throw new Error("I can't control this kind of page — navigate somewhere first.");
  switch(cmd.action){
    case "navigate":{
      if(!/^https?:\/\//i.test(cmd.url||""))throw new Error("bad url");
      if(/^(chrome|edge|about|chrome-extension):/i.test(cmd.url))throw new Error("can't open that page");
      await chrome.tabs.update(tab.id,{url:cmd.url});
      await skWaitLoad(tab.id);
      return {ok:true,data:{navigated:cmd.url}};
    }
    case "read":{
      var rs=await chrome.scripting.executeScript({target:{tabId:tab.id},func:function(){
        var out={title:document.title,url:location.href,text:(document.body?document.body.innerText:"").slice(0,4000),links:[],fields:[]};
        document.querySelectorAll("a[href]").forEach(function(a,i){
          if(i>=40)return;
          var t=(a.innerText||"").trim().replace(/\s+/g," ").slice(0,60);
          if(!t)return;
          out.links.push({text:t,href:a.href,sel:'a[href="'+a.href+'"]'});
        });
        document.querySelectorAll("input,textarea,select").forEach(function(el){
          var tp=(el.type||el.tagName).toLowerCase();
          if(tp==="hidden")return;
          // PRIVACY LOCK: credential fields are listed WITHOUT values (marked
          // cred:true) so the planner can target them for secure fill — their
          // values are never read or displayed.
          var isCred=false;
          try{
            var _id=String(el.id||"").toLowerCase(),_nm=String(el.name||"").toLowerCase(),
                _ph=String(el.placeholder||"").toLowerCase(),_ac=String(el.autocomplete||"").toLowerCase(),
                _cb=_id+" "+_nm+" "+_ph+" "+_ac;
            if(tp==="password"||/pass(word|phrase)|passwd|pwd/.test(_cb))isCred=true;
            else if(/user(name)?|login|signin|sign-in|account/.test(_cb))isCred=true;
            else if(tp==="email"||/e-?mail/.test(_cb))isCred=true;
            else if(/secret|token|api[-_]?key|auth/.test(_cb))isCred=true;
            else if(/current-password|new-password|username/.test(_ac))isCred=true;
          }catch(e){isCred=true;}
          var sel=el.name?el.tagName.toLowerCase()+'[name="'+el.name+'"]':(el.id?"#"+el.id:el.tagName.toLowerCase());
          if(isCred)out.fields.push({type:tp,sel:sel,cred:true});
          else out.fields.push({type:tp,sel:sel,value:String(el.value||"").slice(0,80)});
        });
        return out;
      }});
      if(!rs||!rs[0])throw new Error("couldn't read the page");
      return {ok:true,data:rs[0].result};
    }
    case "click":{
      await chrome.scripting.executeScript({target:{tabId:tab.id},func:function(sel){
        var el=document.querySelector(sel);if(!el)throw new Error("not found: "+sel);
        // PRIVACY LOCK: refuse to click login/submit buttons
        var txt=String(el.innerText||el.value||el.getAttribute("aria-label")||"").toLowerCase();
        var isSubmit=/log\s?in|sign\s?in|submit|continue/.test(txt)&&el.form;
        if(isSubmit){
          try{
            var pw=el.form.querySelector('input[type="password"]');
            if(pw)throw new Error("refused: login button");
          }catch(e){if(/refused/.test(e.message))throw e;}
        }
        el.scrollIntoView({block:"center"});el.click();
      },args:[cmd.selector]});
      await new Promise(function(r){setTimeout(r,1500);});
      return {ok:true,data:{clicked:cmd.selector}};
    }
    case "fill":{
      // Check if this is a credential field
      var credCheck=await chrome.scripting.executeScript({target:{tabId:tab.id},func:function(sel){
        var el=document.querySelector(sel);if(!el)return {isCred:false};
        var tp=String(el.type||"").toLowerCase();
        var cb=String(el.id||"").toLowerCase()+" "+String(el.name||"").toLowerCase()+" "+String(el.placeholder||"").toLowerCase()+" "+String(el.autocomplete||"").toLowerCase();
        var isCred=tp==="password"||/pass(word|phrase)|passwd|pwd|user(name)?|login|signin|e-?mail|secret|token|api[-_]?key|auth/.test(cb);
        if(!isCred&&/current-password|new-password|username/.test(String(el.autocomplete||"").toLowerCase()))isCred=true;
        return {isCred:isCred};
      },args:[cmd.selector]});
      var isCred=credCheck&&credCheck[0]&&credCheck[0].result&&credCheck[0].result.isCred;
      var fillVal=cmd.value||"";
      if(isCred&&!cmd._safeValue){
        // Need the user to provide it via the safe
        throw new Error("NEED_SAFE_INPUT:"+cmd.selector);
      }
      if(isCred&&cmd._safeValue)fillVal=cmd._safeValue;
      await chrome.scripting.executeScript({target:{tabId:tab.id},func:function(sel,val){
        var el=document.querySelector(sel);if(!el)throw new Error("not found: "+sel);
        el.focus();el.value=val;
        el.dispatchEvent(new Event("input",{bubbles:true}));
        el.dispatchEvent(new Event("change",{bubbles:true}));
      },args:[cmd.selector,fillVal]});
      return {ok:true,data:{filled:cmd.selector}};
    }
    case "shot":{
      if(taskTabId){
        try{await new Promise(function(res){try{chrome.tabs.update(taskTabId,{active:true},function(){res();});}catch(e){res();}});}catch(e){}
        await new Promise(function(r){setTimeout(r,400);});
      }
      var capWin=(taskTabId&&tab.windowId)?tab.windowId:null;
      var img=await new Promise(function(res,rej){
        try{
          var args=capWin?[capWin,{format:"jpeg",quality:80}]:[{format:"jpeg",quality:80}];
          chrome.tabs.captureVisibleTab.apply(chrome.tabs,args.concat([function(u){res(u||null);}]));
        }catch(e){rej(e);}
      });
      if(!img)throw new Error("screenshot failed");
      return {ok:true,data:{image:img},shot:true};
    }
  }
  throw new Error("unknown action");
}
function skPlanner(prompt){
  return fetchT(RELAY,{method:"POST",headers:relayHeaders("single",true),
    body:JSON.stringify({provider:"groq",model:"openai/gpt-oss-120b",temp:0.2,
      messages:[{role:"user",content:prompt}]})},30000)
    .then(function(r){return r.json();}).then(function(j){return j.answer||j.text||"";});
}
async function skHasTabAccess(){
  try{
    var tab=await skActiveTab();
    if(!tab||!tab.id)return false;
    await chrome.scripting.executeScript({target:{tabId:tab.id},func:function(){return true;}});
    return true;
  }catch(e){return false;}
}
/* Pull a navigable URL out of a PURE "go to X" / "open X" navigation request.
   Multi-word instructions ("go to google and type youtube") are NOT bare
   navigation — they need the planner to drive the tab, so this returns null
   for them instead of pointlessly googling the instruction text. */
var SK_KNOWN_SITES={
  google:"https://www.google.com",youtube:"https://www.youtube.com",
  facebook:"https://www.facebook.com",instagram:"https://www.instagram.com",
  twitter:"https://twitter.com",x:"https://x.com",reddit:"https://www.reddit.com",
  amazon:"https://www.amazon.com",netflix:"https://www.netflix.com",
  gmail:"https://mail.google.com",outlook:"https://outlook.live.com",
  yahoo:"https://www.yahoo.com",bing:"https://www.bing.com",
  duckduckgo:"https://duckduckgo.com",wikipedia:"https://www.wikipedia.org",
  github:"https://github.com",stackoverflow:"https://stackoverflow.com",
  linkedin:"https://www.linkedin.com",tiktok:"https://www.tiktok.com",
  twitch:"https://www.twitch.tv",discord:"https://discord.com",
  spotify:"https://open.spotify.com",zero:"https://zero.page.gd"
};
function skExtractGoUrl(task){
  var m=String(task||"").match(/^(?:go\s+to|open|visit|navigate\s+to)\s+(.+?)[\s.?!]*$/i);
  if(!m)return null;
  var raw=m[1].trim().replace(/[?!.,;:]+$/,"");
  if(!raw)return null;
  if(/\s/.test(raw)){
    // Multi-word: this is an instruction for the planner, not bare navigation.
    return null;
  }
  var s=raw.toLowerCase();
  if(SK_KNOWN_SITES[s])return SK_KNOWN_SITES[s];
  if(!/^https?:\/\//i.test(s)){
    if(s.indexOf(".")===-1){
      // Bare word, not a known site — search it instead of guessing a domain.
      return "https://www.google.com/search?q="+encodeURIComponent(s);
    }
    s="https://"+s;
  }
  try{
    var u=new URL(s);
    if(!/^https?:$/.test(u.protocol))return null;
    if(u.hostname.indexOf(".")===-1)return null; // reject https://google/ style non-domains
    return u.href;
  }catch(e){return null;}
}
/* Task mode cleanup: release the busy lock so chat works again. */
function taskDone(){busy=false;try{$("send").disabled=false;}catch(e){}}
/* Set when the viewer overrode task routing ("Not a task? Send as chat
   instead") — the next doSend must go to chat, not back into task mode. */
var skForceChatOnce=false;
async function skRunTask(task){
  if(busy)return;
  busy=true;$("send").disabled=true;
  task=String(task||"").replace(/^computer\s*:\s*/i,"").trim();
  addMsg("user",esc(task));zhist.push({role:"user",text:task});
  // (removed) driving permission gate — a request IS the permission now.
  try{localStorage.removeItem("sk_drive_perm");}catch(e){}
  // ---- Zero's own tab: every driving task gets a fresh tab; the viewer's tabs are never touched ----
  var taskTabId=null;
  try{
    var newTab=await new Promise(function(res){
      try{chrome.tabs.create({active:true},function(t){res(t||null);});}
      catch(e){res(null);}
    });
    if(newTab&&newTab.id)taskTabId=newTab.id;
  }catch(e){}
  if(!taskTabId){
    addMsg("ai","I couldn't open a new tab for this task. Try again in a moment.");
    taskDone();return;
  }

  // Simple "go to X": just navigate the fresh tab, no driving needed.
  // (Multi-step instructions return null from skExtractGoUrl and go to the planner below.)
  var goUrl=skExtractGoUrl(task);
  if(goUrl){
    try{await new Promise(function(res){chrome.tabs.update(taskTabId,{url:goUrl},function(){res();});});}catch(e){}
    addMsg("ai","Opened <b>"+esc(goUrl)+"</b> in a new tab of its own. Tell me what to do there next.");
    taskDone();return;
  }
  var card=document.createElement("div");card.className="msg ai";
  card.innerHTML='<div class="taskcard"><div class="taskcard-head"><div class="mark sm">0</div><div><div class="taskcard-title">Doing it for you</div><div class="taskcard-status">Starting…</div></div><span class="taskcard-stop" title="Stop">■</span></div>'+
    '<div style="margin-top:8px"><button class="taskcard-notask" style="background:none;border:none;color:var(--muted);font-size:11.5px;cursor:pointer;text-decoration:underline">Not a task? Send as chat instead</button></div>'+
    '<div class="tasklog"></div><div class="taskshots"></div></div>';
  $("msgs").appendChild(card);$("msgs").scrollTop=$("msgs").scrollHeight;
  var logEl=card.querySelector(".tasklog"),shotEl=card.querySelector(".taskshots"),stEl=card.querySelector(".taskcard-status");
  var markEl=card.querySelector(".taskcard .mark");
  var stopped=false;
  card.querySelector(".taskcard-stop").onclick=function(){stopped=true;stEl.textContent="Stopped";taskDone();};
  var _notask=card.querySelector(".taskcard-notask");
  if(_notask)_notask.onclick=function(){
    stopped=true;taskDone();
    card.remove();
    // Re-send as chat — bypass the task router or it would loop back here.
    qin.value=task;busy=false;$("send").disabled=false;
    skForceChatOnce=true;doSend();
  };
  function clog(t){var dv=document.createElement("div");dv.textContent="• "+t;logEl.appendChild(dv);logEl.scrollTop=logEl.scrollHeight;$("msgs").scrollTop=$("msgs").scrollHeight;}
  function cstatus(s){stEl.textContent=s;}
  function cshot(img){if(!img)return;var im=document.createElement("img");im.src=img;im.onclick=function(){window.open(img,"_blank");};shotEl.appendChild(im);$("msgs").scrollTop=$("msgs").scrollHeight;}
  function plannerPrompt(hist,pageUrl){
    return "You are driving the user's Chrome browser inside a FRESH new tab opened just for this task. Reply with ONLY a JSON object, no other text.\n\n"+
    "The user is currently on: "+(pageUrl||"(unknown page)")+"\n\n"+
    "Actions:\n"+
    '{"action":"navigate","url":"https://..."} — open a page\n'+
    '{"action":"read"} — read the current page: its text, links, and form fields (each link/field has a ready-to-use "sel" CSS selector; credential fields are marked cred:true with NO value — you may fill them only when the task clearly needs it, and the viewer types the value into a secure masked input; never ask for or display credential values)\n'+
    '{"action":"click","selector":"CSS selector"} — click an element; use the "sel" from read results\n'+
    '{"action":"fill","selector":"CSS selector","value":"text"} — type into a field; use the "sel" from read results\n'+
    '{"action":"shot"} — screenshot the page (do this before done, so the user sees proof)\n'+
    '{"action":"done","summary":"..."} — finished; write the final summary for the user\n\n'+
    "Rules: PRIVACY — For password, username, email, or login fields: you MAY fill them ONLY when the task clearly requires it; the user will be asked to type the value into a secure masked input (never shown or stored). NEVER read or display credential values. NEVER log in as someone else. NEVER buy, pay, or complete purchases. Prefer direct URLs (e.g. search URLs) over clicking through homepages. If a step fails twice, try another approach or finish with what you have. Be efficient — finish in as few steps as possible. Your first action should be navigate to the site this task needs (you are starting from a blank new tab).\n\n"+
    "Task: "+task+"\nSteps so far:\n"+(hist.length?hist.join("\n"):"(none yet)")+"\nNext action (JSON only):";
  }
  var hist=[];
  var consecFail=0; // consecutive action failures — planner gets retries, not infinite loops
  cstatus("Working…");
  var startUrl="";
  try{
    for(var step=0;step<12;step++){
      if(stopped)throw new Error("stopped by you");
      cstatus("Thinking… (step "+(step+1)+")");
      if(markEl){try{markEl.textContent=step+1;}catch(_me){}}
      var _pp=plannerPrompt(hist,startUrl);
      try{var _brainP=window.ZeroBrain&&window.ZeroBrain.planner();if(_brainP)_pp+="\n\nExtra instructions from Zero:\n"+_brainP;}catch(_pe){}
      var txt=await skPlanner(_pp);
      var jm=String(txt).match(/\{[\s\S]*\}/);
      if(!jm)throw new Error("planner went quiet");
      var act=null;
      try{act=JSON.parse(jm[0]);}
      catch(pe){
        // Retry once with a repair nudge
        clog("planner JSON garbled, retrying…");
        txt=await skPlanner(plannerPrompt(hist,startUrl)+"\n\nYour last reply wasn't valid JSON. Reply with ONLY the JSON object.");
        jm=String(txt).match(/\{[\s\S]*\}/);
        if(!jm)throw new Error("planner went quiet");
        try{act=JSON.parse(jm[0]);}
        catch(pe2){throw new Error("planner kept garbling its reply");}
      }
      if(!act||typeof act!=="object"||!act.action)throw new Error("planner went quiet");
      if(act.action==="done"){
        cstatus("Done");clog("Done");
        addMsg("ai",md(act.summary||"Done.")+'<br><br><i style="font-size:11.5px;opacity:.7">Done by Zero — it worked in its own new tab while you watched.</i>');
        zhist.push({role:"ai",text:String(act.summary||"Done.").slice(0,4000)});
        zhist=zhist.slice(-20);
        taskDone();return;
      }
      if(["navigate","read","click","fill","shot"].indexOf(act.action)===-1)throw new Error("unknown action");
      cstatus("Doing: "+act.action+"…");
      clog(act.action+(act.url?" — "+act.url:"")+(act.selector?" — "+act.selector:""));
      var res;
      try{
        res=await skTabExec(act,taskTabId);
        consecFail=0;
      }catch(ex){
        if(ex&&ex.message&&ex.message.indexOf("NEED_SAFE_INPUT:")===0){
          // Ask user for the sensitive value via the safe
          cstatus("Waiting for secure input…");
          clog("needs secure input — waiting for you");
          var safeVal=await skAskSafeInput("This step needs a sensitive value (like a password). Type it below — it's masked, used once, and never shown or saved.");
          if(!safeVal){throw new Error("cancelled by you");}
          if(stopped)throw new Error("stopped by you");
          act._safeValue=safeVal;
          res=await skTabExec(act,taskTabId);
          act._safeValue=null; // Clear immediately
          safeVal=null;
          clog("secure input used and cleared");
          consecFail=0;
        }else{
          // Feed the failure back to the planner so it can try another approach,
          // instead of killing the whole task on one bad step.
          consecFail++;
          var fmsg=String((ex&&ex.message)||"error").slice(0,200);
          clog("that step failed: "+fmsg);
          hist.push((step+1)+". "+act.action+" "+(act.url||act.selector||"")+" → FAILED: "+fmsg);
          if(hist.length>8)hist=hist.slice(-8);
          if(consecFail>=3)throw new Error("kept failing ("+fmsg.slice(0,120)+") — stopped to be safe");
          continue;
        }
      }
      if(res.shot)cshot(res.data.image);
      // Keep planner's page URL fresh after navigation
      if(act.action==="navigate"&&res.ok&&res.data&&res.data.navigated)startUrl=res.data.navigated;
      var rtxt=res.ok?(res.shot?"[screenshot taken]":JSON.stringify(res.data).slice(0,2000)):("FAILED: "+(res.error||"unknown"));
      hist.push((step+1)+". "+act.action+" "+(act.url||act.selector||"")+" → "+rtxt.slice(0,200));
      if(hist.length>8)hist=hist.slice(-8);
    }
    cstatus("Done");
    addMsg("ai","I used all my steps. Here's where it got to:<br>"+esc(hist.join("\n")).replace(/\n/g,"<br>"));
    taskDone();
  }catch(e){
    var emsg=String((e&&e.message)||"unknown error");
    if(emsg==="stopped by you"||emsg==="cancelled by you"){
      cstatus("Stopped");
      addMsg("ai","Stopped — the new tab is still open if you want to take over from here.");
    }else{
      cstatus("Error");
      addMsg("ai","The task hit a problem: "+esc(emsg));
    }
    taskDone();
  }
}

/* chat history removed per user request */

