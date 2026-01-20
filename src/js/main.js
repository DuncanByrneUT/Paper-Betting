// =============================================
// CONFIG & STATE
// =============================================
const API_KEY = 'f2ae926aacf54a1862ddd8e938b514c8';
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
const REGIONS = 'us';
const MARKETS = 'h2h,spreads,totals';

let credits = Number(localStorage.getItem('paperBettingCredits')) || 1000;
localStorage.setItem('paperBettingCredits', credits);

let selectedBets = [];

// =============================================
// DOM Elements
// =============================================
const creditsDisplay = document.getElementById('credits-display');
const editBtn = document.getElementById('edit-credits-btn');
const editForm = document.getElementById('edit-credits-form');
const creditsInput = document.getElementById('credits-input');
const saveCredits = document.getElementById('save-credits');
const cancelCredits = document.getElementById('cancel-credits');
const themeToggle = document.getElementById('theme-toggle');

// Init credits display
if (creditsDisplay) creditsDisplay.textContent = credits;

// =============================================
// Dark Mode Toggle
// =============================================
function setTheme(mode) {
    document.body.className = mode + '-mode';
    themeToggle.textContent = mode === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme', mode);
}

const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        setTheme(current === 'dark' ? 'light' : 'dark');
    });
}

// =============================================
// Edit Credits Functionality
// =============================================
if (editBtn) {
    editBtn.addEventListener('click', () => {
        editForm.style.display = 'block';
        editBtn.style.display = 'none';
        creditsInput.value = credits;
    });
}

if (saveCredits) {
    saveCredits.addEventListener('click', () => {
        const newCredits = Number(creditsInput.value);
        if (isNaN(newCredits) || newCredits < 0 || newCredits > 999999) {
            alert('Please enter a number between 0 and 999,999.');
            return;
        }
        credits = newCredits;
        localStorage.setItem('paperBettingCredits', credits);
        creditsDisplay.textContent = credits;
        editForm.style.display = 'none';
        editBtn.style.display = 'inline-block';
    });
}

if (cancelCredits) {
    cancelCredits.addEventListener('click', () => {
        editForm.style.display = 'none';
        editBtn.style.display = 'inline-block';
    });
}

// =============================================
// Fetch list of available sports → populate dropdown
// =============================================
async function fetchSportsList() {
    try {
        const url = `${ODDS_API_BASE}/sports?apiKey=${API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Sports list API error: ${response.status}`);

        const data = await response.json();
        const select = document.getElementById('sport-select');

        // Clear and add default
        select.innerHTML = '<option value="upcoming">All Upcoming (Mixed Sports)</option>';

        // Add real active sports
        data.forEach(sport => {
            if (sport.active) {
                const option = document.createElement('option');
                option.value = sport.key;
                option.textContent = sport.title || sport.key.replace(/_/g, ' ').toUpperCase();
                select.appendChild(option);
            }
        });

        // Listen for change
        select.addEventListener('change', (e) => {
            fetchRealGames(e.target.value);
        });
    } catch (err) {
        console.error('Failed to load sports list:', err);
        // Fallback hardcoded options
        const select = document.getElementById('sport-select');
        select.innerHTML = '<option value="upcoming">All Upcoming (Mixed Sports)</option>';
        ['basketball_nba', 'americanfootball_nfl', 'soccer_epl', 'baseball_mlb'].forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key.replace(/_/g, ' ').toUpperCase();
            select.appendChild(option);
        });
    }
}

// =============================================
// Fetch odds for selected sport
// =============================================
async function fetchRealGames(sportKey = 'upcoming') {
    const container = document.getElementById('games-container');
    if (!container) return;

    container.innerHTML = `<p style="text-align: center; color: #1493ff; font-size: 1.1rem;">
        Loading games for ${sportKey === 'upcoming' ? 'All Upcoming' : sportKey.replace(/_/g, ' ').toUpperCase()}...
    </p>`;

    try {
        const url = `${ODDS_API_BASE}/sports/${sportKey}/odds/?apiKey=${API_KEY}&regions=${REGIONS}&markets=${MARKETS}`;
        const response = await fetch(url);

        console.log('API Response Status:', response.status);
        console.log('Quota remaining:', response.headers.get('x-requests-remaining'));

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${errorText || response.statusText}`);
        }

        const data = await response.json();

        if (data.length === 0) {
            container.innerHTML = `
                <p style="text-align: center; color: #f87171; font-size: 1.2rem; padding: 40px 20px;">
                    No upcoming or live games available for this sport right now.<br>
                    Try a different sport or check back later!
                </p>
            `;
            return;
        }

        const realGames = data.map((event, index) => {
            const home = event.home_team;
            const away = event.away_team;
            const book = event.bookmakers?.[0] || {};

            const h2h = book.markets?.find(m => m.key === 'h2h') || {};
            const moneyline = {
                [home.toLowerCase()]: h2h.outcomes?.find(o => o.name === home)?.price || 'N/A',
                [away.toLowerCase()]: h2h.outcomes?.find(o => o.name === away)?.price || 'N/A'
            };

            const spreadsM = book.markets?.find(m => m.key === 'spreads') || {};
            const spreads = spreadsM.outcomes?.map(o => ({
                side: o.name,
                point: o.point,
                odds: o.price
            })) || [];

            const totalsM = book.markets?.find(m => m.key === 'totals') || {};
            const totals = totalsM.outcomes?.map(o => ({
                side: o.name,
                point: o.point,
                odds: o.price
            })) || [];

            return {
                id: index + 1,
                sport: event.sport_title || 'Unknown',
                matchup: `${home} vs ${away}`,
                time: new Date(event.commence_time).toLocaleString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                }),
                moneyline,
                spreads,
                totals
            };
        });

        renderGames(realGames);
    } catch (err) {
        console.error('Fetch failed:', err);
        container.innerHTML = `
            <p style="text-align: center; color: #f87171; font-size: 1.1rem; padding: 40px 20px;">
                Error loading real odds: ${err.message}<br>
                Showing demo fallback games.
            </p>
        `;
        renderGames(getFallbackGames());
    }
}

// =============================================
// Fallback fake games
// =============================================
function getFallbackGames() {
    return [
        {
            id: 1,
            sport: "NBA",
            matchup: "Lakers vs Celtics",
            time: "Today 8:00 PM",
            moneyline: { lakers: -150, celtics: +130 },
            spreads: [{side: 'Lakers', point: -4.5, odds: -110}, {side: 'Celtics', point: +4.5, odds: -110}],
            totals: [{side: 'Over', point: 225.5, odds: -110}, {side: 'Under', point: 225.5, odds: -110}]
        },
        {
            id: 2,
            sport: "NFL",
            matchup: "Chiefs vs Eagles",
            time: "Tomorrow 4:25 PM",
            moneyline: { chiefs: -180, eagles: +155 },
            spreads: [{side: 'Chiefs', point: -5.5, odds: -110}, {side: 'Eagles', point: +5.5, odds: -110}],
            totals: [{side: 'Over', point: 47.5, odds: -110}, {side: 'Under', point: 47.5, odds: -110}]
        },
        {
            id: 3,
            sport: "Soccer – EPL",
            matchup: "Man City vs Arsenal",
            time: "Sat 10:00 AM",
            moneyline: { mancity: -120, arsenal: +100 },
            spreads: [],
            totals: []
        }
    ];
}

// =============================================
// Render games with clickable odds
// =============================================
function renderGames(gamesList) {
    const container = document.getElementById('games-container');
    if (!container) return;

    container.innerHTML = '';

    gamesList.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';

        const teams = game.matchup.split(' vs ');
        const team1 = teams[0];
        const team2 = teams[1] || 'Opponent';

        let mlHTML = `
            <div style="margin-top: 16px;">
                <strong>Moneyline:</strong><br>
                <button class="odds-btn" data-game-id="${game.id}" data-type="moneyline" data-side="${team1.toLowerCase()}" data-odds="${game.moneyline[team1.toLowerCase()]}">
                    ${team1}: ${game.moneyline[team1.toLowerCase()]}
                </button>
                <button class="odds-btn" data-game-id="${game.id}" data-type="moneyline" data-side="${team2.toLowerCase()}" data-odds="${game.moneyline[team2.toLowerCase()]}">
                    ${team2}: ${game.moneyline[team2.toLowerCase()]}
                </button>
            </div>
        `;

        let spreadHTML = game.spreads.length > 0 ? `
            <div style="margin-top: 20px;">
                <strong>Spreads:</strong><br>
                ${game.spreads.map(s => `
                    <button class="odds-btn" data-game-id="${game.id}" data-type="spread" data-side="${s.side}" data-point="${s.point}" data-odds="${s.odds}">
                        ${s.side} ${s.point}: ${s.odds}
                    </button>
                `).join('')}
            </div>
        ` : '';

        let totalHTML = game.totals.length > 0 ? `
            <div style="margin-top: 20px;">
                <strong>Totals:</strong><br>
                ${game.totals.map(t => `
                    <button class="odds-btn" data-game-id="${game.id}" data-type="total" data-side="${t.side}" data-point="${t.point}" data-odds="${t.odds}">
                        ${t.side} ${t.point}: ${t.odds}
                    </button>
                `).join('')}
            </div>
        ` : '';

        card.innerHTML = `
            <div class="game-header">
                <div class="team-names">${game.matchup}</div>
                <div class="odds">${game.time}</div>
            </div>
            <p>Sport: ${game.sport}</p>
            ${mlHTML}
            ${spreadHTML}
            ${totalHTML}
        `;

        container.appendChild(card);
    });

    // Add click listeners to odds buttons
    document.querySelectorAll('.odds-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bet = {
                gameId: e.target.dataset.gameId,
                type: e.target.dataset.type,
                side: e.target.dataset.side,
                point: e.target.dataset.point || null,
                odds: Number(e.target.dataset.odds),
                description: e.target.textContent.trim()
            };

            // Prevent duplicate
            if (selectedBets.some(b => b.gameId === bet.gameId && b.type === bet.type && b.side === bet.side && b.point === bet.point)) {
                alert('This selection is already in your bet slip!');
                return;
            }

            selectedBets.push(bet);
            updateBetSlip();
        });
    });
}

// =============================================
// Bet Slip Functions
// =============================================
function updateBetSlip() {
    const slip = document.getElementById('selected-bets');
    slip.innerHTML = '';

    if (selectedBets.length === 0) {
        slip.innerHTML = '<p style="text-align: center; color: #64748b;">Your bet slip is empty</p>';
        document.getElementById('place-bet-btn').disabled = true;
        updatePayout();
        return;
    }

    selectedBets.forEach((bet, index) => {
        const item = document.createElement('div');
        item.className = 'selected-bet';
        item.innerHTML = `
            <div>
                <strong>${bet.description}</strong><br>
                <small>${bet.type.toUpperCase()} - Game #${bet.gameId}</small>
            </div>
            <button class="remove-bet" data-index="${index}">X</button>
        `;
        slip.appendChild(item);
    });

    document.querySelectorAll('.remove-bet').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = Number(e.target.dataset.index);
            selectedBets.splice(index, 1);
            updateBetSlip();
        });
    });

    document.getElementById('place-bet-btn').disabled = false;
    updatePayout();
}

function updatePayout() {
    if (selectedBets.length === 0) {
        document.getElementById('total-odds').textContent = '1.00';
        document.getElementById('potential-payout').textContent = '0.00';
        return;
    }

    const decimalOdds = selectedBets.map(bet => {
        const o = bet.odds;
        return o > 0 ? (o / 100 + 1) : (100 / Math.abs(o) + 1);
    });

    const totalDecimal = decimalOdds.reduce((a, b) => a * b, 1);
    const stake = Number(document.getElementById('stake-input').value) || 0;
    const payout = (stake * totalDecimal).toFixed(2);

    const totalAmerican = totalDecimal > 2 ? ((totalDecimal - 1) * 100).toFixed(0) : (-100 / (totalDecimal - 1)).toFixed(0);

    document.getElementById('total-odds').textContent = totalDecimal.toFixed(2) + ` (${totalAmerican > 0 ? '+' : ''}${totalAmerican})`;
    document.getElementById('potential-payout').textContent = payout;
}

document.getElementById('stake-input')?.addEventListener('input', updatePayout);

document.getElementById('place-bet-btn')?.addEventListener('click', () => {
    const stake = Number(document.getElementById('stake-input').value);
    if (stake <= 0 || stake > credits) {
        alert('Invalid stake – must be between 1 and your current credits.');
        return;
    }

    credits -= stake;
    localStorage.setItem('paperBettingCredits', credits);
    creditsDisplay.textContent = credits;

    alert(`Bet placed! ${stake} credits risked on ${selectedBets.length}-leg parlay.\n(Outcome simulation coming next!)`);

    selectedBets = [];
    updateBetSlip();
});

document.getElementById('clear-bets-btn')?.addEventListener('click', () => {
    if (confirm('Clear all selections?')) {
        selectedBets = [];
        updateBetSlip();
    }
});

// =============================================
// Initialize the app
// =============================================
async function initializeApp() {
    try {
        await fetchSportsList();
        await fetchRealGames('upcoming');
    } catch (err) {
        console.error('App initialization failed:', err);
        if (document.getElementById('games-container')) {
            document.getElementById('games-container').innerHTML = 
                '<p style="text-align:center;color:#ef4444;">Failed to load games. Check console for details.</p>';
        }
    }
}

initializeApp();

console.log(`Paper Betting App loaded – Credits: ${credits}`);