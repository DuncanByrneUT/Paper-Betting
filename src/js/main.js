// =============================================
// CONFIG
// =============================================
const API_KEY = 'f2ae926aacf54a1862ddd8e938b514c8'; // Your The Odds API key
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
const REGIONS = 'us'; // US bookmakers
const MARKETS = 'h2h,spreads,totals'; // Simplified – only team markets to avoid 422 errors

// Credits setup (fake money)
let credits = Number(localStorage.getItem('paperBettingCredits')) || 1000;
localStorage.setItem('paperBettingCredits', credits);

const creditsDisplay = document.getElementById('credits-display');
if (creditsDisplay) {
    creditsDisplay.textContent = credits;
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

        // Clear existing options except default
        select.innerHTML = '<option value="upcoming">All Upcoming (Mixed Sports)</option>';

        // Add active sports
        data.forEach(sport => {
            if (sport.active) {
                const option = document.createElement('option');
                option.value = sport.key;
                option.textContent = sport.title || sport.key.replace(/_/g, ' ').toUpperCase();
                select.appendChild(option);
            }
        });

        // Listen for dropdown change
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
// Fetch odds for selected sport (or upcoming)
// =============================================
async function fetchRealGames(sportKey = 'upcoming') {
    const container = document.getElementById('games-container');
    if (!container) return;

    container.innerHTML = `<p style="text-align: center; color: #00d084; font-size: 1.1rem;">
        Loading games for ${sportKey === 'upcoming' ? 'All Upcoming' : sportKey.replace(/_/g, ' ').toUpperCase()}...
    </p>`;

    try {
        const url = `${ODDS_API_BASE}/sports/${sportKey}/odds/?apiKey=${API_KEY}&regions=${REGIONS}&markets=${MARKETS}`;
        const response = await fetch(url);

        console.log('API Response Status:', response.status);
        console.log('Quota remaining:', response.headers.get('x-requests-remaining'));
        console.log('Quota used this call:', response.headers.get('x-requests-used'));

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${errorText || response.statusText}`);
        }

        const data = await response.json();

        if (data.length === 0) {
            container.innerHTML = `
                <p style="text-align: center; color: #ffd166; font-size: 1.2rem; padding: 40px 20px;">
                    No upcoming or live games available for this sport right now.<br>
                    Try selecting a different sport or check back later!
                </p>
            `;
            console.log(`No games returned for ${sportKey}`);
            return;
        }

        // Map API response to game objects
        const realGames = data.map((event, index) => {
            const home = event.home_team;
            const away = event.away_team;
            const book = event.bookmakers?.[0] || {};

            // Moneyline (h2h)
            const h2hMarket = book.markets?.find(m => m.key === 'h2h') || {};
            const moneyline = {
                [home.toLowerCase()]: h2hMarket.outcomes?.find(o => o.name === home)?.price || 'N/A',
                [away.toLowerCase()]: h2hMarket.outcomes?.find(o => o.name === away)?.price || 'N/A'
            };

            // Spreads
            const spreadsMarket = book.markets?.find(m => m.key === 'spreads') || {};
            const spreads = spreadsMarket.outcomes?.map(o => `${o.name} ${o.point}: ${o.price}`) || [];

            // Totals (over/under)
            const totalsMarket = book.markets?.find(m => m.key === 'totals') || {};
            const totals = totalsMarket.outcomes?.map(o => `${o.name} ${o.point}: ${o.price}`) || [];

            return {
                id: index + 1,
                sport: event.sport_title || 'Unknown Sport',
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
                totals,
                playerProps: [] // No props for now – we removed them to fix 422
            };
        });

        renderGames(realGames);
        console.log(`Successfully loaded ${realGames.length} real games for ${sportKey}`);
    } catch (err) {
        console.error('Real games fetch failed:', err);
        container.innerHTML = `
            <p style="text-align: center; color: #ff6b6b; font-size: 1.1rem; padding: 40px 20px;">
                Error loading real odds: ${err.message}<br>
                Showing demo fallback games instead.
            </p>
        `;
        renderGames(getFallbackGames());
    }
}

// =============================================
// Fallback fake games (only used on hard failure)
// =============================================
function getFallbackGames() {
    return [
        {
            id: 1,
            sport: "NBA",
            matchup: "Lakers vs Celtics",
            time: "Today 8:00 PM",
            moneyline: { lakers: -150, celtics: +130 },
            spreads: ["Lakers -4.5: -110", "Celtics +4.5: -110"],
            totals: ["Over 225.5: -110", "Under 225.5: -110"],
            playerProps: []
        },
        {
            id: 2,
            sport: "NFL",
            matchup: "Chiefs vs Eagles",
            time: "Tomorrow 4:25 PM",
            moneyline: { chiefs: -180, eagles: +155 },
            spreads: ["Chiefs -5.5: -110", "Eagles +5.5: -110"],
            totals: ["Over 47.5: -110", "Under 47.5: -110"],
            playerProps: []
        },
        {
            id: 3,
            sport: "Soccer – EPL",
            matchup: "Man City vs Arsenal",
            time: "Sat 10:00 AM",
            moneyline: { mancity: -120, arsenal: +100 },
            spreads: [],
            totals: [],
            playerProps: []
        }
    ];
}

// =============================================
// Render the games list
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

        let propsHTML = '<p style="color: #a0a0c0;">Player props not loaded (temporarily disabled to fix API errors)</p>';

        card.innerHTML = `
            <div class="game-header">
                <div class="team-names">${game.matchup}</div>
                <div class="odds">${game.time}</div>
            </div>
            <p>Sport: ${game.sport}</p>

            <div style="margin-top: 16px;">
                <strong>Moneyline:</strong><br>
                ${team1}: ${game.moneyline?.[team1.toLowerCase()] || 'N/A'}<br>
                ${team2}: ${game.moneyline?.[team2.toLowerCase()] || 'N/A'}
            </div>

            ${game.spreads.length > 0 ? `
                <div style="margin-top: 16px;">
                    <strong>Spreads:</strong><br>
                    ${game.spreads.join('<br>')}
                </div>
            ` : ''}

            ${game.totals.length > 0 ? `
                <div style="margin-top: 16px;">
                    <strong>Totals (O/U):</strong><br>
                    ${game.totals.join('<br>')}
                </div>
            ` : ''}

            <div style="margin-top: 16px;">
                <strong>Player Props:</strong><br>
                ${propsHTML}
            </div>

            <button onclick="alert('Bet placement coming soon!')">Place Bet</button>
        `;

        container.appendChild(card);
    });
}

// =============================================
// Initialize
// =============================================
fetchSportsList().then(() => {
    fetchRealGames('upcoming');
});

console.log(`Paper Betting App loaded – Credits: ${credits}`);