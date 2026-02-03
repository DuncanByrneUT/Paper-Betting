import { useState, useEffect } from 'react';
import CreditsBox from './components/CreditsBox';
import './index.css';

function App() {
  const [credits, setCredits] = useState(() => {
    const saved = localStorage.getItem('paperBettingCredits');
    return saved ? Number(saved) : 1000;
  });

  // Save credits to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('paperBettingCredits', credits);
  }, [credits]);

  return (
    <div>
      <header>
        <div className="header-content">
          <h1>Paper Betting</h1>
          {/* Dark mode toggle coming soon */}
        </div>
        <p className="subtitle">Learn sports betting with fake credits – no real money</p>
      </header>

      <div className="container">
        <main>
          <section id="user-info">
            <CreditsBox credits={credits} onUpdateCredits={setCredits} />
          </section>

          <section id="games-list">
            <h2>Upcoming Games (coming soon)</h2>
          </section>
        </main>

        <aside id="bet-slip">
          <h3>Bet Slip</h3>
          <p>Bet slip coming soon</p>
        </aside>
      </div>
    </div>
  );
}

export default App;