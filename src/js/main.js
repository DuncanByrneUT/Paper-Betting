// =============================================
// CONFIG
// =============================================
const API_KEY = 'f2ae926aacf54a1862ddd8e938b514c8'; // Your key — remove/hide before sharing publicly!
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';
const SPORT_KEY = 'upcoming'; // 'upcoming' = next games across ALL sports (multi-sport magic!)
const REGIONS = 'us'; // US bookmakers (change to 'uk', 'eu', 'au' if preferred)
const MARKETS = 'h2h'; // h2h = moneyline. Add 'spreads,totals' later for more

// Start with 1000 credits if not set
let credits = Number(localStorage.getItem('paperBettingCredits')) || 1000;
localStorage.setItem('paperBettingCredits', credits);

const creditsDisplay = document.getElementById('credits-display');
creditsDisplay.textContent = credits;

// =============================================
// Fetch real games from The Odds API
// =============================================
async function fetchRealGames() {
    const container = document.getElementById('games-container');
    container.innerHTML = '<p>Loading real upcoming games...</p>'; // Show loading

    try {
        const url = `${ODDS_API_BASE}/sports/${SPORT_KEY}/odds/?apiKey=${API_KEY}&regions=${REGIONS}&markets=${MARKETS}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status} - Check quota or key`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            throw new Error('No upcoming games right now');
        }

        // Map API data to your simple game format
        const realGames = data.map((event, index) => {
            const home = event.home_team;
            const away = event.away_team;
            const book = event.bookmakers?.[0]; // First bookmaker (e.g. DraftKings/FanDuel)
            const moneylineOutcomes = book?.markets?.find(m => m.key === 'h2h')?.outcomes || [];

            const homeOdds = moneylineOutcomes.find(o => o.name === home)?.price || 'N/A';
            const awayOdds = moneylineOutcomes.find(o => o.name === away)?.price || 'N/A';

            return {
                id: index + 1,
                sport: event.sport_title || 'Mixed Sports',
                matchup: `${home} vs ${away}`,
                time: new Date(event.commence_time).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                moneyline: { [home.toLowerCase()]: homeOdds, [away.toLowerCase()]: awayOdds }
            };
        });

        renderGames(realGames);
        console.log('Real games loaded! Quota info in headers (check Network tab in dev tools).');
    } catch (err) {
        console.error('API fetch failed:', err);
        container.innerHTML += '<p style="color: #ff6b6b;">Couldn\'t load real odds. Using fake fallback data.</p>';
        renderGames(getFallbackGames()); // Use your old fake ones
    }
}

// Your existing fallback fake games
function getFallbackGames() {
    return [
        { id: 1, sport: "NBA", matchup: "Lakers vs Celtics", time: "Today 8:00 PM", moneyline: { lakers: -150, celtics: +130 } },
        { id: 2, sport: "NFL", matchup: "Chiefs vs Eagles", time: "Tomorrow 4:25 PM", moneyline: { chiefs: -180, eagles: +155 } },
        { id: 3, sport: "Soccer – EPL", matchup: "Man City vs Arsenal", time: "Sat 10:00 AM", moneyline: { mancity: -120, arsenal: +100 } }
    ];
}

// Your existing render function (updated slightly for better odds display)
function renderGames(gamesList) {
    const container = document.getElementById('games-container');
    container.innerHTML = ''; // Clear

    gamesList.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';

        // Extract team names safely
        const teams = game.matchup.split(' vs ');
        const team1 = teams[0];
        const team2 = teams[1] || 'Opponent';

        card.innerHTML = `
            <div class="game-header">
                <div class="team-names">${game.matchup}</div>
                <div class="odds">${game.time}</div>
            </div>
            <p>Sport: ${game.sport}</p>
            <div style="margin-top: 12px;">
                <strong>Moneyline Odds:</strong><br>
                ${team1}: ${game.moneyline?.[team1.toLowerCase()] || 'N/A'}<br>
                ${team2}: ${game.moneyline?.[team2.toLowerCase()] || 'N/A'}
            </div>
            <button onclick="alert('Bet placement coming soon!')">Place Bet</button>
        `;

        container.appendChild(card);
    });
}

// Load on page start
fetchRealGames();

// Log credits for debug
console.log(`Current fake balance: ${credits} credits`);