const SUPABASE_URL = 'https://erwxchopsdbsxacwpvvw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3lAdjBxhuQGwEAIsti0fvQ_rFq0Nwci';

const hasSB =
  typeof window.supabase !== 'undefined' &&
  SUPABASE_URL.startsWith('https://') &&
  SUPABASE_ANON_KEY.length > 20;

const sb = hasSB
  ? window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    )
  : null;


/* =========================================================
   ESTADO
========================================================= */

let currentUser = null;
let profile = {};
let settings = {};
let transactions = [];
let goals = [];
let accounts = [];

let currentTransactionFilter = 'all';


/* =========================================================
   HELPERS
========================================================= */

const $ = id => document.getElementById(id);

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function number(value) {
  return Number(value || 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function showToast(message) {
  const toast = $('toast');

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}


/* =========================================================
   SPLASH / AUTH
========================================================= */

function hideSplash() {
  const splash = $('splashScreen');

  if (!splash) return;

  splash.classList.add('hidden');

  setTimeout(() => {
    splash.style.display = 'none';
  }, 450);
}

function showAuth() {
  $('authScreen')?.classList.remove('hidden');
  $('appScreen')?.classList.add('hidden');

  $('loginCard')?.classList.remove('hidden');
  $('signupCard')?.classList.add('hidden');

  clearAuthMessages();

  setTimeout(() => {
    $('loginEmail')?.focus();
  }, 100);
}

function showSignup() {
  $('loginCard')?.classList.add('hidden');
  $('signupCard')?.classList.remove('hidden');

  clearAuthMessages();

  setTimeout(() => {
    $('signupName')?.focus();
  }, 100);
}

function clearAuthMessages() {
  if ($('loginMessage')) {
    $('loginMessage').textContent = '';
  }

  if ($('signupMessage')) {
    $('signupMessage').textContent = '';
  }
}

function setAuthMessage(type, message) {
  const id =
    type === 'signup'
      ? 'signupMessage'
      : 'loginMessage';

  const element = $(id);

  if (!element) return;

  element.textContent = message;
  element.className = `auth-message ${type}`;
}


/* =========================================================
   LOGIN
========================================================= */

async function login() {
  const email = $('loginEmail')?.value.trim();
  const password = $('loginPassword')?.value;

  if (!email || !password) {
    setAuthMessage(
      'login',
      'Preencha seu e-mail e sua senha.'
    );

    return;
  }

  if (!sb) {
    setAuthMessage(
      'login',
      'Não foi possível conectar ao Supabase.'
    );

    return;
  }

  setAuthMessage(
    'login',
    'Entrando...'
  );

  try {
    const { data, error } =
      await sb.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    currentUser = data.user;

    await loadUserData();

    openApp();

  } catch (error) {
    console.error(error);

    setAuthMessage(
      'login',
      translateAuthError(error)
    );
  }
}


/* =========================================================
   CADASTRO
========================================================= */

async function signup() {
  const name =
    $('signupName')?.value.trim();

  const email =
    $('signupEmail')?.value.trim();

  const password =
    $('signupPassword')?.value;

  if (!name || !email || !password) {
    setAuthMessage(
      'signup',
      'Preencha todos os campos.'
    );

    return;
  }

  if (password.length < 6) {
    setAuthMessage(
      'signup',
      'A senha precisa ter pelo menos 6 caracteres.'
    );

    return;
  }

  if (!sb) {
    setAuthMessage(
      'signup',
      'Não foi possível conectar ao Supabase.'
    );

    return;
  }

  setAuthMessage(
    'signup',
    'Criando sua conta...'
  );

  try {
    const { data, error } =
      await sb.auth.signUp({
        email,
        password,

        options: {
          data: {
            full_name: name
          }
        }
      });

    if (error) {
      throw error;
    }

    /*
      Se a confirmação de e-mail estiver desativada,
      o Supabase já entrega uma sessão.
    */

    if (data.session && data.user) {
      currentUser = data.user;

      await loadUserData();

      openApp();

      showToast(
        'Conta criada com sucesso.'
      );

      return;
    }

    setAuthMessage(
      'signup',
      'Conta criada. Verifique seu e-mail para confirmar o cadastro.'
    );

    setTimeout(() => {
      showLogin();
    }, 1500);

  } catch (error) {
    console.error(error);

    setAuthMessage(
      'signup',
      translateAuthError(error)
    );
  }
}

function translateAuthError(error) {
  const message =
    String(error?.message || '').toLowerCase();

  if (message.includes('already registered')) {
    return 'Este e-mail já possui uma conta.';
  }

  if (
    message.includes('invalid login credentials')
  ) {
    return 'E-mail ou senha incorretos.';
  }

  if (
    message.includes('email not confirmed')
  ) {
    return 'Seu e-mail ainda não foi confirmado.';
  }

  if (
    message.includes('failed to fetch') ||
    message.includes('network')
  ) {
    return 'Não foi possível conectar ao Supabase.';
  }

  return error?.message ||
    'Ocorreu um erro. Tente novamente.';
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {
  try {
    if (sb) {
      await sb.auth.signOut();
    }
  } catch (error) {
    console.error(error);
  }

  currentUser = null;
  profile = {};
  settings = {};
  transactions = [];
  goals = [];
  accounts = [];

  closeMenu();

  $('appScreen')?.classList.add('hidden');

  showAuth();

  showToast('Você saiu da sua conta.');
}


/* =========================================================
   ABRIR APP
========================================================= */

function openApp() {
  $('authScreen')?.classList.add('hidden');
  $('appScreen')?.classList.remove('hidden');

  setUserProfile();

  showScreen('home');

  renderHome();
}


/* =========================================================
   DADOS DO USUÁRIO
========================================================= */

async function loadUserData() {
  if (!sb || !currentUser) {
    return;
  }

  try {
    const [
      profileResult,
      settingsResult,
      transactionsResult,
      goalsResult,
      accountsResult
    ] = await Promise.all([

      sb
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle(),

      sb
        .from('settings')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle(),

      sb
        .from('transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('tx_date', {
          ascending: false
        }),

      sb
        .from('goals')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', {
          ascending: false
        }),

      sb
        .from('accounts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', {
          ascending: false
        })

    ]);

    if (profileResult.error) {
      console.error(
        'Erro no perfil:',
        profileResult.error
      );
    }

    if (settingsResult.error) {
      console.error(
        'Erro nas configurações:',
        settingsResult.error
      );
    }

    if (transactionsResult.error) {
      console.error(
        'Erro nas transações:',
        transactionsResult.error
      );
    }

    if (goalsResult.error) {
      console.error(
        'Erro nas metas:',
        goalsResult.error
      );
    }

    if (accountsResult.error) {
      console.error(
        'Erro nas contas:',
        accountsResult.error
      );
    }

    profile =
      profileResult.data || {};

    settings =
      settingsResult.data || {
        salary: 0,
        advance_pct: 0,
        inss_pct: 0,
        assist_pct: 0,
        life: 0,
        negocial: 0,
        card_limit: 0
      };

    transactions =
      transactionsResult.data || [];

    goals =
      goalsResult.data || [];

    accounts =
      accountsResult.data || [];

  } catch (error) {
    console.error(
      'Erro geral ao carregar dados:',
      error
    );

    showToast(
      'Não foi possível carregar seus dados.'
    );
  }
}


/* =========================================================
   PERFIL
========================================================= */

function setUserProfile() {
  const name =
    profile.full_name ||
    currentUser?.user_metadata?.full_name ||
    'Mirela';

  const email =
    currentUser?.email || '';

  if ($('profileName')) {
    $('profileName').textContent =
      name;
  }

  if ($('profileEmail')) {
    $('profileEmail').textContent =
      email;
  }

  if ($('welcomeTitle')) {
    $('welcomeTitle').textContent =
      `Olá, ${name.split(' ')[0]}.`;
  }

  const avatar =
    document.querySelector('.profile-avatar');

  if (avatar) {
    avatar.textContent =
      name.charAt(0).toUpperCase();
  }
}


/* =========================================================
   SALÁRIO
========================================================= */

function calculateSalary() {
  const salary =
    number(settings.salary);

  const advancePct =
    number(settings.advance_pct);

  const inssPct =
    number(settings.inss_pct);

  const assistPct =
    number(settings.assist_pct);

  const life =
    number(settings.life);

  const negocial =
    number(settings.negocial);

  const inss =
    salary * (inssPct / 100);

  const assist =
    salary * (assistPct / 100);

  const liquid =
    salary -
    inss -
    assist -
    life -
    negocial;

  const advance =
    salary * (advancePct / 100);

  const remaining =
    liquid - advance;

  return {
    salary,
    inss,
    assist,
    life,
    negocial,
    liquid,
    advance,
    remaining
  };
}

function renderSalarySettings() {
  const result =
    calculateSalary();

  if ($('grossSalaryInput')) {
    $('grossSalaryInput').value =
      result.salary || '';
  }

  if ($('advancePercentInput')) {
    $('advancePercentInput').value =
      settings.advance_pct ?? 0;
  }

  if ($('inssPercentInput')) {
    $('inssPercentInput').value =
      settings.inss_pct ?? 0;
  }

  if ($('assistentialPercentInput')) {
    $('assistentialPercentInput').value =
      settings.assist_pct ?? 0;
  }

  if ($('lifeInsuranceInput')) {
    $('lifeInsuranceInput').value =
      settings.life ?? 0;
  }

  if ($('negocialInput')) {
    $('negocialInput').value =
      settings.negocial ?? 0;
  }

  if ($('profileNetSalary')) {
    $('profileNetSalary').textContent =
      money(result.liquid);
  }

  if ($('profileAdvance')) {
    $('profileAdvance').textContent =
      money(result.advance);
  }

  if ($('profileRemaining')) {
    $('profileRemaining').textContent =
      money(result.remaining);
  }
}

async function saveSalarySettings() {
  const newSettings = {
    user_id: currentUser.id,

    salary:
      number(
        $('grossSalaryInput')?.value
      ),

    advance_pct:
      number(
        $('advancePercentInput')?.value
      ),

    inss_pct:
      number(
        $('inssPercentInput')?.value
      ),

    assist_pct:
      number(
        $('assistentialPercentInput')?.value
      ),

    life:
      number(
        $('lifeInsuranceInput')?.value
      ),

    negocial:
      number(
        $('negocialInput')?.value
      )
  };

  if (!sb) {
    return;
  }

  const { error } =
    await sb
      .from('settings')
      .upsert(
        newSettings,
        {
          onConflict: 'user_id'
        }
      );

  if (error) {
    console.error(error);

    showToast(
      'Não foi possível salvar as configurações.'
    );

    return;
  }

  settings = {
    ...settings,
    ...newSettings
  };

  renderSalarySettings();

  renderHome();

  showToast(
    'Configuração salarial salva.'
  );
}


/* =========================================================
   HOME
========================================================= */

function getCurrentMonthTransactions() {
  const month =
    new Date()
      .toISOString()
      .slice(0, 7);

  return transactions.filter(tx =>
    String(
      tx.tx_date || tx.date || ''
    ).slice(0, 7) === month
  );
}

function calculateMonth() {
  const monthTx =
    getCurrentMonthTransactions();

  let income = 0;
  let expense = 0;
  let investment = 0;

  monthTx.forEach(tx => {
    const value =
      number(tx.amount);

    if (tx.type === 'income') {
      income += value;
    }

    if (tx.type === 'expense') {
      expense += value;
    }

    if (tx.type === 'investment') {
      investment += value;
    }
  });

  return {
    income,
    expense,
    investment
  };
}

function renderHome() {
  const month =
    calculateMonth();

  const salary =
    calculateSalary();

  const available =
    salary.liquid +
    month.income -
    month.expense -
    month.investment;

  if ($('homeBalance')) {
    $('homeBalance').textContent =
      money(available);
  }

  if ($('homeSalaryReference')) {
    $('homeSalaryReference').textContent =
      money(salary.liquid);
  }

  if ($('homeIncome')) {
    $('homeIncome').textContent =
      money(month.income);
  }

  if ($('homeExpense')) {
    $('homeExpense').textContent =
      money(month.expense);
  }

  if ($('homeInvestment')) {
    $('homeInvestment').textContent =
      money(month.investment);
  }

  if ($('homeGoals')) {
    $('homeGoals').textContent =
      goals.length;
  }

  if ($('monthIncomeValue')) {
    $('monthIncomeValue').textContent =
      money(month.income);
  }

  if ($('monthExpenseValue')) {
    $('monthExpenseValue').textContent =
      money(month.expense);
  }

  const max =
    Math.max(
      month.income,
      month.expense,
      1
    );

  if ($('monthIncomeBar')) {
    $('monthIncomeBar').style.width =
      `${Math.min(
        100,
        (month.income / max) * 100
      )}%`;
  }

  if ($('monthExpenseBar')) {
    $('monthExpenseBar').style.width =
      `${Math.min(
        100,
        (month.expense / max) * 100
      )}%`;
  }

  const count =
    getCurrentMonthTransactions().length;

  if ($('monthLaunchCount')) {
    $('monthLaunchCount').textContent =
      `${count} lançamento${count === 1 ? '' : 's'}`;
  }

  renderRecentTransactions();
}

function renderRecentTransactions() {
  const container =
    $('recentTransactions');

  if (!container) return;

  const list =
    getCurrentMonthTransactions()
      .slice(0, 5);

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        Ainda não há lançamentos neste mês.
      </div>
    `;

    return;
  }

  container.innerHTML =
    list.map(transactionHTML).join('');
}


/* =========================================================
   TRANSAÇÕES
========================================================= */

function transactionHTML(tx) {
  const type =
    tx.type || 'expense';

  const symbol =
    type === 'income'
      ? '+'
      : type === 'investment'
        ? '↗'
        : '−';

  const amountClass =
    type === 'income'
      ? 'income'
      : type === 'expense'
        ? 'expense'
        : 'investment';

  const date =
    tx.tx_date ||
    tx.date ||
    '';

  return `
    <div class="transaction-item">

      <div class="transaction-icon">
        ${symbol}
      </div>

      <div class="transaction-info">

        <strong>
          ${escapeHtml(
            tx.description ||
            tx.category ||
            'Lançamento'
          )}
        </strong>

        <small>
          ${escapeHtml(
            tx.category ||
            'Outros'
          )}

          ${
            date
              ? ` · ${new Date(
                  `${date}T12:00:00`
                ).toLocaleDateString(
                  'pt-BR'
                )}`
              : ''
          }
        </small>

      </div>

      <strong class="transaction-value ${amountClass}">
        ${type === 'income' ? '+' : '-'}
        ${money(tx.amount)}
      </strong>

    </div>
  `;
}

function renderTransactions() {
  const container =
    $('transactionsList');

  if (!container) return;

  let list =
    [...transactions];

  if (
    currentTransactionFilter !== 'all'
  ) {
    list =
      list.filter(
        tx =>
          tx.type ===
          currentTransactionFilter
      );
  }

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        Nenhum lançamento encontrado.
      </div>
    `;

    return;
  }

  container.innerHTML =
    list.map(transactionHTML)
      .join('');
}

function openTransactionModal() {
  const overlay =
    $('modalOverlay');

  const content =
    $('modalContent');

  if (!overlay || !content) return;

  content.innerHTML = `

    <div class="modal-header">

      <div>
        <span class="eyebrow">
          MOVIMENTAÇÃO
        </span>

        <h2>
          Novo lançamento
        </h2>
      </div>

      <button
        type="button"
        class="modal-close"
        data-close-modal
      >
        ×
      </button>

    </div>


    <form id="transactionModalForm">

      <label>
        Tipo
      </label>

      <select
        id="transactionType"
        required
      >
        <option value="expense">
          Despesa
        </option>

        <option value="income">
          Receita
        </option>

        <option value="investment">
          Investimento
        </option>
      </select>


      <label>
        Valor
      </label>

      <input
        id="transactionAmount"
        type="number"
        min="0"
        step="0.01"
        placeholder="0,00"
        required
      >


      <label>
        Categoria
      </label>

      <input
        id="transactionCategory"
        type="text"
        placeholder="Ex.: Alimentação"
        required
      >


      <label>
        Descrição
      </label>

      <input
        id="transactionDescription"
        type="text"
        placeholder="Ex.: supermercado"
      >


      <label>
        Data
      </label>

      <input
        id="transactionDate"
        type="date"
        value="${today()}"
        required
      >


      <button
        type="submit"
        class="primary-button full-width"
      >
        Salvar lançamento
      </button>

    </form>
  `;

  overlay.classList.remove('hidden');

  $('transactionModalForm')
    ?.addEventListener(
      'submit',
      async event => {

        event.preventDefault();

        await saveTransaction();

      }
    );
}

async function saveTransaction() {
  const transaction = {
    user_id:
      currentUser.id,

    type:
      $('transactionType').value,

    amount:
      number(
        $('transactionAmount').value
      ),

    category:
      $('transactionCategory')
        .value
        .trim() ||
      'Outros',

    description:
      $('transactionDescription')
        .value
        .trim(),

    tx_date:
      $('transactionDate')
        .value
  };

  if (!transaction.amount) {
    showToast(
      'Informe um valor.'
    );

    return;
  }

  if (!sb) {
    return;
  }

  const { error } =
    await sb
      .from('transactions')
      .insert(transaction);

  if (error) {
    console.error(error);

    showToast(
      'Não foi possível salvar o lançamento.'
    );

    return;
  }

  closeModal();

  await loadUserData();

  renderHome();
  renderTransactions();

  showToast(
    'Lançamento salvo.'
  );
}


/* =========================================================
   METAS
========================================================= */

function renderGoals() {
  const container =
    $('goalsList');

  if (!container) return;

  if (!goals.length) {
    container.innerHTML = `
      <div class="empty-state">
        Você ainda não possui metas.
      </div>
    `;

    return;
  }

  container.innerHTML =
    goals.map(goal => {

      const target =
        number(goal.target);

      const saved =
        number(goal.saved);

      const percent =
        target > 0
          ? Math.min(
              100,
              (saved / target) * 100
            )
          : 0;

      return `
        <div class="goal-card">

          <div class="goal-header">

            <div>
              <span class="eyebrow">
                META
              </span>

              <h3>
                ${escapeHtml(
                  goal.name
                )}
              </h3>
            </div>

            <strong>
              ${Math.round(
                percent
              )}%
            </strong>

          </div>

          <div class="goal-values">

            <span>
              ${money(saved)}
            </span>

            <span>
              ${money(target)}
            </span>

          </div>

          <div class="progress-track">

            <div
              class="progress-fill"
              style="width:${percent}%"
            ></div>

          </div>

        </div>
      `;

    }).join('');
}

function openGoalModal() {
  const overlay =
    $('modalOverlay');

  const content =
    $('modalContent');

  if (!overlay || !content) return;

  content.innerHTML = `

    <div class="modal-header">

      <div>
        <span class="eyebrow">
          PLANEJAMENTO
        </span>

        <h2>
          Nova meta
        </h2>
      </div>

      <button
        type="button"
        class="modal-close"
        data-close-modal
      >
        ×
      </button>

    </div>


    <form id="goalModalForm">

      <label>
        Nome da meta
      </label>

      <input
        id="goalName"
        type="text"
        placeholder="Ex.: Viagem"
        required
      >


      <label>
        Valor objetivo
      </label>

      <input
        id="goalTarget"
        type="number"
        min="0"
        step="0.01"
        placeholder="0,00"
        required
      >


      <label>
        Valor já guardado
      </label>

      <input
        id="goalSaved"
        type="number"
        min="0"
        step="0.01"
        value="0"
      >


      <button
        type="submit"
        class="primary-button full-width"
      >
        Criar meta
      </button>

    </form>
  `;

  overlay.classList.remove('hidden');

  $('goalModalForm')
    ?.addEventListener(
      'submit',
      async event => {

        event.preventDefault();

        await saveGoal();

      }
    );
}

async function saveGoal() {
  const goal = {
    user_id:
      currentUser.id,

    name:
      $('goalName')
        .value
        .trim(),

    target:
      number(
        $('goalTarget')
          .value
      ),

    saved:
      number(
        $('goalSaved')
          .value
      )
  };

  if (!goal.name || !goal.target) {
    showToast(
      'Preencha nome e valor da meta.'
    );

    return;
  }

  const { error } =
    await sb
      .from('goals')
      .insert(goal);

  if (error) {
    console.error(error);

    showToast(
      'Não foi possível criar a meta.'
    );

    return;
  }

  closeModal();

  await loadUserData();

  renderGoals();
  renderHome();

  showToast(
    'Meta criada com sucesso.'
  );
}


/* =========================================================
   NAVEGAÇÃO
========================================================= */

function showScreen(screenName) {
  document
    .querySelectorAll('.app-page')
    .forEach(page => {
      page.classList.remove(
        'active-page'
      );
    });

  const target =
    $(`${screenName}Screen`);

  if (target) {
    target.classList.add(
      'active-page'
    );
  }

  document
    .querySelectorAll(
      '[data-screen]'
    )
    .forEach(button => {

      button.classList.toggle(
        'active',
        button.dataset.screen ===
          screenName
      );

    });

  closeMenu();

  if (screenName === 'home') {
    renderHome();
  }

  if (
    screenName ===
    'transactions'
  ) {
    renderTransactions();
  }

  if (
    screenName ===
    'goals'
  ) {
    renderGoals();
  }

  if (
    screenName ===
    'profile'
  ) {
    renderSalarySettings();
    setUserProfile();
  }
}


/* =========================================================
   MENU
========================================================= */

function openMenu() {
  $('sideMenu')
    ?.classList.add('open');

  $('menuOverlay')
    ?.classList.add('open');
}

function closeMenu() {
  $('sideMenu')
    ?.classList.remove('open');

  $('menuOverlay')
    ?.classList.remove('open');
}


/* =========================================================
   MODAL
========================================================= */

function closeModal() {
  $('modalOverlay')
    ?.classList.add('hidden');
}


/* =========================================================
   PIN
========================================================= */

function configurePin() {
  const pin =
    prompt(
      'Digite um PIN de 4 dígitos:'
    );

  if (!/^\d{4}$/.test(pin || '')) {
    showToast(
      'O PIN precisa ter exatamente 4 dígitos.'
    );

    return;
  }

  localStorage.setItem(
    'makariaPin',
    pin
  );

  showToast(
    'PIN configurado.'
  );
}

function lockApp() {
  localStorage.setItem(
    'makariaLocked',
    '1'
  );

  location.reload();
}


/* =========================================================
   BLOQUEIO POR PIN
========================================================= */

function checkPinLock() {
  const locked =
    localStorage.getItem(
      'makariaLocked'
    ) === '1';

  const pin =
    localStorage.getItem(
      'makariaPin'
    );

  if (!locked || !pin) {
    return false;
  }

  const authScreen =
    $('authScreen');

  if (!authScreen) {
    return false;
  }

  authScreen.innerHTML = `

    <div class="auth-brand">

      <img
        src="logo.svg"
        alt="Makaria"
      >

      <div class="brand-name">
        MAKARIA
      </div>

      <div class="brand-tagline">
        onde prosperidade encontra plenitude.
      </div>

    </div>

    <div class="auth-card">

      <h1>
        Acesso protegido
      </h1>

      <p class="auth-description">
        Digite seu PIN para continuar.
      </p>

      <input
        id="unlockPin"
        type="password"
        inputmode="numeric"
        maxlength="4"
        placeholder="••••"
      >

      <button
        type="button"
        id="unlockButton"
        class="primary-button"
      >
        Desbloquear
      </button>

      <button
        type="button"
        id="logoutFromLock"
        class="text-button"
      >
        Sair da conta
      </button>

    </div>
  `;

  authScreen.classList.remove(
    'hidden'
  );

  $('appScreen')
    ?.classList.add(
      'hidden'
    );

  $('unlockButton')
    ?.addEventListener(
      'click',
      unlockWithPin
    );

  $('logoutFromLock')
    ?.addEventListener(
      'click',
      logout
    );

  return true;
}

async function unlockWithPin() {
  const entered =
    $('unlockPin')
      ?.value;

  const saved =
    localStorage.getItem(
      'makariaPin'
    );

  if (entered !== saved) {
    showToast(
      'PIN incorreto.'
    );

    return;
  }

  localStorage.removeItem(
    'makariaLocked'
  );

  if (sb) {
    const { data } =
      await sb.auth.getSession();

    if (data?.session?.user) {
      currentUser =
        data.session.user;

      await loadUserData();

      openApp();

      return;
    }
  }

  showAuth();
}


/* =========================================================
   EVENTOS
========================================================= */

function bindEvents() {

  $('showSignupButton')
    ?.addEventListener(
      'click',
      showSignup
    );

  $('showLoginButton')
    ?.addEventListener(
      'click',
      showLogin
    );

  $('loginForm')
    ?.addEventListener(
      'submit',
      event => {
        event.preventDefault();
        login();
      }
    );

  $('signupForm')
    ?.addEventListener(
      'submit',
      event => {
        event.preventDefault();
        signup();
      }
    );

  $('menuButton')
    ?.addEventListener(
      'click',
      openMenu
    );

  $('closeMenuButton')
    ?.addEventListener(
      'click',
      closeMenu
    );

  $('menuOverlay')
    ?.addEventListener(
      'click',
      closeMenu
    );

  $('logoutButton')
    ?.addEventListener(
      'click',
      logout
    );

  $('profileLogoutButton')
    ?.addEventListener(
      'click',
      logout
    );

  $('lockButton')
    ?.addEventListener(
      'click',
      lockApp
    );

  $('configurePinButton')
    ?.addEventListener(
      'click',
      configurePin
    );

  $('autoLockButton')
    ?.addEventListener(
      'click',
      lockApp
    );

  $('saveSalaryButton')
    ?.addEventListener(
      'click',
      saveSalarySettings
    );

  $('addTransactionButton')
    ?.addEventListener(
      'click',
      openTransactionModal
    );

  $('floatingAddButton')
    ?.addEventListener(
      'click',
      openTransactionModal
    );

  $('addGoalButton')
    ?.addEventListener(
      'click',
      openGoalModal
    );

  $('modalOverlay')
    ?.addEventListener(
      'click',
      event => {

        if (
          event.target ===
          $('modalOverlay')
        ) {
          closeModal();
        }

      }
    );

  document
    .querySelectorAll(
      '[data-close-modal]'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        closeModal
      );
    });

  document
    .querySelectorAll(
      '[data-screen]'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          showScreen(
            button.dataset.screen
          );

        }
      );

    });

  document
    .querySelectorAll(
      '[data-filter]'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          currentTransactionFilter =
            button.dataset.filter;

          document
            .querySelectorAll(
              '[data-filter]'
            )
            .forEach(item => {
              item.classList.toggle(
                'active',
                item.dataset.filter ===
                  currentTransactionFilter
              );
            });

          renderTransactions();

        }
      );

    });
}


/* =========================================================
   LOGIN / SESSION
========================================================= */

function showLogin() {
  $('signupCard')
    ?.classList.add(
      'hidden'
    );

  $('loginCard')
    ?.classList.remove(
      'hidden'
    );

  clearAuthMessages();

  setTimeout(() => {
    $('loginEmail')?.focus();
  }, 100);
}

async function restoreSession() {

  /*
    IMPORTANTE:
    a tela de login é liberada primeiro.
    Assim o app nunca fica preso no splash
    caso a rede demore para responder.
  */

  showAuth();

  hideSplash();

  if (!sb) {
    console.error(
      'Biblioteca do Supabase não carregada.'
    );

    return;
  }

  try {

    const {
      data,
      error
    } =
      await sb.auth.getSession();

    if (error) {
      console.error(
        'Erro ao recuperar sessão:',
        error
      );

      return;
    }

    if (
      data?.session?.user
    ) {

      currentUser =
        data.session.user;

      await loadUserData();

      openApp();

    }

  } catch (error) {

    console.error(
      'Erro ao verificar sessão:',
      error
    );

    /*
      Mesmo que o Supabase falhe,
      o login continua disponível.
    */

    showAuth();

  }
}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function init() {

  bindEvents();

  /*
    Primeiro verificamos se há PIN.
  */

  const pinLocked =
    checkPinLock();

  if (pinLocked) {
    hideSplash();
    return;
  }

  /*
    Depois liberamos imediatamente
    a tela de autenticação.
  */

  await restoreSession();
}


window.addEventListener(
  'DOMContentLoaded',
  init
);
