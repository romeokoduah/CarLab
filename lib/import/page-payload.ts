/**
 * The "Send to Eclipse Motors" browser bookmark, and the payload it hands the
 * importer.
 *
 * che168 now sends this server's traffic to its security check
 * (`captcha.aspx`), so the server can no longer open a listing itself. The
 * admin's own browser still can. The bookmark runs on the listing the admin is
 * looking at, reads the same two things the server scrape read — the page text
 * and the gallery photo links — and copies them behind a prefix. Pasting that
 * into the import box sends it through the same pipeline: DeepSeek, pricing,
 * photos.
 *
 * Client-safe on purpose: the car form imports the prefix and the bookmark
 * link, so nothing server-only may be imported here.
 */

export const PAGE_PAYLOAD_PREFIX = "EMIMPORT1:";

/** Text only a loaded listing shows: mileage, registration date, transfers. */
export const LISTING_MARKERS = /表显里程|上牌时间|过户次数/;

const MAX_TEXT = 300_000;
const MAX_IMAGES = 200;

export interface PagePayload {
  url: string;
  title: string;
  text: string;
  images: string[];
}

export class PagePayloadError extends Error {}

export function isPagePayload(raw: string): boolean {
  return raw.trim().startsWith(PAGE_PAYLOAD_PREFIX);
}

/** The listing title from a pasted payload, to show what is queued. Never throws. */
export function pagePayloadTitle(raw: string): string {
  try {
    const title = JSON.parse(raw.trim().slice(PAGE_PAYLOAD_PREFIX.length)).title;
    return typeof title === "string" ? title.slice(0, 200) : "";
  } catch {
    return "";
  }
}

/**
 * Validates a pasted payload.
 *
 * The server downloads every photo link in it, so only che168's own image CDN
 * (autoimg.cn) is accepted, on the default port with no credentials — anything
 * looser would let a pasted payload make the server fetch arbitrary addresses.
 */
export function decodePagePayload(raw: string): PagePayload {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(PAGE_PAYLOAD_PREFIX)) {
    throw new PagePayloadError(
      "That isn't a page copied with the Send to Eclipse Motors bookmark.",
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed.slice(PAGE_PAYLOAD_PREFIX.length));
  } catch {
    throw new PagePayloadError(
      "The copied page was cut off. Click the bookmark on the listing again and paste the whole thing.",
    );
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new PagePayloadError("The copied page is not in the expected format.");
  }
  const d = data as Record<string, unknown>;

  const url = typeof d.url === "string" ? d.url : "";
  let host = "";
  try {
    const u = new URL(url);
    if (u.protocol === "https:" || u.protocol === "http:") host = u.hostname;
  } catch {
    // leave host empty
  }
  if (!/(^|\.)che168\.com$/.test(host)) {
    throw new PagePayloadError("The copied page isn't a che168.com listing.");
  }

  const text = typeof d.text === "string" ? d.text : "";
  if (!text.trim()) {
    throw new PagePayloadError(
      "The copied page had no text. Wait for the listing to load, then click the bookmark again.",
    );
  }
  if (text.length > MAX_TEXT) {
    throw new PagePayloadError("The copied page is too large to be a single listing.");
  }

  const images: string[] = [];
  for (const candidate of Array.isArray(d.images) ? d.images : []) {
    if (typeof candidate !== "string") continue;
    let u: URL;
    try {
      u = new URL(candidate);
    } catch {
      continue;
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") continue;
    if (!/(^|\.)autoimg\.cn$/.test(u.hostname)) continue;
    if (u.port || u.username || u.password) continue;
    u.protocol = "https:";
    u.search = "";
    u.hash = "";
    const clean = u.toString();
    if (!images.includes(clean)) images.push(clean);
    if (images.length >= MAX_IMAGES) break;
  }

  return {
    url,
    title: typeof d.title === "string" ? d.title.slice(0, 200) : "",
    text,
    images,
  };
}

/**
 * The bookmark itself. Plain ES2017 in a string so no bundler rewrites it:
 * it scrolls the listing once (the gallery lazy-loads its links), reads the
 * text and the 900x675 gallery photos — the same selection the server scrape
 * uses — and shows a small panel with a Copy button. Copying from a click
 * rather than straight away keeps the browser's clipboard permission happy.
 */
export const BOOKMARKLET_SOURCE = String.raw`(function(){
var PREFIX=${JSON.stringify(PAGE_PAYLOAD_PREFIX)};
var ID="em-import-panel";
var old=document.getElementById(ID);
if(old&&old.parentNode){old.parentNode.removeChild(old);}
var MARKERS=/表显里程|上牌时间|过户次数/;
function collect(){
  var text=(document.body?document.body.innerText:"").replace(/\n{2,}/g,"\n");
  var seen={},images=[];
  var imgs=document.querySelectorAll("img");
  for(var i=0;i<imgs.length;i++){
    var im=imgs[i];
    var c=[im.currentSrc,im.getAttribute("src"),im.getAttribute("data-src"),im.getAttribute("data-original")];
    for(var j=0;j<c.length;j++){
      var s=c[j];
      if(!s||!/autoimg\.cn/.test(s)||!/900x675/.test(s)){continue;}
      if(s.indexOf("//")===0){s="https:"+s;}
      s=s.split("?")[0];
      if(!seen[s]){seen[s]=1;images.push(s);}
    }
  }
  return {v:1,url:location.href,title:document.title,text:text,images:images};
}
function el(tag,css,txt){var e=document.createElement(tag);e.style.cssText=css;if(txt){e.textContent=txt;}return e;}
function show(){
  var data=collect();
  var payload=PREFIX+JSON.stringify(data);
  var ok=MARKERS.test(data.text);
  var price=(data.text.match(/¥\s*[\d.]+\s*万/)||[""])[0];
  var km=(data.text.match(/表显里程\s*([\d.]+万?公里)/)||["",""])[1];
  var box=el("div","position:fixed;top:16px;right:16px;z-index:2147483647;width:340px;max-width:calc(100vw - 32px);background:#fff;color:#111;border:2px solid #1325A5;border-radius:12px;padding:16px;font:14px/1.45 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.25);text-align:left");
  box.id=ID;
  box.setAttribute("data-payload",payload);
  box.appendChild(el("div","font-weight:700;font-size:15px;margin-bottom:8px","Send to Eclipse Motors"));
  if(ok){
    box.appendChild(el("div","margin-bottom:4px",data.title));
    box.appendChild(el("div","margin-bottom:12px;color:#444","Price "+(price||"not found")+" · Mileage "+(km||"not found")+" · "+data.images.length+" photos"));
  }else{
    box.appendChild(el("div","margin-bottom:12px;color:#b00020","This page isn't showing the car's details yet. Wait until the price and mileage appear, or finish che168's check, then click the bookmark again."));
  }
  var btn=el("button","display:block;width:100%;padding:10px;border:0;border-radius:8px;background:#1325A5;color:#fff;font-weight:700;cursor:pointer;margin-bottom:8px",ok?"Copy for Eclipse Motors":"Copy anyway");
  var note=el("div","color:#444;font-size:12px;margin-top:8px","");
  btn.onclick=function(){
    function done(){btn.textContent="Copied";note.textContent="Now open Add car on Eclipse Motors, click in the import box, paste (Ctrl+V) and click Import.";}
    function fallback(){
      var t=document.createElement("textarea");
      t.value=payload;t.style.cssText="position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(t);t.select();
      var copied=false;try{copied=document.execCommand("copy");}catch(e){}
      document.body.removeChild(t);
      if(copied){done();}else{note.textContent="The browser blocked copying. Click the button again.";}
    }
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(payload).then(done,fallback);}else{fallback();}
  };
  var close=el("button","display:block;width:100%;padding:8px;border:1px solid #ccc;border-radius:8px;background:#fff;color:#111;cursor:pointer","Close");
  close.onclick=function(){if(box.parentNode){box.parentNode.removeChild(box);}};
  box.appendChild(btn);box.appendChild(close);box.appendChild(note);
  document.body.appendChild(box);
}
var y=0,h=document.body?document.body.scrollHeight:0,start=window.scrollY;
(function step(){
  if(y<h){window.scrollTo(0,y);y+=800;setTimeout(step,60);}
  else{window.scrollTo(0,start);setTimeout(show,300);}
})();
})();`;

export const BOOKMARKLET_HREF = `javascript:${encodeURIComponent(BOOKMARKLET_SOURCE)}`;
