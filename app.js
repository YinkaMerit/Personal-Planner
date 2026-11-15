import { getAll, put, del, exportAll, importAll } from "./db.js";
import { uuid, dayKey, monthKey, localDayKey, startOfDay, addDays, clamp, formatDate, formatShort, minsToHHMM, hhmmToMins, weekStart } from "./utils.js";
import * as sync from "./sync.js";

// Global partner data cache
let partnerScheduleData = null;

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
  // A bare YYYY-MM-DD parses as UTC, so pin it to local midnight
  selectedDate = date instanceof Date ? date : new Date(String(date).length === 10 ? date + "T00:00:00" : date);
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
const BIRTHDAY_MD = "01-24";
const BIRTHDAY_SONG = { artist:"Ryan Ofei", title:"Celebrate", ytId:"ZY1hOYo3_c4" };

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

/* ---------- Daily rotation (verse + song) ---------- */
// Walks a shuffled copy of the list one item per day, so nothing repeats until the whole list has been used.
function dailyPick(list, dateKeyStr, salt){
  const [y,m,d] = String(dateKeyStr||"").split("-").map(Number);
  const dayNo = Math.floor(Date.UTC(y||2026, (m||1)-1, d||1) / 86400000);
  const cycle = Math.floor(dayNo / list.length);
  const pos = ((dayNo % list.length) + list.length) % list.length;
  let seed = (cycle * 2654435761 + salt) >>> 0;
  const rnd = ()=>{
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = list.map((_,i)=>i);
  for (let i=order.length-1; i>0; i--){
    const j = Math.floor(rnd()*(i+1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return list[order[pos]];
}

function pickDailyRnB(dateKeyStr){
  if (String(dateKeyStr).slice(5) === BIRTHDAY_MD) return BIRTHDAY_SONG;
  return dailyPick(RNB_LOVE, dateKeyStr, 24);
}

// Offline set of verses (King James wording). Not a substitute for a full Bible.
const VERSES = [
  { ref:"Jeremiah 29:11", text:"For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end."},
  { ref:"Psalm 23:1", text:"The LORD is my shepherd; I shall not want."},
  { ref:"Philippians 4:6-7", text:"Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus."},
  { ref:"Isaiah 41:10", text:"Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness."},
  { ref:"Romans 8:28", text:"And we know that all things work together for good to them that love God, to them who are the called according to his purpose."},
  { ref:"Proverbs 3:5-6", text:"Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths."},
  { ref:"Matthew 11:28", text:"Come unto me, all ye that labour and are heavy laden, and I will give you rest."},
  { ref:"Philippians 4:13", text:"I can do all things through Christ which strengtheneth me."},
  { ref:"Joshua 1:9", text:"Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest."},
  { ref:"Psalm 46:1", text:"God is our refuge and strength, a very present help in trouble."},
  { ref:"Psalm 46:10", text:"Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth."},
  { ref:"Isaiah 40:31", text:"But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint."},
  { ref:"John 3:16", text:"For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life."},
  { ref:"Psalm 118:24", text:"This is the day which the LORD hath made; we will rejoice and be glad in it."},
  { ref:"Lamentations 3:22-23", text:"It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness."},
  { ref:"2 Timothy 1:7", text:"For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind."},
  { ref:"Psalm 27:1", text:"The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?"},
  { ref:"Psalm 37:4", text:"Delight thyself also in the LORD; and he shall give thee the desires of thine heart."},
  { ref:"Psalm 119:105", text:"Thy word is a lamp unto my feet, and a light unto my path."},
  { ref:"Matthew 6:33", text:"But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you."},
  { ref:"Matthew 6:34", text:"Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof."},
  { ref:"Romans 12:2", text:"And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God."},
  { ref:"Galatians 6:9", text:"And let us not be weary in well doing: for in due season we shall reap, if we faint not."},
  { ref:"1 Corinthians 13:13", text:"And now abideth faith, hope, charity, these three; but the greatest of these is charity."},
  { ref:"1 Corinthians 16:14", text:"Let all your things be done with charity."},
  { ref:"Psalm 34:8", text:"O taste and see that the LORD is good: blessed is the man that trusteth in him."},
  { ref:"Psalm 56:3", text:"What time I am afraid, I will trust in thee."},
  { ref:"Psalm 91:1", text:"He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty."},
  { ref:"Psalm 121:1-2", text:"I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth."},
  { ref:"Psalm 139:14", text:"I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well."},
  { ref:"Proverbs 16:3", text:"Commit thy works unto the LORD, and thy thoughts shall be established."},
  { ref:"Proverbs 31:25", text:"Strength and honour are her clothing; and she shall rejoice in time to come."},
  { ref:"Proverbs 18:10", text:"The name of the LORD is a strong tower: the righteous runneth into it, and is safe."},
  { ref:"Isaiah 26:3", text:"Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee."},
  { ref:"Nahum 1:7", text:"The LORD is good, a strong hold in the day of trouble; and he knoweth them that trust in him."},
  { ref:"Zephaniah 3:17", text:"The LORD thy God in the midst of thee is mighty; he will save, he will rejoice over thee with joy; he will rest in his love, he will joy over thee with singing."},
  { ref:"John 14:27", text:"Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid."},
  { ref:"John 16:33", text:"These things I have spoken unto you, that in me ye might have peace. In the world ye shall have tribulation: but be of good cheer; I have overcome the world."},
  { ref:"Romans 15:13", text:"Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost."},
  { ref:"2 Corinthians 5:7", text:"For we walk by faith, not by sight."},
  { ref:"2 Corinthians 12:9", text:"And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness. Most gladly therefore will I rather glory in my infirmities, that the power of Christ may rest upon me."},
  { ref:"Philippians 4:19", text:"But my God shall supply all your need according to his riches in glory by Christ Jesus."},
  { ref:"Hebrews 11:1", text:"Now faith is the substance of things hoped for, the evidence of things not seen."},
  { ref:"Hebrews 13:8", text:"Jesus Christ the same yesterday, and to day, and for ever."},
  { ref:"James 1:5", text:"If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him."},
  { ref:"1 Peter 5:7", text:"Casting all your care upon him; for he careth for you."},
  { ref:"1 John 4:19", text:"We love him, because he first loved us."},
  { ref:"Deuteronomy 31:6", text:"Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee."},
  { ref:"Numbers 6:24-26", text:"The LORD bless thee, and keep thee: The LORD make his face shine upon thee, and be gracious unto thee: The LORD lift up his countenance upon thee, and give thee peace."},
  { ref:"Micah 6:8", text:"He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?"},
  { ref:"Psalm 16:8", text:"I have set the LORD always before me: because he is at my right hand, I shall not be moved."},
  { ref:"Psalm 55:22", text:"Cast thy burden upon the LORD, and he shall sustain thee: he shall never suffer the righteous to be moved."},
  { ref:"Psalm 100:5", text:"For the LORD is good; his mercy is everlasting; and his truth endureth to all generations."},
  { ref:"Psalm 143:8", text:"Cause me to hear thy lovingkindness in the morning; for in thee do I trust: cause me to know the way wherein I should walk; for I lift up my soul unto thee."},
  { ref:"Matthew 5:16", text:"Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven."},
  { ref:"Mark 11:24", text:"Therefore I say unto you, What things soever ye desire, when ye pray, believe that ye receive them, and ye shall have them."}
];
function verseOfDay(dateKeyStr){
  return dailyPick(VERSES, dateKeyStr, 7);
}


const pageHost = document.getElementById("pageHost");
const drawer = document.getElementById("drawer");

const modal = {
  backdrop: document.getElementById("modalBackdrop"),
  title: document.getElementById("modalTitle"),
  body: document.getElementById("modalBody"),
  footer: document.getElementById("modalFooter"),
  closeBtn: document.getElementById("modalClose"),
  onDismiss: null,
  open({title, body, footer, onDismiss}){
    this.onDismiss = onDismiss || null;
    this.title.textContent = title || "";
    this.body.innerHTML = "";
    this.body.append(body);
    this.footer.innerHTML = "";
    this.footer.append(footer);
    this.backdrop.classList.remove("hidden");
    this.backdrop.setAttribute("aria-hidden", "false");
    this.body.scrollTop = 0;
  },
  close(){
    this.onDismiss = null;
    this.backdrop.classList.add("hidden");
    this.backdrop.setAttribute("aria-hidden", "true");
  },
  // Closed with X, the backdrop or Escape (as opposed to a footer button)
  dismiss(){
    const cb = this.onDismiss;
    this.close();
    if (cb) cb();
  },
  isOpen(){ return !this.backdrop.classList.contains("hidden"); }
};
modal.closeBtn.addEventListener("click", ()=>modal.dismiss());
modal.backdrop.addEventListener("click", (e)=>{ if (e.target === modal.backdrop) modal.dismiss(); });
document.addEventListener("keydown", (e)=>{ if (e.key === "Escape" && modal.isOpen()) modal.dismiss(); });


/* ---------- Modal helpers ---------- */
function showModal(title, bodyNode, footerNode){
  return new Promise((resolve)=>{
    const footer = footerNode || el("div",{class:"row"},[
      btn("Close",{kind:"ghost", onclick: ()=>{ modal.close(); resolve(true); }})
    ]);
    modal.open({ title, body: bodyNode, footer, onDismiss: ()=>resolve(false) });
  });
}

function confirmModal(title, bodyNode, confirmText="OK"){
  return new Promise((resolve)=>{
    const okBtn = btn(confirmText,{onclick: ()=>{ modal.close(); resolve(true); }});
    const cancelBtn = btn("Cancel",{kind:"ghost", onclick: ()=>{ modal.close(); resolve(false); }});
    const footer = el("div",{class:"row"},[cancelBtn, okBtn]);
    modal.open({ title, body: bodyNode, footer, onDismiss: ()=>resolve(false) });
  });
}

function confirmDelete(what="this"){
  return confirmModal(`Delete ${what}?`, el("div",{class:"muted"},[document.createTextNode("This can't be undone.")]), "Delete");
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

document.querySelectorAll(".navitem[data-route]").forEach(b=>{
  b.addEventListener("click", ()=>{
    location.hash = b.dataset.route;
    closeDrawer();
  });
});

function route(){ return (location.hash.replace("#","").split("?")[0].trim() || "dashboard"); }

/* ---------- Backup: export / import ---------- */
function lastBackupText(){
  try{
    const at = localStorage.getItem("tpp_last_backup");
    return at ? `Last backup: ${formatShort(new Date(at))}` : "No backup saved yet.";
  }catch(_){ return ""; }
}

async function exportData(){
  const data = await exportAll();
  const name = `tees-planner-backup-${dayKey(new Date())}.json`;
  const json = JSON.stringify(data, null, 2);
  const done = ()=>{ try{ localStorage.setItem("tpp_last_backup", new Date().toISOString()); }catch(_){} };

  // Installed iOS web apps can't download files, so hand the backup to the share sheet when we can
  try{
    const file = new File([json], name, { type:"application/json" });
    if (navigator.canShare && navigator.canShare({ files:[file] })){
      await navigator.share({ files:[file], title:"Tee's Planner backup" });
      done();
      await navigate(route(), true);
      return;
    }
  }catch(e){
    if (e && e.name === "AbortError") return;
  }

  const url = URL.createObjectURL(new Blob([json], { type:"application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  done();
  await navigate(route(), true);
}

async function importData(file){
  let data;
  try{
    data = JSON.parse(await file.text());
  }catch(_){
    return toast("That file couldn't be read as a planner backup.");
  }
  const looksRight = data && typeof data === "object" && !Array.isArray(data)
    && (data.__meta || Array.isArray(data.tasks) || Array.isArray(data.settings));
  if (!looksRight) return toast("That file doesn't look like a planner backup.");

  const count = Object.values(data).filter(Array.isArray).reduce((n, arr)=>n + arr.length, 0);
  const when = data.__meta?.exportedAt ? ` from ${formatShort(new Date(data.__meta.exportedAt))}` : "";
  const ok = await confirmModal("Replace everything?", el("div",{class:"stack"},[
    el("div",{},[document.createTextNode(`This backup${when} holds ${count} entries.`)]),
    el("div",{class:"muted"},[document.createTextNode("Importing replaces everything in the planner on this device. Export a backup first if you want to keep what is here now.")])
  ]), "Replace");
  if (!ok) return;

  try{
    await importAll(data);
    toast("Backup imported");
  }catch(_){
    toast("Import failed. Your backup file was not changed.");
  }
  await navigate(route(), true);
}

/* ---------- Global Date Picker ---------- */
const globalDatePicker = document.getElementById("globalDatePicker");
globalDatePicker.value = dayKey(new Date());

async function changeSelectedDate(date){
  stopAllAudio();
  setSelectedDate(date);
  await navigate(route(), true);
}
globalDatePicker.addEventListener("change", (e)=>{ if (e.target.value) changeSelectedDate(e.target.value); });
document.getElementById("btnPrevDay").addEventListener("click", ()=>changeSelectedDate(addDays(selectedDate, -1)));
document.getElementById("btnNextDay").addEventListener("click", ()=>changeSelectedDate(addDays(selectedDate, 1)));
document.getElementById("btnToday").addEventListener("click", ()=>changeSelectedDate(new Date()));

/* ---------- PWA ---------- */
if ("serviceWorker" in navigator){
  const hadWorker = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
  navigator.serviceWorker.addEventListener("controllerchange", ()=>{
    if (hadWorker) toast("Planner updated. Close and reopen it to see the latest.", 6000);
  });
}
// Ask the browser not to clear the planner's data when storage runs low
try{ navigator.storage?.persist?.().catch(()=>{}); }catch(_){}

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

/* ---------- The cover ---------- */
const bookCover = document.getElementById("bookCover");
const reducedMotion = ()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Cover swing (1.7s) plus the title page following 0.45s behind it; keep in step with styles.css
const coverAnimMs = ()=>reducedMotion() ? 60 : 2250;

function paintCover(name){
  const now = new Date();
  const who = name || "Tee";
  document.getElementById("coverName").textContent = who + "'s";
  document.getElementById("flyName").textContent = who;
  document.getElementById("coverYear").textContent = String(now.getFullYear());
  document.getElementById("coverDate").textContent = now.toLocaleDateString("en-GB",{ weekday:"long", day:"numeric", month:"long" });
}

function openBook(){
  if (bookCover.classList.contains("opening") || bookCover.classList.contains("gone")) return;
  try{ sessionStorage.setItem("book_open","1"); }catch(_){}
  bookCover.classList.remove("closing");
  bookCover.classList.add("opening");
  setTimeout(()=>{
    bookCover.classList.add("gone");
    bookCover.classList.remove("opening");
  }, coverAnimMs());
}

function closeBook(){
  if (!bookCover.classList.contains("gone")) return;
  stopAllAudio();
  try{ sessionStorage.removeItem("book_open"); }catch(_){}
  bookCover.classList.remove("gone", "opening");
  void bookCover.offsetWidth;
  bookCover.classList.add("closing");
  setTimeout(()=>bookCover.classList.remove("closing"), coverAnimMs());
}

document.getElementById("btnOpenBook").addEventListener("click", openBook);
document.getElementById("btnCloseBook").addEventListener("click", ()=>{ closeDrawer(); closeBook(); });
paintCover();
ensureSettings().then(s=>paintCover(s.userName)).catch(()=>{});

/* ---------- Page flip navigation ---------- */
let currentPage = null;
let currentRouteKey = null;
let currentRouteFull = null;
let isNavigating = false;
let pendingRoute = null;

// Page order for next/prev navigation
const PAGE_ORDER = ["dashboard", "goals", "relationships", "finance", "fitness", "spiritual", "weekly", "diary", "partner", "settings"];
// Sections that have their own tab on the page edge; everything else sits behind "More"
const TAB_ROUTES = ["dashboard", "goals", "relationships", "finance", "spiritual"];

function wrapPage(contentNode, routeKey){
  const kids = [contentNode];
  const idx = PAGE_ORDER.indexOf(routeKey);
  if (idx >= 0) kids.push(el("div",{class:"page-foot"},[document.createTextNode(`page ${idx + 1}`)]));
  return el("div",{class:"pagecontent"}, kids);
}

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
  const next = getNextPage(currentRouteKey);
  if (next) location.hash = next;
}

function goPrevPage() {
  const prev = getPrevPage(currentRouteKey);
  if (prev) location.hash = prev;
}

// Page turn length comes from --flip in styles.css (0 when the phone asks for reduced motion)
function flipMs(){
  const v = getComputedStyle(document.documentElement).getPropertyValue("--flip").trim();
  const n = parseFloat(v) || 0;
  return v.endsWith("ms") ? n : n * 1000;
}

async function renderPage(target){
  try{
    return await renderRoute(target);
  }catch(e){
    logAppError("render", e?.message || "Render failed", e?.stack || "");
    return card("Something went wrong", "", el("div",{class:"muted"},[document.createTextNode("This page couldn't be opened. Try again from the contents.")]));
  }
}

async function navigate(r, skipAnim=false){
  const target = (r || "dashboard");
  const targetKey = target.split("/")[0];

  // Mid page turn: remember the latest request and run it once the turn finishes
  if (isNavigating){ pendingRoute = target; return; }

  document.querySelectorAll(".navitem[data-route]").forEach(b => b.classList.toggle("active", b.dataset.route === targetKey));

  const fromKey = currentRouteKey;
  const ms = flipMs();
  const doFlip = !!currentPage && !skipAnim && fromKey !== targetKey && ms > 0;

  isNavigating = true;
  try {
    if (!doFlip){
      // First render, same section or forced refresh: update in place and keep the scroll position on a refresh
      const keep = (currentPage && target === currentRouteFull) ? (currentPage.firstElementChild?.scrollTop || 0) : 0;
      const content = wrapPage(await renderPage(target), targetKey);
      if (!currentPage){
        currentPage = el("div", {class:"page current"});
        pageHost.innerHTML = "";
        pageHost.append(currentPage);
      }
      currentPage.innerHTML = "";
      currentPage.append(content);
      content.scrollTop = keep;
    } else {
      const goingBackward = getPageIndex(targetKey) < getPageIndex(fromKey);
      const incomingPage = el("div", {class: goingBackward ? "page prev" : "page next"});
      incomingPage.append(wrapPage(await renderPage(target), targetKey));
      pageHost.append(incomingPage);

      // Force reflow so the animation starts from the resting position
      void incomingPage.offsetWidth;
      pageHost.classList.add(goingBackward ? "flipping-back" : "flipping");
      await new Promise(res => setTimeout(res, ms + 40));
      pageHost.classList.remove("flipping", "flipping-back");

      currentPage.remove();
      incomingPage.className = "page current";
      currentPage = incomingPage;
    }
    currentRouteKey = targetKey;
    currentRouteFull = target;
  } finally {
    isNavigating = false;
  }
  updatePageNavButtons();

  if (pendingRoute){
    const next = pendingRoute;
    pendingRoute = null;
    navigate(next, next.split("/")[0] === currentRouteKey);
  }
}

// Scroll the open page back to the top
function scrollToTop() {
  const scroller = currentPage?.firstElementChild;
  if (scroller) scroller.scrollTop = 0;
}

// Highlight the edge tab for the open section
function updatePageNavButtons() {
  document.querySelectorAll("#edgeTabs .tab").forEach(t=>{
    const r = t.dataset.route;
    const on = r === "more" ? !TAB_ROUTES.includes(currentRouteKey) : r === currentRouteKey;
    t.classList.toggle("active", on);
    if (on) t.setAttribute("aria-current","page"); else t.removeAttribute("aria-current");
  });
}

window.addEventListener("hashchange", ()=>navigate(route()));

document.getElementById("edgeTabs").addEventListener("click", (e)=>{
  const t = e.target.closest(".tab");
  if (!t) return;
  if (t.dataset.route === "more") openDrawer();
  else location.hash = t.dataset.route;
});

// The ribbon always brings you back to today
document.getElementById("btnRibbon").addEventListener("click", ()=>{
  setSelectedDate(new Date());
  if (currentRouteFull === "dashboard") navigate("dashboard", true).then(scrollToTop);
  else location.hash = "dashboard";
});

// Swipe left/right to turn the page
let swipeStart = null;
pageHost.addEventListener("touchstart", (e)=>{
  swipeStart = null;
  if (e.touches.length !== 1) return;
  if (e.target.closest(".scheduler, input, textarea, select, .song-track")) return;
  const t = e.touches[0];
  swipeStart = { x: t.clientX, y: t.clientY, at: Date.now() };
}, { passive:true });
pageHost.addEventListener("touchend", (e)=>{
  if (!swipeStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - swipeStart.x;
  const dy = t.clientY - swipeStart.y;
  const dt = Date.now() - swipeStart.at;
  swipeStart = null;
  if (dt > 700 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
  if (dx < 0) goNextPage(); else goPrevPage();
}, { passive:true });

document.addEventListener("keydown", (e)=>{
  if (modal.isOpen() || !bookCover.classList.contains("gone")) return;
  if (e.target.closest?.("input, textarea, select")) return;
  if (e.key === "ArrowRight") goNextPage();
  if (e.key === "ArrowLeft") goPrevPage();
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
  
  // A nudge rather than a popup; the Daily Check-in card is on the Today page
  toast("Your evening check-in is ready when you are.", 5000);
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

async function renderRoute(r){
  const settings = await ensureSettings();
  
  // Initialize sync if configured
  if (settings.firebaseApiKey && settings.firebaseDatabaseUrl && !sync.isSyncEnabled()) {
    try {
      const ok = await sync.initFirebase({
        apiKey: settings.firebaseApiKey,
        databaseURL: settings.firebaseDatabaseUrl
      });
      if (ok) {
        const myUserId = sync.getOrCreateUserId();
        sync.enableSync(myUserId);
        
        // Subscribe to partner if configured
        if (settings.partnerCode) {
          const partnerId = await sync.getUserIdFromCode(settings.partnerCode);
          if (partnerId) {
            sync.subscribeToPartner(partnerId, (data) => {
              partnerScheduleData = data;
            });
          }
        }
      }
    } catch (e) {
      console.log("Sync init error:", e);
    }
  }

  if (r === "cover") return await viewDashboard(settings);
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
  if (r === "partner") return await viewPartnerSchedule(settings);
  if (r === "settings") return await viewSettings(settings);

  return el("div", {}, [el("div",{class:"h1"},[document.createTextNode("Not found")])]);
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
  const isBirthday = dayKey(selectedDateObj).slice(5) === BIRTHDAY_MD;

  const header = el("div",{class: isBirthday ? "dashboard-header birthday-header" : "dashboard-header"},[
    el("div",{class:"kicker"},[document.createTextNode(selectedDateObj.toLocaleDateString("en-GB",{ day:"numeric", month:"long", year:"numeric" }))]),
    el("div",{class:"h1"},[document.createTextNode(isBirthday ? "Happy Birthday My Love 🎂💕" : selectedDateObj.toLocaleDateString("en-GB",{ weekday:"long" }))]),
    isToday ? el("span") : el("div",{class:"subtle"},[document.createTextNode("You're looking at another day. Tap the ribbon to come back to today.")])
  ]);

  const v = verseOfDay(selectedDay);
  const verseCard = card("Verse of the Day", "", el("div",{},[
    el("div",{class:"verse-text"},[document.createTextNode(v.text)]),
    el("div",{class:"verse-ref"},[document.createTextNode(v.ref)])
  ]));

  const myVerseCard = (verse.text || verse.reference)
    ? card("My Verse", "", el("div",{},[
        el("div",{class:"verse-text"},[document.createTextNode(verse.text || "")]),
        el("div",{class:"verse-ref"},[document.createTextNode(verse.reference || "")])
      ]))
    : null;

  const overdueCard = (isToday && overdue.length)
    ? card("Check-ins due", "Based on your reminders.", overdueList(overdue), btn("Open", {kind:"ghost", onclick: ()=>{ location.hash="relationships"; }}))
    : null;

  const tasksBody = el("div",{class:"stack"},[
    frogRequired && !hasFrog && dayTasks.length ? frogPicker(dayTasks) : taskList(dayTasks, qGoals)
  ]);
  const tasksCard = card("To Do", "", tasksBody, btn("Add", { kind:"ghost", onclick: ()=>openTaskModal({ defaultDate: selectedDay }) }));

  const schedCard = card("Schedule", "Drag to move, pull the bottom edge to resize, double tap to edit.",
    scheduler(selectedDay, dayBlocks, dayTasks),
    btn("Add", { kind:"ghost", onclick: ()=>openTimeBlockModal(selectedDay, dayTasks, null) }));

  const reviewCard = card("Daily Check-in", "", el("div",{class:"stack"},[
    el("div",{class:"row spread"},[
      review ? badge(`${review.score}/10`, "good") : badge("Not done yet", "warn"),
      btn(review ? "Edit" : "Review", { kind:"ghost", onclick: ()=>openDailyReviewModal(selectedDay, review) })
    ]),
    el("div",{class:"muted"},[document.createTextNode(review?.notes || "How was your day?")])
  ]));

  // Phones read top to bottom: verse and song first. Wide screens get two columns.
  const wide = window.matchMedia("(min-width: 900px)").matches;
  const song = songCard(selectedDay);
  const body = wide
    ? el("div",{class:"grid"},[
        el("div",{class:"stack"},[tasksCard, schedCard]),
        el("div",{class:"stack"},[verseCard, song, overdueCard, reviewCard, myVerseCard].filter(Boolean))
      ])
    : el("div",{class:"stack"},[verseCard, song, tasksCard, schedCard, overdueCard, reviewCard, myVerseCard].filter(Boolean));

  return el("div",{class: isBirthday ? "stack dashboard-root birthday-mode" : "stack dashboard-root"},[header, body]);
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



/* ---------- Song of the Day player ---------- */
// One <audio> element for the whole app. Unlike Web Audio it still plays when the
// iPhone's silent switch is on, and it keeps playing while you turn pages.
const songAudio = new Audio();
songAudio.preload = "none";
let songUI = null;   // the player currently on screen
let songKey = "";    // "artist|title" loaded into songAudio

const ICON_PLAY = '<svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 2.5v11l9-5.5z"/></svg>';
const ICON_PAUSE = '<svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/></svg>';

function stopAllAudio() {
  try { songAudio.pause(); } catch(_) {}
}

function fmtTime(sec){
  if(!isFinite(sec)) return "0:00";
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec/60);
  const s = String(sec%60).padStart(2,"0");
  return `${m}:${s}`;
}

function setSongStatus(msg){
  if (songUI) songUI.status.textContent = msg || "";
}

function paintSong(){
  if (!songUI) return;
  const mine = songUI.key === songKey;
  const playing = mine && !songAudio.paused && !songAudio.ended;
  const dur = mine ? songAudio.duration : NaN;
  const cur = mine ? (songAudio.currentTime || 0) : 0;
  songUI.playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  songUI.playBtn.setAttribute("aria-label", playing ? "Pause song" : "Play song");
  songUI.bar.style.width = (isFinite(dur) && dur > 0) ? `${Math.min(100, (cur/dur)*100)}%` : "0%";
  songUI.cur.textContent = fmtTime(cur);
  songUI.dur.textContent = (isFinite(dur) && dur > 0) ? fmtTime(dur) : "0:30";
}
["play","pause","ended","timeupdate","loadedmetadata","emptied"].forEach(ev=>songAudio.addEventListener(ev, paintSong));
songAudio.addEventListener("waiting", ()=>setSongStatus("Loading"));
songAudio.addEventListener("playing", ()=>setSongStatus(""));
songAudio.addEventListener("error", ()=>{ if (songAudio.getAttribute("src")) setSongStatus("Preview unavailable"); });

// Finds a ~30s preview through Apple's public iTunes Search API. Results are remembered for a week.
async function findSongPreview(artist, title){
  const cacheKey = `tpp_song_${artist}|${title}`;
  try{
    const c = JSON.parse(localStorage.getItem(cacheKey) || "null");
    if (c && c.previewUrl && Date.now() - c.at < 7*86400000) return c;
  }catch(_){}

  const term = encodeURIComponent(`${artist} ${title}`);
  const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=6`);
  if (!res.ok) throw new Error("preview_search_failed");
  const data = await res.json();

  // Closest match: same artist substring + title substring
  const norm = s => String(s||"").toLowerCase();
  const aN = norm(artist);
  const tN = norm(title);
  let best = null;
  for (const r of (data?.results || [])){
    if (!r.previewUrl) continue;
    const ra = norm(r.artistName);
    const rt = norm(r.trackName);
    const score = (ra.includes(aN)?3:0) + (aN.includes(ra)?2:0) + (rt.includes(tN)?3:0) + (tN.includes(rt)?2:0);
    if (!best || score > best.score) best = { score, r };
  }
  if (!best) return null;

  const out = { previewUrl: best.r.previewUrl, artwork: best.r.artworkUrl100 || "", at: Date.now() };
  try{ localStorage.setItem(cacheKey, JSON.stringify(out)); }catch(_){}
  return out;
}

function songPlayer({artist, title, ytId}){
  const key = `${artist}|${title}`;

  const art = el("div",{class:"song-art"});
  if (ytId) art.style.backgroundImage = `url('https://img.youtube.com/vi/${ytId}/mqdefault.jpg')`;

  const playBtn = el("button",{class:"song-play", "aria-label":"Play song", html: ICON_PLAY});
  const bar = el("div");
  const track = el("div",{class:"song-track"},[el("div",{},[bar])]);
  const cur = el("div",{},[document.createTextNode("0:00")]);
  const dur = el("div",{},[document.createTextNode("0:30")]);
  const status = el("div",{class:"song-status", "aria-live":"polite"});

  const ui = { key, playBtn, bar, cur, dur, status, preview: null };
  songUI = ui;

  // Look the preview up as soon as the card shows, so the tap on play can start sound straight away
  // (iOS only allows audio to start from inside the tap itself)
  const ready = findSongPreview(artist, title).catch(()=>null);
  ready.then(p=>{
    ui.preview = p;
    if (p?.artwork) art.style.backgroundImage = `url('${p.artwork}')`;
  });

  playBtn.addEventListener("click", async ()=>{
    if (songKey === key && songAudio.getAttribute("src")){
      if (songAudio.paused) songAudio.play().catch(()=>setSongStatus("Tap play again"));
      else songAudio.pause();
      return;
    }
    let p = ui.preview;
    if (!p){ setSongStatus("Loading"); p = await ready; }
    if (!p){ setSongStatus("No preview found. Try YouTube."); return; }

    songKey = key;
    songAudio.src = p.previewUrl;
    songAudio.play().catch(()=>setSongStatus("Tap play again"));
    try{
      if ("mediaSession" in navigator){
        navigator.mediaSession.metadata = new MediaMetadata({
          title, artist, album: "Song of the Day",
          artwork: p.artwork ? [{ src: p.artwork, sizes: "100x100", type: "image/jpeg" }] : []
        });
      }
    }catch(_){}
  });

  track.addEventListener("click", (e)=>{
    if (songKey !== key || !isFinite(songAudio.duration)) return;
    const rect = track.getBoundingClientRect();
    songAudio.currentTime = clamp((e.clientX - rect.left) / rect.width, 0, 1) * songAudio.duration;
  });

  const ytLink = el("a",{
    href: ytId ? `https://www.youtube.com/watch?v=${ytId}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(artist + " " + title)}`,
    target:"_blank",
    rel:"noopener"
  },[document.createTextNode("Full song on YouTube")]);

  const node = el("div",{class:"song"},[
    el("div",{class:"song-top"},[
      art,
      el("div",{class:"song-info"},[
        el("div",{class:"song-title"},[document.createTextNode(title)]),
        el("div",{class:"song-artist"},[document.createTextNode(artist)])
      ]),
      playBtn
    ]),
    el("div",{class:"song-progress"},[cur, track, dur]),
    el("div",{class:"song-foot"},[ytLink, status])
  ]);

  paintSong();
  return node;
}

function songCard(dateKeyStr){
  const pick = pickDailyRnB(dateKeyStr);
  const c = card("Song of the Day", "", songPlayer({ artist: pick.artist, title: pick.title, ytId: pick.ytId }));
  c.classList.add("navy");
  return c;
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
    list.append(el("div",{class:"muted"},[document.createTextNode("Nothing planned yet.")]));
    return list;
  }
  for (const t of tasks){
    const q = t.quarterlyGoalId ? qGoals.find(x=>x.id===t.quarterlyGoalId) : null;
    const isDone = t.status === "done";

    const meta = el("div",{class:"m"},[]);
    const bits = [ t.pillar ? pillarName(t.pillar) : null, q ? q.title : null ].filter(Boolean).join(" · ");
    if (t.isFrog) meta.append(el("span",{class:"top-pri"},[document.createTextNode("Top priority")]));
    if (bits) meta.append(document.createTextNode((t.isFrog ? " · " : "") + bits));

    // Tick on the left; tap the task itself to edit or delete it
    list.append(el("div",{class:"task" + (isDone ? " done" : "")},[
      el("button",{class:"chk" + (isDone ? " done" : ""), "aria-label": isDone ? "Mark as not done" : "Mark as done", onclick: async ()=>{
        t.status = isDone ? "todo" : "done";
        await put("tasks", t);
        await navigate(route(), true);
      }}),
      el("button",{class:"body", onclick: ()=>openTaskModal({ editing: t })},[
        el("div",{class:"h"},[document.createTextNode(t.title)]),
        meta
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

    let dragging=false, resizing=false, startY=0, os=0, oe=0, lastTap=0;

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
      if (b.startMins === os && b.endMins === oe){
        // Not moved: treat two quick taps as "edit"
        const now = Date.now();
        if (now - lastTap < 400) openTimeBlockModal(dateKeyStr, tasks, b);
        lastTap = now;
        return;
      }
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
    isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ if(!(await confirmDelete())) return; await del("timeBlocks", editing.id); modal.close(); await navigate(route(), true); }}) : el("span"),
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
    el("div",{class:"h1"},[document.createTextNode("My Goals")]),
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
          el("div",{class:"m"},[document.createTextNode(meta || "")]),
          (g.isComplete ? el("div",{class:"muted small"},[document.createTextNode("Completed")]) : el("span"))
        ]),
        el("div",{class:"actions"},[
          btn("Edit",{kind:"ghost", onclick: ()=>openYearlyModal(g)}),
          btn("Delete",{kind:"danger", onclick: async ()=>{ if(!(await confirmDelete())) return; await del("yearlyGoals", g.id); await navigate(route(), true); }})
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
          el("div",{class:"m"},[document.createTextNode(meta || "")]),
          (m.isComplete ? el("div",{class:"muted small"},[document.createTextNode("Completed")]) : el("span"))
        ]),
        el("div",{class:"actions"},[
          btn("Edit",{kind:"ghost", onclick: ()=>openMonthlyModal(m)}),
          btn("Delete",{kind:"danger", onclick: async ()=>{ if(!(await confirmDelete())) return; await del("monthlyGoals", m.id); await navigate(route(), true); }})
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
    isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ if(!(await confirmDelete())) return; await del("monthlyGoals", g.id); modal.close(); await navigate(route(), true); }}) : el("span"),
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
          el("div",{class:"m"},[document.createTextNode(meta || "")]),
          (q.isComplete ? el("div",{class:"muted small"},[document.createTextNode("Completed")]) : el("span"))
        ]),
        el("div",{class:"qRight"},[
          badge(hasRetro ? "Retro done" : "Retro missing", hasRetro ? "good" : "warn"),
          el("div",{class:"actions"},[
            btn("Retro",{kind:"ghost", onclick: ()=>openRetroModal(q, retroByQ.get(q.id)||null)}),
            btn("Edit",{kind:"ghost", onclick: ()=>openQuarterlyModal(yearly, q)}),
            btn("Delete",{kind:"danger", onclick: async ()=>{
              if(!(await confirmDelete())) return;
              if (hasRetro) await del("quarterlyRetros", retroByQ.get(q.id).id);
              await del("quarterlyGoals", q.id);
              await navigate(route(), true);
            }})
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
    isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ if(!(await confirmDelete())) return; await del("yearlyGoals", editing.id); modal.close(); await navigate(route(), true); }}) : el("span"),
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
    isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ if(!(await confirmDelete())) return; await del("quarterlyGoals", editing.id); modal.close(); await navigate(route(), true); }}) : el("span"),
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
    isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ if(!(await confirmDelete())) return; await del("quarterlyRetros", existing.id); modal.close(); await navigate(route(), true); }}) : el("span"),
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
    const d = localDayKey(t.datetime || t.dateKey || t.date);
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
    el("div",{class:"h1"},[document.createTextNode("People I Love")]),
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
            if(!(await confirmDelete(c.name))) return;
            // Take the reminder and logged check-ins with the contact so nothing is left pointing at them
            if (r) await del("contactRules", r.id);
            for (const t of (await getAll("touchpoints")).filter(t=>t.contactId === c.id)) await del("touchpoints", t.id);
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
          btn("Del",{kind:"danger", onclick: async ()=>{ if(!(await confirmDelete())) return; await del("touchpoints", t.id); await navigate(route(), true); }})
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
    isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ if(!(await confirmDelete())) return; await del("contactRules", existing.id); modal.close(); await navigate(route(), true); }}) : el("span"),
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
  } else {
    // Always use current date/time for new entries
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
        dateKey: dayKey(new Date(dt.value)),
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
  
  const monthTx = tx.filter(t => localDayKey(t.date).slice(0,7) === selectedMonth);
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
    el("div",{class:"h1"},[document.createTextNode("My Money")]),
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
          el("div",{class:"m"},[document.createTextNode(`Budget: ${b?`£${b.toFixed(2)}`:"not set"} • Spent: £${a.toFixed(2)}`)]),
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
          btn("Del",{kind:"danger", onclick: async ()=>{ if(!(await confirmDelete())) return; await del("transactions", t.id); await navigate(route(), true); }})
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
  
  // Always use current date/time for new entries, existing date for edits
  let base;
  if (existing?.date) {
    base = new Date(existing.date);
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

  const amount = el("input",{class:"input", type:"number", step:"0.01", value: existing?.amount || ""});
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
    isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ if(!(await confirmDelete())) return; await del("budgets", existing.id); modal.close(); await navigate(route(), true); }}) : el("span"),
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
      if (amt <= 0) { toast("Enter a budget amount above zero"); return; }
      
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
  const monthWorkouts = workouts.filter(w => localDayKey(w.date).slice(0,7) === selectedMonth);
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
    el("div",{class:"h1"},[document.createTextNode("Wellness")]),
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
          btn("Del",{kind:"danger", onclick: async ()=>{
            if(!(await confirmDelete("this workout"))) return;
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
  } else if (selectedMonth && selectedMonth !== monthKey(new Date())) {
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
                if(!(await confirmDelete("this set"))) return;
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
  
  // Always use current date for new entries, existing date for edits
  if (existing?.date) {
    dt.value = String(existing.date).slice(0,10);
  } else {
    dt.value = dayKey(new Date());
  }

  const weight = el("input",{class:"input", type:"number", step:"0.1", value: existing?.weight || ""});
  const bf = el("input",{class:"input", type:"number", step:"0.1", value: existing?.bodyFat || ""});
  const sleep = el("input",{class:"input", type:"number", step:"0.1", value: existing?.sleepHours || ""});
  const energy = el("input",{class:"input", type:"number", step:"1", value: existing?.energy || ""});

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
          el("div",{class:"m"},[document.createTextNode(meta || "")])
        ]),
        el("div",{class:"actions"},[
          btn("Edit",{kind:"ghost", onclick: ()=>openBioModal(b, selectedMonth)}),
          btn("Del",{kind:"danger", onclick: async ()=>{ if(!(await confirmDelete())) return; await del("biometrics", b.id); await navigate(route(), true); }})
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
    el("div",{class:"h1"},[document.createTextNode("Faith & Spirit")]),
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
          btn("Delete",{kind:"danger", onclick: async ()=>{ if(!(await confirmDelete())) return; await del("prayers", p.id); await navigate(route(), true); }})
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
          btn("Delete",{kind:"danger", onclick: async ()=>{ if(!(await confirmDelete())) return; await del("sermons", s.id); await navigate(route(), true); }})
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
  const fromKey = dayKey(ws);
  const toKey = dayKey(we);

  const [touch, tx, prayers, sermons, tasks, workouts] = await Promise.all([
    getAll("touchpoints"),
    getAll("transactions"),
    getAll("prayers"),
    getAll("sermons"),
    getAll("tasks"),
    getAll("workouts")
  ]);

  const inWeek = (isoOrKey)=>{
    const k = localDayKey(isoOrKey);
    return !!k && k >= fromKey && k < toKey;
  };

  const moneySpent = tx.filter(t=>t.direction==="expense" && inWeek(t.date)).reduce((s,t)=>s+Number(t.amount||0),0);
  const touchCount = touch.filter(t=>inWeek(t.datetime || t.dateKey || t.date)).length;
  const spiritualCount = prayers.filter(p=>inWeek(p.dateRequested || p.createdAt)).length + sermons.filter(s=>inWeek(s.date || s.createdAt)).length;
  const weekTasks = tasks.filter(t=>inWeek(t.scheduledDate));
  const tasksDone = weekTasks.filter(t=>t.status==="done").length;
  const workoutCount = workouts.filter(w=>inWeek(w.date)).length;

  const isThisWeek = fromKey === dayKey(weekStart(new Date(), !!settings.weekStartsMonday));
  const weekNav = el("div",{class:"row"},[
    btn("Earlier",{kind:"ghost", onclick:()=>{ location.hash = "weekly/" + dayKey(addDays(ws,-7)); }}),
    btn("Later",{kind:"ghost", onclick:()=>{ location.hash = "weekly/" + toKey; }}),
    !isThisWeek ? btn("This week",{kind:"ghost", onclick:()=>{ location.hash = "weekly"; }}) : el("span")
  ]);

  const header = el("div",{},[
    el("div",{class:"kicker"},[document.createTextNode(`${formatShort(ws)} to ${formatShort(addDays(we,-1))}`)]),
    el("div",{class:"h1"},[document.createTextNode("History")]),
    weekNav
  ]);

  const stat = (value, label)=>el("div",{},[
    el("div",{class:"stat-v"},[document.createTextNode(value)]),
    el("div",{class:"stat-l"},[document.createTextNode(label)])
  ]);
  const stats = card("This week", "", el("div",{class:"stats"},[
    stat(`${tasksDone}/${weekTasks.length}`, "Tasks done"),
    stat(`£${moneySpent.toFixed(2)}`, "Spent"),
    stat(String(touchCount), "Check-ins with people"),
    stat(String(workoutCount), "Workouts"),
    stat(String(spiritualCount), "Prayers and sermon notes")
  ]));

  // One row per day; tap to open that day's page
  const days = card("Days", "Tap a day to see everything from it.", el("div",{class:"list"}, Array.from({length:7}, (_, i)=>{
    const d = addDays(ws, i);
    const k = dayKey(d);
    const n = tasks.filter(t=>t.scheduledDate === k).length;
    return el("button",{class:"listitem", onclick:()=>{ location.hash = "day/" + k; }},[
      el("div",{class:"li-top"},[
        el("div",{class:"li-title"},[document.createTextNode(d.toLocaleDateString("en-GB",{ weekday:"long" }))]),
        el("div",{class:"li-meta"},[document.createTextNode(`${formatShort(d)}${n ? ` · ${n} task${n===1?"":"s"}` : ""}`)])
      ])
    ]);
  })));

  return el("div",{class:"stack"},[header, stats, days]);
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

  const contactNames = new Map((await getAll("contacts")).map(c=>[c.id, c.name]));
  const dayTasks = tasks.filter(t=>(t.scheduledDate||t.date||"" )===key);
  const dayBlocks = blocks.filter(b=>b.date===key).sort((a,b)=>(a.startMins??a.startMin)-(b.startMins??b.startMin));
  const dayTx = tx.filter(t=>localDayKey(t.date)===key);
  const spend = dayTx.filter(t=>t.direction==="expense").reduce((s,t)=>s+Number(t.amount||0),0);
  const income = dayTx.filter(t=>t.direction==="income").reduce((s,t)=>s+Number(t.amount||0),0);
  const dayTouch = touch.filter(t=>localDayKey(t.datetime||t.dateKey)===key);
  const dayWorkouts = workouts.filter(w=>localDayKey(w.date)===key);
  const dayPrayers = prayers.filter(p=>localDayKey(p.dateRequested||p.createdAt)===key);
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
    const s = minsToHHMM(b.startMins??b.startMin);
    const e = minsToHHMM(b.endMins??b.endMin);
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
      el("div",{class:"muted small"},[document.createTextNode((t.merchant||t.note||"").slice(0,50))])
    ])) : [el("div",{class:"muted"},[document.createTextNode("No spending saved for this day.")])])
  ]));

  const relCard = card("Relationships", "", el("div",{class:"stack"}, dayTouch.length ? dayTouch.map(x=>el("div",{class:"row", style:"justify-content:space-between;"},[
    el("div",{},[document.createTextNode(`${contactNames.get(x.contactId) || "Contact"} • Check-in`)]),
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
    el("div",{class:"h1"},[document.createTextNode("My Diary")]),
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
        el("div",{class:"muted"},[document.createTextNode("Your diary is locked. Enter your PIN to unlock.")]),
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
    el("div",{class:"muted small"},[document.createTextNode("Unlocked")]),
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
    : el("div",{class:"muted"},[document.createTextNode("No entries yet. Tap New entry to start writing.")]);

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


/* ---------- Partner Schedule View ---------- */
async function viewPartnerSchedule(settings) {
  const partnerData = sync.getPartnerData();
  const syncStatus = sync.getSyncStatus();
  
  const header = el("div",{},[
    el("div",{class:"h1"},[document.createTextNode(`${partnerData?.displayName || "Partner"}'s Schedule`)]),
    el("div",{class:"subtle"},[document.createTextNode(
      partnerData?.lastUpdated 
        ? `Last updated: ${new Date(partnerData.lastUpdated).toLocaleString()}`
        : "View your partner's schedule"
    )])
  ]);
  
  if (!syncStatus.enabled || !partnerData) {
    return el("div",{class:"stack"},[
      header,
      card("Not Connected", "", el("div",{class:"stack"},[
        el("div",{class:"muted"},[document.createTextNode("You haven't connected to a partner yet.")]),
        el("div",{class:"muted small"},[document.createTextNode("Go to Settings → Partner Sync to set up sharing.")]),
        btn("Go to Settings",{onclick:()=>{ location.hash = "settings"; }})
      ]))
    ]);
  }
  
  const today = dayKey(selectedDate);
  
  // Partner's tasks for selected date
  const partnerTasks = (partnerData.tasks || []).filter(t => t.scheduledDate === today);
  const partnerBlocks = (partnerData.timeBlocks || []).filter(b => b.date === today);
  
  // Tasks card
  const tasksBody = el("div",{class:"list"},[]);
  if (partnerTasks.length === 0) {
    tasksBody.append(el("div",{class:"muted"},[document.createTextNode("No tasks scheduled")]));
  } else {
    for (const t of partnerTasks) {
      const statusIcon = t.status === "done" ? "✓" : t.status === "wontdo" ? "✗" : "○";
      tasksBody.append(el("div",{class:"item"},[
        el("div",{class:"top"},[
          el("div",{},[
            el("div",{class:"h"},[document.createTextNode(`${statusIcon} ${t.title}`)]),
            t.notes ? el("div",{class:"m"},[document.createTextNode(t.notes)]) : el("span")
          ])
        ])
      ]));
    }
  }
  
  // Time blocks card
  const blocksBody = el("div",{class:"list"},[]);
  if (partnerBlocks.length === 0) {
    blocksBody.append(el("div",{class:"muted"},[document.createTextNode("No schedule blocks")]));
  } else {
    partnerBlocks.sort((a,b) => (a.startMins||0) - (b.startMins||0));
    for (const b of partnerBlocks) {
      const startTime = minsToHHMM(b.startMins || 0);
      const endTime = minsToHHMM(b.endMins || 0);
      blocksBody.append(el("div",{class:"item"},[
        el("div",{class:"top"},[
          el("div",{},[
            el("div",{class:"h"},[document.createTextNode(b.title || "Busy")]),
            el("div",{class:"m"},[document.createTextNode(`${startTime} - ${endTime}`)])
          ])
        ])
      ]));
    }
  }
  
  // Goals overview
  const partnerYearlyGoals = partnerData.yearlyGoals || [];
  const partnerQuarterlyGoals = partnerData.quarterlyGoals || [];
  const partnerMonthlyGoals = partnerData.monthlyGoals || [];
  
  const goalsBody = el("div",{class:"stack"},[
    el("div",{style:"font-weight:700"},[document.createTextNode(`Yearly Goals (${partnerYearlyGoals.length})`)]),
    ...partnerYearlyGoals.slice(0,3).map(g => 
      el("div",{class:"muted small"},[document.createTextNode(`• ${g.title}`)])
    ),
    partnerYearlyGoals.length > 3 ? el("div",{class:"muted small"},[document.createTextNode(`...and ${partnerYearlyGoals.length - 3} more`)]) : el("span"),
    el("hr"),
    el("div",{style:"font-weight:700"},[document.createTextNode(`This Month's Goals (${partnerMonthlyGoals.filter(m=>m.monthKey===monthKey(new Date())).length})`)]),
    ...partnerMonthlyGoals.filter(m=>m.monthKey===monthKey(new Date())).slice(0,3).map(g => 
      el("div",{class:"muted small"},[document.createTextNode(`• ${g.title}`)])
    )
  ]);
  
  return el("div",{class:"stack"},[
    header,
    card(`Tasks for ${formatDate(selectedDate)}`, "", tasksBody),
    card("Schedule", "", blocksBody),
    card("Goals Overview", "", goalsBody),
    el("div",{class:"row",style:"justify-content:center;"},[
      btn("Refresh",{kind:"ghost", onclick: async ()=>{
        toast("Checking for updates...");
        await navigate(route(), true);
      }})
    ])
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
    el("div",{class:"h1"},[document.createTextNode("Settings")]),
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

  // Backup card
  const importInput = el("input",{type:"file", accept:"application/json,.json", "aria-label":"Import backup file"});
  importInput.addEventListener("change", async ()=>{
    const f = importInput.files?.[0];
    importInput.value = "";
    if (f) await importData(f);
  });
  const backupCard = card("Backup", "Everything is stored on this device only. Save a copy now and then.", el("div",{class:"stack"},[
    el("div",{class:"muted small"},[document.createTextNode(lastBackupText())]),
    el("div",{class:"row"},[
      btn("Export backup",{onclick: exportData}),
      el("label",{class:"btn ghost filebtn"},[document.createTextNode("Import backup"), importInput])
    ])
  ]));

  // Music info card
  const musicCard = card("Song of the Day", "", el("div",{class:"muted"},[
    document.createTextNode("Play gives you a 30 second preview inside the planner. Use the YouTube link under the player for the full song.")
  ]));

  // Partner Sync Card
  const syncStatus = sync.getSyncStatus();
  const myUserId = sync.getOrCreateUserId();
  const myShareCode = sync.generateShareCode(myUserId);
  
  const displayNameInput = el("input",{class:"input", placeholder:"Your name", value: settings.syncDisplayName || ""});
  const partnerCodeInput = el("input",{class:"input", placeholder:"Partner's code", value: settings.partnerCode || ""});
  const firebaseApiKey = el("input",{class:"input", placeholder:"Firebase API Key", value: settings.firebaseApiKey || ""});
  const firebaseDatabaseUrl = el("input",{class:"input", placeholder:"Firebase Database URL", value: settings.firebaseDatabaseUrl || ""});
  const syncStatusEl = el("div",{class:"muted small"},[document.createTextNode(
    syncStatus.hasPartnerData 
      ? `Connected to ${syncStatus.partnerName || 'Partner'} • Last updated: ${syncStatus.partnerLastUpdated ? new Date(syncStatus.partnerLastUpdated).toLocaleString() : 'Unknown'}`
      : "Not connected to partner"
  )]);
  
  const syncCard = card("Partner Sync", "Share schedules with your partner", el("div",{class:"stack"},[
    el("div",{class:"muted small"},[document.createTextNode("Share your schedule with a partner or family member in real-time.")]),
    el("hr"),
    el("div",{style:"font-weight:700"},[document.createTextNode("Your Share Code")]),
    el("div",{class:"row",style:"gap:8px;align-items:center;"},[
      el("code",{style:"background:var(--accent3);padding:8px 16px;border-radius:8px;font-size:18px;letter-spacing:2px;font-weight:bold;"},[document.createTextNode(myShareCode)]),
      btn("Copy",{kind:"ghost", onclick:()=>{
        navigator.clipboard.writeText(myShareCode);
        toast("Code copied!");
      }})
    ]),
    el("div",{class:"muted small"},[document.createTextNode("Give this code to your partner")]),
    el("hr"),
    el("div",{style:"font-weight:700"},[document.createTextNode("Your Display Name")]),
    displayNameInput,
    el("hr"),
    el("div",{style:"font-weight:700"},[document.createTextNode("Partner's Code")]),
    partnerCodeInput,
    el("hr"),
    el("div",{style:"font-weight:700"},[document.createTextNode("Firebase Setup")]),
    el("div",{class:"muted small"},[document.createTextNode("Create a free Firebase project at firebase.google.com")]),
    el("label",{class:"label"},[document.createTextNode("API Key")]),
    firebaseApiKey,
    el("label",{class:"label"},[document.createTextNode("Database URL")]),
    firebaseDatabaseUrl,
    el("hr"),
    syncStatusEl,
    el("div",{class:"row"},[
      btn("Save & Connect",{onclick: async ()=>{
        settings.syncDisplayName = displayNameInput.value.trim() || "Partner";
        settings.partnerCode = partnerCodeInput.value.trim().toUpperCase();
        settings.firebaseApiKey = firebaseApiKey.value.trim();
        settings.firebaseDatabaseUrl = firebaseDatabaseUrl.value.trim();
        await put("settings", settings);
        
        if (settings.firebaseApiKey && settings.firebaseDatabaseUrl) {
          const ok = await sync.initFirebase({
            apiKey: settings.firebaseApiKey,
            databaseURL: settings.firebaseDatabaseUrl
          });
          
          if (ok) {
            sync.enableSync(myUserId);
            await sync.registerShareCode(myUserId);
            
            // Upload my data
            const allData = await exportAll();
            allData.displayName = settings.syncDisplayName;
            await sync.uploadMyData(myUserId, allData);
            
            // Subscribe to partner if code entered
            if (settings.partnerCode) {
              const partnerId = await sync.getUserIdFromCode(settings.partnerCode);
              if (partnerId) {
                sync.subscribeToPartner(partnerId, (data) => {
                  partnerScheduleData = data;
                  toast(`${data.displayName || 'Partner'}'s schedule updated!`);
                });
                toast("Connected to partner!");
              } else {
                toast("Partner code not found");
              }
            } else {
              toast("Sync enabled! Share your code with your partner.");
            }
          } else {
            toast("Firebase connection failed. Check your credentials.");
          }
        } else {
          toast("Settings saved");
        }
        
        await navigate(route(), true);
      }}),
      btn("Sync Now",{kind:"ghost", onclick: async ()=>{
        if (!sync.isSyncEnabled()) {
          toast("Set up Firebase first");
          return;
        }
        const allData = await exportAll();
        allData.displayName = settings.syncDisplayName || "Partner";
        await sync.uploadMyData(myUserId, allData);
        toast("Schedule uploaded!");
      }})
    ])
  ]));

  // Sizing details, handy when something looks the wrong size on a phone
  const standalone = navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  const aboutCard = card("About this device", "", el("div",{class:"muted small"},[document.createTextNode(
    `Window ${window.innerWidth} x ${window.innerHeight}, screen ${screen.width} x ${screen.height}, ` +
    `${standalone ? "home screen app" : "browser"}, zoom ${document.documentElement.style.zoom || "none"}`
  )]));

  return el("div",{class:"stack"},[
    header,
    card("Preferences", "", prefs),
    syncCard,
    backupCard,
    musicCard,
    aboutCard
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
      isEdit ? btn("Delete",{kind:"danger", onclick: async ()=>{ if(!(await confirmDelete())) return; await del("tasks", editing.id); modal.close(); await navigate(route(), true); }}) : el("span"),
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

// First render, once everything above is defined
navigate(route(), true);
