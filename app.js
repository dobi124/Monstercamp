// Проверяем, есть ли Telegram WebApp
const tg = window.Telegram ? window.Telegram.WebApp : null;

const state = {
  user: null,
  clicks: 0,
};

// Рендер страницы
function render() {
  const root = document.getElementById('app');

  let userText = "";
  if (state.user) {
    userText = `<p>Привет, <strong>${state.user.first_name}</strong>!</p>`;
  } else {
    userText = `<p>Игра не в Telegram. Открой через бота.</p>`;
  }

  root.innerHTML = `
    <div style="
      padding: 16px;
      min-height: 100vh;
      background: #10141a;
      color: #f5f5f5;
    ">
      <h1 style="margin-top:0;">Моя игра для Telegram</h1>

      ${userText}

      <button id="btn-attack" style="
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
      ">
        Атаковать врага
      </button>

      <p style="margin-top: 12px;">
        Ты атаковал <strong>${state.clicks}</strong> раз(а).
      </p>
    </div>
  `;

  document.getElementById("btn-attack").onclick = () => {
    state.clicks++;
    render();
  };
}

// Инициализация WebApp
function init() {
  if (tg) {
    tg.ready();
    tg.expand(); 

    // Данные пользователя из Telegram
    state.user = tg.initDataUnsafe.user || null;
  }

  render();
}

document.addEventListener("DOMContentLoaded", init);
