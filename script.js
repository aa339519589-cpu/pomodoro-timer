// DOM 元素
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const statusEl = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const tabs = document.querySelectorAll('.tab');
const ringProgress = document.querySelector('.ring-progress');
const completedCountEl = document.getElementById('completedCount');
const workInput = document.getElementById('workDuration');
const shortBreakInput = document.getElementById('shortBreakDuration');
const longBreakInput = document.getElementById('longBreakDuration');

// 状态
let mode = 'work'; // work | shortBreak | longBreak
let isRunning = false;
let isPaused = false;
let timerId = null;
let timeLeft = 25 * 60; // 秒
let totalTime = 25 * 60;
let completedToday = 0;

// 从 localStorage 恢复数据
function loadStats() {
  const saved = localStorage.getItem('pomodoro_completed');
  if (saved) {
    const data = JSON.parse(saved);
    const today = new Date().toDateString();
    if (data.date === today) {
      completedToday = data.count;
    } else {
      completedToday = 0;
      localStorage.setItem('pomodoro_completed', JSON.stringify({ date: today, count: 0 }));
    }
  }
  completedCountEl.textContent = completedToday;
}

function saveStats() {
  const today = new Date().toDateString();
  localStorage.setItem('pomodoro_completed', JSON.stringify({ date: today, count: completedToday }));
  completedCountEl.textContent = completedToday;
}

// 获取当前模式时长（秒）
function getDuration() {
  if (mode === 'work') return parseInt(workInput.value) * 60;
  if (mode === 'shortBreak') return parseInt(shortBreakInput.value) * 60;
  return parseInt(longBreakInput.value) * 60;
}

// 更新显示
function updateDisplay() {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  minutesEl.textContent = String(mins).padStart(2, '0');
  secondsEl.textContent = String(secs).padStart(2, '0');

  // 进度环
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - timeLeft / totalTime);
  ringProgress.style.strokeDasharray = circumference;
  ringProgress.style.strokeDashoffset = offset;
}

// 更新状态文字
function updateStatus() {
  if (isRunning) {
    if (isPaused) {
      statusEl.textContent = '已暂停';
    } else {
      statusEl.textContent = mode === 'work' ? '专注中…' : '休息中…';
    }
  } else {
    statusEl.textContent = mode === 'work' ? '准备开始' : '准备休息';
  }
}

// 切换模式
function setMode(newMode) {
  mode = newMode;
  tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));

  // 颜色变化
  const color = mode === 'work' ? '#e25555' : '#4a9eff';
  ringProgress.style.stroke = color;
  document.querySelector('.tab.active').style.backgroundColor = color;
  document.querySelector('.tab.active').style.borderColor = color;

  // 重置计时
  stopTimer();
  isRunning = false;
  isPaused = false;
  timeLeft = getDuration();
  totalTime = timeLeft;
  updateDisplay();
  updateStatus();
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  startBtn.textContent = '开始';
}

// 开始
function startTimer() {
  if (isPaused) {
    isPaused = false;
    isRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    updateStatus();
    return;
  }

  if (isRunning) return;

  isRunning = true;
  isPaused = false;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  updateStatus();

  timerId = setInterval(() => {
    timeLeft--;
    updateDisplay();

    if (timeLeft <= 0) {
      clearInterval(timerId);
      timerId = null;
      isRunning = false;
      isPaused = false;
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      onComplete();
    }
  }, 1000);
}

// 暂停
function pauseTimer() {
  if (isRunning && !isPaused) {
    isPaused = true;
    clearInterval(timerId);
    timerId = null;
    startBtn.disabled = false;
    startBtn.textContent = '继续';
    pauseBtn.disabled = true;
    updateStatus();
  }
}

// 停止
function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  startBtn.textContent = '开始';
}

// 重置
function resetTimer() {
  stopTimer();
  isRunning = false;
  isPaused = false;
  timeLeft = getDuration();
  totalTime = timeLeft;
  updateDisplay();
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  startBtn.textContent = '开始';
  updateStatus();
}

// 完成一个番茄
function onComplete() {
  // 播放声音
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);

    // 响两次
    setTimeout(() => {
      const ctx2 = new (window.AudioContext || window.webkitAudioContext)();
      const osc2 = ctx2.createOscillator();
      const gain2 = ctx2.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx2.destination);
      osc2.frequency.value = 1100;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, ctx2.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.6);
      osc2.start(ctx2.currentTime);
      osc2.stop(ctx2.currentTime + 0.6);
    }, 200);
  } catch (e) { /* 静默失败 */ }

  // 浏览器通知
  if ('Notification' in window && Notification.permission === 'granted') {
    if (mode === 'work') {
      new Notification('番茄时间到！', { body: '该休息一下了 🎉', icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍅</text></svg>' });
    } else {
      new Notification('休息结束！', { body: '开始新一轮专注 💪', icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍅</text></svg>' });
    }
  }

  // 统计
  if (mode === 'work') {
    completedToday++;
    saveStats();
    // 自动切换到短休息
    setTimeout(() => {
      setMode('shortBreak');
    }, 1000);
  } else {
    // 休息结束自动切回工作
    setTimeout(() => {
      setMode('work');
    }, 1000);
  }

  startBtn.disabled = false;
  pauseBtn.disabled = true;
  startBtn.textContent = '开始';
  statusEl.textContent = '完成！';
}

// 请求通知权限
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// 事件绑定
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    if (isRunning && !isPaused) return; // 运行中禁止切换
    setMode(tab.dataset.mode);
  });
});

// 设置变更时重置
[workInput, shortBreakInput, longBreakInput].forEach(input => {
  input.addEventListener('change', () => {
    if (!isRunning) {
      timeLeft = getDuration();
      totalTime = timeLeft;
      updateDisplay();
    }
  });
});

// 初始化
loadStats();
setMode('work');