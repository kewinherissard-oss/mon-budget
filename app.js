'use strict';

/* ── Constantes ────────────────────────────────────────── */
const STORAGE_KEY = 'monbudget_transactions';

const CAT_COLORS = {
  alimentation: '#f97316',
  logement:     '#6c63ff',
  transport:    '#2563eb',
  loisirs:      '#a855f7',
  sante:        '#22c55e',
  autres:       '#94a3b8',
};

const CAT_LABELS = {
  alimentation: 'Alimentation',
  logement:     'Logement',
  transport:    'Transport',
  loisirs:      'Loisirs',
  sante:        'Santé',
  autres:       'Autres',
};

/* ── État ──────────────────────────────────────────────── */
let transactions = load();

/* ── Persistance ───────────────────────────────────────── */
function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function genId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

/* ── Mutations ─────────────────────────────────────────── */
function addTransaction(data) {
  transactions.push({ id: genId(), ...data });
  save();
  render();
}

function deleteTransaction(id) {
  if (!confirm('Supprimer cette transaction ?')) return;
  transactions = transactions.filter(t => t.id !== id);
  save();
  render();
}

/* ── Formatage ─────────────────────────────────────────── */
function formatAmount(n) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/* ── Filtres ───────────────────────────────────────────── */
function getFiltered() {
  const type = document.getElementById('fil-type').value;
  const cat  = document.getElementById('fil-categorie').value;
  const mois = document.getElementById('fil-mois').value;   // "YYYY-MM"

  return transactions
    .filter(t => !type || t.type === type)
    .filter(t => !cat  || t.categorie === cat)
    .filter(t => !mois || t.date.startsWith(mois))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/* ── Rendu : résumé ────────────────────────────────────── */
function renderSummary() {
  const revenus   = transactions.filter(t => t.type === 'revenu').reduce((s, t) => s + t.montant, 0);
  const depenses  = transactions.filter(t => t.type === 'depense').reduce((s, t) => s + t.montant, 0);
  const solde     = revenus - depenses;

  const elSolde = document.getElementById('val-solde');
  elSolde.textContent = formatAmount(solde);
  elSolde.className = 'card-value' + (solde > 0 ? ' positive' : solde < 0 ? ' negative' : '');

  document.getElementById('val-revenus').textContent  = formatAmount(revenus);
  document.getElementById('val-depenses').textContent = formatAmount(depenses);
}

/* ── Rendu : graphique en camembert ────────────────────── */
function renderChart() {
  const canvas = document.getElementById('chart');
  const ctx    = canvas.getContext('2d');

  canvas.width  = canvas.offsetWidth || 360;
  canvas.height = 320;

  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Agréger les dépenses par catégorie
  const map = {};
  transactions
    .filter(t => t.type === 'depense')
    .forEach(t => { map[t.categorie] = (map[t.categorie] || 0) + t.montant; });

  const data = Object.entries(map)
    .map(([cat, total]) => ({ cat, total }))
    .sort((a, b) => b.total - a.total);

  // Pas de données
  if (data.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Aucune dépense à afficher', W / 2, H / 2);
    return;
  }

  const total = data.reduce((s, d) => s + d.total, 0);

  // Zone camembert : moitié haute
  const LEGEND_H = 28 * data.length;
  const pieAreaH = H - LEGEND_H - 16;
  const cx = W / 2;
  const cy = pieAreaH / 2;
  const radius = Math.min(cx, cy) - 12;

  // Dessiner les secteurs
  let startAngle = -Math.PI / 2;
  data.forEach(d => {
    const slice = (d.total / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = CAT_COLORS[d.cat] || '#94a3b8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pourcentage dans le secteur (si secteur assez grand)
    if (slice > 0.25) {
      const midAngle = startAngle + slice / 2;
      const tx = cx + (radius * 0.65) * Math.cos(midAngle);
      const ty = cy + (radius * 0.65) * Math.sin(midAngle);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round((d.total / total) * 100) + '%', tx, ty);
    }

    startAngle += slice;
  });

  // Légende sous le camembert
  const legendTop = pieAreaH + 8;
  data.forEach((d, i) => {
    const y = legendTop + i * 28;
    // Carré de couleur
    ctx.fillStyle = CAT_COLORS[d.cat] || '#94a3b8';
    ctx.beginPath();
    ctx.roundRect(16, y + 4, 14, 14, 3);
    ctx.fill();
    // Label
    ctx.fillStyle = '#1e293b';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(CAT_LABELS[d.cat] || d.cat, 38, y + 11);
    // Montant
    ctx.fillStyle = '#64748b';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    const amtLabel = d.total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    ctx.fillText(amtLabel, W - 16, y + 11);
  });
}

/* ── Rendu : table ─────────────────────────────────────── */
function renderTable(filtered) {
  const tbody = document.getElementById('transactions-body');
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    tr.innerHTML = '<td colspan="6">Aucune transaction à afficher</td>';
    tbody.appendChild(tr);
    return;
  }

  filtered.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-date">${formatDate(t.date)}</td>
      <td class="td-desc" title="${t.description || ''}">${t.description || '<em style="color:var(--color-muted)">—</em>'}</td>
      <td><span class="badge badge-${t.categorie}">${CAT_LABELS[t.categorie]}</span></td>
      <td><span class="type-badge type-${t.type}">${t.type === 'depense' ? 'Dépense' : 'Revenu'}</span></td>
      <td class="td-amount ${t.type === 'revenu' ? 'income' : 'expense'}">
        ${t.type === 'revenu' ? '+' : '−'} ${formatAmount(t.montant)}
      </td>
      <td>
        <button class="btn btn--danger btn-delete" data-id="${t.id}" title="Supprimer">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ── Rendu global ──────────────────────────────────────── */
function render() {
  renderSummary();
  renderChart();
  renderTable(getFiltered());
}

/* ── Formulaire ────────────────────────────────────────── */
function clearError(fieldId, errId) {
  const f = document.getElementById(fieldId);
  const e = document.getElementById(errId);
  if (f) f.classList.remove('invalid');
  if (e) e.textContent = '';
}

function showError(fieldId, errId, msg) {
  const f = document.getElementById(fieldId);
  const e = document.getElementById(errId);
  if (f) f.classList.add('invalid');
  if (e) e.textContent = msg;
}

document.getElementById('transaction-form').addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;

  const type        = form.type.value;
  const montantRaw  = parseFloat(form.montant.value);
  const categorie   = form.categorie.value;
  const date        = form.date.value;
  const description = form.description.value.trim();

  let valid = true;

  clearError('f-montant',   'err-montant');
  clearError('f-categorie', 'err-categorie');
  clearError('f-date',      'err-date');

  if (isNaN(montantRaw) || montantRaw <= 0) {
    showError('f-montant', 'err-montant', 'Montant invalide (doit être > 0)');
    valid = false;
  }
  if (!categorie) {
    showError('f-categorie', 'err-categorie', 'Veuillez choisir une catégorie');
    valid = false;
  }
  if (!date) {
    showError('f-date', 'err-date', 'Veuillez saisir une date');
    valid = false;
  }

  if (!valid) return;

  addTransaction({ type, montant: montantRaw, categorie, date, description });
  form.reset();
  document.getElementById('f-date').value = todayISO();
});

/* ── Suppression (délégation) ──────────────────────────── */
document.getElementById('transactions-body').addEventListener('click', e => {
  const btn = e.target.closest('.btn-delete');
  if (btn) deleteTransaction(btn.dataset.id);
});

/* ── Filtres ───────────────────────────────────────────── */
['fil-type', 'fil-categorie', 'fil-mois'].forEach(id => {
  document.getElementById(id).addEventListener('change', render);
});

document.getElementById('btn-reset-filters').addEventListener('click', () => {
  document.getElementById('fil-type').value      = '';
  document.getElementById('fil-categorie').value = '';
  document.getElementById('fil-mois').value      = '';
  render();
});

/* ── Utilitaires ───────────────────────────────────────── */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/* ── Redessiner le canvas au redimensionnement ─────────── */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderChart, 120);
});

/* ── Init ──────────────────────────────────────────────── */
document.getElementById('f-date').value = todayISO();
render();
