import {
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

async function loadLeaderboard() {
  const list = document.getElementById("leaderboardList");
  if (!list) return;

  try {
    const q = query(
      collection(db, "users"),
      orderBy("coins", "desc"),
      limit(10)
    );

    const snapshot = await getDocs(q);

    list.innerHTML = "";

    let rank = 1;

    snapshot.forEach((docSnap) => {
      const user = docSnap.data();

      const item = document.createElement("div");
      item.className = "leaderboard-item";

      item.innerHTML = `
        <span>${rank}. ${user.email || "User"}</span>
        <strong>${user.coins || 0} pts</strong>
      `;

      list.appendChild(item);
      rank++;
    });

    if (rank === 1) {
      list.innerHTML = "<p>No users yet</p>";
    }

  } catch (err) {
    console.error(err);
    list.innerHTML = "<p>Error loading leaderboard</p>";
  }
}
