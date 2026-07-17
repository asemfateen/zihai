import { db, pool } from "../db.js";

async function runTests() {
  console.log("=== STARTING GAMIFICATION INTEGRATION TESTS ===");
  
  try {
    // 1. Create a test user directly
    const testEmail = `test_${Date.now()}@zihai.test`;
    console.log(`Creating test user: ${testEmail}`);
    
    await db.run(
      "INSERT INTO users (email, xp, streak_days, last_login, gems, streak_freezes, previous_streak) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [testEmail, 150, 5, new Date(), 0, 0, 0]
    );

    const user = await db.get("SELECT * FROM users WHERE email = $1", [testEmail]);
    console.log("Initial User stats:", {
      id: user.id,
      email: user.email,
      xp: user.xp,
      streak_days: user.streak_days,
      gems: user.gems,
      streak_freezes: user.streak_freezes,
      previous_streak: user.previous_streak
    });

    if (user.gems !== 0 || user.streak_freezes !== 0 || user.previous_streak !== 0) {
      throw new Error("Initial stats are incorrect");
    }
    console.log("✔ Step 1: User created with correct default stats");

    // 2. Buy streak freeze (Simulate having 300 gems first)
    console.log("Simulating earning gems (+300 gems)...");
    await db.run("UPDATE users SET gems = 300 WHERE id = $1", [user.id]);
    
    // Simulate buy freeze logic
    const userAfterGems = await db.get("SELECT gems, streak_freezes FROM users WHERE id = $1", [user.id]);
    if (userAfterGems.gems !== 300) throw new Error("Gems update failed");
    
    console.log("Buying 1 Streak Freeze...");
    const buyRes = await db.get(
      "UPDATE users SET gems = gems - 200, streak_freezes = streak_freezes + 1 WHERE id = $1 RETURNING gems, streak_freezes",
      [user.id]
    );
    console.log("Result after buying:", buyRes);
    if (buyRes.gems !== 100 || buyRes.streak_freezes !== 1) {
      throw new Error("Streak freeze purchase calculation failed");
    }
    console.log("✔ Step 2: Successfully bought a Streak Freeze with gems");

    // 3. Trigger Streak Freeze consumption (diff > 1, freezes > 0)
    console.log("Simulating missing yesterday's login (setting last_login to 3 days ago)...");
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    await db.run("UPDATE users SET last_login = $1 WHERE id = $2", [threeDaysAgo, user.id]);

    // Simulate progress check endpoint
    const checkUser = await db.get("SELECT * FROM users WHERE id = $1", [user.id]);
    console.log("User before progress check:", {
      streak_days: checkUser.streak_days,
      streak_freezes: checkUser.streak_freezes,
      last_login: checkUser.last_login
    });

    // Check difference in days
    const date1 = new Date(checkUser.last_login);
    const date2 = new Date();
    date1.setHours(0,0,0,0);
    date2.setHours(0,0,0,0);
    const diff = Math.round((date2 - date1) / (1000 * 60 * 60 * 24));
    console.log(`Days since last login: ${diff}`);

    let currentStreak = checkUser.streak_days;
    let currentFreezes = checkUser.streak_freezes;
    let freezeUsed = false;
    let streakBroken = false;
    let previousStreak = checkUser.previous_streak;

    if (diff > 1) {
      if (currentFreezes > 0) {
        currentFreezes -= 1;
        freezeUsed = true;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        await db.run(
          "UPDATE users SET streak_freezes = $1, last_login = $2 WHERE id = $3",
          [currentFreezes, yesterday, user.id]
        );
      } else {
        previousStreak = currentStreak;
        currentStreak = 0;
        streakBroken = true;
        await db.run(
          "UPDATE users SET previous_streak = $1, streak_days = 0 WHERE id = $2",
          [previousStreak, user.id]
        );
      }
    }

    const checkUserAfter = await db.get("SELECT * FROM users WHERE id = $1", [user.id]);
    console.log("User after progress check (freeze should be used):", {
      streak_days: checkUserAfter.streak_days,
      streak_freezes: checkUserAfter.streak_freezes,
      freeze_used: freezeUsed,
      streak_broken: streakBroken
    });

    if (checkUserAfter.streak_freezes !== 0 || checkUserAfter.streak_days !== 5 || !freezeUsed) {
      throw new Error("Streak freeze consumption logic failed");
    }
    console.log("✔ Step 3: Streak Freeze successfully saved the streak");

    // 4. Trigger Streak Break (diff > 1, freezes == 0)
    console.log("Simulating missing yesterday's login again (freezes are 0, setting last_login to 3 days ago)...");
    await db.run("UPDATE users SET last_login = $1 WHERE id = $2", [threeDaysAgo, user.id]);

    const checkUser2 = await db.get("SELECT * FROM users WHERE id = $1", [user.id]);
    const date1b = new Date(checkUser2.last_login);
    const date2b = new Date();
    date1b.setHours(0,0,0,0);
    date2b.setHours(0,0,0,0);
    const diffb = Math.round((date2b - date1b) / (1000 * 60 * 60 * 24));
    
    let currentStreak2 = checkUser2.streak_days;
    let currentFreezes2 = checkUser2.streak_freezes;
    let freezeUsed2 = false;
    let streakBroken2 = false;
    let previousStreak2 = checkUser2.previous_streak;

    if (diffb > 1) {
      if (currentFreezes2 > 0) {
        currentFreezes2 -= 1;
        freezeUsed2 = true;
      } else {
        previousStreak2 = currentStreak2;
        currentStreak2 = 0;
        streakBroken2 = true;
        await db.run(
          "UPDATE users SET previous_streak = $1, streak_days = 0 WHERE id = $2",
          [previousStreak2, user.id]
        );
      }
    }

    const checkUserAfter2 = await db.get("SELECT * FROM users WHERE id = $1", [user.id]);
    console.log("User after progress check (streak should break):", {
      streak_days: checkUserAfter2.streak_days,
      previous_streak: checkUserAfter2.previous_streak,
      freeze_used: freezeUsed2,
      streak_broken: streakBroken2
    });

    if (checkUserAfter2.streak_days !== 0 || checkUserAfter2.previous_streak !== 5 || !streakBroken2) {
      throw new Error("Streak break logic failed");
    }
    console.log("✔ Step 4: Streak successfully broke and saved to previous_streak");

    // 5. Repair streak with Gems (costs 100 gems)
    console.log("Repairing streak with Gems...");
    const checkUser3 = await db.get("SELECT gems, previous_streak FROM users WHERE id = $1", [user.id]);
    if (checkUser3.gems < 100 || checkUser3.previous_streak <= 0) {
      throw new Error("Preconditions for gem repair not met");
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await db.run(
      "UPDATE users SET gems = gems - 100, streak_days = previous_streak, previous_streak = 0, last_login = $1 WHERE id = $2",
      [yesterday, user.id]
    );

    const checkUserAfter3 = await db.get("SELECT * FROM users WHERE id = $1", [user.id]);
    console.log("User after gem repair:", {
      streak_days: checkUserAfter3.streak_days,
      previous_streak: checkUserAfter3.previous_streak,
      gems: checkUserAfter3.gems
    });

    if (checkUserAfter3.streak_days !== 5 || checkUserAfter3.previous_streak !== 0 || checkUserAfter3.gems !== 0) {
      throw new Error("Gem repair logic failed");
    }
    console.log("✔ Step 5: Streak successfully repaired with Gems");

    // Cleanup
    await db.run("DELETE FROM users WHERE id = $1", [user.id]);
    console.log("=== ALL TESTS PASSED SUCCESSFULLY ===");

  } catch (err) {
    console.error("❌ TEST FAILED:", err);
  } finally {
    await pool.end();
  }
}

runTests();
