import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthScreenContainer from '../../components/auth-wizard/AuthScreenContainer';
import IntentCardRadio from '../../components/auth-wizard/IntentCardRadio';
import BottomAuthLinks from '../../components/auth-wizard/BottomAuthLinks';
import './ChoixInscriptionPage.css';

export default function ChoixInscriptionPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const handleSelectAlternant = () => {
    setSelected('alternant');
    navigate('/inscription/alternant');
  };

  const handleSelectProprio = () => {
    setSelected('proprietaire');
    navigate('/inscription/proprietaire');
  };

  return (
    <AuthScreenContainer>
      <h1 className="aw-screen-title">INSCRIPTION</h1>

      <div className="cip-cards-stack">
        <IntentCardRadio
          name="profil"
          value="alternant"
          checked={selected === 'alternant'}
          onChange={handleSelectAlternant}
          icon={
            <svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor">
              <path d="M480-120 200-272v-240L40-600l440-240 440 240v320h-80v-276l-80 44v240L480-120Zm0-332 274-148-274-148-274 148 274 148Zm0 241 200-108v-151L480-362 280-470v151l200 108Zm0-241Zm0 90Zm0 0Z"/>
            </svg>
          }
          label={<>Je suis <span className="aw-intent-card-keyword">étudiant</span> en alternance</>}
          style={{ animationDelay: '0.16s' }}
        />
        <IntentCardRadio
          name="profil"
          value="proprietaire"
          checked={selected === 'proprietaire'}
          onChange={handleSelectProprio}
          icon={
            <svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor">
              <path d="M700-200h40v-100h100v-40H740v-100h-40v100H600v40h100v100Zm20 80q-83 0-141.5-58.5T520-320q0-83 58.5-141.5T720-520q83 0 141.5 58.5T920-320q0 83-58.5 141.5T720-120Zm-560-80v-480l320-240 320 240v92q-19-6-39-9t-41-3v-40L480-820 240-640v360h203q3 21 9 41t15 39H160Zm320-350Z"/>
            </svg>
          }
          label={<>Je suis <span className="aw-intent-card-keyword">propriétaire</span></>}
          style={{ animationDelay: '0.24s' }}
        />
      </div>

      <BottomAuthLinks showSignInLink />
    </AuthScreenContainer>
  );
}
