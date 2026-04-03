import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBcH8WZrVF52aiW4OFLqVJZGNiQSVu2Yjo",
  authDomain: "ipl-prediction-app-a8b80.firebaseapp.com",
  projectId: "ipl-prediction-app-a8b80",
  storageBucket: "ipl-prediction-app-a8b80.firebasestorage.app",
  messagingSenderId: "1004710899145",
  appId: "1:1004710899145:web:3a38dbaf96da95ec04cc18"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const MATCHES = [
  {
    id: "match-1",
    teamA: "Mumbai Indians",
    teamB: "Chennai Super Kings",
    date: "05 Apr 2026",
    time: "7:30 PM IST",
    venue: "Wankhede Stadium"
  },
  {
    id: "match-2",
    teamA: "Royal Challengers Bengaluru",
    teamB: "Kolkata Knight Riders",
    date: "06 Apr 2026",
    time: "7:30 PM IST",
    venue: "M. Chinnaswamy Stadium"
  },
  {
    id: "match-3",
    teamA: "Rajasthan Royals",
    teamB: "Sunrisers Hyderabad",
    date: "07 Apr 2026",
    time: "3:30 PM IST",
    venue: "Sawai Mansingh Stadium"
  },
  {
    id: "match-4",
    teamA: "Delhi Capitals",
    teamB: "Punjab Kings",
    date: "08 Apr 2026",
    time: "7:30 PM IST",
    venue: "Arun Jaitley Stadium"
  },
  {
    id: "match-5",
    teamA: "Gujarat Titans",
    teamB: "Lucknow Super Giants",
    date: "09 Apr 2026",
    time: "7:30 PM IST",
    venue: "Narendra Modi Stadium"
  },
  {
    id: "match-6",
    teamA: "Chennai Super Kings",
    teamB: "Rajasthan Royals",
    date: "10 Apr 2026",
    time: "7:30 PM IST",
    venue: "M. A. Chidambaram Stadium"
  }
];

const STORAGE_KEYS = {
  selectedMatch: "iplSelectedMatch",
  redirectPage: "iplRedirectPage"
};

let currentUser = null;

// Returns true when Firebase has an authenticated user for the current session.
function isLoggedIn() {
  return Boolean(currentUser);
}

// Stores the selected match so we can restore it after login.
function saveMatchSelection(matchId) {
  const match = MATCHES.find((item) => item.id === matchId);
  if (!match) {
    return null;
  }

  localStorage.setItem(STORAGE_KEYS.selectedMatch, JSON.stringify(match));
  localStorage.setItem(STORAGE_KEYS.redirectPage, "predict.html");
  return match;
}

// Sends the user back to the page they wanted before logging in.
function redirectAfterLogin() {
  const nextPage = localStorage.getItem(STORAGE_KEYS.redirectPage) || "index.html";
  localStorage.removeItem(STORAGE_KEYS.redirectPage);
  window.location.href = nextPage;
}

function getSelectedMatch() {
  const stored = localStorage.getItem(STORAGE_KEYS.selectedMatch);
  return stored ? JSON.parse(stored) : null;
}

function validateEmail(email) {
  return email.includes("@") && email.includes(".");
}

function getUserDocRef(userId) {
  return doc(db, "users", userId);
}

function getPredictionDocRef(userId, matchId) {
  return doc(db, "predictions", `${userId}_${matchId}`);
}

// Ensures every authenticated user has a matching Firestore profile document.
async function ensureUserDocument(user) {
  const userRef = getUserDocRef(user.uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    await setDoc(userRef, {
      email: user.email,
      coins: 0
    });

    return {
      email: user.email,
      coins: 0
    };
  }

  return userSnapshot.data();
}

// Reads the authenticated user's coin balance from Firestore and paints the header.
async function updateCoinDisplay() {
  const coinNode = document.getElementById("coinDisplay");
  if (!coinNode) {
    return;
  }

  if (!currentUser) {
    coinNode.textContent = "Coins 0";
    return;
  }

  try {
    const userData = await ensureUserDocument(currentUser);
    coinNode.textContent = `Coins ${userData.coins ?? 0}`;
  } catch (error) {
    console.error("Failed to load coins:", error);
    coinNode.textContent = "Coins --";
  }
}

// Builds each home-page match card from the hardcoded IPL data.
function createMatchCard(match) {
  const card = document.createElement("article");
  card.className = "match-card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Predict ${match.teamA} versus ${match.teamB}`);
  card.innerHTML = `
    <div class="match-teams">
      <span class="team-pill">${match.teamA}</span>
      <span class="versus">VS</span>
      <span class="team-pill">${match.teamB}</span>
    </div>
    <div class="match-footer">
      <div class="match-meta">
        <strong>${match.date}</strong><br>
        <span>${match.time} | ${match.venue}</span>
      </div>
      <span class="predict-chip">Predict</span>
    </div>
  `;

  const openMatch = () => {
    saveMatchSelection(match.id);
    window.location.href = isLoggedIn() ? "predict.html" : "login.html";
  };

  card.addEventListener("click", openMatch);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMatch();
    }
  });

  return card;
}

function renderMatches() {
  const matchesContainer = document.getElementById("matchesContainer");
  if (!matchesContainer) {
    return;
  }

  matchesContainer.innerHTML = "";
  MATCHES.forEach((match) => {
    matchesContainer.appendChild(createMatchCard(match));
  });
}

function getFriendlyAuthError(error) {
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Wrong password. Please try again.";
    case "auth/user-not-found":
      return "No account found for this email.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/email-already-in-use":
      return "This email is already registered. Try logging in again.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a bit.";
    default:
      return "Login failed. Please try again.";
  }
}

// Attempts a normal sign-in first, then falls back to automatic signup
// when Firebase reports that the user does not exist yet.
async function loginOrSignup(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return {
      user: credential.user,
      mode: "login"
    };
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }

    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return {
      user: credential.user,
      mode: "signup"
    };
  }
}

async function handleLogin() {
  const loginForm = document.getElementById("loginForm");
  const messageNode = document.getElementById("loginMessage");

  if (!loginForm || !messageNode) {
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = loginForm.email.value.trim();
    const password = loginForm.password.value.trim();

    if (!validateEmail(email)) {
      messageNode.textContent = "Please enter a valid email address.";
      messageNode.className = "form-message error";
      return;
    }

    // Firebase email/password signup requires at least 6 characters.
    if (password.length < 6) {
      messageNode.textContent = "Password must be at least 6 characters.";
      messageNode.className = "form-message error";
      return;
    }

    messageNode.textContent = "Signing in...";
    messageNode.className = "form-message";

    try {
      const { user, mode } = await loginOrSignup(email, password);
      currentUser = user;
      await ensureUserDocument(currentUser);
      messageNode.textContent = mode === "signup"
        ? "Account created successfully 🎉"
        : "Login successful";
      messageNode.className = "form-message success";
      await updateCoinDisplay();

      setTimeout(() => {
        redirectAfterLogin();
      }, 700);
    } catch (error) {
      console.error("Login error:", error);
      messageNode.textContent = getFriendlyAuthError(error);
      messageNode.className = "form-message error";
    }
  });
}

async function getExistingPrediction(userId, matchId) {
  const predictionSnapshot = await getDoc(getPredictionDocRef(userId, matchId));
  if (!predictionSnapshot.exists()) {
    return "";
  }

  const prediction = predictionSnapshot.data();
  return prediction.predictedTeam || "";
}

async function savePrediction(matchId, teamName) {
  if (!currentUser) {
    throw new Error("User must be logged in to save a prediction.");
  }

  await setDoc(getPredictionDocRef(currentUser.uid, matchId), {
    userId: currentUser.uid,
    matchId,
    predictedTeam: teamName,
    updatedAt: serverTimestamp()
  });
}

// Hydrates the prediction screen using the match saved from the home page.
async function renderPredictionPage() {
  const selectedMatch = getSelectedMatch();
  const matchCard = document.getElementById("selectedMatchCard");
  const optionsContainer = document.getElementById("teamOptions");
  const submitButton = document.getElementById("submitPrediction");
  const messageNode = document.getElementById("predictionMessage");
  const matchMeta = document.getElementById("matchMeta");

  if (!matchCard || !optionsContainer || !submitButton || !messageNode || !matchMeta) {
    return;
  }

  if (!currentUser) {
    localStorage.setItem(STORAGE_KEYS.redirectPage, "predict.html");
    window.location.href = "login.html";
    return;
  }

  if (!selectedMatch) {
    matchCard.innerHTML = `
      <h2>No match selected</h2>
      <p>Please return to the home page and choose an IPL fixture first.</p>
    `;
    submitButton.disabled = true;
    return;
  }

  matchMeta.textContent = `${selectedMatch.date} | ${selectedMatch.time} | ${selectedMatch.venue}`;
  matchCard.innerHTML = `
    <p class="eyebrow">Selected fixture</p>
    <h2>${selectedMatch.teamA} vs ${selectedMatch.teamB}</h2>
    <p>Pick the team you think will win this clash.</p>
  `;

  let chosenTeam = "";

  try {
    chosenTeam = await getExistingPrediction(currentUser.uid, selectedMatch.id);
  } catch (error) {
    console.error("Failed to load saved prediction:", error);
  }

  optionsContainer.innerHTML = "";

  [selectedMatch.teamA, selectedMatch.teamB].forEach((teamName) => {
    const teamButton = document.createElement("button");
    teamButton.type = "button";
    teamButton.className = "team-card";
    teamButton.innerHTML = `
      <strong>${teamName}</strong>
      <span>${teamName === selectedMatch.teamA ? "Home momentum" : "Away momentum"}</span>
      <div class="status-chip">${chosenTeam === teamName ? "Selected" : "Tap to choose"}</div>
    `;

    if (chosenTeam === teamName) {
      teamButton.classList.add("selected");
    }

    teamButton.addEventListener("click", () => {
      chosenTeam = teamName;
      Array.from(optionsContainer.children).forEach((node) => {
        node.classList.remove("selected");
        const chip = node.querySelector(".status-chip");
        if (chip) {
          chip.textContent = "Tap to choose";
        }
      });

      teamButton.classList.add("selected");
      const chip = teamButton.querySelector(".status-chip");
      if (chip) {
        chip.textContent = "Selected";
      }

      messageNode.textContent = "";
      messageNode.className = "form-message";
    });

    optionsContainer.appendChild(teamButton);
  });

  submitButton.addEventListener("click", async () => {
    if (!chosenTeam) {
      messageNode.textContent = "Please select a team before submitting.";
      messageNode.className = "form-message error";
      return;
    }

    submitButton.disabled = true;
    messageNode.textContent = "Saving prediction...";
    messageNode.className = "form-message";

    try {
      await savePrediction(selectedMatch.id, chosenTeam);
      messageNode.textContent = `Prediction saved: ${chosenTeam} to win.`;
      messageNode.className = "form-message success";
    } catch (error) {
      console.error("Prediction save error:", error);
      messageNode.textContent = "Could not save your prediction. Please try again.";
      messageNode.className = "form-message error";
    } finally {
      submitButton.disabled = false;
    }
  });
}

async function initPage(page) {
  renderMatches();

  if (page === "login") {
    await handleLogin();
    return;
  }

  if (page === "predict") {
    await renderPredictionPage();
  }
}

function init() {
  const page = document.body.dataset.page;

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    await updateCoinDisplay();

    // Keep protected prediction routes behind Firebase authentication.
    if (!currentUser && page === "predict") {
      localStorage.setItem(STORAGE_KEYS.redirectPage, "predict.html");
      window.location.href = "login.html";
      return;
    }

    // If a user is already logged in, the login page should move them forward.
    if (currentUser && page === "login") {
      await ensureUserDocument(currentUser);
      redirectAfterLogin();
      return;
    }

    await initPage(page);
  });
}

document.addEventListener("DOMContentLoaded", init);
