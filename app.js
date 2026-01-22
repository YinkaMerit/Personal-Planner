
/* ---------- Landscape Detection for PWA ---------- */
function checkOrientation() {
  const isLandscape = window.innerWidth > window.innerHeight && window.innerWidth < 1024;
  const blocker = document.querySelector('.landscape-blocker');
  const app = document.querySelector('.app');
  
  if (blocker && app) {
    if (isLandscape) {
      blocker.style.display = 'flex';
      app.style.display = 'none';
    } else {
      blocker.style.display = 'none';
      app.style.display = '';
    }
  }
}

// Check on load and resize
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', () => {
  setTimeout(checkOrientation, 100);
});
document.addEventListener('DOMContentLoaded', checkOrientation);

function verseOfDay(dateKeyStr){
  // Offline, simple rotating set (KJV-style wording). Not a substitute for a full Bible integration.
  const verses = [
    { ref:"Jeremiah 29:11", text:"For I know the plans I have for you, saith the LORD, plans for good and not for disaster, to give you a future and a hope."},
    { ref:"Psalm 23:1", text:"The LORD is my shepherd; I shall not want."},
    { ref:"Philippians 4:6-7", text:"Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus."},
    { ref:"Isaiah 41:10", text:"Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness."},
    { ref:"Romans 8:28", text:"And we know that all things work together for good to them that love God, to them who are the called according to his purpose."},
    { ref:"Proverbs 3:5-6", text:"Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths."},
    { ref:"Matthew 11:28", text:"Come unto me, all ye that labour and are heavy laden, and I will give you rest."}
  ];
  // simple deterministic hash
  let h = 0;
  const s = String(dateKeyStr||"");
  for(let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) >>> 0;
  return verses[h % verses.length];
}

import { getAll, put, del, exportAll, importAll } from "./db.js";
import { uuid, dayKey, monthKey, startOfDay, addDays, clamp, formatDate, formatShort, minsToHHMM, hhmmToMins, weekStart } from "./utils.js";

/* ---------- Toast notification ---------- */
function toast(message, duration = 3000) {
  // Remove existing toast if any
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  
  const toastEl = document.createElement('div');
  toastEl.className = 'toast-notification';
  toastEl.textContent = message;
  document.body.appendChild(toastEl);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toastEl.classList.add('show');
  });
  
  // Auto remove
  setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => toastEl.remove(), 300);
  }, duration);
}

const PILLARS = [
  { key:"fitness", name:"Fitness" },
  { key:"finance", name:"Finance" },
  { key:"relationships", name:"Relationships" },
  { key:"spiritual", name:"Spiritual" },
];

const START_MINS = 0;
const END_MINS = 24*60;
const PX_PER_MIN = 1;  // schedule scale
const SNAP = 15;       // 15-min snapping

/* ---------- Selected Date (for viewing past/future days) ---------- */
let selectedDate = new Date(); // Default to today

function getSelectedDate() {
  return selectedDate;
}

function setSelectedDate(date) {
  selectedDate = date instanceof Date ? date : new Date(date);
  // Update the date picker in the header if it exists
  const picker = document.getElementById("globalDatePicker");
  if (picker) picker.value = dayKey(selectedDate);
}

function getSelectedDayKey() {
  return dayKey(selectedDate);
}

function isSelectedDateToday() {
  return dayKey(selectedDate) === dayKey(new Date());
}


// Special song for January 24th
const SPECIAL_SONGS = {
  "2026-01-24": { artist:"Ryan Ofei", title:"Celebrate", ytId:"ZY1hOYo3_c4" },
  "2025-01-24": { artist:"Ryan Ofei", title:"Celebrate", ytId:"ZY1hOYo3_c4" },
  "2027-01-24": { artist:"Ryan Ofei", title:"Celebrate", ytId:"ZY1hOYo3_c4" },
  "2028-01-24": { artist:"Ryan Ofei", title:"Celebrate", ytId:"ZY1hOYo3_c4" },
  "2029-01-24": { artist:"Ryan Ofei", title:"Celebrate", ytId:"ZY1hOYo3_c4" },
  "2030-01-24": { artist:"Ryan Ofei", title:"Celebrate", ytId:"ZY1hOYo3_c4" },
};

const RNB_LOVE = [
  // Chris Brown
  { artist:"Chris Brown", title:"With You", ytId:"nmjdaBaZe8Y" },
  { artist:"Chris Brown", title:"Forever", ytId:"5sMKX22BHeE" },
  { artist:"Chris Brown", title:"Say Goodbye", ytId:"GJ26gAc7BtU" },
  { artist:"Chris Brown", title:"Yo (Excuse Me Miss)", ytId:"yn_6LC4loY8" },
  { artist:"Chris Brown", title:"Run It", ytId:"w6QGe-pXgdI" },
  { artist:"Chris Brown", title:"Take You Down", ytId:"pydyGAqR11Y" },
  { artist:"Chris Brown", title:"No Air", ytId:"WBKnpyoFEBo" },
  { artist:"Chris Brown", title:"Superhuman", ytId:"fhMlSITt7hU" },
  
  // Keyshia Cole
  { artist:"Keyshia Cole", title:"Love", ytId:"9PBZy9j3H3I" },
  { artist:"Keyshia Cole", title:"I Should Have Cheated", ytId:"29qvbeDA0iU" },
  { artist:"Keyshia Cole", title:"Let It Go", ytId:"Hybj2Gfk6G8" },
  { artist:"Keyshia Cole", title:"Heaven Sent", ytId:"POkQXeTv7-4" },
  { artist:"Keyshia Cole", title:"I Remember", ytId:"3v3T_KxvFyM" },
  { artist:"Keyshia Cole", title:"Fallin Out", ytId:"lQjJ8_k1gI8" },
  { artist:"Keyshia Cole", title:"I Changed My Mind", ytId:"LbE1qz8wktQ" },
  { artist:"Keyshia Cole", title:"Trust", ytId:"SkOTimhMwSs" },
  
  // Rihanna
  { artist:"Rihanna", title:"Unfaithful", ytId:"rp4UwPZfRis" },
  { artist:"Rihanna", title:"Take A Bow", ytId:"J3UjJ4wKLkg" },
  { artist:"Rihanna", title:"Umbrella", ytId:"CvBfHwUxHIk" },
  { artist:"Rihanna", title:"We Found Love", ytId:"tg00YEETFzg" },
  { artist:"Rihanna", title:"Stay", ytId:"JF8BRvqGCNs" },
  { artist:"Rihanna", title:"Diamonds", ytId:"lWA2pjMjpBs" },
  { artist:"Rihanna", title:"California King Bed", ytId:"nhBorPm6JjQ" },
  { artist:"Rihanna", title:"What's My Name", ytId:"U0CGsw6h60k" },
  { artist:"Rihanna", title:"Love On The Brain", ytId:"QMP-o8WXSPM" },
  
  // Nicki Minaj
  { artist:"Nicki Minaj", title:"Your Love", ytId:"pSFyrrhKj1Q" },
  { artist:"Nicki Minaj", title:"Right By My Side", ytId:"he3DJLXbebI" },
  { artist:"Nicki Minaj", title:"Moment 4 Life", ytId:"Ks3_kuRAzHs" },
  { artist:"Nicki Minaj", title:"Save Me", ytId:"AN3KSuzjhbU" },
  { artist:"Nicki Minaj", title:"Grand Piano", ytId:"nFdvtuGYqUU" },
  
  // Mariah Carey
  { artist:"Mariah Carey", title:"Touch My Body", ytId:"9b8erWuBA44" },
  { artist:"Mariah Carey", title:"We Belong Together", ytId:"0habxsuXW4g" },
  { artist:"Mariah Carey", title:"Always Be My Baby", ytId:"LfRNRymrv9k" },
  { artist:"Mariah Carey", title:"Vision of Love", ytId:"tov22NtCMC4" },
  { artist:"Mariah Carey", title:"Hero", ytId:"0IA3ZvCkRkQ" },
  { artist:"Mariah Carey", title:"My All", ytId:"mIhI23gBBPQ" },
  { artist:"Mariah Carey", title:"Emotions", ytId:"NrJEFrth27Q" },
  { artist:"Mariah Carey", title:"Fantasy", ytId:"qq09UkPRdFY" },
  
  // Fantasia
  { artist:"Fantasia", title:"When I See U", ytId:"R8iqEfje7Aw" },
  { artist:"Fantasia", title:"Free Yourself", ytId:"BWs3fs9nnzc" },
  { artist:"Fantasia", title:"Truth Is", ytId:"e265_NvKvRQ" },
  { artist:"Fantasia", title:"I Believe", ytId:"KcdURLaRa-I" },
  { artist:"Fantasia", title:"Bittersweet", ytId:"80lh4Oj2Ys4" },
  
  // Boyz II Men
  { artist:"Boyz II Men", title:"End of the Road", ytId:"zDKO6XYXioc" },
  { artist:"Boyz II Men", title:"I'll Make Love to You", ytId:"fV8vB1BB2qc" },
  { artist:"Boyz II Men", title:"On Bended Knee", ytId:"jSUSFow70no" },
  { artist:"Boyz II Men", title:"Water Runs Dry", ytId:"9N9opF-PK5k" },
  { artist:"Boyz II Men", title:"A Song for Mama", ytId:"se2dmYLfaHI" },
  
  // TLC
  { artist:"TLC", title:"No Scrubs", ytId:"FrLequ6dUdM" },
  { artist:"TLC", title:"Waterfalls", ytId:"8WEtxJ4-sh4" },
  { artist:"TLC", title:"Creep", ytId:"LlZydtG3xqI" },
  { artist:"TLC", title:"Red Light Special", ytId:"dP2t9LBeAwo" },
  
  // Aaliyah
  { artist:"Aaliyah", title:"Are You That Somebody", ytId:"uTMuqL0qx08" },
  { artist:"Aaliyah", title:"One in a Million", ytId:"KKSz4NE6PwY" },
  { artist:"Aaliyah", title:"Try Again", ytId:"qTA0RuZoIxM" },
  { artist:"Aaliyah", title:"Rock the Boat", ytId:"3HSJU5fDg0A" },
  { artist:"Aaliyah", title:"Back and Forth", ytId:"a02dBbBGSPg" },
  
  // Destiny's Child
  { artist:"Destiny's Child", title:"Say My Name", ytId:"sQgd6MccwZc" },
  { artist:"Destiny's Child", title:"Bills Bills Bills", ytId:"NiF6-0UTqtc" },
  { artist:"Destiny's Child", title:"Cater 2 U", ytId:"juqws1LIH-I" },
  { artist:"Destiny's Child", title:"Survivor", ytId:"Wmc8bQoL-J0" },
  { artist:"Destiny's Child", title:"Bootylicious", ytId:"IyYnnUcgeMc" },
  
  // Mary J. Blige
  { artist:"Mary J. Blige", title:"Real Love", ytId:"OSmGu5LBs7E" },
  { artist:"Mary J. Blige", title:"Be Without You", ytId:"8XNaPX6MKlU" },
  { artist:"Mary J. Blige", title:"Family Affair", ytId:"znlFu_lemsU" },
  { artist:"Mary J. Blige", title:"No More Drama", ytId:"em328ua_Lo8" },
  { artist:"Mary J. Blige", title:"Not Gon Cry", ytId:"YXHBuIXAiXo" },
  
  // Jodeci
  { artist:"Jodeci", title:"Forever My Lady", ytId:"qZCPgfEZvzQ" },
  { artist:"Jodeci", title:"Come and Talk to Me", ytId:"_WhlGjHUz4I" },
  { artist:"Jodeci", title:"Cry for You", ytId:"Iznvc-eqKpU" },
  { artist:"Jodeci", title:"Feenin", ytId:"_gjTIvpR0zw" },
  
  // SWV
  { artist:"SWV", title:"Weak", ytId:"976b8TPPFJU" },
  { artist:"SWV", title:"Right Here", ytId:"vHwXoY0LiQk" },
  { artist:"SWV", title:"I'm So Into You", ytId:"FL-pm-xRb40" },
  
  // Toni Braxton
  { artist:"Toni Braxton", title:"Un-Break My Heart", ytId:"p2Rch6WvPJE" },
  { artist:"Toni Braxton", title:"Breathe Again", ytId:"pRFEz2MjZgg" },
  { artist:"Toni Braxton", title:"Another Sad Love Song", ytId:"2yQ0Fll_9pM" },
  { artist:"Toni Braxton", title:"You're Makin Me High", ytId:"wIgOL21S98o" },
  
  // Brian McKnight
  { artist:"Brian McKnight", title:"Back at One", ytId:"rXPfovXw2tw" },
  { artist:"Brian McKnight", title:"One Last Cry", ytId:"sz-NhGanOAE" },
  { artist:"Brian McKnight", title:"Anytime", ytId:"A1kzG9Ld1kI" },
  
  // 112
  { artist:"112", title:"Cupid", ytId:"8dtzMPApA4M" },
  { artist:"112", title:"Peaches and Cream", ytId:"wl2NCXzg1FQ" },
  { artist:"112", title:"It's Over Now", ytId:"IihCzGUEPbs" },
  
  // Dru Hill
  { artist:"Dru Hill", title:"In My Bed", ytId:"_Ixip0K2r10" },
  { artist:"Dru Hill", title:"Never Make a Promise", ytId:"JAnA6c7Jql4" },
  { artist:"Dru Hill", title:"How Deep Is Your Love", ytId:"43XWafBLJIM" },
  { artist:"Dru Hill", title:"Beauty", ytId:"L3w7FHq2EYE" },
  
  // Ginuwine
  { artist:"Ginuwine", title:"Pony", ytId:"lbnoG2dsUk0" },
  { artist:"Ginuwine", title:"Differences", ytId:"U_90XNCBatY" },
  { artist:"Ginuwine", title:"So Anxious", ytId:"DHpUtOcwhyU" },
  
  // Monica
  { artist:"Monica", title:"Angel of Mine", ytId:"3eOuK-pYhy4" },
  { artist:"Monica", title:"Don't Take It Personal", ytId:"asXau88O5Is" },
  { artist:"Monica", title:"The Boy Is Mine", ytId:"qSIOp_K5GMw" },
  
  // Brandy
  { artist:"Brandy", title:"Have You Ever", ytId:"Xkj1An6Wnec" },
  { artist:"Brandy", title:"Sittin Up in My Room", ytId:"yge2PqEZZJo" },
  { artist:"Brandy", title:"I Wanna Be Down", ytId:"PzpLkcfBe-A" },
  
  // Joe
  { artist:"Joe", title:"I Wanna Know", ytId:"dJ8VjyPw0qY" },
  { artist:"Joe", title:"All the Things Your Man Won't Do", ytId:"cVi25pSRAkc" },
  { artist:"Joe", title:"Stutter", ytId:"eODhO-sA9aQ" },
  
  // Jagged Edge
  { artist:"Jagged Edge", title:"Let's Get Married", ytId:"Mo1HaVN1Pt0" },
  { artist:"Jagged Edge", title:"Where the Party At", ytId:"9UCY_U4QwqI" },
  { artist:"Jagged Edge", title:"Promise", ytId:"lXd1GHJPx-A" },
  
  // Next
  { artist:"Next", title:"Too Close", ytId:"kwEZRPkAAu8" },
  { artist:"Next", title:"Wifey", ytId:"aGFZq4od-VQ" },
  
  // En Vogue
  { artist:"En Vogue", title:"Don't Let Go Love", ytId:"mwhwGmoYv1s" },
  { artist:"En Vogue", title:"My Lovin", ytId:"JIuYQ_4TcXg" },
  { artist:"En Vogue", title:"Free Your Mind", ytId:"i7iQbBbMAFE" },
  
  // Xscape
  { artist:"Xscape", title:"Just Kickin It", ytId:"w_BTEFAVwjU" },
  { artist:"Xscape", title:"Understanding", ytId:"HR5J5jUDcnA" },
  { artist:"Xscape", title:"Who Can I Run To", ytId:"xLjyPBQk_Os" },
  
  // Blackstreet
  { artist:"Blackstreet", title:"No Diggity", ytId:"3KL9mRus19o" },
  { artist:"Blackstreet", title:"Before I Let You Go", ytId:"kC6TnBx0HIU" },
  { artist:"Blackstreet", title:"Don't Leave Me", ytId:"DBUz2nkOKsc" },
  
  // Tevin Campbell
  { artist:"Tevin Campbell", title:"Can We Talk", ytId:"3SoYkCAzMBk" },
  { artist:"Tevin Campbell", title:"I'm Ready", ytId:"F6Ns_uiu-yg" },
  
  // Babyface
  { artist:"Babyface", title:"Whip Appeal", ytId:"fh5ejGUTGAo" },
  { artist:"Babyface", title:"When Can I See You", ytId:"Ee9SCW91urE" },
  { artist:"Babyface", title:"Every Time I Close My Eyes", ytId:"GbrSO81KhBY" },
  
  // New Edition
  { artist:"New Edition", title:"Can You Stand the Rain", ytId:"7flrKMGfwjw" },
  { artist:"New Edition", title:"If It Isn't Love", ytId:"ReI6gvzVP0Y" },
  
  // Bell Biv DeVoe
  { artist:"Bell Biv DeVoe", title:"Poison", ytId:"hgnhVcyLy1I" },
  { artist:"Bell Biv DeVoe", title:"Do Me", ytId:"ZieygZyvw4A" },
  
  // Usher
  { artist:"Usher", title:"You Make Me Wanna", ytId:"bQRzrnH6_HY" },
  { artist:"Usher", title:"Nice and Slow", ytId:"DIpQ4AZSAf8" },
  { artist:"Usher", title:"U Remind Me", ytId:"Bxau9B3jOHM" },
  { artist:"Usher", title:"U Got It Bad", ytId:"o3IWTfcks4k" },
  { artist:"Usher", title:"Burn", ytId:"t5XNWFw5HVw" },
  { artist:"Usher", title:"Confessions Part II", ytId:"5Sy19X0xxrM" },
  { artist:"Usher", title:"There Goes My Baby", ytId:"m6urbZyHgO4" },
  
  // Luther Vandross
  { artist:"Luther Vandross", title:"Never Too Much", ytId:"pNj9bXKGOiI" },
  { artist:"Luther Vandross", title:"Here and Now", ytId:"0u_u4nlYmNs" },
  
  // Anita Baker
  { artist:"Anita Baker", title:"Sweet Love", ytId:"2w6udgiojlE" },
  { artist:"Anita Baker", title:"Giving You the Best That I Got", ytId:"gKGj8XwooYQ" },
  
  // Beyonce
  { artist:"Beyonce", title:"Halo", ytId:"bnVUHWCynig" },
  { artist:"Beyonce", title:"Love On Top", ytId:"Ob7vObnFUJc" },
  { artist:"Beyonce", title:"Dangerously In Love", ytId:"4Xemq4xCSEA" },
  { artist:"Beyonce", title:"Me Myself and I", ytId:"4S37SGxZSMc" },
  { artist:"Beyonce", title:"Irreplaceable", ytId:"2EwViQxSJJQ" },
  
  // Alicia Keys
  { artist:"Alicia Keys", title:"If I Ain't Got You", ytId:"Ju8Hr50Ckwk" },
  { artist:"Alicia Keys", title:"No One", ytId:"rywUS-ohqeE" },
  { artist:"Alicia Keys", title:"Fallin", ytId:"Urdlvw0SSEc" },
  { artist:"Alicia Keys", title:"You Don't Know My Name", ytId:"_ST6ZRbhGiA" },
  
  // Ciara
  { artist:"Ciara", title:"Promise", ytId:"UcGWy7xUZQE" },
  { artist:"Ciara", title:"And I", ytId:"pG-lVf8f0Ks" },
  { artist:"Ciara", title:"Body Party", ytId:"B9rSBcoX9ak" },
  
  // Ashanti
  { artist:"Ashanti", title:"Foolish", ytId:"gUPrnu3BEU8" },
  { artist:"Ashanti", title:"Happy", ytId:"MrCsubL_OSQ" },
  { artist:"Ashanti", title:"Baby", ytId:"QThbui6twrI" },
];

function pickDailyRnB(dateKeyStr){
  // Check for special date first
  if (SPECIAL_SONGS[dateKeyStr]) {
    return SPECIAL_SONGS[dateKeyStr];
  }
  
  // Deterministic daily pick, no internet needed
  let h = 2166136261;
  for (let i=0; i<dateKeyStr.length; i++){
    h ^= dateKeyStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % RNB_LOVE.length;
  return RNB_LOVE[idx];
}



const pageHost = document.getElementById("pageHost");
const drawer = document.getElementById("drawer");

const modal = {
  backdrop: document.getElementById("modalBackdrop"),
  title: document.getElementById("modalTitle"),
  body: document.getElementById("modalBody"),
  footer: document.getElementById("modalFooter"),
  closeBtn: document.getElementById("modalClose"),
  open({title, body, footer}){
    this.title.textContent = title || "";
    this.body.innerHTML = "";
    this.body.append(body);
    this.footer.innerHTML = "";
    this.footer.append(footer);
    this.backdrop.classList.remove("hidden");
    this.backdrop.setAttribute("aria-hidden", "false");
  },
  close(){
    this.backdrop.classList.add("hidden");
    this.backdrop.setAttribute("aria-hidden", "true");
  }
};
modal.closeBtn.addEventListener("click", ()=>modal.close());
modal.backdrop.addEventListener("click", (e)=>{ if (e.target === modal.backdrop) modal.close(); });


/* ---------- Modal helpers ---------- */
function showModal(title, bodyNode, footerNode){
  return new Promise((resolve)=>{
    const footer = footerNode || el("div",{class:"row"},[
      btn("Close",{kind:"ghost", onclick: ()=>{ modal.close(); resolve(true); }})
    ]);
    modal.open({ title, body: bodyNode, footer });

    // Close via X/backdrop should also resolve
    const done = (v)=>{
      try{ resolve(v); }catch(_){}
    };
    const onX = ()=>done(false);
    const onBack = (e)=>{ if(e.target === modal.backdrop) done(false); };
    modal.closeBtn.addEventListener("click", onX, {once:true});
    modal.backdrop.addEventListener("click", onBack, {once:true});
  });
}

function confirmModal(title, bodyNode, confirmText="OK"){
  return new Promise((resolve)=>{
    const okBtn = btn(confirmText,{onclick: ()=>{ modal.close(); resolve(true); }});
    const cancelBtn = btn("Cancel",{kind:"ghost", onclick: ()=>{ modal.close(); resolve(false); }});
    const footer = el("div",{class:"row"},[cancelBtn, okBtn]);
    modal.open({ title, body: bodyNode, footer });

    const onX = ()=>resolve(false);
    const onBack = (e)=>{ if(e.target === modal.backdrop) resolve(false); };
    modal.closeBtn.addEventListener("click", onX, {once:true});
    modal.backdrop.addEventListener("click", onBack, {once:true});
  });
}

/* ---------- UI helpers ---------- */
function el(tag, attrs={}, children=[]){
  const n = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)){
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k === "style") n.style.cssText = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of children) n.append(c);
  return n;
}
function btn(text, opts={}){
  return el("button", { class:`btn ${opts.kind||""}`.trim(), onclick: opts.onclick }, [document.createTextNode(text)]);
}
function card(title, desc, body, right=null){
  const headLeft = el("div", {}, [
    el("div", {class:"t"}, [document.createTextNode(title)]),
    desc ? el("div", {class:"d"}, [document.createTextNode(desc)]) : el("div", {class:"d"}, [])
  ]);
  return el("div", {class:"card"}, [
    el("div", {class:"card-h"}, [headLeft, right || el("div")]),
    el("div", {class:"card-b"}, [body])
  ]);
}

function cardFill(title, desc, body, right=null){
  const c = card(title, desc, body, right);
  c.classList.add("fill");
  return c;
}
function rowLabel(labelText, inputNode, errorNode=null){
  const kids = [
    el("label", {}, [document.createTextNode(labelText)]),
    inputNode
  ];
  if(errorNode) kids.push(errorNode);
  return el("div", {class:"field"}, kids);
}

function mkFieldError(){
  return el("div",{class:"field-error hidden"},[]);
}
function setFieldError(node, msg){
  if(!node) return;
  node.textContent = msg || "";
  if(msg) node.classList.remove("hidden"); else node.classList.add("hidden");
}
function pillarName(k){ return PILLARS.find(p=>p.key===k)?.name ?? k; }
function badge(text, kind=""){ return el("span",{class:`badge ${kind}`.trim()},[document.createTextNode(text)]); }

function openDrawer(){ drawer.classList.remove("hidden"); drawer.setAttribute("aria-hidden","false"); }
function closeDrawer(){ drawer.classList.add("hidden"); drawer.setAttribute("aria-hidden","true"); }
document.getElementById("btnMenu").addEventListener("click", openDrawer);
document.getElementById("btnCloseMenu").addEventListener("click", closeDrawer);
drawer.addEventListener("click", (e)=>{ if (e.target === drawer) closeDrawer(); });

document.querySelectorAll(".navitem").forEach(b=>{
  b.addEventListener("click", ()=>{
    location.hash = b.dataset.route;
    closeDrawer();
  });
});

function route(){ return (location.hash.replace("#","").split("?")[0].trim() || "dashboard"); }

/* ---------- Export/Import ---------- */
document.getElementById("btnExport").addEventListener("click", async ()=>{
  const data = await exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tee-personal-planner-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById("fileImport").addEventListener("change", async (e)=>{
  const f = e.target.files?.[0];
  if (!f) return;
  const txt = await f.text();
  await importAll(JSON.parse(txt));
  e.target.value = "";
  await navigate(route());
});

/* ---------- Global Date Picker ---------- */
const globalDatePicker = document.getElementById("globalDatePicker");
globalDatePicker.value = dayKey(new Date());

// Global tracker for active audio contexts/sources
let activeAudioSources = [];

function stopAllAudio() {
  // Stop HTML audio elements
  document.querySelectorAll("audio").forEach(a => { 
    try { a.pause(); a.currentTime = 0; } catch(_) {} 
  });
  
  // Stop Web Audio API sources
  activeAudioSources.forEach(source => {
    try { 
      if (source.sourceNode) source.sourceNode.stop();
      if (source.audioContext) source.audioContext.close();
    } catch(_) {}
  });
  activeAudioSources = [];
}

function registerAudioSource(source) {
  activeAudioSources.push(source);
}

function unregisterAudioSource(source) {
  activeAudioSources = activeAudioSources.filter(s => s !== source);
}

globalDatePicker.addEventListener("change", async (e) => {
  stopAllAudio();
  setSelectedDate(e.target.value);
  await navigate(route(), true);
});

document.getElementById("btnPrevDay").addEventListener("click", async () => {
  stopAllAudio();
  const newDate = addDays(selectedDate, -1);
  setSelectedDate(newDate);
  await navigate(route(), true);
});

document.getElementById("btnNextDay").addEventListener("click", async () => {
  stopAllAudio();
  const newDate = addDays(selectedDate, 1);
  setSelectedDate(newDate);
  await navigate(route(), true);
});

document.getElementById("btnToday").addEventListener("click", async () => {
  stopAllAudio();
  setSelectedDate(new Date());
  await navigate(route(), true);
});

/* ---------- PWA ---------- */
if ("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

/* ---------- Lock to Portrait Mode ---------- */
(function lockPortrait() {
  // Try Screen Orientation API
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("portrait").catch(() => {
      // Silently fail - not all browsers support this
    });
  }
  // Fallback for older iOS
  if (window.orientation !== undefined) {
    window.addEventListener("orientationchange", () => {
      if (window.orientation === 90 || window.orientation === -90) {
        // Could show a message, but CSS handles the rotation
      }
    });
  }
})();

/* ---------- Data defaults ---------- */
async function ensureSettings(){
  const all = await getAll("settings");
  if (all.length) return all[0];
  const s = {
    id: uuid(),
    createdAt: new Date().toISOString(),
    frogRequired: true,
    dailyReviewPromptMins: 21*60,
    notificationsEnabled: false,
    overdueNotifyHour: 10,
    weekStartsMonday: true,
    diaryPinSalt: null,
    diaryPinHash: null
  };
  await put("settings", s);
  return s;
}


async function hashPin(pin, salt){
  const enc = new TextEncoder();
  const data = enc.encode(String(salt||"") + ":" + String(pin||""));
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let s = "";
  for(const b of bytes) s += b.toString(16).padStart(2,"0");
  return s;
}
function diaryIsUnlocked(){
  try{ return sessionStorage.getItem("diary_unlocked") === "1"; }catch(_){ return false; }
}
function diarySetUnlocked(v){
  try{
    if(v) sessionStorage.setItem("diary_unlocked","1");
    else sessionStorage.removeItem("diary_unlocked");
  }catch(_){}
}
async function diaryEnsureUnlock(settings, afterRoute){
  // Returns {ok:true} or {ok:false, node:HTMLElement}
  if(!settings.diaryPinHash) return { ok:true };
  if(diaryIsUnlocked()) return { ok:true };

  const pin = el("input",{class:"input", type:"password", inputmode:"numeric", placeholder:"Enter PIN"});
  const msg = el("div",{class:"muted small"},[document.createTextNode("This page is locked.")]);

  const btnUnlock = btn("Unlock",{onclick: async ()=>{
    const entered = (pin.value||"").trim();
    if(!entered) return toast("Enter your PIN");
    const h = await hashPin(entered, settings.diaryPinSalt);
    if(h === settings.diaryPinHash){
      diarySetUnlocked(true);
      toast("Unlocked");
      try{ modal.close(); }catch(_){ }
      // Force page refresh with timestamp
      location.hash = (afterRoute || "diary") + "?t=" + Date.now();
    } else {
      toast("Wrong PIN");
    }
  }});

  const body = el("div",{class:"stack"},[
    el("div",{class:"h2"},[document.createTextNode("Diary lock")]),
    msg,
    pin,
    el("div",{class:"row"},[btnUnlock])
  ]);

  return { ok:false, node: card("Locked", "", body) };
}
async function ensureVerse(){
  const v = await getAll("verse");
  if (v.length) return v[0];
  const seed = { id: uuid(), reference: "Proverbs 3:5-6", text: "Trust in the LORD with all your heart..." };
  await put("verse", seed);
  return seed;
}

/* ---------- Page flip navigation ---------- */
function withWatermark(contentNode){
  const wrap = el("div",{style:"position:relative; height:100%; min-height:0;"},[
    el("div",{class:"watermark"}),
    el("div",{class:"curl"}),
    el("div",{class:"pagecontent"},[contentNode])
  ]);
  return wrap;
}

let currentPage = null;
let currentRouteKey = null;
let currentRouteFull = null;
let isNavigating = false;

// Page order for next/prev navigation
const PAGE_ORDER = ["cover", "dashboard", "goals", "relationships", "finance", "fitness", "spiritual", "weekly", "diary", "settings"];

function getPageIndex(key) {
  return PAGE_ORDER.indexOf(key);
}

function getNextPage(currentKey) {
  const idx = getPageIndex(currentKey);
  if (idx === -1 || idx >= PAGE_ORDER.length - 1) return null;
  return PAGE_ORDER[idx + 1];
}

function getPrevPage(currentKey) {
  const idx = getPageIndex(currentKey);
  if (idx <= 0) return null;
  return PAGE_ORDER[idx - 1];
}

function goNextPage() {
  if (isNavigating) return;
  const next = getNextPage(currentRouteKey);
  if (next) {
    // Update hash and navigate directly for reliability
    history.replaceState(null, "", "#" + next);
    navigate(next, false);
  }
}

function goPrevPage() {
  if (isNavigating) return;
  const prev = getPrevPage(currentRouteKey);
  if (prev) {
    // Update hash and navigate directly for reliability
    history.replaceState(null, "", "#" + prev);
    navigate(prev, false);
  }
}

async function navigate(r, skipAnim=false){
  const target = (r || "cover");
  const targetKey = target.split("/")[0];
  
  // If same route, always allow refresh (don't block on isNavigating)
  const isSameRoute = targetKey === currentRouteKey;
  
  if (isNavigating && !skipAnim && !isSameRoute) return;
  
  document.querySelectorAll(".navitem").forEach(b => b.classList.toggle("active", b.dataset.route === targetKey));

  // First render: no animation
  if (!currentPage){
    currentPage = el("div", {class:"page current"});
    currentPage.append(withWatermark(await renderRoute(target)));
    pageHost.innerHTML = "";
    pageHost.append(currentPage);
    currentRouteKey = targetKey;
    currentRouteFull = target;
    updatePageNavButtons();
    scrollToTop();
    return;
  }

  const fromKey = currentRouteKey || "cover";
  const doFlip = (!skipAnim) && (fromKey !== targetKey);

  // Same section (or forced refresh): update in place, no animation
  if(!doFlip){
    scrollToTop();
    currentPage.innerHTML = "";
    currentPage.append(withWatermark(await renderRoute(target)));
    currentRouteKey = targetKey;
    currentRouteFull = target;
    updatePageNavButtons();
    return;
  }

  // Determine direction: forward or backward
  const fromIdx = getPageIndex(fromKey);
  const toIdx = getPageIndex(targetKey);
  const goingBackward = toIdx < fromIdx;

  isNavigating = true;

  // Scroll to top BEFORE navigation starts
  scrollToTop();

  // Disable scrolling during animation
  const main = document.querySelector('.main');
  if (main) main.classList.add('no-scroll');

  try {
    // Create incoming page with appropriate class
    const incomingClass = goingBackward ? "page prev" : "page next";
    const incomingPage = el("div", {class: incomingClass});
    incomingPage.append(withWatermark(await renderRoute(target)));
    
    // Add incoming page to DOM
    pageHost.append(incomingPage);

    // Disable pointer events during animation
    currentPage.style.pointerEvents = "none";
    incomingPage.style.pointerEvents = "none";

    // Force reflow to ensure DOM is ready
    void incomingPage.offsetWidth;
    
    // Wait for next animation frame
    await new Promise(res => requestAnimationFrame(res));
    
    // Start the flip animation via CSS class
    pageHost.classList.add(goingBackward ? "flipping-back" : "flipping");
    
    // Wait for animation to complete (2.4s)
    await new Promise(res => setTimeout(res, 2450));
    
    // Clean up animation classes
    pageHost.classList.remove("flipping", "flipping-back");
    
    // Remove old page
    currentPage.remove();
    
    // Promote incoming page to current
    incomingPage.classList.remove("next", "prev");
    incomingPage.classList.add("current");
    incomingPage.style.pointerEvents = "";
    
    currentPage = incomingPage;

    currentRouteKey = targetKey;
    currentRouteFull = target;
  } finally {
    isNavigating = false;
    // Re-enable scrolling after animation completes
    if (main) main.classList.remove('no-scroll');
  }
  updatePageNavButtons();
}

// Scroll to top of page
function scrollToTop() {
  const main = document.querySelector('.main');
  if (main) {
    main.scrollTop = 0;
  }
  // Also ensure window is at top
  window.scrollTo(0, 0);
}

// Update prev/next button visibility
function updatePageNavButtons() {
  const prevBtn = document.getElementById("btnPrevPage");
  const nextBtn = document.getElementById("btnNextPage");
  if (prevBtn) {
    const hasPrev = getPrevPage(currentRouteKey);
    prevBtn.classList.toggle("hidden", !hasPrev);
  }
  if (nextBtn) {
    const hasNext = getNextPage(currentRouteKey);
    nextBtn.classList.toggle("hidden", !hasNext);
  }
}

window.addEventListener("hashchange", ()=>navigate(route()));
navigate(route(), true);

// Page navigation buttons - use event delegation for reliability
document.addEventListener("click", (e) => {
  if (e.target.id === "btnPrevPage" || e.target.closest("#btnPrevPage")) {
    e.preventDefault();
    goPrevPage();
  }
  if (e.target.id === "btnNextPage" || e.target.closest("#btnNextPage")) {
    e.preventDefault();
    goNextPage();
  }
});

/* ---------- Cross-cutting: Daily review prompt & overdue notifications ---------- */
setInterval(async ()=>{
  const settings = await ensureSettings();
  await maybePromptDailyReview(settings);
  await maybeDueNotifications(settings);
}, 30_000);

async function maybePromptDailyReview(settings){
  // Only prompt if user is on dashboard
  if (currentRouteKey !== "dashboard") return;
  
  // Don't prompt if user is actively navigating
  if (isNavigating) return;
  
  const today = dayKey(new Date());
  const existing = (await getAll("dailyReviews")).find(r => r.date === today);
  if (existing) return;

  const now = new Date();
  const mins = now.getHours()*60 + now.getMinutes();
  if (mins < settings.dailyReviewPromptMins) return;

  const key = `tpp_review_prompted_${today}`;
  if (sessionStorage.getItem(key) === "1") return;
  sessionStorage.setItem(key, "1");
  
  // Don't auto-open modal - user can click the Review button
  // This prevents unexpected popups
  // openDailyReviewModal(today, null);
}

async function maybeDueNotifications(settings){
  if (!settings.notificationsEnabled) return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const now = new Date();
  if (now.getHours() !== Number(settings.overdueNotifyHour || 10)) return;

  const today = dayKey(now);
  const key = `tpp_overdue_notified_${today}`;
  if (localStorage.getItem(key) === "1") return;

  const overdue = await computeDueContacts();
  if (overdue.length){
    const names = overdue.slice(0,3).map(x=>x.name).join(", ");
    new Notification("Check-ins due", { body: overdue.length <= 3 ? names : `${names} +${overdue.length-3} more` });
  }
  localStorage.setItem(key, "1");
}

async function computeDueContacts(){
  const [contacts, rules, touchpoints] = await Promise.all([
    getAll("contacts"),
    getAll("contactRules"),
    getAll("touchpoints")
  ]);

  const ruleByContact = new Map(rules.map(r => [r.contactId, r]));
  const lastTouch = new Map();

  for (const t of touchpoints){
    if (!t.contactId) continue;
    // Use datetime field (primary) or dateKey as fallback
    const dateVal = t.datetime || t.dateKey || t.date;
    if (!dateVal) continue;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) continue; // Skip invalid dates
    const prev = lastTouch.get(t.contactId);
    if (!prev || d > prev) lastTouch.set(t.contactId, d);
  }

  const out = [];
  const today = startOfDay(new Date());
  for (const c of contacts){
    const r = ruleByContact.get(c.id);
    const freq = Number(r?.desiredEveryDays || 0);
    if (!freq) continue;

    const last = lastTouch.get(c.id);
    if (!last){
      out.push({ ...c, overdueByDays: freq });
      continue;
    }
    const diffDays = Math.floor((today - startOfDay(last)) / 86400000);
    if (diffDays >= freq){
      out.push({ ...c, overdueByDays: diffDays - freq + 1 });
    }
  }
  out.sort((a,b)=>b.overdueByDays - a.overdueByDays);
  return out;
}

/* ---------- Views ---------- */

/* ---------- Spotify (optional full songs) ---------- */
function spotifyCfg(){
  try{
    return JSON.parse(localStorage.getItem("spotify_cfg")||"") || { clientId:"", useFull:true };
  }catch(_){
    return { clientId:"", useFull:true };
  }
}
function setSpotifyCfg(cfg){
  try{ localStorage.setItem("spotify_cfg", JSON.stringify(cfg)); }catch(_){}
}
function spotifyTokens(){
  try{ return JSON.parse(localStorage.getItem("spotify_tokens")||"") || null; }catch(_){ return null; }
}
function setSpotifyTokens(t){
  try{ localStorage.setItem("spotify_tokens", JSON.stringify(t)); }catch(_){}
}
function spotifyClear(){
  try{ localStorage.removeItem("spotify_tokens"); }catch(_){}
  try{ localStorage.removeItem("spotify_pkce"); }catch(_){}
  window.__sp_player = null;
  window.__sp_device = null;
}
function spotifyRedirectUri(){
  // Use the exact current page URL without query/hash (works on any port/path)
  const u = new URL(window.location.href);
  spotifyGetProduct().catch(()=>{});
  u.hash = "";
  u.search = "";
  return u.toString();
}
function b64url(bytes){
  let s=""; for(const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
async function sha256Bytes(str){
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return new Uint8Array(buf);
}
function rand(len=64){
  const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const a=crypto.getRandomValues(new Uint8Array(len));
  let out=""; for(let i=0;i<len;i++) out += chars[a[i]%chars.length];
  return out;
}
async function spotifyBeginAuth(){
  const cfg = spotifyCfg();
  if(!cfg.clientId) throw new Error("missing_client_id");
  const verifier = rand(64);
  const challenge = b64url(await sha256Bytes(verifier));
  const state = rand(16);
  try{ localStorage.setItem("spotify_pkce", JSON.stringify({verifier, state, at:Date.now()})); }catch(_){}
  const auth = new URL("https://accounts.spotify.com/authorize");
  auth.searchParams.set("client_id", cfg.clientId);
  auth.searchParams.set("response_type","code");
  auth.searchParams.set("redirect_uri", spotifyRedirectUri());
  auth.searchParams.set("code_challenge_method","S256");
  auth.searchParams.set("code_challenge", challenge);
  auth.searchParams.set("scope", "streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state");
  auth.searchParams.set("state", state);
  window.location.href = auth.toString();
}
async function spotifyHandleCallback(){
  const u = new URL(window.location.href);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const err = u.searchParams.get("error");
  if(!code && !err) return false;
  if(err) { throw new Error(err); }
  let pkce=null;
  try{ pkce = JSON.parse(localStorage.getItem("spotify_pkce")||"null"); }catch(_){}
  if(!pkce || pkce.state !== state) throw new Error("state_mismatch");

  const cfg = spotifyCfg();
  const body = new URLSearchParams();
  body.set("client_id", cfg.clientId);
  body.set("grant_type","authorization_code");
  body.set("code", code);
  body.set("redirect_uri", spotifyRedirectUri());
  body.set("code_verifier", pkce.verifier);

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method:"POST",
    headers:{ "Content-Type":"application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if(!res.ok) throw new Error("token_failed");
  const data = await res.json();
  setSpotifyTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in*1000) - 15000
  });
  // clean URL + go to dashboard
  u.search = "";
  if(!u.hash) u.hash = "#dashboard";
  history.replaceState({}, "", u.toString());
  return true;
}
async function spotifyEnsureAccessToken(){
  const cfg = spotifyCfg();
  const t = spotifyTokens();
  if(!cfg.clientId || !t) return null;
  if(Date.now() < (t.expires_at||0)) return t.access_token;

  const body = new URLSearchParams();
  body.set("client_id", cfg.clientId);
  body.set("grant_type","refresh_token");
  body.set("refresh_token", t.refresh_token);

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method:"POST",
    headers:{ "Content-Type":"application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if(!res.ok) return t.access_token;
  const data = await res.json();
  setSpotifyTokens({
    access_token: data.access_token,
    refresh_token: t.refresh_token,
    expires_at: Date.now() + (data.expires_in*1000) - 15000
  });
  return data.access_token;
}


async function spotifyGetProfile(){
  const tok = await spotifyEnsureAccessToken();
  if(!tok) return null;
  const res = await fetch("https://api.spotify.com/v1/me", { headers:{ "Authorization":"Bearer " + tok }});
  if(!res.ok) return null;
  return await res.json();
}

async function spotifyGetMe(){
  const tok = await spotifyEnsureAccessToken();
  if(!tok) return null;
  const res = await fetch("https://api.spotify.com/v1/me", { headers:{ "Authorization":"Bearer " + tok } });
  if(!res.ok) return null;
  return await res.json();
}
async function spotifyGetProduct(){
  try{
    const me = await spotifyGetMe();
    const product = me && me.product ? me.product : null; // "premium", "free", "open"
    if(product){
      try{ localStorage.setItem("spotify_product", product); }catch(_){}
    }
    return product;
  }catch(_){
    return null;
  }
}
function spotifyCachedProduct(){
  try{ return localStorage.getItem("spotify_product") || ""; }catch(_){ return ""; }
}

function spotifyConnected(){
  const t = spotifyTokens();
  return !!(t && t.access_token);
}
async function spotifySearchTrack(artist, title){
  const tok = await spotifyEnsureAccessToken();
  if(!tok) return null;
  const q = encodeURIComponent(`${artist} ${title}`);
  const res = await fetch(`https://api.spotify.com/v1/search?type=track&limit=5&q=${q}`, {
    headers:{ "Authorization":"Bearer " + tok }
  });
  if(!res.ok) return null;
  const data = await res.json();
  return data?.tracks?.items?.[0] || null;
}
function spotifyOpenLink(artist, title){
  const q = encodeURIComponent(`${artist} ${title}`);
  return `https://open.spotify.com/search/${q}`;
}


async function renderRoute(r){
  const settings = await ensureSettings();

  if (r === "cover") return await viewCover(settings);
  if (r === "dashboard") return await viewDashboard(settings);
  if (r === "goals") return await viewGoals();
  if (r === "relationships" || r.startsWith("relationships/")) return await viewRelationships();
  if (r === "finance" || r.startsWith("finance/")) return await viewFinance();
  if (r === "fitness" || r.startsWith("fitness/")) return await viewFitness();
  if (r === "spiritual") return await viewSpiritual();
  if (r === "weekly") return await viewWeekly(settings);
if (r === "diary") return await viewDiary(settings);
if (r.startsWith("diary/")) return await viewDiaryEntry(settings, r.split("/")[1]);
if (r.startsWith("weekly/")) return await viewWeekly(settings, r.split("/")[1]);
if (r.startsWith("day/")) return await viewDay(settings, r.split("/")[1]);
  if (r === "settings") return await viewSettings(settings);

  return el("div", {}, [el("div",{class:"h1"},[document.createTextNode("Not found")])]);
}


/* ---------- Spotify Web Playback (full song) ---------- */
function spotifySdkInject(){
  if(document.getElementById("spotify-web-sdk")) return;
  const s = document.createElement("script");
  s.id = "spotify-web-sdk";
  s.src = "https://sdk.scdn.co/spotify-player.js";
  s.async = true;
  document.head.appendChild(s);
}

async function spotifyWaitForSdk(timeoutMs=8000){
  spotifySdkInject();
  const start = Date.now();
  while(Date.now() - start < timeoutMs){
    if(window.Spotify && window.Spotify.Player) return true;
    await new Promise(r=>setTimeout(r, 80));
  }
  return false;
}

async function spotifyInitWebPlayer(){
  const tok = await spotifyEnsureAccessToken();
  if(!tok) throw new Error("no_token");

  const ok = await spotifyWaitForSdk(9000);
  if(!ok) throw new Error("sdk_timeout");

  if(window.__sp_web_player && window.__sp_device) return { player: window.__sp_web_player, deviceId: window.__sp_device };

  const player = new window.Spotify.Player({
    name: "Tee's Personal Planner",
    getOAuthToken: async (cb) => {
      const t = await spotifyEnsureAccessToken();
      cb(t || tok);
    },
    volume: 0.8
  });

  let deviceId = null;
  const readyP = new Promise((resolve, reject)=>{
    player.addListener("ready", ({device_id}) => { deviceId = device_id; resolve(device_id); });
    player.addListener("initialization_error", ({message}) => reject(new Error(message)));
    player.addListener("authentication_error", ({message}) => reject(new Error(message)));
    player.addListener("account_error", ({message}) => reject(new Error(message)));
    player.addListener("playback_error", ({message}) => { /* non-fatal */ });
  });

  const connected = await player.connect();
  if(!connected) throw new Error("player_connect_failed");

  deviceId = await readyP;

  window.__sp_web_player = player;
  window.__sp_device = deviceId;

  // Transfer playback to this web device (required)
  const t2 = await spotifyEnsureAccessToken();
  await fetch("https://api.spotify.com/v1/me/player", {
    method:"PUT",
    headers:{ "Authorization":"Bearer " + t2, "Content-Type":"application/json" },
    body: JSON.stringify({ device_ids:[deviceId], play:false })
  }).catch(()=>{});

  return { player, deviceId };
}

async function spotifyPlayFullTrack(artist, title){
  // Returns {ok:boolean, reason?:string}
  if(!spotifyConnected()) return { ok:false, reason:"not_connected" };
  const cfg = spotifyCfg();
  if(!cfg.useFull) return { ok:false, reason:"disabled" };

  try{
    const { deviceId } = await spotifyInitWebPlayer();
    const tok = await spotifyEnsureAccessToken();
    const tr = await spotifySearchTrack(artist, title);
    if(!tr || !tr.uri) return { ok:false, reason:"no_track" };

    try{
      if(window.__sp_web_player && typeof window.__sp_web_player.activateElement === 'function'){
        await window.__sp_web_player.activateElement();
      }
    }catch(_){ }

    const url = deviceId
      ? `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`
      : "https://api.spotify.com/v1/me/player/play";

    const res = await fetch(url, {
      method:"PUT",
      headers:{ "Authorization":"Bearer " + tok, "Content-Type":"application/json" },
      body: JSON.stringify({ uris:[tr.uri] })
    });

    if(!res.ok){
      let body = "";
      try{ body = await res.text(); }catch(_){ }
      return { ok:false, reason:"play_failed_" + res.status, detail: body.slice(0,200) };
    }
    return { ok:true };
  }catch(e){
    return { ok:false, reason:"error" };
  }
}

async function spotifyTogglePause(){
  try{
    if(!window.__sp_web_player) return false;
    await window.__sp_web_player.togglePlay();
    return true;
  }catch(_){
    return false;
  }
}


/* ---------- Cover Page ---------- */
async function viewCover(settings){
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = today.toLocaleDateString('en-GB', options);
  
  const userName = settings.userName || "Tee";
  
  const [tasks, goals, contacts] = await Promise.all([
    getAll("tasks"),
    getAll("quarterlyGoals"),
    getAll("contacts")
  ]);
  
  const todayKey = dayKey(today);
  const todaysTasks = tasks.filter(t => t.scheduledDate === todayKey);
  const activeGoals = goals.filter(g => !g.done).length;
  
  const cover = el("div", {class:"cover-page"}, [
    el("div", {class:"cover-decoration cover-tl"}),
    el("div", {class:"cover-decoration cover-tr"}),
    el("div", {class:"cover-decoration cover-bl"}),
    el("div", {class:"cover-decoration cover-br"}),
    
    el("div", {class:"cover-content"}, [
      el("div", {class:"cover-header"}, [
        el("div", {class:"cover-icon"}, [document.createTextNode("📓")]),
        el("div", {class:"cover-title"}, [document.createTextNode(userName + "'s")]),
        el("div", {class:"cover-subtitle"}, [document.createTextNode("Personal Planner")])
      ]),
      
      el("div", {class:"cover-date"}, [document.createTextNode(dateStr)]),
      
      el("div", {class:"cover-stats"}, [
        el("div", {class:"cover-stat"}, [
          el("div", {class:"cover-stat-value"}, [document.createTextNode(String(todaysTasks.length))]),
          el("div", {class:"cover-stat-label"}, [document.createTextNode("Tasks Today")])
        ]),
        el("div", {class:"cover-stat"}, [
          el("div", {class:"cover-stat-value"}, [document.createTextNode(String(activeGoals))]),
          el("div", {class:"cover-stat-label"}, [document.createTextNode("Active Goals")])
        ]),
        el("div", {class:"cover-stat"}, [
          el("div", {class:"cover-stat-value"}, [document.createTextNode(String(contacts.length))]),
          el("div", {class:"cover-stat-label"}, [document.createTextNode("Contacts")])
        ])
      ]),
      
      el("div", {class:"cover-action"}, [
        btn("Open Planner →", {onclick: ()=>{ location.hash = "dashboard"; }})
      ]),
      
      el("div", {class:"cover-footer"}, [
        el("div", {class:"cover-quote"}, [document.createTextNode("\"The secret of getting ahead is getting started.\"")]),
        el("div", {class:"cover-author"}, [document.createTextNode("- Mark Twain")])
      ])
    ])
  ]);
  
  return cover;
}

/* ---------- Dashboard ---------- */
async function viewDashboard(settings){
  const selectedDay = getSelectedDayKey();
  const isToday = isSelectedDateToday();

  const [verse, tasks, qGoals, blocks, reviews, overdue] = await Promise.all([
    ensureVerse(),
    getAll("tasks"),
    getAll("quarterlyGoals"),
    getAll("timeBlocks"),
    getAll("dailyReviews"),
    computeDueContacts()
  ]);

  const dayTasks = tasks.filter(t => t.scheduledDate === selectedDay).sort((a,b)=> (b.isFrog?1:0) - (a.isFrog?1:0));
  const dayBlocks = blocks.filter(b => b.date === selectedDay).sort((a,b)=>a.startMins-b.startMins);
  const review = reviews.find(r => r.date === selectedDay) || null;

  const hasFrog = dayTasks.some(t=>t.isFrog);
  const frogRequired = !!settings.frogRequired;

  // Check if it's birthday (January 24th)
  const selectedDateObj = getSelectedDate();
  const isBirthday = selectedDateObj.getMonth() === 0 && selectedDateObj.getDate() === 24;
  
  let dateLabel;
  if (isBirthday) {
    dateLabel = "Happy Birthday My Love 🎂💕";
  } else if (isToday) {
    dateLabel = "Hello ✿";
  } else {
    dateLabel = formatDate(getSelectedDate());
  }

  const isMobile = window.matchMedia("(max-width: 980px)").matches;
  
  const headerClasses = isBirthday ? "dashboard-header birthday-header" : "dashboard-header";
  const header = el("div",{class: headerClasses},[
    el("div",{class:"h1"},[document.createTextNode(dateLabel)]),
    el("div",{class:"subtle"},[document.createTextNode(isToday ? formatDate(new Date()) : `Viewing ${selectedDay}`)])
  ]);

  // Add birthday class to root if it's birthday
  const rootClasses = isBirthday ? "stack dashboard-root birthday-mode" : "stack dashboard-root";


  const v = verseOfDay(selectedDay);
  const versePreview = (v.text.length > 110) ? (v.text.slice(0, 110) + "…") : v.text;

  const verseCard = card("Daily Verse", v.ref, el("div",{class:"stack"},[
    el("div",{class:"prose"},[document.createTextNode(versePreview)]),
    btn("Read",{kind:"ghost", onclick: async ()=>{
      const full = el("div",{class:"stack"},[
        el("div",{class:"h2"},[document.createTextNode(v.ref)]),
        el("div",{class:"prose"},[document.createTextNode(v.text)])
      ]);
      await showModal("Verse", full);
    }})
  ]));


  const verseBanner = el("div",{class:"banner"},[
    el("div",{class:"t"},[document.createTextNode("My Verse")]),
    el("div",{class:"ref"},[document.createTextNode(verse.reference || "")]),
    verse.text ? el("div",{class:"txt"},[document.createTextNode(verse.text)]) : el("div",{class:"txt"})
  ]);

  const overdueCard = (isToday && overdue.length)
    ? card("Check-ins due", "Based on your rules.", el("div",{class:"scroll-area overdueScroll", style:"overflow-y:auto; max-height:200px;"},[overdueList(overdue)]), btn("Open", {kind:"ghost", onclick: ()=>{ location.hash="relationships"; }}))
    : null;

  const tasksBody = el("div",{class:"stack"},[
    el("div",{class:"row spread"},[
      frogRequired ? badge(hasFrog ? "Top Priority set" : "Pick your Top Priority", hasFrog ? "good":"warn") : badge("Top Priority off"),
      btn("Add Task", { onclick: ()=>openTaskModal({ defaultDate: selectedDay }) })
    ]),
    el("div",{class: (dayTasks.length>2 ? "scroll-area tasksScroll" : ""), style: dayTasks.length>2 ? "overflow-y:auto; max-height:200px;" : ""},[ frogRequired && !hasFrog ? frogPicker(dayTasks) : taskList(dayTasks, qGoals) ])
  ]);

  const blocksBody = el("div",{class:"stack"},[
    el("div",{class:"row spread"},[
      el("div",{class:"muted small"},[document.createTextNode("Drag • resize • double-click")]),
      btn("+ Add", { onclick: ()=>openTimeBlockModal(selectedDay, dayTasks, null) })
    ]),
    scheduler(selectedDay, dayBlocks, dayTasks)
  ]);

  const scoreBody = el("div",{class:"stack"},[
    el("div",{class:"row spread"},[
      review ? badge(`${review.score}/10`, "good") : badge("Pending", "warn"),
      btn(review ? "Edit" : "Review", { kind:"ghost", onclick: ()=>openDailyReviewModal(selectedDay, review) })
    ]),
    review?.notes ? el("div",{class:"muted"},[document.createTextNode(review.notes)]) : el("div",{class:"muted"},[document.createTextNode("How was your day?")])
  ]);

  // Create a separate scoreBody for mobile (can't reuse same DOM node)
  const scoreBodyMobile = el("div",{class:"stack"},[
    el("div",{class:"row spread"},[
      review ? badge(`${review.score}/10`, "good") : badge("Pending", "warn"),
      btn(review ? "Edit" : "Review", { kind:"ghost", onclick: ()=>openDailyReviewModal(selectedDay, review) })
    ]),
    review?.notes ? el("div",{class:"muted"},[document.createTextNode(review.notes)]) : el("div",{class:"muted"},[document.createTextNode("How was your day?")])
  ]);

  // Create verse banner for mobile
  const verseBannerMobile = el("div",{class:"banner"},[
    el("div",{class:"t"},[document.createTextNode("My Verse")]),
    el("div",{class:"ref"},[document.createTextNode(verse.reference || "")]),
    verse.text ? el("div",{class:"txt"},[document.createTextNode(verse.text)]) : el("div",{class:"txt"})
  ]);

  // Create verse banner for desktop  
  const verseBannerDesktop = el("div",{class:"banner"},[
    el("div",{class:"t"},[document.createTextNode("My Verse")]),
    el("div",{class:"ref"},[document.createTextNode(verse.reference || "")]),
    verse.text ? el("div",{class:"txt"},[document.createTextNode(verse.text)]) : el("div",{class:"txt"})
  ]);

  // Mobile top section - verse and music (shown first on mobile via CSS)
  const mobileTop = el("div",{class:"mobile-top-section stack"},[
    verseBannerMobile,
    rnbCard(selectedDay),
    // Daily Check-in shown early on mobile
    el("div",{class:"mobile-only"}, [card("Daily Check-in", "Reflect on your day", scoreBodyMobile)])
  ]);

  const left = el("div",{class:"stack dashboard-left"},[
    card("To Do", "Your tasks for today", tasksBody),
    card("Schedule", "Plan your time", blocksBody),
  ]);
  
  const rightItems = [];
  // Desktop shows verse banner here (hidden on mobile via CSS)
  rightItems.push(el("div",{class:"desktop-only"}, [verseBannerDesktop]));
  if (overdueCard) rightItems.push(overdueCard);
  // Desktop shows music here (hidden on mobile via CSS)
  rightItems.push(el("div",{class:"desktop-only"}, [rnbCard(selectedDay)]));
  // Daily Check-in only on desktop (mobile has it in mobileTop)
  rightItems.push(el("div",{class:"desktop-only"}, [card("Daily Check-in", "Reflect on your day", scoreBody)]));
  
  const right = el("div",{class:"stack dashboard-right"}, rightItems);

  const grid = el("div",{class:"grid"},[left, right]);

  const root = el("div",{class: rootClasses},[header, mobileTop, grid]);
  return root;
}

function overdueList(items){
  const list = el("div",{class:"list"},[]);
  for (const c of items.slice(0,6)){
    list.append(el("div",{class:"item"},[
      el("div",{class:"top"},[
        el("div",{},[
          el("div",{class:"h"},[document.createTextNode(c.name)]),
          el("div",{class:"m"},[document.createTextNode(`Due ~${c.overdueByDays} day(s)`)])
        ]),
        el("div",{class:"actions"},[badge("Overdue","bad")])
      ])
    ]));
  }
  if (items.length > 6) list.append(el("div",{class:"muted small"},[document.createTextNode(`+${items.length-6} more`) ]));
  return list;
}



async function fetchItunesPreview(artist, title){
  // Uses Apple's public iTunes Search API to fetch a short preview URL (usually ~30s)
  // This avoids embedding a large player and plays inside the app via <audio>.
  const term = encodeURIComponent(`${artist} ${title}`);
  const url = `https://itunes.apple.com/search?term=${term}&entity=song&limit=6`;
  const res = await fetch(url);
  if(!res.ok) throw new Error("preview_search_failed");
  const data = await res.json();
  const results = (data && data.results) ? data.results : [];
  // Try to find a close match: same artist substring + title substring
  const norm = s => String(s||"").toLowerCase();
  const aN = norm(artist);
  const tN = norm(title);

  let best = null;
  for(const r of results){
    const ra = norm(r.artistName);
    const rt = norm(r.trackName);
    const score =
      (ra.includes(aN) ? 3 : 0) +
      (aN.includes(ra) ? 2 : 0) +
      (rt.includes(tN) ? 3 : 0) +
      (tN.includes(rt) ? 2 : 0);
    if(!best || score > best.score) best = { score, r };
  }
  const pick = best ? best.r : results[0];
  if(!pick) throw new Error("no_preview_found");

  return {
    artistName: pick.artistName,
    trackName: pick.trackName,
    previewUrl: pick.previewUrl,
    trackViewUrl: pick.trackViewUrl,
    artwork: pick.artworkUrl100 || pick.artworkUrl60 || pick.artworkUrl30 || null,
    collection: pick.collectionName || ""
  };
}

function fmtTime(sec){
  if(!isFinite(sec)) return "0:00";
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec/60);
  const s = String(sec%60).padStart(2,"0");
  return `${m}:${s}`;
}

function miniAudioPlayer({artist, title, ytId, spotifyId, todayKey}){
  const state = { 
    audioContext: null, 
    audioBuffer: null, 
    sourceNode: null,
    gainNode: null,
    playing: false, 
    loaded: false,
    unlocked: false
  };
  
  // Register this player's state for global stop
  registerAudioSource(state);

  const titleEl = el("div",{class:"songTitle"},[document.createTextNode(title)]);
  const artistEl = el("div",{class:"songArtist"},[document.createTextNode(artist)]);
  const statusEl = el("div",{class:"songStatus muted small"},[document.createTextNode("Tap play")]);
  const timeEl = el("div",{class:"songTime muted"},[document.createTextNode("")]);
  
  // Album art - start with placeholder, will update with iTunes artwork
  const art = el("div",{class:"songArt"});
  art.style.background = "linear-gradient(135deg, #4a90d9 0%, #a8d4ff 100%)";
  
  // Immediately fetch iTunes artwork
  (async () => {
    try {
      const q = encodeURIComponent(`${artist} ${title}`);
      const res = await fetch(`https://itunes.apple.com/search?term=${q}&media=music&limit=10`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        // Find best match
        const norm = s => String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
        const aN = norm(artist);
        const tN = norm(title);
        let best = null;
        for (const r of data.results) {
          if (!r.artworkUrl100) continue;
          const ra = norm(r.artistName);
          const rt = norm(r.trackName);
          const score = (ra.includes(aN)?3:0) + (aN.includes(ra)?2:0) + (rt.includes(tN)?3:0) + (tN.includes(rt)?2:0);
          if (!best || score > best.score) best = { score, r };
        }
        if (best && best.r.artworkUrl100) {
          art.style.backgroundImage = `url('${best.r.artworkUrl100}')`;
          art.style.background = "";
        }
      }
    } catch (e) {
      // Keep placeholder on error
    }
  })();
  
  // Play button
  const playBtn = el("button",{class:"playBtn"},[document.createTextNode("▶")]);
  
  // Progress bar
  const progressWrap = el("div",{class:"progressWrap"});
  const progressBar = el("div",{class:"progressBar"});
  progressWrap.appendChild(progressBar);
  
  // YouTube button
  const ytBtn = el("a",{
    class:"musicBtn ytBtn",
    href: ytId ? `https://www.youtube.com/watch?v=${ytId}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(artist + " " + title)}`,
    target:"_blank",
    rel:"noopener"
  },[document.createTextNode("▶ Watch on YouTube")]);

  async function loadAndPlay() {
    // Step 1: Create/unlock AudioContext
    if (!state.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      state.audioContext = new AudioContext();
      state.gainNode = state.audioContext.createGain();
      state.gainNode.gain.value = 1.0;
      state.gainNode.connect(state.audioContext.destination);
    }
    
    // Resume if suspended
    if (state.audioContext.state === 'suspended') {
      await state.audioContext.resume();
    }
    
    // Step 2: Load audio if not loaded
    if (!state.loaded) {
      statusEl.textContent = "Loading...";
      playBtn.textContent = "...";
      
      try {
        // Fetch from iTunes
        const term = encodeURIComponent(`${artist} ${title}`);
        const url = `https://itunes.apple.com/search?term=${term}&entity=song&limit=5`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
          // Find best match
          const norm = s => String(s||"").toLowerCase();
          const aN = norm(artist);
          const tN = norm(title);
          let best = null;
          for (const r of data.results) {
            if (!r.previewUrl) continue;
            const ra = norm(r.artistName);
            const rt = norm(r.trackName);
            const score = (ra.includes(aN)?3:0) + (aN.includes(ra)?2:0) + (rt.includes(tN)?3:0) + (tN.includes(rt)?2:0);
            if (!best || score > best.score) best = { score, r };
          }
          
          if (best && best.r.previewUrl) {
            // Update artwork
            if (best.r.artworkUrl100) {
              art.style.backgroundImage = `url('${best.r.artworkUrl100}')`;
            }
            
            statusEl.textContent = "Downloading...";
            
            // Download audio data
            const audioRes = await fetch(best.r.previewUrl);
            const arrayBuffer = await audioRes.arrayBuffer();
            
            statusEl.textContent = "Decoding...";
            
            // Decode audio
            state.audioBuffer = await state.audioContext.decodeAudioData(arrayBuffer);
            state.loaded = true;
            
            statusEl.textContent = "Ready";
          } else {
            statusEl.textContent = "No preview";
            playBtn.textContent = "▶";
            return;
          }
        }
      } catch (e) {
        console.log("Load error:", e);
        statusEl.textContent = "Error - try YouTube";
        playBtn.textContent = "▶";
        return;
      }
    }
    
    // Step 3: Play
    if (state.audioBuffer) {
      // Stop any existing playback
      if (state.sourceNode) {
        try { state.sourceNode.stop(); } catch(e) {}
      }
      
      // Create new source
      state.sourceNode = state.audioContext.createBufferSource();
      state.sourceNode.buffer = state.audioBuffer;
      state.sourceNode.connect(state.gainNode);
      
      state.sourceNode.onended = function() {
        state.playing = false;
        playBtn.textContent = "▶";
        playBtn.classList.remove("playing");
        progressBar.style.width = "0%";
        statusEl.textContent = "Ended";
      };
      
      // Start playback
      const startTime = state.audioContext.currentTime;
      state.sourceNode.start(0);
      state.playing = true;
      playBtn.textContent = "⏸";
      playBtn.classList.add("playing");
      statusEl.textContent = "Playing...";
      
      // Update progress
      const duration = state.audioBuffer.duration;
      function updateProgress() {
        if (!state.playing) return;
        const elapsed = state.audioContext.currentTime - startTime;
        const pct = Math.min(100, (elapsed / duration) * 100);
        progressBar.style.width = pct + "%";
        timeEl.textContent = formatTime(elapsed) + " / " + formatTime(duration);
        if (elapsed < duration) {
          requestAnimationFrame(updateProgress);
        }
      }
      updateProgress();
    }
  }
  
  function formatTime(sec) {
    if (!isFinite(sec)) return "0:00";
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60);
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }
  
  function stopPlayback() {
    if (state.sourceNode) {
      try { state.sourceNode.stop(); } catch(e) {}
      state.sourceNode = null;
    }
    state.playing = false;
    playBtn.textContent = "▶";
    playBtn.classList.remove("playing");
    statusEl.textContent = "Stopped";
  }

  // Play button click
  playBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (state.playing) {
      stopPlayback();
    } else {
      loadAndPlay();
    }
  });

  const content = el("div",{class:"songCard"},[
    el("div",{class:"songLeft"},[
      art,
      playBtn
    ]),
    el("div",{class:"songInfo"},[
      titleEl,
      artistEl,
      progressWrap,
      el("div",{class:"songMeta"},[timeEl, statusEl]),
      ytBtn
    ])
  ]);

  return content;
}

function rnbCard(todayKey){
  const pick = pickDailyRnB(todayKey);

  const body = el("div",{class:"stack"},[
    miniAudioPlayer({ artist: pick.artist, title: pick.title, ytId: pick.ytId, spotifyId: pick.spotifyId, todayKey }),
  ]);

  return card("Song of the Day ♪", "A little soul for your soul", body);
}


function frogPicker(tasks){
  const list = el("div",{class:"list"},[]);
  if (!tasks.length){
    list.append(el("div",{class:"muted"},[document.createTextNode("No tasks yet.")]));
    return list;
  }
  list.append(el("div",{class:"muted small"},[document.createTextNode("Pick 1 Top Priority to unlock the rest.")]));
  for (const t of tasks){
    list.append(el("div",{class:"item"},[
      el("div",{class:"top"},[
        el("div",{},[
          el("div",{class:"h"},[document.createTextNode(t.title)]),
          el("div",{class:"m"},[document.createTextNode("Set as Top Priority")])
        ]),
        el("div",{class:"actions"},[
          btn("Set Top Priority",{kind:"good", onclick: async ()=>{
            for (const other of tasks){
              other.isFrog = other.id === t.id;
              await put("tasks", other);
            }
            await navigate(route(), true);
          }})
        ])
      ])
    ]));
  }
  return list;
}

function taskList(tasks, qGoals){
  const list = el("div",{class:"list"},[]);
  if (!tasks.length){
    list.append(el("div",{class:"muted"},[document.createTextNode("No tasks for today.")]));
    return list;
  }
  for (const t of tasks){
    const q = t.quarterlyGoalId ? qGoals.find(x=>x.id===t.quarterlyGoalId) : null;
    const meta = [
      t.pillar ? `Pillar: ${pillarName(t.pillar)}` : null,
      q ? `↳ ${q.title}` : null,
      t.isFrog ? "⭐ Top Priority" : null
    ].filter(Boolean).join(" • ");

    const isDone = t.status === "done";
    const titleStyle = isDone ? "text-decoration:line-through; opacity:0.55;" : "";

    list.append(el("div",{class:"item"},[
      el("div",{class:"top"},[
        el("div",{},[
          el("div",{class:"h", style:titleStyle},[document.createTextNode(t.title)]),
          el("div",{class:"m"},[document.createTextNode(meta || "—")])
        ]),
        el("div",{class:"actions"},[
          el("div",{class:`chk ${isDone?"done":""}`, onclick: async ()=>{
            t.status = isDone ? "todo" : "done";
            await put("tasks", t);
            await navigate(route(), true);
          }}),
          btn("Edit",{kind:"ghost", onclick: ()=>openTaskModal({ editing: t })}),
          btn("Delete",{kind:"danger", onclick: async ()=>{ await del("tasks", t.id); await navigate(route(), true); }})
        ])
      ])
    ]));
  }
  return list;
}

/* ---------- Time-block Scheduler ---------- */
function scheduler(dateKeyStr, blocks, tasks){
  const wrap = el("div",{class:"scheduler"},[]);
  const inner = el("div",{class:"sched-inner"});
  inner.style.height = `${(END_MINS-START_MINS)*PX_PER_MIN}px`;

  for (let h=0; h<=24; h++){
    const y = (h*60 - START_MINS)*PX_PER_MIN;
    inner.append(el("div",{class:"hourline", style:`top:${y}px`},[
      el("div",{class:"hourlabel"},[document.createTextNode(`${String(h).padStart(2,"0")}:00`)])
    ]));
  }

  for (const b of blocks){
    const top = (b.startMins - START_MINS)*PX_PER_MIN;
    const height = Math.max(15, (b.endMins - b.startMins)*PX_PER_MIN);
    const linked = b.taskId ? tasks.find(t=>t.id===b.taskId) : null;

    const node = el("div",{class:"block", style:`top:${top}px;height:${height}px;`},[
      el("div",{class:"bt"},[document.createTextNode(b.title || "Block")]),
      el("div",{class:"bm"},[document.createTextNode(`${minsToHHMM(b.startMins)}–${minsToHHMM(b.endMins)}${linked ? ` • ↳ ${linked.title}` : ""}`)]),
      el("div",{class:"resize"})
    ]);

    node.addEventListener("dblclick", ()=>openTimeBlockModal(dateKeyStr, tasks, b));

    let dragging=false, resizing=false, startY=0, os=0, oe=0;

    const snap = (m)=>Math.round(m/SNAP)*SNAP;

    node.addEventListener("pointerdown", (e)=>{
      if (e.target?.classList?.contains("resize")) return;
      dragging=true; startY=e.clientY; os=b.startMins; oe=b.endMins;
      node.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    node.querySelector(".resize").addEventListener("pointerdown", (e)=>{
      resizing=true; startY=e.clientY; os=b.startMins; oe=b.endMins;
      node.setPointerCapture(e.pointerId);
      e.preventDefault(); e.stopPropagation();
    });

    node.addEventListener("pointermove", (e)=>{
      if (!dragging && !resizing) return;
      const dy = e.clientY - startY;
      const dmins = snap(dy / PX_PER_MIN);

      if (dragging){
        const dur = oe - os;
        let ns = clamp(os + dmins, START_MINS, END_MINS-15);
        let ne = clamp(ns + dur, START_MINS+15, END_MINS);
        b.startMins = ns;
        b.endMins = ne;
      } else if (resizing){
        let ne = clamp(oe + dmins, b.startMins+15, END_MINS);
        b.endMins = ne;
      }

      node.style.top = `${(b.startMins-START_MINS)*PX_PER_MIN}px`;
      node.style.height = `${Math.max(15,(b.endMins-b.startMins)*PX_PER_MIN)}px`;
      node.querySelector(".bm").textContent = `${minsToHHMM(b.startMins)}–${minsToHHMM(b.endMins)}${linked ? ` • ↳ ${linked.title}` : ""}`;
    });

    node.addEventListener("pointerup", async ()=>{
      if (!dragging && !resizing) return;
      dragging=false; resizing=false;
      b.updatedAt = new Date().toISOString();
      await put("timeBlocks", b);
    });

    inner.append(node);
  }

  wrap.append(inner);

  // Auto-scroll to around 'now' (helps with 24h schedule)
  const now = new Date();
  const nowMins = now.getHours()*60 + now.getMinutes();
  const target = Math.max(0, (nowMins - 120) * PX_PER_MIN);
  setTimeout(()=>{ try { wrap.scrollTop = target; } catch(_){} }, 0);

  return wrap;
}

function openTimeBlockModal(dateKeyStr, tasks, editing){
  const isEdit = !!editing;
  const b = isEdit ? {...editing} : {
    id: uuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    date: dateKeyStr,
    title: "",
    startMins: (()=>{ const n=new Date(); const m=n.getHours()*60+n.getMinutes(); return Math.floor(m/15)*15; })(),
    endMins: (()=>{ const n=new Date(); const m=n.getHours()*60+n.getMinutes(); const s=Math.floor(m/15)*15; return Math.min(s+60, 24*60); })(),
    taskId: ""
  };

  const title = el("input",{class:"input", placeholder:"e.g., Deep Work, Meeting...", value:b.title});
  const errTitle = mkFieldError();
  const start = el("input",{class:"input", type:"time", value: minsToHHMM(b.startMins)});
  const errStart = mkFieldError();
  const end = el("input",{class:"input", type:"time", value: minsToHHMM(b.endMins)});
  const errEnd = mkFieldError();

  const taskSel = el("select",{class:"input"},[
    el("option",{value:""},[document.createTextNode("No linked task")]),
    ...tasks.map(t=>el("option",{value:t.id},[document.createTextNode(t.title)]))
  ]);
  taskSel.value = b.taskId || "";

  const body = el("div",{class:"stack"},[
    el("div",{class:"muted small"},[document.createTextNode(`Date: ${dateKeyStr}`)]),
    rowLabel("Title", title, errTitle),
    el("div",{class:"form2"},[
      rowLabel("Start", start, errStart),
      rowLabel("End", end, errEnd)
    ]),
    rowLabel("Link to Task (optional)", taskSel),
    el("div",{class:"muted small"},[document.createTextNode("Save, then drag/resize in the schedule.")])
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ await del("timeBlocks", editing.id); modal.close(); await navigate(route(), true); }}) : el("span"),
    btn(isEdit ? "Save" : "Create",{onclick: async ()=>{
      // Reset errors
      setFieldError(errTitle, "");
      setFieldError(errStart, "");
      setFieldError(errEnd, "");
      
      // Validate
      let hasError = false;
      if (!title.value.trim()) {
        setFieldError(errTitle, "Title is required");
        hasError = true;
      }
      if (!start.value) {
        setFieldError(errStart, "Start time is required");
        hasError = true;
      }
      if (!end.value) {
        setFieldError(errEnd, "End time is required");
        hasError = true;
      }
      
      const s = hhmmToMins(start.value);
      const e = hhmmToMins(end.value);
      
      if (start.value && end.value && e <= s) {
        setFieldError(errEnd, "End time must be after start time");
        hasError = true;
      }
      
      if (hasError) return;
      
      const obj = isEdit ? editing : b;
      obj.title = title.value.trim();
      obj.startMins = clamp(s, START_MINS, END_MINS-15);
      obj.endMins = clamp(e, obj.startMins+15, END_MINS);
      obj.taskId = taskSel.value || "";
      obj.updatedAt = new Date().toISOString();
      await put("timeBlocks", obj);
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title: isEdit ? "Edit Time Block" : "New Time Block", body, footer });
}

/* ---------- Goals + Quarterly Retrospective ---------- */
async function viewGoals(){
  const [yearly, quarterly, monthly, retros] = await Promise.all([
    getAll("yearlyGoals"),
    getAll("quarterlyGoals"),
    getAll("monthlyGoals"),
    getAll("quarterlyRetros")
  ]);

  yearly.sort((a,b)=> (a.targetDate||"").localeCompare(b.targetDate||""));
  quarterly.sort((a,b)=> (b.startDate||"").localeCompare(a.startDate||""));
  monthly.sort((a,b)=> (b.monthKey||"").localeCompare(a.monthKey||""));

  const retroByQ = new Map(retros.map(r => [r.quarterlyGoalId, r]));

  const header = el("div",{},[
    el("div",{class:"h1"},[document.createTextNode("My Goals ✿")]),
    el("div",{class:"subtle"},[document.createTextNode("Dream big, start small")])
  ]);

  
  const mBody = el("div",{class:"fillCol"},[
    el("div",{class:"row spread"},[
      el("div",{class:"muted small"},[document.createTextNode("This month's focus")]),
      btn("+ New",{onclick: ()=>openMonthlyModal(null)})
    ]),
    el("div",{class:"scroll-area goalsScroll flexFill", style:"overflow-y:auto; max-height:280px;"},[monthlyList(monthly)])
  ]);
const yBody = el("div",{class:"stack"},[
    el("div",{class:"row spread"},[
      el("div",{class:"muted small"},[document.createTextNode("Big outcomes tied to pillars.")]),
      btn("Add Yearly",{onclick: ()=>openYearlyModal(null)})
    ]),
    (yearly.length > 2 ? el("div",{class:"scroll-area goalsScroll yearlyClamp", style:"overflow-y:auto; max-height:200px;"},[goalList(yearly)]) : goalList(yearly))
  ]);

  const qBody = el("div",{class:"fillCol"},[
el("div",{class:"row spread"},[
      el("div",{class:"muted small"},[document.createTextNode("Each quarter can have a Stop/Start/Continue retrospective.")]),
      btn("Add Quarterly",{onclick: ()=>openQuarterlyModal(yearly, null)})
    ]),
    el("div",{class:"scroll-area goalsScroll flexFill", style:"overflow-y:auto; max-height:280px;"},[quarterlyList(quarterly, yearly, retroByQ)])
  ]);

  
  const yearCard = card("Yearly", "Your big goals.", yBody);
  yearCard.classList.add("yearlyCard");
  const quarterCard = card("Quarterly", "Your quarter plan.", qBody);
  quarterCard.classList.add("quarterlyCard");
return el("div",{class:"fillPage"},[
    header,
    el("div",{class:"fillMain"},[
      el("div",{class:"grid fillGrid goalsGrid"},[
        cardFill("Monthly", "Your monthly focus.", mBody),
        el("div",{class:"goalsRightStack"},[yearCard, quarterCard])
      ])
    ])
  ]);
}

function goalList(items){
  const list = el("div",{class:"list"},[]);
  if (!items.length){
    list.append(el("div",{class:"muted"},[document.createTextNode("No yearly goals yet.")]));
    return list;
  }
  for (const g of items){
    const meta = [
      g.pillar ? `Pillar: ${pillarName(g.pillar)}` : null,
      g.targetDate ? `Target: ${formatShort(new Date(g.targetDate))}` : null
    ].filter(Boolean).join(" • ");

    const chk = el("input",{type:"checkbox"});
    chk.checked = !!g.isComplete;
    chk.onchange = ()=>setGoalComplete("yearlyGoals", g, chk.checked);

    list.append(el("div",{class:"item"},[
      el("div",{class:"top"},[
        el("div",{},[
          el("div",{class:"leftRow"},[
            chk,
            el("div",{class:"h" + (g.isComplete ? " doneTitle" : "")},[document.createTextNode(g.title)])
          ]),
          el("div",{class:"m"},[document.createTextNode(meta || "—")]),
          (g.isComplete ? el("div",{class:"muted small"},[document.createTextNode("Completed")]) : el("span"))
        ]),
        el("div",{class:"actions"},[
          btn("Edit",{kind:"ghost", onclick: ()=>openYearlyModal(g)}),
          btn("Delete",{kind:"danger", onclick: async ()=>{ await del("yearlyGoals", g.id); await navigate(route(), true); }})
        ])
      ])
    ]));
  }
  return list;
}



function monthlyList(items){
  const list = el("div",{class:"list"},[]);
  if (!items.length){
    list.append(el("div",{class:"muted"},[document.createTextNode("No monthly goals yet.")]));
    return list;
  }
  for (const m of items){
    const meta = [
      m.pillar ? `Pillar: ${pillarName(m.pillar)}` : null,
      m.monthKey ? `Month: ${formatMonthKey(m.monthKey)}` : null
    ].filter(Boolean).join(" • ");

    const chk = el("input",{type:"checkbox"});
    chk.checked = !!m.isComplete;
    chk.onchange = ()=>setGoalComplete("monthlyGoals", m, chk.checked);

    list.append(el("div",{class:"item"},[
      el("div",{class:"top"},[
        el("div",{},[
          el("div",{class:"leftRow"},[
            chk,
            el("div",{class:"h" + (m.isComplete ? " doneTitle" : "")},[document.createTextNode(m.title)])
          ]),
          el("div",{class:"m"},[document.createTextNode(meta || "—")]),
          (m.isComplete ? el("div",{class:"muted small"},[document.createTextNode("Completed")]) : el("span"))
        ]),
        el("div",{class:"actions"},[
          btn("Edit",{kind:"ghost", onclick: ()=>openMonthlyModal(m)}),
          btn("Delete",{kind:"danger", onclick: async ()=>{ await del("monthlyGoals", m.id); await navigate(route(), true); }})
        ])
      ])
    ]));
  }
  return list;
}


function formatMonthKey(monthKey){
  // monthKey: YYYY-MM
  try{
    const [y,mo] = String(monthKey).split("-").map(x=>Number(x));
    if(!y || !mo) return String(monthKey);
    const dt = new Date(Date.UTC(y, mo-1, 1));
    return new Intl.DateTimeFormat("en-GB",{month:"long", year:"numeric"}).format(dt);
  }catch(e){
    return String(monthKey);
  }
}

function openMonthlyModal(editing){
  const isEdit = !!editing;
  const g = isEdit ? {...editing} : {
    id: uuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: "",
    pillar: "fitness",
    details: "",
    successCriteria: "",
    monthKey: monthKey(new Date())
  };

  const pillar = el("select",{class:"input"}, PILLARS.map(p=>el("option",{value:p.key},[document.createTextNode(p.name)])));
  pillar.value = g.pillar || "fitness";
  
  const title = el("input",{class:"input", value:(g.title||""), placeholder:"e.g., Save £200"});
  const errTitle = mkFieldError();

  const month = el("input",{class:"input", type:"month", value:(g.monthKey||monthKey(new Date()))});
  const errMonth = mkFieldError();

  const details = el("textarea",{class:"input", placeholder:"What does this goal involve?"}); 
  details.value = g.details || "";
  
  const success = el("textarea",{class:"input", placeholder:"How will you know you achieved it?"}); 
  success.value = g.successCriteria || "";

  const body = el("div",{class:"stack"},[
    el("div",{class:"form2"},[
      rowLabel("Pillar", pillar),
      rowLabel("Month", month, errMonth)
    ]),
    rowLabel("Title", title, errTitle),
    rowLabel("Details", details),
    rowLabel("Success Criteria", success)
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ await del("monthlyGoals", g.id); modal.close(); await navigate(route(), true); }}) : el("span"),
    btn(isEdit ? "Save" : "Add",{onclick: async ()=>{
      setFieldError(errTitle,"");
      setFieldError(errMonth,"");

      const ttl = title.value.trim();
      if(!ttl){ setFieldError(errTitle,"Title is required"); return; }

      const mk = (month.value||"").trim();
      if(!mk){ setFieldError(errMonth,"Month is required"); return; }

      g.updatedAt = new Date().toISOString();
      g.title = ttl;
      g.pillar = pillar.value || "";
      g.monthKey = mk;
      g.details = details.value.trim();
      g.successCriteria = success.value.trim();

      await put("monthlyGoals", g);
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({title: isEdit ? "Edit Monthly Goal" : "Add Monthly Goal", body, footer});
}

function quarterlyList(items, yearly, retroByQ){
  const list = el("div",{class:"list"},[]);
  if (!items.length){
    list.append(el("div",{class:"muted"},[document.createTextNode("No quarterly goals yet.")]));
    return list;
  }
  for (const q of items){
    const y = q.yearlyGoalId ? yearly.find(x=>x.id===q.yearlyGoalId) : null;
    const meta = [
      q.pillar ? `Pillar: ${pillarName(q.pillar)}` : null,
      q.startDate && q.endDate ? `Dates: ${prettyDateRange(q.startDate, q.endDate)}` : null,
      y ? `↳ ${y.title}` : null
    ].filter(Boolean).join(" • ");

    const hasRetro = retroByQ.has(q.id);

    const chk = el("input",{type:"checkbox"});
    chk.checked = !!q.isComplete;
    chk.onchange = ()=>setGoalComplete("quarterlyGoals", q, chk.checked);

    list.append(el("div",{class:"item"},[
      el("div",{class:"top"},[
        el("div",{},[
          el("div",{class:"leftRow"},[
            chk,
            el("div",{class:"h" + (q.isComplete ? " doneTitle" : "")},[document.createTextNode(q.title)])
          ]),
          el("div",{class:"m"},[document.createTextNode(meta || "—")]),
          (q.isComplete ? el("div",{class:"muted small"},[document.createTextNode("Completed")]) : el("span"))
        ]),
        el("div",{class:"qRight"},[
          badge(hasRetro ? "Retro done" : "Retro missing", hasRetro ? "good" : "warn"),
          el("div",{class:"actions"},[
            btn("Retro",{kind:"ghost", onclick: ()=>openRetroModal(q, retroByQ.get(q.id)||null)}),
            btn("Edit",{kind:"ghost", onclick: ()=>openQuarterlyModal(yearly, q)}),
            btn("Delete",{kind:"danger", onclick: async ()=>{ await del("quarterlyGoals", q.id); await navigate(route(), true); }})
          ])
        ])
      ])
    ]));
  }
  return list;
}


function openYearlyModal(editing){
  const isEdit = !!editing;
  const g = isEdit ? {...editing} : {
    id: uuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pillar: "fitness",
    title: "",
    details: "",
    successCriteria: "",
    targetDate: new Date(new Date().getFullYear(), 11, 31).toISOString()
  };

  const pillar = el("select",{class:"input"}, PILLARS.map(p=>el("option",{value:p.key},[document.createTextNode(p.name)])));
  pillar.value = g.pillar;
  const title = el("input",{class:"input", value:g.title, placeholder:"e.g., Get lean & strong"});
  const errTitle = mkFieldError();
  const details = el("textarea",{class:"input"}); details.value = g.details || "";
  const success = el("textarea",{class:"input"}); success.value = g.successCriteria || "";
  const target = el("input",{class:"input", type:"date", value:(g.targetDate||new Date().toISOString()).slice(0,10)});

  const body = el("div",{class:"stack"},[
    el("div",{class:"form2"},[
      rowLabel("Pillar", pillar),
      rowLabel("Target Date", target)
    ]),
    rowLabel("Title", title, errTitle),
    rowLabel("Details", details),
    rowLabel("Success Criteria", success)
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ await del("yearlyGoals", editing.id); modal.close(); await navigate(route(), true); }}) : el("span"),
    btn(isEdit ? "Save":"Create",{onclick: async ()=>{
      const obj = isEdit ? editing : g;
      obj.pillar = pillar.value;
      obj.title = title.value.trim();
      obj.details = details.value.trim();
      obj.successCriteria = success.value.trim();
      obj.targetDate = new Date(target.value+"T00:00:00").toISOString();
      obj.updatedAt = new Date().toISOString();
      setFieldError(errTitle,"");
      if (!obj.title){ setFieldError(errTitle,"Title is required"); return; }
      await put("yearlyGoals", obj);
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title: isEdit ? "Edit Yearly Goal" : "New Yearly Goal", body, footer });
}

function openQuarterlyModal(yearlyGoals, editing){
  const isEdit = !!editing;
  const q = isEdit ? {...editing} : {
    id: uuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pillar: "fitness",
    title: "",
    details: "",
    startDate: dayKey(new Date()),
    endDate: dayKey(addDays(new Date(), 90)),
    yearlyGoalId: ""
  };

  const pillar = el("select",{class:"input"}, PILLARS.map(p=>el("option",{value:p.key},[document.createTextNode(p.name)])));
  pillar.value = q.pillar;

  const title = el("input",{class:"input", value:q.title, placeholder:"e.g., 90-day sprint"});
  const errTitle = mkFieldError();
  const details = el("textarea",{class:"input"}); details.value = q.details || "";
  const start = el("input",{class:"input", type:"date", value:q.startDate});
  const end = el("input",{class:"input", type:"date", value:q.endDate});

  const y = el("select",{class:"input"},[
    el("option",{value:""},[document.createTextNode("No yearly link")]),
    ...yearlyGoals.map(g=>el("option",{value:g.id},[document.createTextNode(`${pillarName(g.pillar)}: ${g.title}`)]))
  ]);
  y.value = q.yearlyGoalId || "";

  const body = el("div",{class:"stack"},[
    el("div",{class:"form2"},[
      rowLabel("Pillar", pillar),
      rowLabel("Link Yearly (optional)", y)
    ]),
    rowLabel("Title", title, errTitle),
    rowLabel("Details", details),
    el("div",{class:"form2"},[
      rowLabel("Start", start),
      rowLabel("End", end)
    ])
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ await del("quarterlyGoals", editing.id); modal.close(); await navigate(route(), true); }}) : el("span"),
    btn(isEdit ? "Save":"Create",{onclick: async ()=>{
      const obj = isEdit ? editing : q;
      obj.pillar = pillar.value;
      obj.title = title.value.trim();
      obj.details = details.value.trim();
      obj.startDate = start.value;
      obj.endDate = end.value;
      obj.yearlyGoalId = y.value || "";
      obj.updatedAt = new Date().toISOString();
      setFieldError(errTitle,"");
      if (!obj.title){ setFieldError(errTitle,"Title is required"); return; }
      await put("quarterlyGoals", obj);
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title: isEdit ? "Edit Quarterly Goal" : "New Quarterly Goal", body, footer });
}

function openRetroModal(quarter, existing){
  const isEdit = !!existing;
  const r = isEdit ? {...existing} : {
    id: uuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    quarterlyGoalId: quarter.id,
    stop: "",
    start: "",
    cont: "",
    notes: ""
  };

  const stop = el("textarea",{class:"input"}); stop.value = r.stop || "";
  const start = el("textarea",{class:"input"}); start.value = r.start || "";
  const cont = el("textarea",{class:"input"}); cont.value = r.cont || "";
  const notes = el("textarea",{class:"input"}); notes.value = r.notes || "";

  const body = el("div",{class:"stack"},[
    el("div",{class:"muted small"},[document.createTextNode(`Quarter: ${quarter.title}`)]),
    rowLabel("Stop", stop),
    rowLabel("Start", start),
    rowLabel("Continue", cont),
    rowLabel("Notes", notes)
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ await del("quarterlyRetros", existing.id); modal.close(); await navigate(route(), true); }}) : el("span"),
    btn("Save",{onclick: async ()=>{
      const obj = isEdit ? existing : r;
      obj.stop = stop.value.trim();
      obj.start = start.value.trim();
      obj.cont = cont.value.trim();
      obj.notes = notes.value.trim();
      obj.updatedAt = new Date().toISOString();
      await put("quarterlyRetros", obj);
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title:"Quarterly Retrospective", body, footer });
}

/* ---------- Relationships: frequency rules + overdue ---------- */
async function viewRelationships(){
  const [contacts, rules, touchpoints] = await Promise.all([
    getAll("contacts"),
    getAll("contactRules"),
    getAll("touchpoints")
  ]);

  // Get selected month from URL hash or default to current
  const hashParts = location.hash.split("/");
  const selectedMonth = hashParts[1] || monthKey(new Date());
  
  // Filter touchpoints by selected month
  const monthTouchpoints = touchpoints.filter(t => {
    const d = t.dateKey || t.datetime || t.date || "";
    return d.slice(0,7) === selectedMonth;
  });

  contacts.sort((a,b)=>a.name.localeCompare(b.name));
  monthTouchpoints.sort((a,b)=> (b.datetime||b.date||"").localeCompare(a.datetime||a.date||""));

  const ruleByContact = new Map(rules.map(r=>[r.contactId, r]));
  const overdue = await computeDueContacts();
  const overdueSet = new Set(overdue.map(x=>x.id));
  
  // Month navigation
  const [y, m] = selectedMonth.split("-").map(Number);
  const prevMonth = m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,"0")}`;
  const nextMonth = m === 12 ? `${y+1}-01` : `${y}-${String(m+1).padStart(2,"0")}`;
  const currentMk = monthKey(new Date());
  const isCurrentMonth = selectedMonth === currentMk;
  
  const monthNav = el("div",{class:"row", style:"justify-content:center; gap:12px; margin-bottom:8px;"},[
    btn("◀",{kind:"ghost", style:"padding:4px 10px;", onclick:()=>{ location.hash = `relationships/${prevMonth}`; }}),
    el("div",{class:"h2", style:"min-width:120px; text-align:center;"},[document.createTextNode(formatMonthYear(selectedMonth))]),
    btn("▶",{kind:"ghost", style:"padding:4px 10px;", onclick:()=>{ location.hash = `relationships/${nextMonth}`; }}),
    !isCurrentMonth ? btn("Today",{kind:"ghost", style:"padding:4px 8px; font-size:11px;", onclick:()=>{ location.hash = "relationships"; }}) : el("span")
  ]);

  const header = el("div",{},[
    el("div",{class:"h1"},[document.createTextNode("People I Love ❀")]),
    el("div",{class:"subtle"},[document.createTextNode(`${monthTouchpoints.length} check-ins this month`)]),
    monthNav
  ]);

  const leftBody = el("div",{class:"fillCol"},[
el("div",{class:"row spread"},[
      el("div",{class:"muted small"},[document.createTextNode(`My circle (${contacts.length})`)]),
      btn("+ Add",{onclick: ()=>openContactModal()})
    ]),
    el("div",{class:"scroll-area relScroll flexFill", style:"overflow-y:auto; max-height:280px;"},[contactsList(contacts, ruleByContact, overdueSet)])
  ]);

  const rightBody = el("div",{class:"fillCol"},[
el("div",{class:"row spread"},[
      el("div",{class:"muted small"},[document.createTextNode(`Check-ins (${monthTouchpoints.length})`)]),
      btn("+ Log",{onclick: ()=>openTouchpointModal(contacts, null, selectedMonth)})
    ]),
    el("div",{class:"scroll-area relScroll flexFill", style:"overflow-y:auto; max-height:280px;"},[touchpointsList(monthTouchpoints, contacts, selectedMonth)])
  ]);

  const top = (isCurrentMonth && overdue.length)
    ? card("Overdue", "People you haven't contacted recently.", el("div",{style:"overflow-y:auto; max-height:200px;"},[overdueList(overdue)])) 
    : null;

  return el("div",{class:"fillPage"},[
    el("div",{class:"stack"},[header, top].filter(Boolean)),
    el("div",{class:"fillMain"},[
      el("div",{class:"grid fillGrid"},[cardFill("Contacts", "Set how often you want to stay in touch.", leftBody),
      cardFill("Check-ins", "Calls, texts, meets.", rightBody)])
    ])
  ]);
}

function contactsList(contacts, ruleByContact, overdueSet){
  const list = el("div",{class:"list"},[]);
  if (!contacts.length){
    list.append(el("div",{class:"muted"},[document.createTextNode("No contacts yet.")]));
    return list;
  }

  for (const c of contacts){
    const r = ruleByContact.get(c.id);
    const days = Number(r?.desiredEveryDays || 0);
    const status = overdueSet.has(c.id) ? badge("Overdue","bad") : badge("OK","good");

    list.append(el("div",{class:"item"},[
      el("div",{class:"top"},[
        el("div",{},[
          el("div",{class:"h"},[document.createTextNode(c.name)]),
          el("div",{class:"m"},[document.createTextNode(days ? `Contact every ${days} day${days > 1 ? 's' : ''}` : "No reminder set")])
        ]),
        el("div",{class:"actions"},[
          status,
          btn("Edit",{kind:"ghost", onclick: ()=>openContactModal(c)}),
          btn("Reminder",{kind:"ghost", onclick: ()=>openRuleModal(c, r || null)}),
          btn("Delete",{kind:"danger", onclick: async ()=>{
            if (r) await del("contactRules", r.id);
            await del("contacts", c.id);
            await navigate(route(), true);
          }})
        ])
      ])
    ]));
  }
  return list;
}

function touchpointsList(items, contacts, selectedMonth){
  const list = el("div",{class:"list"},[]);
  if (!items.length){
    list.append(el("div",{class:"muted"},[document.createTextNode("No check-ins this month.")]));
    return list;
  }
  for (const t of items.slice(0, 60)){
    const c = contacts.find(x=>x.id===t.contactId);
    const dateStr = t.datetime ? formatDate(new Date(t.datetime)) : (t.dateKey || "No date");
    list.append(el("div",{class:"item"},[
      el("div",{class:"top"},[
        el("div",{},[
          el("div",{class:"h"},[document.createTextNode(c?.name || "Unknown")]),
          el("div",{class:"m"},[document.createTextNode(`${t.type || "check-in"} • ${dateStr}`)])
        ]),
        el("div",{class:"actions"},[
          btn("Edit",{kind:"ghost", onclick: ()=>openTouchpointModal(contacts, t, selectedMonth)}),
          btn("Delete",{kind:"danger", onclick: async ()=>{ await del("touchpoints", t.id); await navigate(route(), true); }})
        ])
      ]),
      (t.notes || t.note) ? el("div",{class:"m", style:"margin-top:8px"},[document.createTextNode(t.notes || t.note)]) : el("div")
    ]));
  }
  return list;
}

function openContactModal(existing=null){
  const isEdit = !!existing;
  const name = el("input",{class:"input", placeholder:"Name", value: existing?.name || ""});
  const errName = mkFieldError();
  const tags = el("input",{class:"input", placeholder:"Comma separated (optional)", value: (existing?.tags || []).join(", ")});
  const notes = el("textarea",{class:"input"}); notes.value = existing?.notes || "";

  const body = el("div",{class:"stack"},[
    rowLabel("Name", name, errName),
    rowLabel("Tags", tags),
    rowLabel("Notes", notes)
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    btn("Save",{onclick: async ()=>{
      setFieldError(errName,"");
      if (!name.value.trim()){ setFieldError(errName,"Name is required"); return; }
      await put("contacts", {
        id: existing?.id || uuid(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: name.value.trim(),
        tags: tags.value.split(",").map(s=>s.trim()).filter(Boolean),
        notes: notes.value.trim()
      });
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title: isEdit ? "Edit Contact" : "New Contact", body, footer });
}

function openRuleModal(contact, existing){
  const isEdit = !!existing;
  const r = isEdit ? {...existing} : { id: uuid(), createdAt: new Date().toISOString(), contactId: contact.id, desiredEveryDays: 7 };

  const days = el("input",{class:"input", type:"number", min:"1", max:"365", value: Number(r.desiredEveryDays || 7)});

  const body = el("div",{class:"stack"},[
    el("div",{class:"muted small"},[document.createTextNode(`Person: ${contact.name}`)]),
    rowLabel("Stay in touch every (days)", days),
    el("div",{class:"muted small"},[document.createTextNode("You'll see a reminder when it's been longer than this since your last contact.")])
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ await del("contactRules", existing.id); modal.close(); await navigate(route(), true); }}) : el("span"),
    btn("Save",{onclick: async ()=>{
      const obj = isEdit ? existing : r;
      obj.desiredEveryDays = clamp(Number(days.value || 7), 1, 365);
      await put("contactRules", obj);
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title:"Set Contact Reminder", body, footer });
}

function openTouchpointModal(contacts, existing=null, selectedMonth=null){
  const isEdit = !!existing;
  const who = el("select",{class:"input"},[
    ...contacts.map(c=>el("option",{value:c.id, selected: (existing?.contactId===c.id)},[document.createTextNode(c.name)]))
  ]);
  const dt = el("input",{class:"input", type:"datetime-local"});
  const errWho = mkFieldError();
  const errDt = mkFieldError();
  
  let base;
  if (existing?.datetime) {
    base = new Date(existing.datetime);
  } else if (selectedMonth) {
    base = new Date(selectedMonth + "-15T12:00:00");
  } else {
    base = new Date();
  }
  dt.value = new Date(base.getTime() - base.getTimezoneOffset()*60000).toISOString().slice(0,16);

  const note = el("textarea",{class:"input"});
  note.value = existing?.note || "";

  const body = el("div",{class:"stack"},[
    rowLabel("Contact", who, errWho),
    rowLabel("When", dt, errDt),
    rowLabel("Notes", note)
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    btn("Save",{onclick: async ()=>{
      setFieldError(errWho,"");
      setFieldError(errDt,"");
      if (!who.value){ setFieldError(errWho,"Contact is required"); return; }
      if (!dt.value){ setFieldError(errDt,"Date and time is required"); return; }
      await put("touchpoints", {
        id: existing?.id || uuid(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contactId: who.value,
        datetime: new Date(dt.value).toISOString(),
        dateKey: new Date(dt.value).toISOString().slice(0,10),
        note: note.value.trim()
      });
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title: isEdit ? "Edit Check-in" : "Log Check-in", body, footer });
}

/* ---------- Finance: budgets vs actual ---------- */
async function viewFinance(){
  const [tx, budgets] = await Promise.all([getAll("transactions"), getAll("budgets")]);
  tx.sort((a,b)=> (b.date||"").localeCompare(a.date||""));

  // Get selected month from URL hash or default to current
  const hashParts = location.hash.split("/");
  const selectedMonth = hashParts[1] || monthKey(new Date());
  
  const monthTx = tx.filter(t => (t.date || "").slice(0,7) === selectedMonth);
  const spent = monthTx.filter(t=>t.direction==="expense").reduce((s,t)=>s+Number(t.amount||0),0);
  const income = monthTx.filter(t=>t.direction==="income").reduce((s,t)=>s+Number(t.amount||0),0);

  const budget = budgets.find(b => b.monthKey === selectedMonth) || null;
  
  // Month navigation
  const [y, m] = selectedMonth.split("-").map(Number);
  const prevMonth = m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,"0")}`;
  const nextMonth = m === 12 ? `${y+1}-01` : `${y}-${String(m+1).padStart(2,"0")}`;
  const currentMk = monthKey(new Date());
  const isCurrentMonth = selectedMonth === currentMk;
  
  const monthNav = el("div",{class:"row", style:"justify-content:center; gap:12px; margin-bottom:8px;"},[
    btn("◀",{kind:"ghost", style:"padding:4px 10px;", onclick:()=>{ location.hash = `finance/${prevMonth}`; }}),
    el("div",{class:"h2", style:"min-width:120px; text-align:center;"},[document.createTextNode(formatMonthYear(selectedMonth))]),
    btn("▶",{kind:"ghost", style:"padding:4px 10px;", onclick:()=>{ location.hash = `finance/${nextMonth}`; }}),
    !isCurrentMonth ? btn("Today",{kind:"ghost", style:"padding:4px 8px; font-size:11px;", onclick:()=>{ location.hash = "finance"; }}) : el("span")
  ]);

  const header = el("div",{},[
    el("div",{class:"h1"},[document.createTextNode("My Money ✿")]),
    el("div",{class:"subtle"},[document.createTextNode(`£${spent.toFixed(2)} spent${income ? ` • £${income.toFixed(2)} income` : ""}`)]),
    monthNav
  ]);

  // Get budget overview and categories separately
  const { overview, categories } = budgetVsActual(budget, monthTx, selectedMonth);

  const budgetBody = el("div",{class:"fillCol"},[
    el("div",{class:"row spread"},[
      el("div",{class:"muted small"},[document.createTextNode("Budget overview")]),
      el("div",{class:"row"},[
        btn("Set Budget",{kind:"ghost", onclick: ()=>openBudgetModal(selectedMonth, budget)}),
        btn("+ Expense",{onclick: ()=>openTxModal(null, selectedMonth)})
      ])
    ]),
    overview,
    el("div",{class:"scroll-area finScroll flexFill", style:"overflow-y:auto; max-height:220px;"},[categories])
  ]);

  const txBody = el("div",{class:"fillCol"},[
    el("div",{class:"row spread"},[
      el("div",{class:"muted small"},[document.createTextNode(`Transactions (${monthTx.length})`)]),
      btn("+ Add",{onclick: ()=>openTxModal(null, selectedMonth)})
    ]),
    el("div",{class:"scroll-area finScroll flexFill", style:"overflow-y:auto; max-height:280px;"},[txList(monthTx, selectedMonth)])
  ]);

  return el("div",{class:"fillPage"},[
    header,
    el("div",{class:"fillMain"},[
      el("div",{class:"grid fillGrid"},[cardFill("Budget vs Actual", "Category breakdown + progress.", budgetBody),
      cardFill("Spending", "Manual entries (offline).", txBody)])
    ])
  ]);
}

function formatMonthYear(mk){
  const [y, m] = mk.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m-1]} ${y}`;
}

function budgetVsActual(budget, monthTx, selectedMonth){
  const totalBudget = Number(budget?.totalBudget || 0);
  const totalTx = monthTx.filter(t=>t.direction==="expense").reduce((s,t)=>s+Number(t.amount||0),0);
  const rem = totalBudget ? (totalBudget-totalTx) : null;

  // Overview section (stays fixed)
  const overview = el("div",{class:"stack", style:"margin-bottom:8px;"},[
    el("div",{class:"row spread"},[
      badge(totalBudget ? `Budget £${totalBudget.toFixed(2)}` : "No total budget", totalBudget ? "" : "warn"),
      badge(`Actual £${totalTx.toFixed(2)}`, "")
    ])
  ]);

  if (totalBudget){
    const p = el("div",{class:"progress"},[el("div")]);
    const pct = (totalTx/totalBudget)*100;
    p.firstChild.style.width = `${clamp(pct, 0, 100)}%`;
    p.firstChild.style.background = pct > 100 ? "rgba(210,90,90,0.8)" : pct > 80 ? "rgba(230,180,80,0.8)" : "rgba(80,180,120,0.8)";
    overview.append(p);
    overview.append(el("div",{class:"muted small"},[document.createTextNode(`Remaining: £${rem.toFixed(2)} (${(100-pct).toFixed(0)}%)`)]));
  }

  // Categories section (will scroll)
  const categories = el("div",{class:"stack"},[]);
  
  const catTx = {};
  for (const t of monthTx){
    if (t.direction !== "expense") continue;
    const c = (t.category || "General").trim() || "General";
    catTx[c] = (catTx[c] || 0) + Number(t.amount||0);
  }
  const catBudget = budget?.categoryBudgets || {};
  const cats = Object.keys({ ...catBudget, ...catTx }).sort((a,b)=>a.localeCompare(b));

  if (!cats.length){
    categories.append(el("div",{class:"muted"},[document.createTextNode("No expenses yet.")]));
    return { overview, categories };
  }

  categories.append(el("div",{class:"muted small"},[document.createTextNode("Category Budget vs Actual")]));

  for (const c of cats){
    const b = Number(catBudget[c] || 0);
    const a = Number(catTx[c] || 0);
    const pct = b ? (a/b)*100 : 0;
    
    // Progress bar for category
    const catProgress = b ? el("div",{class:"progress", style:"height:4px; margin-top:6px;"},[el("div")]) : null;
    if (catProgress){
      catProgress.firstChild.style.width = `${clamp(pct, 0, 100)}%`;
      catProgress.firstChild.style.background = pct > 100 ? "rgba(210,90,90,0.8)" : pct > 80 ? "rgba(230,180,80,0.8)" : "rgba(80,180,120,0.8)";
    }
    
    const statusBadge = b 
      ? (a <= b ? badge(`${(100-pct).toFixed(0)}% left`,"good") : badge(`${(pct-100).toFixed(0)}% over`,"bad")) 
      : badge("No budget","warn");

    categories.append(el("div",{class:"item"},[
      el("div",{class:"top"},[
        el("div",{style:"flex:1;"},[
          el("div",{class:"h"},[document.createTextNode(c)]),
          el("div",{class:"m"},[document.createTextNode(`Budget: ${b?`£${b.toFixed(2)}`:"—"} • Spent: £${a.toFixed(2)}`)]),
          catProgress
        ]),
        el("div",{class:"actions", style:"flex-direction:column; gap:4px;"},[
          statusBadge,
          btn("Edit",{kind:"ghost", style:"font-size:11px; padding:4px 8px;", onclick: ()=>openCategoryBudgetModal(c, budget, a, selectedMonth)})
        ])
      ])
    ]));
  }

  return { overview, categories };
}

function txList(items, selectedMonth){
  const list = el("div",{class:"list"},[]);
  if (!items.length){
    list.append(el("div",{class:"muted"},[document.createTextNode("No transactions this month.")]));
    return list;
  }
  for (const t of items.slice(0, 60)){
    list.append(el("div",{class:"item"},[
      el("div",{class:"top"},[
        el("div",{},[
          el("div",{class:"h", style: t.direction==="income" ? "color:rgba(80,180,120,0.9);" : ""},[document.createTextNode(`${t.direction==="income"?"+":"-"}£${Number(t.amount||0).toFixed(2)}`)]),
          el("div",{class:"m"},[document.createTextNode(`${t.category || "General"} • ${formatDate(new Date(t.date))}`)])
        ]),
        el("div",{class:"actions"},[
          btn("Edit",{kind:"ghost", onclick: ()=>openTxModal(t, selectedMonth)}),
          btn("Delete",{kind:"danger", onclick: async ()=>{ await del("transactions", t.id); await navigate(route(), true); }})
        ])
      ]),
      t.merchant ? el("div",{class:"m", style:"margin-top:4px"},[document.createTextNode(t.merchant)]) : el("div")
    ]));
  }
  return list;
}

function openTxModal(existing=null, selectedMonth=null){
  const isEdit = !!existing;
  const dt = el("input",{class:"input", type:"datetime-local"});
  const errDt = mkFieldError();
  
  // Default to selected month if provided, otherwise use existing date or now
  let base;
  if (existing?.date) {
    base = new Date(existing.date);
  } else if (selectedMonth) {
    // Default to first of selected month at noon
    base = new Date(selectedMonth + "-15T12:00:00");
  } else {
    base = new Date();
  }
  dt.value = new Date(base.getTime() - base.getTimezoneOffset()*60000).toISOString().slice(0,16);

  const direction = el("select",{class:"input"},[
    el("option",{value:"expense"},[document.createTextNode("Spend")]),
    el("option",{value:"income"},[document.createTextNode("Income")])
  ]);
  // Set direction value after element creation for reliability
  direction.value = existing?.direction || "expense";

  const amount = el("input",{class:"input", type:"number", step:"0.01", value: existing ? Number(existing.amount||0) : ""});
  const errAmount = mkFieldError();
  const category = el("input",{class:"input", placeholder:"e.g., Food", value: existing?.category || ""});
  const merchant = el("input",{class:"input", placeholder:"e.g., Tesco", value: existing?.merchant || ""});

  const body = el("div",{class:"stack"},[
    rowLabel("Date/Time", dt, errDt),
    rowLabel("Type", direction),
    rowLabel("Amount", amount, errAmount),
    rowLabel("Category", category),
    rowLabel("Merchant", merchant)
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    btn("Save",{onclick: async ()=>{
      setFieldError(errDt,"");
      setFieldError(errAmount,"");
      if(!dt.value){ setFieldError(errDt,"Date/Time is required"); return; }
      const amt = Number(amount.value||0);
      if(!amt || amt<=0){ setFieldError(errAmount,"Amount is required"); return; }
      await put("transactions", {
        id: existing?.id || uuid(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: new Date(dt.value).toISOString(),
        direction: direction.value,
        amount: Number(amount.value || 0),
        category: category.value.trim() || "General",
        merchant: merchant.value.trim()
      });
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title: isEdit ? "Edit Transaction" : "New Transaction", body, footer });
}

function openBudgetModal(mk, existing){
  const isEdit = !!existing;
  const b = isEdit ? {...existing} : {
    id: uuid(),
    createdAt: new Date().toISOString(),
    monthKey: mk,
    totalBudget: 0,
    categoryBudgets: {}
  };

  const total = el("input",{class:"input", type:"number", step:"0.01", value: Number(b.totalBudget || 0)});
  const cats = el("textarea",{class:"input"});
  cats.value = Object.entries(b.categoryBudgets || {}).map(([k,v])=>`${k}=${v}`).join("\n");

  const body = el("div",{class:"stack"},[
    el("div",{class:"muted small"},[document.createTextNode(`Month: ${mk}`)]),
    rowLabel("Total Budget", total),
    rowLabel("Category Budgets (one per line: Category=Amount)", cats)
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ await del("budgets", existing.id); modal.close(); await navigate(route(), true); }}) : el("span"),
    btn("Save",{onclick: async ()=>{
      const obj = isEdit ? existing : b;
      obj.monthKey = mk;
      obj.totalBudget = Number(total.value || 0);

      const map = {};
      for (const line of cats.value.split("\n")){
        const s = line.trim();
        if (!s) continue;
        const parts = s.split("=");
        if (parts.length < 2) continue;
        const k = parts[0].trim();
        const v = Number(parts.slice(1).join("=").trim());
        if (!k) continue;
        map[k] = isFinite(v) ? v : 0;
      }
      obj.categoryBudgets = map;

      await put("budgets", obj);
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title:"Monthly Budget", body, footer });
}

async function openCategoryBudgetModal(categoryName, existingBudget, currentSpend, selectedMonth){
  const mk = selectedMonth || monthKey(new Date());
  
  // Get existing category budget if any
  const existingCatBudget = existingBudget?.categoryBudgets?.[categoryName] || 0;
  
  // Suggest a budget based on current spend (rounded up to nearest 50) or existing
  const suggested = existingCatBudget || Math.ceil((currentSpend * 1.2) / 50) * 50 || 100;
  
  const budgetInput = el("input",{class:"input", type:"number", step:"0.01", placeholder:`e.g., ${suggested}`});
  budgetInput.value = suggested;
  
  const body = el("div",{class:"stack"},[
    el("div",{class:"muted small"},[document.createTextNode(`Category: "${categoryName}" • ${formatMonthYear(mk)}`)]),
    el("div",{class:"muted small"},[document.createTextNode(`Current spend: £${currentSpend.toFixed(2)}`)]),
    rowLabel("Budget Amount (£)", budgetInput),
    existingCatBudget ? el("div",{class:"muted small", style:"margin-top:8px;"},[document.createTextNode(`Current budget: £${existingCatBudget.toFixed(2)}`)]) : el("span")
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    existingCatBudget ? btn("Remove",{kind:"danger", onclick: async ()=>{
      // Remove this category budget
      const budgets = await getAll("budgets");
      let budget = budgets.find(b => b.monthKey === mk);
      if (budget && budget.categoryBudgets) {
        delete budget.categoryBudgets[categoryName];
        budget.updatedAt = new Date().toISOString();
        await put("budgets", budget);
      }
      modal.close();
      await navigate(route(), true);
    }}) : el("span"),
    btn("Save",{onclick: async ()=>{
      const amt = Number(budgetInput.value || 0);
      if (amt <= 0) { alert("Please enter a valid budget amount"); return; }
      
      // Get or create budget for this month
      const budgets = await getAll("budgets");
      let budget = budgets.find(b => b.monthKey === mk);
      
      if (!budget) {
        budget = {
          id: uuid(),
          createdAt: new Date().toISOString(),
          monthKey: mk,
          totalBudget: 0,
          categoryBudgets: {}
        };
      }
      
      budget.categoryBudgets = budget.categoryBudgets || {};
      budget.categoryBudgets[categoryName] = amt;
      budget.updatedAt = new Date().toISOString();
      
      await put("budgets", budget);
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title: `${existingCatBudget ? "Edit" : "Set"} ${categoryName} Budget`, body, footer });
}

/* ---------- Fitness: workouts + sets/reps ---------- */
async function viewFitness(){
  const [workouts, sets, bio] = await Promise.all([
    getAll("workouts"),
    getAll("workoutSets"),
    getAll("biometrics")
  ]);

  // Get selected month from URL hash or default to current
  const hashParts = location.hash.split("/");
  const selectedMonth = hashParts[1] || monthKey(new Date());
  
  // Filter by selected month
  const monthWorkouts = workouts.filter(w => (w.date || "").slice(0,7) === selectedMonth);
  const monthBio = bio.filter(b => (b.date || "").slice(0,7) === selectedMonth);
  
  monthWorkouts.sort((a,b)=> (b.date||"").localeCompare(a.date||""));
  monthBio.sort((a,b)=> (b.date||"").localeCompare(a.date||""));

  const setsByWorkout = new Map();
  for (const s of sets){
    const arr = setsByWorkout.get(s.workoutId) || [];
    arr.push(s);
    setsByWorkout.set(s.workoutId, arr);
  }
  
  // Month navigation
  const [y, m] = selectedMonth.split("-").map(Number);
  const prevMonth = m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,"0")}`;
  const nextMonth = m === 12 ? `${y+1}-01` : `${y}-${String(m+1).padStart(2,"0")}`;
  const currentMk = monthKey(new Date());
  const isCurrentMonth = selectedMonth === currentMk;
  
  // Stats for selected month
  const totalWorkouts = monthWorkouts.length;
  const totalSets = monthWorkouts.reduce((sum, w) => sum + (setsByWorkout.get(w.id)?.length || 0), 0);
  
  const monthNav = el("div",{class:"row", style:"justify-content:center; gap:12px; margin-bottom:8px;"},[
    btn("◀",{kind:"ghost", style:"padding:4px 10px;", onclick:()=>{ location.hash = `fitness/${prevMonth}`; }}),
    el("div",{class:"h2", style:"min-width:120px; text-align:center;"},[document.createTextNode(formatMonthYear(selectedMonth))]),
    btn("▶",{kind:"ghost", style:"padding:4px 10px;", onclick:()=>{ location.hash = `fitness/${nextMonth}`; }}),
    !isCurrentMonth ? btn("Today",{kind:"ghost", style:"padding:4px 8px; font-size:11px;", onclick:()=>{ location.hash = "fitness"; }}) : el("span")
  ]);

  const header = el("div",{},[
    el("div",{class:"h1"},[document.createTextNode("Wellness ❀")]),
    el("div",{class:"subtle"},[document.createTextNode(`${totalWorkouts} workouts • ${totalSets} sets`)]),
    monthNav
  ]);

  const wBody = el("div",{class:"fillCol"},[
el("div",{class:"row spread"},[
      el("div",{class:"muted small"},[document.createTextNode(`Workouts (${monthWorkouts.length})`)]),
      btn("+ Log",{onclick: ()=>openWorkoutModal(null, selectedMonth)})
    ]),
    el("div",{class:"scroll-area fitScroll flexFill", style:"overflow-y:auto; max-height:280px;"},[workoutsList(monthWorkouts, setsByWorkout, selectedMonth)])
  ]);

  const bBody = el("div",{class:"stack"},[
    el("div",{class:"row spread"},[
      el("div",{class:"muted small"},[document.createTextNode(`Body stats (${monthBio.length})`)]),
      btn("+ Add",{kind:"ghost", onclick: ()=>openBioModal(null, selectedMonth)})
    ]),
    el("div",{class:"scroll-area fitScroll flexFill", style:"overflow-y:auto; max-height:280px;"},[bioList(monthBio, selectedMonth)])
  ]);

  return el("div",{class:"fillPage"},[
    header,
    el("div",{class:"fillMain"},[
      el("div",{class:"grid fillGrid"},[cardFill("Workouts", "Open a workout to add sets.", wBody),
      cardFill("Biometrics", "Weight, BF%, sleep, energy.", bBody)])
    ])
  ]);
}

function workoutsList(workouts, setsByWorkout, selectedMonth){
  const list = el("div",{class:"list"},[]);
  if (!workouts.length){
    list.append(el("div",{class:"muted"},[document.createTextNode("No workouts this month.")]));
    return list;
  }
  for (const w of workouts.slice(0, 40)){
    const ws = (setsByWorkout.get(w.id) || []).sort((a,b)=> (a.createdAt||"").localeCompare(b.createdAt||""));
    list.append(el("div",{class:"item"},[
      el("div",{class:"top"},[
        el("div",{},[
          el("div",{class:"h"},[document.createTextNode(w.title || "Workout")]),
          el("div",{class:"m"},[document.createTextNode(`${formatDate(new Date(w.date))} • Sets: ${ws.length}`)])
        ]),
        el("div",{class:"actions"},[
          btn("Edit",{kind:"ghost", onclick: ()=>openWorkoutModal(w, selectedMonth)}),
          btn("Open",{kind:"ghost", onclick: ()=>openWorkoutDetailModal(w, ws)}),
          btn("Delete",{kind:"danger", onclick: async ()=>{
            for (const s of ws) await del("workoutSets", s.id);
            await del("workouts", w.id);
            await navigate(route(), true);
          }})
        ])
      ]),
      w.notes ? el("div",{class:"m", style:"margin-top:8px"},[document.createTextNode(w.notes)]) : el("div")
    ]));
  }
  return list;
}

function openWorkoutModal(existing=null, selectedMonth=null){
  const isEdit = !!existing;
  const dt = el("input",{class:"input", type:"datetime-local"});
  const errDt = mkFieldError();
  
  let base;
  if (existing?.date) {
    base = new Date(existing.date);
  } else if (selectedMonth) {
    base = new Date(selectedMonth + "-15T12:00:00");
  } else {
    base = new Date();
  }
  dt.value = new Date(base.getTime() - base.getTimezoneOffset()*60000).toISOString().slice(0,16);

  const title = el("input",{class:"input", placeholder:"e.g., Push Day", value: existing?.title || ""});
  const errTitle = mkFieldError();
  const notes = el("textarea",{class:"input"}); notes.value = existing?.notes || "";

  const body = el("div",{class:"stack"},[
    rowLabel("Date/Time", dt, errDt),
    rowLabel("Title", title, errTitle),
    rowLabel("Notes", notes)
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    btn("Save",{onclick: async ()=>{
      setFieldError(errDt,"");
      setFieldError(errTitle,"");
      if(!dt.value){ setFieldError(errDt,"Date/Time is required"); return; }
      if(!title.value.trim()){ setFieldError(errTitle,"Title is required"); return; }
      await put("workouts", {
        id: existing?.id || uuid(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: new Date(dt.value).toISOString(),
        title: title.value.trim() || "Workout",
        notes: notes.value.trim()
      });
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title: isEdit ? "Edit Workout" : "New Workout", body, footer });
}

function openWorkoutDetailModal(workout, workoutSets){
  const body = el("div",{class:"stack"},[]);
  body.append(el("div",{class:"muted small"},[document.createTextNode(`${workout.title} • ${formatDate(new Date(workout.date))}`)]));

  // Group sets by exercise name
  const groups = new Map();
  for (const s of (workoutSets||[])){
    const key = String(s.exercise||"").trim() || "Exercise";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  // Keep a stable order: by exercise name, then by createdAt/updatedAt
  const exerciseNames = Array.from(groups.keys()).sort((a,b)=>a.localeCompare(b));
  for (const k of exerciseNames){
    groups.get(k).sort((a,b)=> String(a.createdAt||"").localeCompare(String(b.createdAt||"")));
  }

  body.append(btn("Add Set",{onclick: ()=>openSetModal(workout)}));

  const wrap = el("div",{class:"list"},[]);
  if (!workoutSets || !workoutSets.length){
    wrap.append(el("div",{class:"muted"},[document.createTextNode("No sets yet. Add your first set.")]));
  } else {
    for (const ex of exerciseNames){
      const sets = groups.get(ex) || [];

      const section = el("div",{class:"exerciseGroup"},[
        el("div",{class:"exerciseHeader"},[
          el("div",{class:"h"},[document.createTextNode(ex)]),
          el("div",{class:"m"},[document.createTextNode(`${sets.length} set${sets.length===1?"":"s"}`)])
        ])
      ]);

      const list = el("div",{class:"exerciseList"},[]);
      for (let i=0;i<sets.length;i++){
        const s = sets[i];
        const setNo = i+1;
        const w = (s.weight === null || s.weight === undefined || s.weight === "" || Number(s.weight) === 0) ? null : Number(s.weight);
        const line = `${s.reps} reps${w ? ` @ ${w}kg` : ""}`;

        list.append(el("div",{class:"item compact"},[
          el("div",{class:"top"},[
            el("div",{},[
              el("div",{class:"h"},[document.createTextNode(line)]),
              el("div",{class:"m"},[document.createTextNode(`Set ${setNo}`)])
            ]),
            el("div",{class:"actions"},[
              btn("Edit",{kind:"ghost", onclick: ()=>openSetModal(workout, s)}),
              btn("Delete",{kind:"danger", onclick: async ()=>{
                await del("workoutSets", s.id);
                modal.close();
                await navigate(route(), true);
              }})
            ])
          ])
        ]));
      }

      section.append(list);
      wrap.append(section);
    }
  }

  body.append(wrap);

  const footer = el("div",{},[
    btn("Close",{kind:"ghost", onclick: ()=>modal.close()})
  ]);

  modal.open({ title:"Workout Details", body, footer });
}

async function openSetModal(workout, existing=null){
  const isEdit = !!existing;

  // Suggest existing exercises in this workout (keeps names consistent for grouping)
  let exerciseOptions = [];
  try{
    const allSets = await getAll("workoutSets");
    exerciseOptions = allSets
      .filter(x=>x.workoutId===workout.id)
      .map(x=>String(x.exercise||"").trim())
      .filter(Boolean);
    exerciseOptions = Array.from(new Set(exerciseOptions)).sort((a,b)=>a.localeCompare(b));
  }catch(e){ exerciseOptions = []; }

  const dlId = `exerciseSuggestions-${workout.id}`;
  const dl = el("datalist",{id: dlId}, exerciseOptions.map(v=>el("option",{value:v},[])));

  const exercise = el("input",{class:"input", list: dlId, placeholder:"Exercise", value: existing?.exercise || ""});
  const errExercise = mkFieldError();

  const reps = el("input",{class:"input", type:"number", step:"1", value: existing ? String(existing.reps ?? "") : ""});
  const errReps = mkFieldError();

  const weight = el("input",{class:"input", type:"number", step:"0.5", value: (existing && existing.weight!=null && Number(existing.weight)!==0) ? String(existing.weight) : ""});

  const body = el("div",{class:"stack"},[
    dl,
    el("div",{class:"muted small"},[document.createTextNode(isEdit ? "Edit Set" : "Add Set")]),
    rowLabel("Exercise", exercise),
    errExercise,
    rowLabel("Reps", reps),
    errReps,
    rowLabel("Weight (kg, optional)", weight)
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    btn(isEdit ? "Save" : "Add",{onclick: async ()=>{
      const ex = String(exercise.value||"").trim();
      const repsVal = String(reps.value||"").trim();

      setFieldError(errExercise, "");
      setFieldError(errReps, "");

      let ok = true;
      if(!ex){ setFieldError(errExercise, "Exercise is required"); ok = false; }
      if(!repsVal || Number(repsVal) <= 0){ setFieldError(errReps, "Reps must be greater than 0"); ok = false; }
      if(!ok) return;

      const obj = existing ? {...existing} : { id: uuid(), workoutId: workout.id, createdAt: new Date().toISOString() };
      obj.exercise = ex;
      obj.reps = Number(repsVal);
      obj.weight = (String(weight.value).trim()==="" ? null : Number(weight.value));
      obj.updatedAt = new Date().toISOString();

      await put("workoutSets", obj);
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title: isEdit ? "Edit Set" : "Add Set", body, footer });
}

function openBioModal(existing=null, selectedMonth=null){
  const isEdit = !!existing;
  const dt = el("input",{class:"input", type:"date"});
  
  if (existing?.date) {
    dt.value = String(existing.date).slice(0,10);
  } else if (selectedMonth) {
    dt.value = selectedMonth + "-15";
  } else {
    dt.value = dayKey(new Date());
  }

  const weight = el("input",{class:"input", type:"number", step:"0.1", value: existing ? Number(existing.weight||0) : ""});
  const bf = el("input",{class:"input", type:"number", step:"0.1", value: existing ? Number(existing.bodyFat||0) : ""});
  const sleep = el("input",{class:"input", type:"number", step:"0.1", value: existing ? Number(existing.sleepHours||0) : ""});
  const energy = el("input",{class:"input", type:"number", step:"1", value: existing ? Number(existing.energy||0) : ""});

  const body = el("div",{class:"stack"},[
    rowLabel("Date", dt),
    rowLabel("Weight (kg)", weight),
    rowLabel("Body Fat (%)", bf),
    rowLabel("Sleep (hours)", sleep),
    rowLabel("Energy (1-10)", energy)
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    btn("Save",{onclick: async ()=>{
      if(!dt.value) return toast("Date is required");
      const w = Number(weight.value||0), b = Number(bf.value||0), s = Number(sleep.value||0), e = Number(energy.value||0);
      if(!w && !b && !s && !e) return toast("Enter at least one value");
      await put("biometrics", {
        id: existing?.id || uuid(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: dt.value,
        weight: Number(weight.value || 0),
        bodyFat: Number(bf.value || 0),
        sleepHours: Number(sleep.value || 0),
        energy: Number(energy.value || 0)
      });
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title: isEdit ? "Edit Biometrics" : "New Biometrics", body, footer });
}

function bioList(items, selectedMonth){
  const list = el("div",{class:"list"},[]);
  if (!items.length){
    list.append(el("div",{class:"muted"},[document.createTextNode("No biometrics this month.")]));
    return list;
  }
  for (const b of items.slice(0, 30)){
    const meta = [
      b.weight ? `${b.weight}kg` : null,
      b.bodyFat ? `${b.bodyFat}% BF` : null,
      b.sleepHours ? `${b.sleepHours}h sleep` : null,
      b.energy ? `Energy ${b.energy}/10` : null
    ].filter(Boolean).join(" • ");

    list.append(el("div",{class:"item"},[
      el("div",{class:"top"},[
        el("div",{},[
          el("div",{class:"h"},[document.createTextNode(b.date)]),
          el("div",{class:"m"},[document.createTextNode(meta || "—")])
        ]),
        el("div",{class:"actions"},[
          btn("Edit",{kind:"ghost", onclick: ()=>openBioModal(b, selectedMonth)}),
          btn("Delete",{kind:"danger", onclick: async ()=>{ await del("biometrics", b.id); await navigate(route(), true); }})
        ])
      ])
    ]));
  }
  return list;
}

/* ---------- Spiritual (small base) ---------- */
async function viewSpiritual(){
  const [verse, prayers, sermons] = await Promise.all([
    ensureVerse(),
    getAll("prayers"),
    getAll("sermons")
  ]);

  prayers.sort((a,b)=> (b.dateRequested||"").localeCompare(a.dateRequested||""));
  sermons.sort((a,b)=> (b.date||"").localeCompare(a.date||""));

  const header = el("div",{},[
    el("div",{class:"h1"},[document.createTextNode("Faith & Spirit ✿")]),
    el("div",{class:"subtle"},[document.createTextNode("Nourish your soul")])
  ]);

  const verseBody = el("div",{class:"stack"},[
    el("div",{class:"banner"},[
      el("div",{class:"t"},[document.createTextNode("My Verse")]),
      el("div",{class:"ref"},[document.createTextNode(verse.reference || "")]),
      verse.text ? el("div",{class:"txt"},[document.createTextNode(verse.text)]) : el("div",{class:"txt"})
    ]),
    btn("Edit",{kind:"ghost", onclick: ()=>openVerseModal(verse)})
  ]);

  const prayersBody = el("div",{class:"fillCol"},[
    el("div",{class:"row spread"},[
      el("div",{class:"muted small"},[document.createTextNode("Prayers")]),
      btn("+ Add",{onclick: ()=>openPrayerModal()})
    ]),
    el("div",{class:"scroll-area spiScroll flexFill", style:"overflow-y:auto;"},[prayerList(prayers)])
  ]);

  const sermonsBody = el("div",{class:"fillCol"},[
    el("div",{class:"row spread"},[
      el("div",{class:"muted small"},[document.createTextNode("Notes")]),
      btn("+ Add",{onclick: ()=>openSermonModal()})
    ]),
    el("div",{class:"scroll-area spiScroll flexFill", style:"overflow-y:auto;"},[sermonList(sermons)])
  ]);

  return el("div",{class:"fillPage"},[
    header,
    el("div",{class:"fillMain"},[
      el("div",{class:"grid fillGrid"},[card("Verse", "Shows on dashboard.", verseBody),
      el("div",{class:"stack", style:"gap:14px;"},[
        cardFill("Prayer Journal", "Track requested → answered.", prayersBody),
        cardFill("Sermon Notes", "Notes + application.", sermonsBody)
      ])])
    ])
  ]);
}

function openVerseModal(existing){
  const ref = el("input",{class:"input", value: existing?.reference || ""});
  const txt = el("textarea",{class:"input"}); txt.value = existing?.text || "";

  const body = el("div",{class:"stack"},[
    rowLabel("Reference", ref),
    rowLabel("Text", txt)
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    btn("Save",{onclick: async ()=>{
      await put("verse", { id: existing?.id || uuid(), reference: ref.value.trim(), text: txt.value.trim() });
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title:"Edit Verse", body, footer });
}

function openPrayerModal(existing=null){
  const isEdit = !!existing;
  const requested = el("input",{class:"input", type:"date"});
  const errReq = mkFieldError();
  requested.value = existing?.dateRequested || dayKey(new Date());

  const answered = el("input",{class:"input", type:"date"});
  answered.value = existing?.dateAnswered || "";

  const details = el("textarea",{class:"input"});
  const errDetails = mkFieldError();
  details.value = existing?.requestDetails || "";

  const body = el("div",{class:"stack"},[
    rowLabel("Date Requested", requested, errReq),
    rowLabel("Request Details", details, errDetails),
    rowLabel("Date Answered (optional)", answered)
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    btn("Save",{onclick: async ()=>{
      setFieldError(errReq,"");
      setFieldError(errDetails,"");
      if(!requested.value){ setFieldError(errReq,"Date Requested is required"); return; }
      if(!details.value.trim()){ setFieldError(errDetails,"Request Details is required"); return; }
      await put("prayers", {
        id: existing?.id || uuid(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dateRequested: requested.value,
        requestDetails: details.value.trim(),
        dateAnswered: answered.value || ""
      });
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title: isEdit ? "Edit Prayer" : "New Prayer", body, footer });
}

function prayerList(items){
  const list = el("div",{class:"list"},[]);
  if (!items.length){
    list.append(el("div",{class:"muted"},[document.createTextNode("No prayers yet.")]));
    return list;
  }
  for (const p of items.slice(0, 40)){
    const meta = `Requested: ${p.dateRequested} • ${p.dateAnswered ? "Answered: "+p.dateAnswered : "Unanswered"}`;
    list.append(el("div",{class:"item"},[
      el("div",{class:"top"},[
        el("div",{},[
          el("div",{class:"h"},[document.createTextNode(p.requestDetails || "(empty)")]),
          el("div",{class:"m"},[document.createTextNode(meta)])
        ]),
        el("div",{class:"actions"},[
          btn("Open",{kind:"ghost", onclick: ()=>openPrayerModal(p)}),
          btn("Delete",{kind:"danger", onclick: async ()=>{ await del("prayers", p.id); await navigate(route(), true); }})
        ])
      ])
    ]));
  }
  return list;
}

function openSermonModal(existing=null){
  const isEdit = !!existing;
  const d = el("input",{class:"input", type:"date"});
  const errDate = mkFieldError();
  d.value = existing?.date || dayKey(new Date());

  const title = el("input",{class:"input", placeholder:"Title", value: existing?.title || ""});
  const errTitle = mkFieldError();
  const notes = el("textarea",{class:"input"}); notes.value = existing?.mainNotes || "";
  const appField = el("textarea",{class:"input"}); appField.value = existing?.application || "";

  const body = el("div",{class:"stack"},[
    rowLabel("Date", d, errDate),
    rowLabel("Title", title, errTitle),
    rowLabel("Notes", notes),
    rowLabel("Application", appField)
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    btn("Save",{onclick: async ()=>{
      setFieldError(errDate,"");
      setFieldError(errTitle,"");
      if(!d.value){ setFieldError(errDate,"Date is required"); return; }
      if(!title.value.trim()){ setFieldError(errTitle,"Title is required"); return; }
      await put("sermons", {
        id: existing?.id || uuid(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: d.value,
        title: title.value.trim(),
        mainNotes: notes.value.trim(),
        application: appField.value.trim()
      });
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title: isEdit ? "Edit Sermon Note" : "Sermon Note", body, footer });
}

function sermonList(items){
  const list = el("div",{class:"list"},[]);
  if (!items.length){
    list.append(el("div",{class:"muted"},[document.createTextNode("No sermon notes yet.")]));
    return list;
  }
  for (const s of items.slice(0, 40)){
    list.append(el("div",{class:"item"},[
      el("div",{class:"top"},[
        el("div",{},[
          el("div",{class:"h"},[document.createTextNode(s.title)]),
          el("div",{class:"m"},[document.createTextNode(`${s.date} • ${s.application ? "Has application" : "No application"}`)])
        ]),
        el("div",{class:"actions"},[
          btn("Edit",{kind:"ghost", onclick: ()=>openSermonModal(s)}),
          btn("Delete",{kind:"danger", onclick: async ()=>{ await del("sermons", s.id); await navigate(route(), true); }})
        ])
      ])
    ]));
  }
  return list;
}

/* ---------- Weekly Review ---------- */
async function viewWeekly(settings, baseKey){
  const base = baseKey ? new Date(baseKey+"T00:00:00") : new Date();
  const ws = weekStart(base, !!settings.weekStartsMonday);
  const we = addDays(ws, 7);

  const [touch, tx, prayers, sermons] = await Promise.all([
    getAll("touchpoints"),
    getAll("transactions"),
    getAll("prayers"),
    getAll("sermons")
  ]);

  const inWeek = (isoOrKey)=>{
    if (!isoOrKey) return false;
    const d = isoOrKey.length===10 ? new Date(isoOrKey+"T00:00:00") : new Date(isoOrKey);
    return d >= ws && d < we;
  };

  const moneySpent = tx.filter(t=>t.direction==="expense" && inWeek(t.date)).reduce((s,t)=>s+Number(t.amount||0),0);
  const touchCount = touch.filter(t=>inWeek(t.dateKey || t.datetime || t.date || "")).length;
  const spiritualCount = prayers.filter(p=>inWeek(p.dateRequested || p.createdAt || "")).length + sermons.filter(s=>inWeek(s.date || s.createdAt || "")).length;

  const header = el("div",{},[
    el("div",{class:"h1"},[document.createTextNode("Weekly Review")]),
    el("div",{class:"subtle"},[document.createTextNode(`${formatShort(ws)} → ${formatShort(addDays(we,-1))}`)])
  ]);

  const body = el("div",{class:"stack"},[
    card("Money Spent", "Expenses this week.", el("div",{class:"h1", style:"font-size:28px"},[document.createTextNode(`£${moneySpent.toFixed(2)}`)])),
    card("Relationship Touchpoints", "Calls/texts/meets logged.", el("div",{class:"h1", style:"font-size:28px"},[document.createTextNode(String(touchCount))])),
    card("Spiritual Actions", "Prayers + sermons created.", el("div",{class:"h1", style:"font-size:28px"},[document.createTextNode(String(spiritualCount))]))
  ]);

  return el("div",{class:"stack"},[header, body]);
}

/* ---------- Settings ---------- */

/* ---------- Day view (history) ---------- */
async function viewDay(settings, key){
  const date = new Date(key + "T00:00:00");
  const [tasks, blocks, reviews, tx, touch, workouts, prayers, bio] = await Promise.all([
    getAll("tasks"),
    getAll("timeBlocks"),
    getAll("dailyReviews"),
    getAll("transactions"),
    getAll("touchpoints"),
    getAll("workouts"),
    getAll("prayers"),
    getAll("biometrics")
  ]);

  const dayTasks = tasks.filter(t=>(t.scheduledDate||t.date||"" )===key);
  const dayBlocks = blocks.filter(b=>b.date===key).sort((a,b)=>(a.startMins??a.startMin)-(b.startMins??b.startMin));
  const dayTx = tx.filter(t=>String(t.date||"").slice(0,10)===key);
  const spend = dayTx.filter(t=>t.direction==="expense").reduce((s,t)=>s+Number(t.amount||0),0);
  const income = dayTx.filter(t=>t.direction==="income").reduce((s,t)=>s+Number(t.amount||0),0);
  const dayTouch = touch.filter(t=>String(t.dateKey||t.datetime||"").slice(0,10)===key);
  const dayWorkouts = workouts.filter(w=>String(w.date||"").slice(0,10)===key);
  const dayPrayers = prayers.filter(p=>String(p.dateRequested||p.createdAt||"").slice(0,10)===key);
  const review = reviews.find(r=>r.date===key);
  const bioDay = bio.filter(b=>(b.date||"").slice(0,10)===key).sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")))[0];

  const header = el("div",{class:"row", style:"justify-content:space-between; align-items:center;"},[
    btn("← Back",{kind:"ghost", onclick:()=>{ location.hash = "weekly/" + key; }}),
    el("div",{},[
      el("div",{class:"h1"},[document.createTextNode(date.toLocaleDateString(undefined,{weekday:"long", month:"long", day:"numeric", year:"numeric"}))]),
      el("div",{class:"muted"},[document.createTextNode(key)])
    ]),
    el("div",{})
  ]);

  const scoreCard = card("Daily Score", "", el("div",{class:"stack"},[
    el("div",{class:"row", style:"gap:10px; flex-wrap:wrap;"},[
      badge(review ? ("Score " + (review.score||0)) : "No score"),
      badge(dayTasks.filter(t=>t.status==="done").length + "/" + dayTasks.length + " tasks done"),
      badge("£" + spend.toFixed(2) + " spent"),
      badge(dayTouch.length + " check-ins")
    ]),
    review ? el("div",{class:"muted"},[document.createTextNode(review.notes || "")]) : el("div",{class:"muted"},[document.createTextNode("No review saved for this day.")])
  ]));

  const tasksCard = card("Tasks", "", el("div",{class:"stack"}, dayTasks.length ? dayTasks.map(t=>el("div",{class:"row", style:"justify-content:space-between;"},[
    el("div",{},[document.createTextNode((t.status==="done" ? "✓ " : "• ") + t.title)]),
    t.pillar ? badge(t.pillar) : el("span",{})
  ])) : [el("div",{class:"muted"},[document.createTextNode("No tasks saved for this day.")])]));

  const blocksCard = card("Time Blocks", "", el("div",{class:"stack"}, dayBlocks.length ? dayBlocks.map(b=>{
    const s = minutesToLabel(b.startMins??b.startMin);
    const e = minutesToLabel(b.endMins??b.endMin);
    return el("div",{class:"row", style:"justify-content:space-between;"},[
      el("div",{},[document.createTextNode(`${s}–${e} • ${b.title || "Block"}`)]),
      b.taskId ? badge("Linked") : el("span",{})
    ]);
  }) : [el("div",{class:"muted"},[document.createTextNode("No time blocks saved for this day.")])]));

  const moneyCard = card("Money", "", el("div",{class:"stack"},[
    el("div",{class:"row", style:"gap:10px; flex-wrap:wrap;"},[
      badge("Spent £" + spend.toFixed(2)),
      badge("In £" + income.toFixed(2))
    ]),
    ...(dayTx.length ? dayTx.map(t=>el("div",{class:"row", style:"justify-content:space-between;"},[
      el("div",{},[document.createTextNode(`${t.direction==="expense" ? "Spent" : "In"} • £${Number(t.amount||0).toFixed(2)} • ${t.category || "Other"}`)]),
      el("div",{class:"muted small"},[document.createTextNode((t.note||"").slice(0,50))])
    ])) : [el("div",{class:"muted"},[document.createTextNode("No spending saved for this day.")])])
  ]));

  const relCard = card("Relationships", "", el("div",{class:"stack"}, dayTouch.length ? dayTouch.map(x=>el("div",{class:"row", style:"justify-content:space-between;"},[
    el("div",{},[document.createTextNode(`${x.contactName || x.name || "Contact"} • Check-in`)]),
    el("div",{class:"muted small"},[document.createTextNode(x.note || "")])
  ])) : [el("div",{class:"muted"},[document.createTextNode("No check-ins saved for this day.")])]));

  const fitCard = card("Fitness", "", el("div",{class:"stack"},[
    ...(bioDay ? [el("div",{class:"row", style:"gap:10px; flex-wrap:wrap;"},[
      bioDay.weight ? badge("Weight " + bioDay.weight) : el("span",{}),
      bioDay.bodyFat ? badge("BF% " + bioDay.bodyFat) : el("span",{})
    ])] : [el("div",{class:"muted"},[document.createTextNode("No body stats saved for this day.")])]),
    ...(dayWorkouts.length ? dayWorkouts.map(w=>el("div",{class:"row", style:"justify-content:space-between;"},[
      el("div",{},[document.createTextNode(w.title || "Workout")]),
      el("div",{class:"muted small"},[document.createTextNode((w.notes||"").slice(0,60))])
    ])) : [el("div",{class:"muted"},[document.createTextNode("No workouts saved for this day.")])])
  ]));

  const spiritCard = card("Spiritual", "", el("div",{class:"stack"}, dayPrayers.length ? dayPrayers.map(p=>el("div",{class:"stack"},[
    el("div",{class:"row", style:"justify-content:space-between;"},[
      el("div",{},[document.createTextNode("Prayer")]),
      p.dateAnswered ? badge("Answered","good") : badge("Open")
    ]),
    el("div",{class:"muted small"},[document.createTextNode((p.requestDetails||"").slice(0,120))])
  ])) : [el("div",{class:"muted"},[document.createTextNode("No prayers saved for this day.")])]));

  return el("div",{class:"stack"},[
    header,
    scoreCard,
    el("div",{class:"grid2"},[tasksCard, blocksCard]),
    el("div",{class:"grid2"},[moneyCard, relCard]),
    el("div",{class:"grid2"},[fitCard, spiritCard])
  ]);
}


async function viewDiary(settings){
  const hasPin = !!settings.diaryPinHash;
  const unlocked = hasPin && diaryIsUnlocked();

  const header = el("div",{},[
    el("div",{class:"h1"},[document.createTextNode("My Diary ❀")]),
    el("div",{class:"subtle"},[document.createTextNode("Your private thoughts")])
  ]);

  // No PIN set - only show option to set PIN
  if (!hasPin) {
    const btnSetPin = btn("Set PIN",{onclick: async ()=>{
      const a = el("input",{class:"input", type:"password", inputmode:"numeric", placeholder:"Set a PIN (4+ digits)"});
      const b = el("input",{class:"input", type:"password", inputmode:"numeric", placeholder:"Confirm PIN"});
      const body = el("div",{class:"stack"},[
        el("div",{class:"muted small"},[document.createTextNode("This locks your Diary on this device.")]),
        a,b
      ]);
      const ok = await confirmModal("Set Diary PIN", body, "Set PIN");
      if(!ok) return;
      const p1 = (a.value||"").trim();
      const p2 = (b.value||"").trim();
      if(!p1 || p1.length < 4) return toast("Use at least 4 digits");
      if(p1 !== p2) return toast("PINs do not match");

      const salt = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(x=>x.toString(16).padStart(2,"0")).join("");
      settings.diaryPinSalt = salt;
      settings.diaryPinHash = await hashPin(p1, salt);
      await put("settings", settings);
      diarySetUnlocked(true); // unlock after setting PIN so user can add entries
      toast("PIN set - diary unlocked");
      location.hash = "diary?t=" + Date.now();
    }});

    return el("div",{class:"stack"},[
      header,
      card("Set Up Your Diary", "", el("div",{class:"stack"},[
        el("div",{class:"muted"},[document.createTextNode("Your diary is private. Set a PIN to protect your entries.")]),
        el("div",{class:"row"},[btnSetPin])
      ]))
    ]);
  }

  // PIN set but locked - show unlock option only
  if (!unlocked) {
    const btnUnlock = btn("Unlock",{onclick: async ()=>{
      const u = await diaryEnsureUnlock(settings, "diary");
      if(!u.ok){ await showModal("Unlock Diary", u.node); }
    }});

    return el("div",{class:"stack"},[
      header,
      card("Diary Locked", "", el("div",{class:"stack"},[
        el("div",{class:"muted"},[document.createTextNode("🔒 Your diary is locked. Enter your PIN to unlock.")]),
        el("div",{class:"row"},[btnUnlock])
      ]))
    ]);
  }

  // PIN set and unlocked - show full diary
  const entries = await getAll("diaryEntries");
  entries.sort((a,b)=> (b.dateKey||"").localeCompare(a.dateKey||"") || (b.updatedAt||"").localeCompare(a.updatedAt||""));

  const btnNew = btn("New entry",{onclick: async ()=>{
    const id = uuid();
    const today = dayKey(new Date());
    const e = { id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dateKey: today, title:"", content:"" };
    await put("diaryEntries", e);
    location.hash = "diary/" + id;
  }});

  const btnLock = btn("Lock",{kind:"ghost", onclick: async ()=>{
    diarySetUnlocked(false);
    toast("Locked");
    // Force re-render by updating hash with timestamp then back to diary
    location.hash = "diary?t=" + Date.now();
  }});

  const btnChangePin = btn("Change PIN",{kind:"ghost", onclick: async ()=>{
    const curr = el("input",{class:"input", type:"password", inputmode:"numeric", placeholder:"Current PIN"});
    const a = el("input",{class:"input", type:"password", inputmode:"numeric", placeholder:"New PIN (4+ digits)"});
    const b = el("input",{class:"input", type:"password", inputmode:"numeric", placeholder:"Confirm New PIN"});
    const body = el("div",{class:"stack"},[curr, a, b]);
    const ok = await confirmModal("Change Diary PIN", body, "Change PIN");
    if(!ok) return;
    
    // Verify current PIN
    const currHash = await hashPin((curr.value||"").trim(), settings.diaryPinSalt);
    if(currHash !== settings.diaryPinHash) return toast("Current PIN is incorrect");
    
    const p1 = (a.value||"").trim();
    const p2 = (b.value||"").trim();
    if(!p1 || p1.length < 4) return toast("Use at least 4 digits");
    if(p1 !== p2) return toast("PINs do not match");

    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(x=>x.toString(16).padStart(2,"0")).join("");
    settings.diaryPinSalt = salt;
    settings.diaryPinHash = await hashPin(p1, salt);
    await put("settings", settings);
    toast("PIN changed");
  }});

  const topRow = el("div",{class:"row spread"},[
    el("div",{class:"muted small"},[document.createTextNode("🔓 Unlocked")]),
    el("div",{class:"row"},[btnNew, btnLock, btnChangePin])
  ]);

  const list = entries.length
    ? el("div",{class:"diaryList"}, entries.map(e=>{
        const title = (e.title||"").trim() || "(untitled)";
        const date = e.dateKey || "";
        const preview = (e.content||"").trim().slice(0,140);
        return el("button",{class:"listitem", onclick: ()=>{ location.hash = "diary/" + e.id; }},[
          el("div",{class:"li-top"},[
            el("div",{class:"li-title"},[document.createTextNode(title)]),
            el("div",{class:"li-meta"},[document.createTextNode(date)]),
          ]),
          el("div",{class:"li-sub"},[document.createTextNode(preview)])
        ]);
      }))
    : el("div",{class:"muted"},[document.createTextNode("No entries yet. Click 'New entry' to start writing.")]);

  return el("div",{class:"diaryPage"},[
    header,
    topRow,
    el("div",{class:"diaryListWrap", style:"overflow-y:auto; max-height:400px;"},[list])
  ]);
}

async function viewDiaryEntry(settings, id){
  const header = el("div",{},[
    el("div",{class:"h1"},[document.createTextNode("Diary entry")]),
    el("div",{class:"subtle"},[document.createTextNode("Write freely. It saves locally.")])
  ]);
  
  // Check if locked
  if(settings.diaryPinHash && !diaryIsUnlocked()){
    const body = el("div",{class:"stack"},[
      el("div",{class:"muted"},[document.createTextNode("Diary is locked. Unlock it from the Diary page.")]),
      btn("Back to Diary",{kind:"ghost", onclick: ()=>{ location.hash = "diary"; }})
    ]);
    return el("div",{class:"stack"},[header, card("Locked", "", body)]);
  }
  
  const all = await getAll("diaryEntries");
  const entry = all.find(x=>x.id === id);
  
  if(!entry){
    return el("div",{class:"stack"},[
      header, 
      card("Not Found", "", el("div",{class:"stack"},[
        el("div",{class:"muted"},[document.createTextNode("Entry not found. It may have been deleted.")]),
        btn("Back to Diary",{kind:"ghost", onclick: ()=>{ location.hash = "diary"; }})
      ]))
    ]);
  }

  const date = el("input",{class:"input", type:"date", value: entry.dateKey || dayKey(new Date())});
  const title = el("input",{class:"input", placeholder:"Title (optional)", value: entry.title || ""});
  const content = el("textarea",{class:"textarea", placeholder:"Write your poem or reflection...", rows:"14"});
  content.value = entry.content || "";

  const btnBack = btn("Back",{kind:"ghost", onclick: ()=>{ location.hash = "diary"; }});
  const btnSave = btn("Save",{onclick: async ()=>{
    entry.dateKey = date.value || entry.dateKey;
    entry.title = title.value || "";
    entry.content = content.value || "";
    entry.updatedAt = new Date().toISOString();
    await put("diaryEntries", entry);
    toast("Saved");
  }});
  const btnDelete = btn("Delete",{kind:"danger", onclick: async ()=>{
    const ok = await confirmModal("Delete entry?", el("div",{},[document.createTextNode("This cannot be undone.")]), "Delete");
    if(!ok) return;
    await del("diaryEntries", entry.id);
    toast("Deleted");
    location.hash = "diary?t=" + Date.now();
  }});

  const actionRow = el("div",{class:"row"},[btnBack, btnSave, btnDelete]);

  const fields = el("div",{class:"stack"},[
    rowLabel("Date", date),
    rowLabel("Title", title),
    el("div",{class:"stack"},[
      el("div",{class:"label"},[document.createTextNode("Writing")]),
      content
    ])
  ]);

  const body = el("div",{class:"stack"},[
    actionRow,
    fields
  ]);

  return el("div",{class:"stack"},[
    header,
    card("Write", "", body)
  ]);
}




async function viewSettings(settings){
  const frog = el("input",{type:"checkbox"});
  frog.checked = !!settings.frogRequired;

  const time = el("input",{class:"input", type:"time", value: minsToHHMM(settings.dailyReviewPromptMins || 21*60)});

  const notif = el("input",{type:"checkbox"});
  notif.checked = !!settings.notificationsEnabled;

  const hour = el("input",{class:"input", type:"number", min:"0", max:"23", value: Number(settings.overdueNotifyHour || 10)});

  const monday = el("input",{type:"checkbox"});
  monday.checked = !!settings.weekStartsMonday;

  const perm = ("Notification" in window) ? Notification.permission : "unsupported";

  const header = el("div",{},[
    el("div",{class:"h1"},[document.createTextNode("Settings ✿")]),
    el("div",{class:"subtle"},[document.createTextNode("Customize your experience")])
  ]);

  const prefs = el("div",{class:"stack"},[
    el("div",{class:"row spread"},[
      el("div",{},[
        el("div",{style:"font-weight:800"},[document.createTextNode("Daily focus task")]),
        el("div",{class:"muted small"},[document.createTextNode("Pick one priority each day")])
      ]),
      frog
    ]),
    rowLabel("Evening review time", time),
    el("div",{class:"row spread"},[
      el("div",{},[
        el("div",{style:"font-weight:800"},[document.createTextNode("Week starts Monday")]),
        el("div",{class:"muted small"},[document.createTextNode("For weekly summaries")])
      ]),
      monday
    ]),
    el("hr"),
    el("div",{class:"row spread"},[
      el("div",{},[
        el("div",{style:"font-weight:950"},[document.createTextNode("Due notifications")]),
        el("div",{class:"muted small"},[document.createTextNode("Browser notifications while the app is open.")])
      ]),
      notif
    ]),
    rowLabel("Notify hour (0-23)", hour),
    el("div",{class:"muted small"},[document.createTextNode("Notification permission: " + perm)]),
    el("div",{class:"row"},[
      btn("Request Permission",{kind:"ghost", onclick: async ()=>{
        try{
          if(!("Notification" in window)) return toast("Notifications not supported here.");
          await Notification.requestPermission();
          await navigate(route(), true);
        }catch(_){
          toast("Couldn't request permission.");
        }
      }}),
      btn("Save",{onclick: async ()=>{
        settings.frogRequired = frog.checked;
        settings.dailyReviewPromptMins = hhmmToMins(time.value);
        settings.notificationsEnabled = notif.checked;
        settings.overdueNotifyHour = clamp(Number(hour.value || 10), 0, 23);
        settings.weekStartsMonday = monday.checked;
        await put("settings", settings);
        await navigate(route(), true);
      }})
    ])
  ]);

  // Spotify card (optional)
  let spCard = null;
  try{
    if(typeof spotifyCfg === "function"){
      const sp = spotifyCfg();
      const spId = el("input",{class:"input", placeholder:"Spotify Client ID", value: sp.clientId || ""});
      const spFull = el("input",{type:"checkbox"});
      spFull.checked = (sp.useFull !== false);

      const accLine = el("div",{class:"muted small"},[document.createTextNode("Account: checking…")]);
      (async ()=>{
        try{
          if(typeof spotifyGetProfile !== "function") { accLine.textContent = "Account: not connected"; return; }
          const p = await spotifyGetProfile();
          if(!p){ accLine.textContent = "Account: not connected"; return; }
          const prod = (p.product || "unknown").toLowerCase();
          accLine.textContent = "Account: " + prod;
        }catch(_){
          accLine.textContent = "Account: not connected";
        }
      })();

      const redirectLine = el("div",{class:"muted small"},[
        document.createTextNode("Redirect URL to add in Spotify: " + (typeof spotifyRedirectUri === "function" ? spotifyRedirectUri() : ""))
      ]);

      spCard = card("Spotify (Optional)", "Connect for enhanced features.", el("div",{class:"stack"},[
        accLine,
        redirectLine,
        el("label",{class:"label"},[document.createTextNode("Client ID")]),
        spId,
        el("label",{class:"row", style:"gap:10px; align-items:center;"},[
          spFull,
          el("div",{},[document.createTextNode("Use Spotify for full songs (Premium required)")])
        ]),
        el("div",{class:"row"},[
          btn((typeof spotifyConnected==="function" && spotifyConnected()) ? "Reconnect" : "Connect",{onclick: async ()=>{
            const cfg = spotifyCfg();
            cfg.clientId = (spId.value||"").trim();
            cfg.useFull = !!spFull.checked;
            setSpotifyCfg(cfg);
            if(!cfg.clientId) return toast("Paste your Spotify Client ID first.");
            await spotifyBeginAuth();
          }}),
          btn("Disconnect",{kind:"ghost", onclick: async ()=>{
            if(typeof spotifyClear==="function") spotifyClear();
            toast("Spotify disconnected");
            await navigate(route(), true);
          }})
        ])
      ]));
    }
  }catch(_){
    spCard = null;
  }

  // Music info card
  const musicCard = card("Music Player", "Daily R&B Love Song", el("div",{class:"stack"},[
    el("div",{class:"muted"},[document.createTextNode("Preview plays a 30-second clip in-app via iTunes.")]),
    el("div",{class:"muted small"},[document.createTextNode("Click 'Play Full Video' to open the full song on YouTube.")])
  ]));

  return el("div",{class:"stack"},[
    header,
    card("Preferences", "", prefs),
    spCard ? spCard : el("div"),
    musicCard
  ]);
}


/* ---------- Task + Daily review modals ---------- */
function openTaskModal({ defaultDate, editing }){
  const isEdit = !!editing;
  const t = isEdit ? {...editing} : {
    id: uuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: "",
    notes: "",
    status: "todo",
    scheduledDate: defaultDate || dayKey(new Date()),
    isFrog: false,
    pillar: "",
    quarterlyGoalId: ""
  };

  Promise.all([getAll("quarterlyGoals")]).then(([qGoals])=>{
    qGoals.sort((a,b)=> (b.startDate||"").localeCompare(a.startDate||""));

    const title = el("input",{class:"input", value:(t.title||""), placeholder:"Task"});
    const errTitle = mkFieldError();
    const notes = el("textarea",{class:"input"}); notes.value = t.notes || "";
    const date = el("input",{class:"input", type:"date", value:(t.scheduledDate||dayKey(new Date()))});
    const errDate = mkFieldError();

    const pillar = el("select",{class:"input"},[
      el("option",{value:""},[document.createTextNode("No pillar")]),
      ...PILLARS.map(p=>el("option",{value:p.key},[document.createTextNode(p.name)]))
    ]);
    pillar.value = t.pillar || "";

    const q = el("select",{class:"input"},[
      el("option",{value:""},[document.createTextNode("No quarterly link")]),
      ...qGoals.map(g=>el("option",{value:g.id},[document.createTextNode(`${pillarName(g.pillar)}: ${g.title}`)]))
    ]);
    q.value = t.quarterlyGoalId || "";

    const frog = el("input",{type:"checkbox"});
    frog.checked = !!t.isFrog;

    const body = el("div",{class:"stack"},[
      rowLabel("Title", title, errTitle),
      rowLabel("Notes", notes),
      el("div",{class:"form3"},[
        rowLabel("Date", date, errDate),
        rowLabel("Pillar", pillar),
        rowLabel("Quarterly link", q)
      ]),
      el("div",{class:"row"},[frog, el("div",{class:"muted small"},[document.createTextNode("Mark as Top Priority")])])
    ]);

    const footer = el("div",{},[
      btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
      isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ await del("tasks", editing.id); modal.close(); await navigate(route(), true); }}) : el("span"),
      btn(isEdit ? "Save":"Create",{onclick: async ()=>{
        const obj = isEdit ? editing : t;
        setFieldError(errTitle, "");
        setFieldError(errDate, "");
        obj.title = title.value.trim();
        if (!obj.title){ setFieldError(errTitle, "Title is required"); return; }
        if (!date.value){ setFieldError(errDate, "Date is required"); return; }
        obj.notes = notes.value.trim();
        obj.scheduledDate = date.value;
        obj.pillar = pillar.value || "";
        obj.quarterlyGoalId = q.value || "";
        obj.isFrog = frog.checked;
        obj.updatedAt = new Date().toISOString();
        await put("tasks", obj);
        modal.close();
        await navigate(route(), true);
      }})
    ]);

    modal.open({ title: isEdit ? "Edit Task" : "New Task", body, footer });
  });
}

function openDailyReviewModal(dateKeyStr, existing){
  const score = el("input",{class:"input", type:"number", min:"1", max:"10", value: existing?.score ?? 7});
  const errScore = el("div",{class:"field-error hidden"},[document.createTextNode("")]);
  const notes = el("textarea",{class:"input"}); notes.value = existing?.notes ?? "";

  const body = el("div",{class:"stack"},[
    el("div",{class:"muted small"},[document.createTextNode(`Date: ${dateKeyStr}`)]),
    rowLabel("Score (1-10)", score),
    errScore,
    rowLabel("Notes", notes)
  ]);

  const footer = el("div",{},[
    btn("Cancel",{kind:"ghost", onclick: ()=>modal.close()}),
    btn(existing ? "Update":"Save",{onclick: async ()=>{
      errScore.textContent = "";
      errScore.classList.add("hidden");
      const raw = Number(score.value);
      if(!raw || raw < 1 || raw > 10){
        errScore.textContent = "Score must be between 1 and 10";
        errScore.classList.remove("hidden");
        return;
      }
      const obj = existing ? {...existing} : { id: uuid(), createdAt: new Date().toISOString(), date: dateKeyStr };
      obj.score = clamp(Number(score.value || 7), 1, 10);
      obj.notes = notes.value.trim();
      await put("dailyReviews", obj);
      modal.close();
      await navigate(route(), true);
    }})
  ]);

  modal.open({ title:"Daily Scorecard", body, footer });
}

const appErrors = [];
function logAppError(kind, message, detail){
  const item = { kind, message: String(message||""), detail: detail ? String(detail).slice(0,800) : "", at: new Date().toISOString() };
  appErrors.unshift(item);
  if(appErrors.length > 50) appErrors.length = 50;
}
window.addEventListener("error", (e)=>{
  try{
    logAppError("error", e.message || "Error", (e.filename||"") + ":" + (e.lineno||"") + ":" + (e.colno||""));
  }catch(_){}
});
window.addEventListener("unhandledrejection", (e)=>{
  try{
    const r = e.reason;
    logAppError("promise", r?.message || "Unhandled rejection", r?.stack || String(r||""));
  }catch(_){}
});async function setGoalComplete(storeName, item, checked){
  const obj = {...item};
  obj.updatedAt = new Date().toISOString();
  obj.isComplete = !!checked;
  obj.completedAt = checked ? (obj.completedAt || new Date().toISOString()) : null;
  await put(storeName, obj);
  await navigate(route(), true);
}

function sortByCompleteThenUpdated(a,b){
  const ac = a.isComplete ? 1 : 0;
  const bc = b.isComplete ? 1 : 0;
  if(ac !== bc) return ac - bc; // incomplete first
  return String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||""));
}

function prettyDate(d){
  if(!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return new Intl.DateTimeFormat("en-GB",{day:"numeric", month:"short", year:"numeric"}).format(dt);
}
function prettyDateRange(start, end){
  if(!start || !end) return "";
  const s = new Date(start), e = new Date(end);
  if(Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${start} → ${end}`;
  const sFmt = new Intl.DateTimeFormat("en-GB",{day:"numeric", month:"short"}).format(s);
  const eFmt = new Intl.DateTimeFormat("en-GB",{day:"numeric", month:"short"}).format(e);
  const sY = s.getFullYear(), eY = e.getFullYear();
  if(sY === eY) return `${sFmt} – ${eFmt} ${sY}`;
  return `${sFmt} ${sY} – ${eFmt} ${eY}`;
}


