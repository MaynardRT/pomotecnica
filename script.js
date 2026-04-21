const STORAGE_KEY = "pomotecnicaSettings";
const TICK_INTERVAL_MS = 250;

const modes = {
  pomodoro: {
    minutes: 25,
    label: "Focus session",
  },
  "short-break": {
    minutes: 5,
    label: "Short break",
  },
  "long-break": {
    minutes: 15,
    label: "Long break",
  },
};

let timeLeft = modes.pomodoro.minutes * 60;
let isRunning = false;
let currentMode = "pomodoro";
let soundEnabled = true;
let completedPomodoros = 0;
let timerIntervalId = null;
let endTimestamp = null;

const timerDisplay = document.getElementById("timer");
const sessionLabel = document.getElementById("session-label");
const statusMessage = document.getElementById("status-message");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const soundBtn = document.getElementById("sound-btn");
const aboutToggle = document.getElementById("about-toggle");
const popupContent = document.getElementById("popupContent");
const popupClose = document.getElementById("popup-close");
const modalBackdrop = document.getElementById("modal-backdrop");
const timerEndSound = document.getElementById("timer-end-sound");
const modeButtons = Array.from(document.querySelectorAll(".timer-option"));
const body = document.body;

function getModeDuration(mode) {
  return modes[mode].minutes * 60;
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(timeLeft);
  document.title = `${formatTime(timeLeft)} • ${modes[currentMode].label}`;
}

function updateStatus(message) {
  statusMessage.textContent = message;
}

function updateModeButtons() {
  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === currentMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function updateTheme() {
  body.classList.remove(
    "theme-pomodoro",
    "theme-short-break",
    "theme-long-break",
  );
  body.classList.add(`theme-${currentMode}`);
}

function updateSessionLabel() {
  sessionLabel.textContent = modes[currentMode].label;
}

function updateSoundButton() {
  soundBtn.textContent = soundEnabled ? "SOUND ON" : "SOUND OFF";
  soundBtn.setAttribute("aria-pressed", String(soundEnabled));
}

function updateStartButton() {
  startBtn.textContent = isRunning ? "PAUSE" : "START";
}

function persistSettings() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      currentMode,
      timeLeft,
      isRunning,
      soundEnabled,
      completedPomodoros,
      endTimestamp,
    }),
  );
}

function render() {
  updateTheme();
  updateModeButtons();
  updateSessionLabel();
  updateSoundButton();
  updateStartButton();
  updateDisplay();
}

function stopTicker() {
  if (timerIntervalId !== null) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

function playCompletionSound() {
  if (!soundEnabled) {
    return;
  }

  timerEndSound.pause();
  timerEndSound.currentTime = 0;
  timerEndSound.play().catch(() => {
    updateStatus(
      "Timer ended. Tap anywhere and enable sound if your browser blocked playback.",
    );
  });
}

function getNextMode(mode) {
  if (mode === "pomodoro") {
    return completedPomodoros > 0 && completedPomodoros % 4 === 0
      ? "long-break"
      : "short-break";
  }

  return "pomodoro";
}

function finishTimer() {
  stopTicker();
  isRunning = false;
  endTimestamp = null;
  timeLeft = 0;

  if (currentMode === "pomodoro") {
    completedPomodoros += 1;
  }

  playCompletionSound();

  const finishedMode = currentMode;
  const nextMode = getNextMode(finishedMode);
  const nextLabel = modes[nextMode].label.toLowerCase();

  setMode(nextMode, {
    preserveStatus: true,
    resetTimer: true,
  });

  updateStatus(
    `${modes[finishedMode].label} finished. ${nextLabel.charAt(0).toUpperCase()}${nextLabel.slice(1)} is ready.`,
  );
  persistSettings();
}

function syncRemainingTime() {
  if (!isRunning || !endTimestamp) {
    return;
  }

  const nextTimeLeft = Math.max(
    0,
    Math.ceil((endTimestamp - Date.now()) / 1000),
  );

  if (nextTimeLeft !== timeLeft) {
    timeLeft = nextTimeLeft;
    updateDisplay();
    persistSettings();
  }

  if (nextTimeLeft <= 0) {
    finishTimer();
  }
}

function startTicker() {
  stopTicker();
  syncRemainingTime();
  timerIntervalId = window.setInterval(syncRemainingTime, TICK_INTERVAL_MS);
}

function startTimer() {
  if (isRunning || timeLeft <= 0) {
    return;
  }

  isRunning = true;
  endTimestamp = Date.now() + timeLeft * 1000;
  updateStartButton();
  updateStatus(`${modes[currentMode].label} in progress.`);
  startTicker();
  persistSettings();
}

function pauseTimer() {
  if (!isRunning) {
    return;
  }

  syncRemainingTime();
  isRunning = false;
  endTimestamp = null;
  stopTicker();
  updateStartButton();
  updateStatus(`${modes[currentMode].label} paused.`);
  persistSettings();
}

function resetCurrentMode() {
  stopTicker();
  isRunning = false;
  endTimestamp = null;
  timeLeft = getModeDuration(currentMode);
  render();
  updateStatus(`${modes[currentMode].label} reset.`);
  persistSettings();
}

function setMode(mode, options = {}) {
  const { preserveStatus = false, resetTimer = true } = options;

  stopTicker();
  isRunning = false;
  endTimestamp = null;
  currentMode = mode;

  if (resetTimer) {
    timeLeft = getModeDuration(mode);
  }

  render();

  if (!preserveStatus) {
    updateStatus(`${modes[mode].label} ready.`);
  }

  persistSettings();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  updateSoundButton();
  updateStatus(
    soundEnabled
      ? "Sound notifications enabled."
      : "Sound notifications muted.",
  );
  persistSettings();
}

function togglePopup() {
  if (popupContent.classList.contains("show")) {
    closePopup();
    return;
  }

  popupContent.classList.add("show");
  popupContent.setAttribute("aria-hidden", "false");
  aboutToggle.setAttribute("aria-expanded", "true");
  modalBackdrop.hidden = false;
  modalBackdrop.classList.add("is-visible");
  document.body.classList.add("modal-open");
  popupContent.focus();
}

function closePopup() {
  popupContent.classList.remove("show");
  popupContent.setAttribute("aria-hidden", "true");
  aboutToggle.setAttribute("aria-expanded", "false");
  modalBackdrop.classList.remove("is-visible");
  modalBackdrop.hidden = true;
  document.body.classList.remove("modal-open");
}

function loadSettings() {
  const rawSettings = localStorage.getItem(STORAGE_KEY);
  if (!rawSettings) {
    render();
    updateStatus("Ready to focus.");
    return;
  }

  try {
    const settings = JSON.parse(rawSettings);
    currentMode = modes[settings.currentMode]
      ? settings.currentMode
      : "pomodoro";
    soundEnabled =
      typeof settings.soundEnabled === "boolean" ? settings.soundEnabled : true;
    completedPomodoros = Number.isInteger(settings.completedPomodoros)
      ? settings.completedPomodoros
      : 0;

    const fallbackTime = getModeDuration(currentMode);
    timeLeft =
      Number.isFinite(settings.timeLeft) && settings.timeLeft > 0
        ? settings.timeLeft
        : fallbackTime;
    isRunning = Boolean(settings.isRunning);
    endTimestamp =
      typeof settings.endTimestamp === "number" ? settings.endTimestamp : null;

    if (isRunning && endTimestamp) {
      const resumedTimeLeft = Math.max(
        0,
        Math.ceil((endTimestamp - Date.now()) / 1000),
      );

      if (resumedTimeLeft <= 0) {
        isRunning = false;
        endTimestamp = null;
        timeLeft = fallbackTime;
        updateStatus("Previous session expired while the page was closed.");
      } else {
        timeLeft = resumedTimeLeft;
        updateStatus(`${modes[currentMode].label} resumed.`);
        startTicker();
      }
    } else {
      isRunning = false;
      endTimestamp = null;
      updateStatus(`${modes[currentMode].label} ready.`);
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    currentMode = "pomodoro";
    timeLeft = getModeDuration(currentMode);
    isRunning = false;
    soundEnabled = true;
    completedPomodoros = 0;
    endTimestamp = null;
    updateStatus("Settings were reset after an invalid saved state.");
  }

  render();
  persistSettings();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      updateStatus("Offline mode is unavailable in this browser session.");
    });
  });
}

startBtn.addEventListener("click", () => {
  if (isRunning) {
    pauseTimer();
    return;
  }

  startTimer();
});

resetBtn.addEventListener("click", resetCurrentMode);
soundBtn.addEventListener("click", toggleSound);

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});

aboutToggle.addEventListener("click", togglePopup);
popupClose.addEventListener("click", closePopup);
modalBackdrop.addEventListener("click", closePopup);

document.addEventListener("click", (event) => {
  if (!popupContent.classList.contains("show")) {
    return;
  }

  if (!event.target.closest(".popup")) {
    closePopup();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !event.target.closest("button")) {
    event.preventDefault();
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  if (event.key === "Escape") {
    closePopup();
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && isRunning) {
    syncRemainingTime();
  }
});

loadSettings();
registerServiceWorker();
