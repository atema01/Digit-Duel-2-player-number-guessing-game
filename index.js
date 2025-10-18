/* ====== State ====== */
let secret1 = null;
let secret2 = null;
let turn = 1;
let guessesP1 = [];
let guessesP2 = [];
let timer1 = null;
let timer2 = null;
let timeLeft1 = 60;
let timeLeft2 = 60;
let DIGIT_LENGTH = 4; // default

const q = (s) => document.querySelector(s);

/* ====== Helpers ====== */
function isValidSecret(s){
  if(typeof s !== 'string') return false;
  if(s.length !== DIGIT_LENGTH) return false;
  if(!/^[0-9]+$/.test(s)) return false;
  if(s[0] === '0' || s[s.length - 1] === '0') return false;
  const arr = s.split('');
  const set = new Set(arr);
  return set.size === DIGIT_LENGTH;
}

function computeFeedback(secret, guess){
  let position = 0;
  let present = 0;
  for(let i=0; i<DIGIT_LENGTH; i++){
    if(guess[i] === secret[i]) position++;
    if(secret.includes(guess[i])) present++;
  }
  return { trueCount: present, positionCount: position };
}

function sanitizeInputDigits(s){
  return (s || '').replace(/[^0-9]/g,'').slice(0, DIGIT_LENGTH);
}

function extractDigits(inputStr) {
  const matches = (inputStr || '').match(/[0-9]/g);
  return matches ? new Set(matches) : new Set();
}

/* ====== DOM refs ====== */
const digitLengthSelect = q('#digitLength');
const secretP1Input = q('#secretP1');
const secretP2Input = q('#secretP2');
const p1SetBtn = q('#p1Set');
const p2SetBtn = q('#p2Set');
const clearP1 = q('#clearP1');
const clearP2 = q('#clearP2');
const startGameBtn = q('#startGame');
const resetAllBtn = q('#resetAll');
const setupArea = q('#setupArea');
const p1Status = q('#p1Status');
const p2Status = q('#p2Status');
const gameBoard = q('#gameBoard');
const guessP1Input = q('#guessP1');
const guessP2Input = q('#guessP2');
const submitP1 = q('#submitP1');
const submitP2 = q('#submitP2');
const listP1 = q('#listP1');
const listP2 = q('#listP2');
const p1TurnBadge = q('#p1TurnBadge');
const p2TurnBadge = q('#p2TurnBadge');
const p1GuessCount = q('#p1GuessCount');
const p2GuessCount = q('#p2GuessCount');
const overlay = q('#overlay');
const winnerTitle = q('#winnerTitle');
const winnerMsg = q('#winnerMsg');
const showSecret1 = q('#showSecret1');
const showSecret2 = q('#showSecret2');
const playAgain = q('#playAgain');
const closeOverlay = q('#closeOverlay');
const p1SecretSet = q('#p1SecretSet');
const p2SecretSet = q('#p2SecretSet');
const highlightP1Input = q('#highlightP1');
const highlightP2Input = q('#highlightP2');

/* ====== Dynamic UI based on digit length ====== */
function updateDigitLength() {
  DIGIT_LENGTH = parseInt(digitLengthSelect.value);
  const example = DIGIT_LENGTH === 3 ? '347' : 
                  DIGIT_LENGTH === 4 ? '3478' :
                  DIGIT_LENGTH === 5 ? '34781' : '347812';
  
  secretP1Input.placeholder = `e.g. ${example}`;
  secretP2Input.placeholder = `e.g. ${example}`;
  secretP1Input.maxLength = DIGIT_LENGTH;
  secretP2Input.maxLength = DIGIT_LENGTH;
  guessP1Input.placeholder = `Enter ${DIGIT_LENGTH}-digit guess`;
  guessP2Input.placeholder = `Enter ${DIGIT_LENGTH}-digit guess`;
  guessP1Input.maxLength = DIGIT_LENGTH;
  guessP2Input.maxLength = DIGIT_LENGTH;
}

digitLengthSelect.addEventListener('change', updateDigitLength);
updateDigitLength(); // initialize

/* ====== Timer & Turn Management ====== */
function clearTimers() {
  if (timer1) clearInterval(timer1);
  if (timer2) clearInterval(timer2);
  timer1 = null;
  timer2 = null;
}

function startTurnTimer(player) {
  clearTimers();
  if (player === 1) {
    timeLeft1 = 60;
    updateTurnBadge(1, timeLeft1);
    timer1 = setInterval(() => {
      timeLeft1--;
      updateTurnBadge(1, timeLeft1);
      if (timeLeft1 <= 0) {
        clearInterval(timer1);
        timer1 = null;
        handleTimeout(1);
      }
    }, 1000);
  } else {
    timeLeft2 = 60;
    updateTurnBadge(2, timeLeft2);
    timer2 = setInterval(() => {
      timeLeft2--;
      updateTurnBadge(2, timeLeft2);
      if (timeLeft2 <= 0) {
        clearInterval(timer2);
        timer2 = null;
        handleTimeout(2);
      }
    }, 1000);
  }
}

function updateTurnBadge(player, seconds) {
  const badge = player === 1 ? p1TurnBadge : p2TurnBadge;
  badge.textContent = seconds > 0 ? `Your turn (${seconds}s)` : 'Your turn';
}

function handleTimeout(player) {
  const listEl = player === 1 ? listP1 : listP2;
  const guesses = player === 1 ? guessesP1 : guessesP2;
  const row = document.createElement('div');
  row.className = 'guess-row timeout-row';
  row.textContent = 'Timeout — Turn skipped';
  listEl.prepend(row);
  guesses.push({ guess: null, fb: null, timeout: true });
  const countEl = player === 1 ? p1GuessCount : p2GuessCount;
  countEl.textContent = String(guesses.length);

  turn = player === 1 ? 2 : 1;
  updateTurnUI();
}

/* ====== Setup handlers ====== */
secretP1Input.addEventListener('input', (e)=> {
  e.target.value = sanitizeInputDigits(e.target.value);
});
secretP2Input.addEventListener('input', (e)=> {
  e.target.value = sanitizeInputDigits(e.target.value);
});

p1SetBtn.addEventListener('click', ()=>{
  const val = secretP1Input.value.trim();
  if(!isValidSecret(val)){
    alert(`Invalid Player 1 secret. Must be ${DIGIT_LENGTH} digits, no repeats, cannot start or end with 0.`);
    return;
  }
  secret1 = val;
  p1Status.innerHTML = 'Player 1: <strong>set</strong>';
  secretP1Input.disabled = true;
  p1SetBtn.disabled = true;
  checkStartReady();
  p1SecretSet.textContent = 'Yes';
});

p2SetBtn.addEventListener('click', ()=>{
  const val = secretP2Input.value.trim();
  if(!isValidSecret(val)){
    alert(`Invalid Player 2 secret. Must be ${DIGIT_LENGTH} digits, no repeats, cannot start or end with 0.`);
    return;
  }
  secret2 = val;
  p2Status.innerHTML = 'Player 2: <strong>set</strong>';
  secretP2Input.disabled = true;
  p2SetBtn.disabled = true;
  checkStartReady();
  p2SecretSet.textContent = 'Yes';
});

clearP1.addEventListener('click', ()=>{ secretP1Input.value = ''; });
clearP2.addEventListener('click', ()=>{ secretP2Input.value = ''; });

resetAllBtn.addEventListener('click', resetEverything);

function checkStartReady(){
  startGameBtn.disabled = !(secret1 && secret2);
}

startGameBtn.addEventListener('click', ()=>{
  if(!(secret1 && secret2)){
    alert('Both secrets must be set to start.');
    return;
  }
  setupArea.style.display = 'none';
  gameBoard.style.display = 'flex';
  turn = 1;
  guessesP1 = []; guessesP2 = [];
  digitSelectorArea.style.display = 'none';
  listP1.innerHTML = ''; listP2.innerHTML = '';
  p1GuessCount.textContent = '0'; p2GuessCount.textContent = '0';
  guessP1Input.value = ''; guessP2Input.value = '';
  highlightP1Input.value = ''; highlightP2Input.value = '';
  updateTurnUI();
});

function resetEverything(){
  clearTimers();
  secret1 = null; secret2 = null;
  guessesP1 = []; guessesP2 = [];
  p1Status.innerHTML = 'Player 1: <strong>not set</strong>';
  p2Status.innerHTML = 'Player 2: <strong>not set</strong>';
  secretP1Input.disabled = false; secretP2Input.disabled = false;
  p1SetBtn.disabled = false; p2SetBtn.disabled = false;
  secretP1Input.value = ''; secretP2Input.value = '';
  setupArea.style.display = 'flex';
  gameBoard.style.display = 'none';
  listP1.innerHTML = ''; listP2.innerHTML = '';
  p1GuessCount.textContent = '0'; p2GuessCount.textContent = '0';
  startGameBtn.disabled = true;
  p1SecretSet.textContent = 'No';
  p2SecretSet.textContent = 'No';
  overlay.classList.remove('show');
  guessP1Input.value = '';
  guessP2Input.value = '';
  highlightP1Input.value = '';
  highlightP2Input.value = '';
  // Reset digit length UI (optional)
  digitLengthSelect.value = '4';
  updateDigitLength();
}

/* ====== Game logic ====== */
guessP1Input.addEventListener('input', (e)=> {
  e.target.value = sanitizeInputDigits(e.target.value);
});
guessP2Input.addEventListener('input', (e)=> {
  e.target.value = sanitizeInputDigits(e.target.value);
});

highlightP1Input.addEventListener('input', () => renderAllGuesses(1));
highlightP2Input.addEventListener('input', () => renderAllGuesses(2));

submitP1.addEventListener('click', ()=> handleSubmit(1));
submitP2.addEventListener('click', ()=> handleSubmit(2));

function handleSubmit(player){
  if(player === 1 && turn !== 1) { alert("It's not Player 1's turn."); return; }
  if(player === 2 && turn !== 2) { alert("It's not Player 2's turn."); return; }

  if (player === 1) { if (timer1) clearInterval(timer1); timer1 = null; }
  else { if (timer2) clearInterval(timer2); timer2 = null; }

  const guess = (player===1?guessP1Input.value:guessP2Input.value).trim();
  if(guess.length !== DIGIT_LENGTH || !/^[0-9]+$/.test(guess)){
    alert(`Invalid guess. Enter exactly ${DIGIT_LENGTH} digits.`);
    return;
  }
  if(new Set(guess.split('')).size !== DIGIT_LENGTH){
    alert('Guesses must not contain repeated digits.');
    return;
  }

  if(player === 1){
    const fb = computeFeedback(secret2, guess);
    guessesP1.push({guess, fb});
    appendGuessRow(listP1, guessesP1.length, guess, fb, extractDigits(highlightP1Input.value));
    p1GuessCount.textContent = String(guessesP1.length);
    guessP1Input.value = '';
    if(fb.trueCount === DIGIT_LENGTH && fb.positionCount === DIGIT_LENGTH){
      clearTimers();
      showWinner(1);
      return;
    }
    turn = 2;
    updateTurnUI();
  } else {
    const fb = computeFeedback(secret1, guess);
    guessesP2.push({guess, fb});
    appendGuessRow(listP2, guessesP2.length, guess, fb, extractDigits(highlightP2Input.value));
    p2GuessCount.textContent = String(guessesP2.length);
    guessP2Input.value = '';
    if(fb.trueCount === DIGIT_LENGTH && fb.positionCount === DIGIT_LENGTH){
      clearTimers();
      showWinner(2);
      return;
    }
    turn = 1;
    updateTurnUI();
  }
}

function appendGuessRow(listEl, idx, guess, fb, highlightSet) {
  const row = document.createElement('div');
  row.className = 'guess-row';
  
  let guessHTML = '';
  for (const digit of guess) {
    if (highlightSet.has(digit)) {
      guessHTML += `<span class="highlight-digit">${digit}</span>`;
    } else {
      guessHTML += digit;
    }
  }

  row.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center">
      <div class="badge">${idx}</div>
      <div style="min-width:${40 + DIGIT_LENGTH * 10}px;font-weight:700">${guessHTML}</div>
      <div class="small">True: <strong>${fb.trueCount}</strong></div>
      <div class="small">Position: <strong>${fb.positionCount}</strong></div>
    </div>
  `;
  listEl.prepend(row);
}

function renderAllGuesses(player) {
  const listEl = player === 1 ? listP1 : listP2;
  const guesses = player === 1 ? guessesP1 : guessesP2;
  const highlightSet = player === 1 ? extractDigits(highlightP1Input.value) : extractDigits(highlightP2Input.value);
  
  listEl.innerHTML = '';
  for (let i = guesses.length - 1; i >= 0; i--) {
    const g = guesses[i];
    if (g.timeout) {
      const row = document.createElement('div');
      row.className = 'guess-row timeout-row';
      row.textContent = 'Timeout — Turn skipped';
      listEl.appendChild(row);
    } else {
      appendGuessRow(listEl, i+1, g.guess, g.fb, highlightSet);
    }
  }
}

function updateTurnUI(){
  clearTimers();
  if(turn === 1){
    p1TurnBadge.textContent = `Your turn (60s)`;
    p2TurnBadge.textContent = 'Wait';
    submitP1.disabled = false;
    guessP1Input.disabled = false;
    submitP2.disabled = true;
    guessP2Input.disabled = true;
    guessP1Input.focus();
    startTurnTimer(1);
  } else {
    p2TurnBadge.textContent = `Your turn (60s)`;
    p1TurnBadge.textContent = 'Wait';
    submitP2.disabled = false;
    guessP2Input.disabled = false;
    submitP1.disabled = true;
    guessP1Input.disabled = true;
    guessP2Input.focus();
    startTurnTimer(2);
  }
}

function showWinner(player){
  winnerTitle.textContent = `🎉 Player ${player} Wins!`;
  winnerMsg.textContent = `Player ${player} guessed the opponent's secret.`;
  showSecret1.textContent = secret1;
  showSecret2.textContent = secret2;
  overlay.classList.add('show');
}

playAgain.addEventListener('click', resetEverything);
closeOverlay.addEventListener('click', ()=> overlay.classList.remove('show'));

/* ====== Initialization ====== */
(function init(){
  startGameBtn.disabled = true;
  submitP1.disabled = true;
  submitP2.disabled = true;
  p1SecretSet.textContent = 'No';
  p2SecretSet.textContent = 'No';
})();