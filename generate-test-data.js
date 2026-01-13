/**
 * Test Data Generator for Tee's Personal Planner
 * 
 * HOW TO USE:
 * 1. Open the planner app in your browser
 * 2. Open Developer Tools (F12 or Cmd+Option+I)
 * 3. Go to the Console tab
 * 4. Copy ALL the contents of this file (Ctrl+A, Ctrl+C)
 * 5. Paste into the console (Ctrl+V) and press Enter
 * 6. Wait for "TEST DATA GENERATION COMPLETE!" message
 * 7. Refresh the page to see the data
 * 
 * DO NOT just type "generate" - you must paste the ENTIRE file!
 */

(async function() {
  // Helper to generate UUID
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // Helper to get date string
  function dayKey(d) {
    return d.toISOString().slice(0, 10);
  }

  // Helper to get random item from array
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Helper to get random number in range
  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Open IndexedDB - must match db.js exactly
  const DB_NAME = "tee_personal_planner_db";
  const DB_VERSION = 5;
  
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      const stores = [
        "settings", "verse", "yearlyGoals", "quarterlyGoals", "monthlyGoals",
        "quarterlyRetros", "tasks", "timeBlocks", "dailyReviews", "transactions",
        "budgets", "contacts", "contactRules", "touchpoints", "biometrics",
        "workouts", "workoutSets", "prayers", "sermons", "diaryEntries"
      ];
      stores.forEach(name => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      });
    };
  });

  // Helper to put data
  async function put(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Date ranges - last 3 months
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  console.log("🚀 Generating test data for the last 3 months...");

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTACTS
  // ═══════════════════════════════════════════════════════════════════════════
  const contactNames = [
    "Sarah Johnson", "Michael Chen", "Emma Williams", "James Brown", "Olivia Davis",
    "William Miller", "Sophia Wilson", "Benjamin Moore", "Isabella Taylor", "Lucas Anderson",
    "Mia Thomas", "Henry Jackson", "Charlotte White", "Alexander Harris", "Amelia Martin"
  ];
  
  const frequencies = ["daily", "weekly", "fortnightly", "monthly", "quarterly"];
  
  for (const name of contactNames) {
    const freq = pick(frequencies);
    const lastContact = new Date(today);
    lastContact.setDate(lastContact.getDate() - rand(1, 60));
    
    await put("contacts", {
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: name,
      frequency: freq,
      lastContactDate: dayKey(lastContact),
      notes: `Met through ${pick(["work", "church", "gym", "school", "neighborhood"])}`
    });
  }
  console.log("✓ Created 15 contacts");

  // ═══════════════════════════════════════════════════════════════════════════
  // YEARLY GOALS
  // ═══════════════════════════════════════════════════════════════════════════
  const yearlyGoals = [
    { title: "Read 24 books", pillar: "growth" },
    { title: "Save £10,000", pillar: "finance" },
    { title: "Run a half marathon", pillar: "health" },
    { title: "Learn Spanish basics", pillar: "growth" },
    { title: "Strengthen family relationships", pillar: "relationships" }
  ];

  for (const goal of yearlyGoals) {
    await put("yearlyGoals", {
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: goal.title,
      pillar: goal.pillar,
      done: false
    });
  }
  console.log("✓ Created 5 yearly goals");

  // ═══════════════════════════════════════════════════════════════════════════
  // QUARTERLY GOALS
  // ═══════════════════════════════════════════════════════════════════════════
  const quarterlyGoals = [
    { title: "Complete project Alpha", pillar: "work", progress: 75 },
    { title: "Read 6 books", pillar: "growth", progress: 50 },
    { title: "Exercise 3x per week", pillar: "health", progress: 80 },
    { title: "Save £2,500", pillar: "finance", progress: 60 },
    { title: "Weekly family dinners", pillar: "relationships", progress: 90 },
    { title: "Daily prayer habit", pillar: "spiritual", progress: 70 },
    { title: "Learn React basics", pillar: "growth", progress: 40 },
    { title: "Meal prep Sundays", pillar: "health", progress: 65 }
  ];

  const qGoalIds = [];
  for (const goal of quarterlyGoals) {
    const id = uuid();
    qGoalIds.push(id);
    await put("quarterlyGoals", {
      id: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: goal.title,
      pillar: goal.pillar,
      progress: goal.progress,
      done: goal.progress >= 100
    });
  }
  console.log("✓ Created 8 quarterly goals");

  // ═══════════════════════════════════════════════════════════════════════════
  // TASKS (spread over 3 months)
  // ═══════════════════════════════════════════════════════════════════════════
  const taskTitles = [
    "Review project docs", "Team standup", "Code review", "Update documentation",
    "Client meeting", "Sprint planning", "Write unit tests", "Deploy to staging",
    "Grocery shopping", "Gym session", "Call Mom", "Pay bills",
    "Dentist appointment", "Car service", "Read chapter", "Meal prep",
    "Clean house", "Laundry", "Water plants", "Walk dog",
    "Meditate", "Journal", "Review budget", "Plan weekend"
  ];

  let taskCount = 0;
  for (let d = new Date(threeMonthsAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const tasksForDay = rand(2, 5);
    for (let i = 0; i < tasksForDay; i++) {
      const title = pick(taskTitles);
      const isDone = d < today ? Math.random() > 0.2 : Math.random() > 0.7;
      
      await put("tasks", {
        id: uuid(),
        createdAt: new Date(d).toISOString(),
        updatedAt: new Date().toISOString(),
        title: title,
        scheduledDate: dayKey(d),
        status: isDone ? "done" : "todo",
        pillar: pick(["work", "health", "growth", "relationships", "finance", "spiritual", null]),
        quarterlyGoalId: Math.random() > 0.7 ? pick(qGoalIds) : null,
        isFrog: Math.random() > 0.85
      });
      taskCount++;
    }
  }
  console.log(`✓ Created ${taskCount} tasks`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSACTIONS (spread over 3 months)
  // ═══════════════════════════════════════════════════════════════════════════
  const expenseCategories = ["Food", "Transport", "Entertainment", "Shopping", "Bills", "Health", "Education"];
  const merchants = ["Tesco", "Amazon", "Uber", "Netflix", "Spotify", "Costa", "Gym", "EE", "Thames Water"];
  
  let txCount = 0;
  for (let d = new Date(threeMonthsAgo); d <= today; d.setDate(d.getDate() + 1)) {
    // 1-3 transactions per day
    const txForDay = rand(1, 3);
    for (let i = 0; i < txForDay; i++) {
      const isExpense = Math.random() > 0.15;
      
      await put("transactions", {
        id: uuid(),
        createdAt: new Date(d).toISOString(),
        updatedAt: new Date().toISOString(),
        date: new Date(d).toISOString(),
        direction: isExpense ? "expense" : "income",
        amount: isExpense ? rand(5, 150) : rand(100, 500),
        category: isExpense ? pick(expenseCategories) : "Salary",
        merchant: isExpense ? pick(merchants) : "Employer"
      });
      txCount++;
    }
  }
  console.log(`✓ Created ${txCount} transactions`);

  // ═══════════════════════════════════════════════════════════════════════════
  // BUDGETS (for each of the last 3 months)
  // ═══════════════════════════════════════════════════════════════════════════
  for (let m = 0; m < 3; m++) {
    const monthDate = new Date(today);
    monthDate.setMonth(monthDate.getMonth() - m);
    const mk = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    
    await put("budgets", {
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      monthKey: mk,
      totalBudget: rand(2000, 3000),
      categoryBudgets: {
        "Food": rand(300, 500),
        "Transport": rand(100, 200),
        "Entertainment": rand(50, 150),
        "Shopping": rand(100, 300),
        "Bills": rand(200, 400),
        "Health": rand(50, 100),
        "Education": rand(50, 150)
      }
    });
  }
  console.log("✓ Created 3 monthly budgets");

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKOUTS (spread over 3 months)
  // ═══════════════════════════════════════════════════════════════════════════
  const workoutTypes = ["Running", "Weights", "Yoga", "Swimming", "Cycling", "HIIT", "Walking"];
  
  let workoutCount = 0;
  for (let d = new Date(threeMonthsAgo); d <= today; d.setDate(d.getDate() + 1)) {
    // 0-2 workouts per day (skip some days)
    if (Math.random() > 0.6) {
      const type = pick(workoutTypes);
      await put("workouts", {
        id: uuid(),
        createdAt: new Date(d).toISOString(),
        updatedAt: new Date().toISOString(),
        date: dayKey(d),
        type: type,
        duration: rand(20, 90),
        notes: `${type} session - felt ${pick(["great", "good", "tired", "energized"])}`
      });
      workoutCount++;
    }
  }
  console.log(`✓ Created ${workoutCount} workouts`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRAYERS
  // ═══════════════════════════════════════════════════════════════════════════
  const prayerTopics = [
    "Family health", "Work guidance", "Financial wisdom", "Patience", "Gratitude",
    "Friend's recovery", "Job interview", "Safe travels", "Peace of mind", "Wisdom"
  ];

  for (let i = 0; i < 12; i++) {
    const requestDate = new Date(today);
    requestDate.setDate(requestDate.getDate() - rand(1, 90));
    const isAnswered = Math.random() > 0.5;
    
    await put("prayers", {
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: pick(prayerTopics),
      dateRequested: dayKey(requestDate),
      dateAnswered: isAnswered ? dayKey(new Date(requestDate.getTime() + rand(1, 30) * 86400000)) : null,
      notes: isAnswered ? "Prayer answered - thank you Lord!" : ""
    });
  }
  console.log("✓ Created 12 prayer requests");

  // ═══════════════════════════════════════════════════════════════════════════
  // SERMONS
  // ═══════════════════════════════════════════════════════════════════════════
  const sermonTitles = [
    "Walking in Faith", "The Power of Prayer", "Love Your Neighbor",
    "Trusting God's Plan", "Finding Peace", "The Good Shepherd",
    "Grace and Mercy", "Living with Purpose", "Hope in Trials",
    "The Beatitudes", "Forgiveness", "Spiritual Growth"
  ];

  for (let i = 0; i < 12; i++) {
    const sermonDate = new Date(today);
    sermonDate.setDate(sermonDate.getDate() - (i * 7)); // Weekly sermons
    
    await put("sermons", {
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: dayKey(sermonDate),
      title: sermonTitles[i],
      speaker: pick(["Pastor John", "Pastor Sarah", "Guest Speaker", "Elder Mike"]),
      scripture: pick(["John 3:16", "Psalm 23", "Romans 8:28", "Matthew 5:1-12", "Philippians 4:13"]),
      notes: "Key points from the sermon...\n- Point 1\n- Point 2\n- Application",
      application: "How I will apply this teaching in my life this week."
    });
  }
  console.log("✓ Created 12 sermon notes");

  // ═══════════════════════════════════════════════════════════════════════════
  // DIARY ENTRIES
  // ═══════════════════════════════════════════════════════════════════════════
  const diaryTitles = [
    "Reflections on the day", "Grateful thoughts", "New beginnings",
    "Lessons learned", "Dreams and aspirations", "Quiet moments",
    "Adventures today", "Peaceful evening", "Creative ideas"
  ];

  for (let i = 0; i < 15; i++) {
    const entryDate = new Date(today);
    entryDate.setDate(entryDate.getDate() - rand(1, 90));
    
    await put("diaryEntries", {
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dateKey: dayKey(entryDate),
      title: pick(diaryTitles),
      content: `Today was ${pick(["wonderful", "challenging", "peaceful", "productive", "inspiring"])}.\n\nI spent time ${pick(["with family", "working on projects", "reading", "exercising", "reflecting"])}.\n\nThings I'm grateful for:\n- ${pick(["Good health", "Supportive friends", "New opportunities", "Beautiful weather"])}\n- ${pick(["Delicious food", "Quiet moments", "Learning something new", "Helping others"])}\n\nTomorrow I hope to ${pick(["be more productive", "take time to rest", "connect with friends", "focus on goals"])}.`
    });
  }
  console.log("✓ Created 15 diary entries");

  // ═══════════════════════════════════════════════════════════════════════════
  // DAILY REVIEWS (spread over 3 months)
  // ═══════════════════════════════════════════════════════════════════════════
  let reviewCount = 0;
  for (let d = new Date(threeMonthsAgo); d <= today; d.setDate(d.getDate() + 1)) {
    if (Math.random() > 0.3) { // Skip some days
      await put("dailyReviews", {
        id: uuid(),
        createdAt: new Date(d).toISOString(),
        updatedAt: new Date().toISOString(),
        date: dayKey(d),
        score: rand(5, 10),
        notes: Math.random() > 0.5 ? `${pick(["Productive", "Relaxing", "Busy", "Focused", "Creative"])} day. ${pick(["Met all goals", "Some tasks pending", "Great progress", "Need to improve tomorrow"])}.` : ""
      });
      reviewCount++;
    }
  }
  console.log(`✓ Created ${reviewCount} daily reviews`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TIME BLOCKS (for recent days)
  // ═══════════════════════════════════════════════════════════════════════════
  const blockLabels = ["Deep work", "Meetings", "Exercise", "Lunch", "Admin", "Learning", "Email", "Planning"];
  
  let blockCount = 0;
  for (let i = 0; i < 14; i++) {
    const blockDate = new Date(today);
    blockDate.setDate(blockDate.getDate() - i);
    const blocksForDay = rand(3, 6);
    let startHour = 8;
    
    for (let j = 0; j < blocksForDay; j++) {
      const duration = rand(1, 3);
      await put("timeBlocks", {
        id: uuid(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: dayKey(blockDate),
        startMins: startHour * 60,
        endMins: (startHour + duration) * 60,
        label: pick(blockLabels),
        color: pick(["#7cb7ff", "#90EE90", "#FFB6C1", "#DDA0DD", "#F0E68C", "#87CEEB"])
      });
      startHour += duration + (Math.random() > 0.5 ? 1 : 0);
      blockCount++;
      if (startHour >= 18) break;
    }
  }
  console.log(`✓ Created ${blockCount} time blocks`);

  // ═══════════════════════════════════════════════════════════════════════════
  // VERSE OF THE YEAR
  // ═══════════════════════════════════════════════════════════════════════════
  await put("verse", {
    id: "verse",
    reference: "Philippians 4:13",
    text: "I can do all things through Christ who strengthens me."
  });
  console.log("✓ Set verse of the year");

  console.log("\n✅ TEST DATA GENERATION COMPLETE!");
  console.log("Refresh the page to see the data.");
  
  // Close database
  db.close();
})();
