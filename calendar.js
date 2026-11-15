// Read-only calendar feed (iCloud "Public Calendar" links, which are .ics files).
// Parses the events we need and answers "what is on this day?". No dependencies.

const DAY_MS = 86400000;
const DOW = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function unescapeText(s){
  return String(s || "").replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
}

// Wall-clock time in a named time zone -> Date. Falls back to the device's zone.
function zonedTime(y, mo, d, h, mi, s, tz){
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  try{
    const f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric"
    });
    const p = Object.fromEntries(f.formatToParts(new Date(guess)).map(x => [x.type, x.value]));
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return new Date(guess - (shown - guess));
  }catch(_){
    return new Date(y, mo - 1, d, h, mi, s);
  }
}

// DTSTART / DTEND / UNTIL / EXDATE values
function parseWhen(value, params){
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(String(value).trim());
  if (!m) return null;
  const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4] || 0, m[5] || 0, m[6] || 0].map(Number);
  if (m[4] === undefined) return { date: new Date(y, mo - 1, d), allDay: true };
  if (m[7]) return { date: new Date(Date.UTC(y, mo - 1, d, h, mi, s)), allDay: false };
  if (params.TZID) return { date: zonedTime(y, mo, d, h, mi, s, params.TZID), allDay: false };
  return { date: new Date(y, mo - 1, d, h, mi, s), allDay: false };
}

function parseRule(value){
  const parts = Object.fromEntries(String(value).split(";").map(kv => kv.split("=")));
  const until = parts.UNTIL ? parseWhen(parts.UNTIL, {})?.date : null;
  return {
    freq: parts.FREQ || "",
    interval: Math.max(1, Number(parts.INTERVAL || 1)),
    count: parts.COUNT ? Number(parts.COUNT) : null,
    until,
    byday: parts.BYDAY ? parts.BYDAY.split(",") : null,
    bymonthday: parts.BYMONTHDAY ? parts.BYMONTHDAY.split(",").map(Number) : null
  };
}

export function parseICS(text){
  // Long lines are folded: a line starting with a space or tab continues the previous one
  const lines = String(text || "").replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const events = [];
  let ev = null;

  for (const line of lines){
    if (line === "BEGIN:VEVENT"){ ev = { exdates: [] }; continue; }
    if (line === "END:VEVENT"){
      if (ev && ev.start && ev.status !== "CANCELLED"){
        if (!ev.end) ev.end = new Date(ev.start.getTime() + (ev.allDay ? DAY_MS : 3600000));
        events.push(ev);
      }
      ev = null;
      continue;
    }
    if (!ev) continue;

    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const [name, ...paramBits] = line.slice(0, colon).split(";");
    const params = Object.fromEntries(paramBits.map(p => p.split("=")));
    const value = line.slice(colon + 1);

    switch (name){
      case "SUMMARY": ev.title = unescapeText(value); break;
      case "LOCATION": ev.location = unescapeText(value); break;
      case "UID": ev.uid = value; break;
      case "STATUS": ev.status = value.trim(); break;
      case "DTSTART": { const w = parseWhen(value, params); if (w){ ev.start = w.date; ev.allDay = w.allDay; } break; }
      case "DTEND": { const w = parseWhen(value, params); if (w) ev.end = w.date; break; }
      case "RRULE": ev.rule = parseRule(value); break;
      case "EXDATE": for (const v of value.split(",")){ const w = parseWhen(v, params); if (w) ev.exdates.push(w.date); } break;
      case "RECURRENCE-ID": { const w = parseWhen(value, params); if (w) ev.replaces = w.date; break; }
    }
  }

  // A moved or edited instance of a repeating event replaces the original occurrence on that day
  const byUid = new Map(events.filter(e => e.rule && e.uid).map(e => [e.uid, e]));
  for (const e of events){
    if (e.replaces && byUid.has(e.uid)) byUid.get(e.uid).exdates.push(e.replaces);
  }
  return events;
}

const dayStart = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const daysApart = (a, b) => Math.round((dayStart(b) - dayStart(a)) / DAY_MS);

// Does this repeating event have an occurrence starting on `day`?
function repeatsOn(ev, day){
  const r = ev.rule;
  const first = dayStart(ev.start);
  const n = daysApart(first, day);
  if (n < 0) return false;
  if (r.until && dayStart(day) > dayStart(r.until)) return false;
  if (ev.exdates.some(x => sameDay(x, day))) return false;

  const matches = (d)=>{
    const k = daysApart(first, d);
    if (r.freq === "DAILY") return k % r.interval === 0;
    if (r.freq === "WEEKLY"){
      const days = r.byday ? r.byday.map(x => x.slice(-2)) : [DOW[first.getDay()]];
      const weekOf = x => Math.floor((daysApart(first, x) + ((first.getDay() + 6) % 7)) / 7); // weeks start Monday
      return weekOf(d) % r.interval === 0 && days.includes(DOW[d.getDay()]);
    }
    if (r.freq === "MONTHLY"){
      const months = (d.getFullYear() - first.getFullYear()) * 12 + d.getMonth() - first.getMonth();
      if (months % r.interval !== 0) return false;
      if (r.byday){
        // e.g. 2TU = second Tuesday, -1FR = last Friday
        return r.byday.some(code => {
          const m = /^(-?\d)?([A-Z]{2})$/.exec(code);
          if (!m || DOW[d.getDay()] !== m[2]) return false;
          if (!m[1]) return true;
          const nth = Number(m[1]);
          const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
          return nth > 0 ? Math.ceil(d.getDate() / 7) === nth : Math.ceil((daysInMonth - d.getDate() + 1) / 7) === -nth;
        });
      }
      return (r.bymonthday || [first.getDate()]).includes(d.getDate());
    }
    if (r.freq === "YEARLY"){
      return (d.getFullYear() - first.getFullYear()) % r.interval === 0 && d.getMonth() === first.getMonth() && d.getDate() === first.getDate();
    }
    return k === 0;
  };

  if (!matches(day)) return false;
  if (r.count){
    // COUNT limits how many times it repeats, so count the occurrences up to this day
    let seen = 0;
    for (let i = 0; i <= n && i < 4000; i++){
      if (matches(new Date(first.getFullYear(), first.getMonth(), first.getDate() + i))) seen++;
      if (seen > r.count) return false;
    }
  }
  return true;
}

// Events on a local calendar day, as { title, location, allDay, startMins, endMins }
export function eventsOnDay(events, date){
  const day = dayStart(date);
  const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  const out = [];

  for (const ev of events){
    let start = ev.start, end = ev.end;
    if (ev.rule){
      if (!repeatsOn(ev, day)) continue;
      const length = ev.end - ev.start;
      start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), ev.start.getHours(), ev.start.getMinutes());
      end = new Date(start.getTime() + length);
    } else if (!(start < next && end > day)){
      continue;
    }
    out.push({
      title: ev.title || "Busy",
      location: ev.location || "",
      allDay: !!ev.allDay,
      startMins: start <= day ? 0 : start.getHours() * 60 + start.getMinutes(),
      endMins: end >= next ? 1440 : end.getHours() * 60 + end.getMinutes()
    });
  }
  return out.sort((a, b) => (b.allDay - a.allDay) || (a.startMins - b.startMins));
}
