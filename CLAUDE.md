# Mon Budget — Application de gestion de budget personnel

## Description

Application web de gestion de budget personnel permettant de suivre dépenses et revenus. Interface entièrement en français, design moderne et épuré, sans dépendances externes. Fonctionne en ouvrant `index.html` directement dans un navigateur (protocole `file://`).

## Technologies

- **HTML5** — structure sémantique
- **CSS3** — variables CSS, flexbox/grid, responsive
- **JavaScript pur (ES6+)** — aucun framework, aucune bibliothèque
- **localStorage** — persistance des données (clé `monbudget_transactions`)

## Structure des fichiers

```
Mon-budget/
├── CLAUDE.md
├── index.html      ← structure HTML complète
├── style.css       ← design system et composants
└── app.js          ← logique métier, état, rendu
```

## Fonctionnalités implémentées

### Tableau de bord
- 3 cartes : Solde actuel (coloré vert/rouge selon signe), Total revenus, Total dépenses
- Graphique **camembert** dessiné en Canvas 2D natif (hauteur 320 px) :
  - Secteurs proportionnels au montant, pourcentage affiché dans chaque secteur (si > 0.25 rad)
  - Légende sous le camembert : carré coloré + nom de catégorie + montant
  - Message "Aucune dépense à afficher" si aucune donnée
  - Redimensionnement automatique au resize (debounce 120 ms)

### Formulaire d'ajout
- Champs : type (Dépense/Revenu), montant, catégorie, date (pré-remplie à aujourd'hui), description
- Validation inline : erreurs affichées sous chaque champ invalide (classe `.invalid` + `.field-error`)
- Reset du formulaire après ajout (date conservée à aujourd'hui)

### Historique
- Table triée par date décroissante
- 3 filtres combinables : type, catégorie, mois (`<input type="month">`)
- Bouton "Réinitialiser" pour vider les 3 filtres
- Badge catégorie coloré + badge type coloré sur chaque ligne
- Suppression par délégation d'événement sur `#transactions-body` avec `confirm()` natif

### Persistance
- `load()` / `save()` sur `localStorage` (clé `monbudget_transactions`)
- `genId()` via `crypto.randomUUID()` avec fallback `Date.now()`

## Architecture JS

État centralisé dans un tableau `transactions` (source de vérité unique).  
Toute mutation appelle `save()` puis `render()`.

```
render()
  ├── renderSummary()   → 3 cartes du tableau de bord
  ├── renderChart()     → camembert Canvas 2D
  └── renderTable(getFiltered())  → tbody de la table historique
```

Listeners d'événements :
- `submit` sur `#transaction-form` → `addTransaction()`
- `click` délégué sur `#transactions-body` → `deleteTransaction(id)`
- `change` sur les 3 selects de filtre → `render()`
- `click` sur `#btn-reset-filters` → reset + `render()`
- `resize` window → `renderChart()` (debounce 120 ms)

## Design system (CSS)

Variables dans `:root` :

| Variable | Valeur | Usage |
|---|---|---|
| `--color-primary` | `#6c63ff` | Violet — header, focus, bouton principal |
| `--color-income` | `#22c55e` | Vert — revenus, solde positif |
| `--color-expense` | `#f43f5e` | Rouge — dépenses, solde négatif |
| `--color-bg` | `#f1f5f9` | Fond de page |
| `--color-surface` | `#ffffff` | Fond des cards |

Palette catégories :

| Catégorie | Couleur |
|---|---|
| Alimentation | `#f97316` (orange) |
| Logement | `#6c63ff` (violet) |
| Transport | `#2563eb` (bleu) |
| Loisirs | `#a855f7` (violet clair) |
| Santé | `#22c55e` (vert) |
| Autres | `#94a3b8` (gris) |

Layout principal : `grid` 2 colonnes (`420px 1fr`).  
Breakpoints responsive : `≤ 900px` → 1 colonne, `≤ 560px` → tout en colonne simple.

## Modèle de données (localStorage)

Clé : `monbudget_transactions`

```json
[
  {
    "id": "uuid-v4",
    "type": "depense" | "revenu",
    "montant": 42.50,
    "categorie": "alimentation" | "logement" | "transport" | "loisirs" | "sante" | "autres",
    "date": "2026-05-09",
    "description": "Courses supermarché"
  }
]
```

## Conventions de code

- Pas de bibliothèques tierces
- Pas de commentaires sauf pour délimiter les sections (`/* ── Titre ── */`)
- Fonctions pures pour le formatage (`formatAmount`, `formatDate`, `getFiltered`)
- `render()` est la seule fonction appelée après une mutation — jamais de mise à jour partielle du DOM en dehors de leurs fonctions dédiées
- Canvas redimensionné dynamiquement (`canvas.width = canvas.offsetWidth`) à chaque appel de `renderChart()`
