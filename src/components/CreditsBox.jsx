import { useState } from 'react';

function CreditsBox({ credits, onUpdateCredits }) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(credits);

  const handleSave = () => {
    const newVal = Number(inputValue);
    if (!isNaN(newVal) && newVal >= 0 && newVal <= 999999) {
      onUpdateCredits(newVal);
      setIsEditing(false);
    } else {
      alert('Please enter a number between 0 and 999,999.');
    }
  };

  return (
    <div className="credits-box">
      <span>Your Credits:</span>
      <strong>{credits}</strong>

      {!isEditing ? (
        <button onClick={() => setIsEditing(true)}>Edit</button>
      ) : (
        <div style={{ marginTop: '12px' }}>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            min="0"
            max="999999"
            style={{ width: '120px', marginRight: '8px' }}
          />
          <button onClick={handleSave}>Save</button>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default CreditsBox;