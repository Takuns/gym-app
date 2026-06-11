import { useState, useEffect } from 'react';
import GymScreen from './components/GymScreen';
import HoyScreen from './components/HoyScreen';
import ProfileScreen from './components/ProfileScreen';
import BottomNav from './components/BottomNav';
import LoginScreen from './components/LoginScreen';
import { pb } from './lib/pocketbase';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid);
  const [currentTab, setCurrentTab] = useState<'gym' | 'hoy' | 'profile'>('hoy');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    // Escuchar cambios en la autenticación (login/logout)
    const unsubscribe = pb.authStore.onChange(() => {
      setIsAuthenticated(pb.authStore.isValid);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="pb-20">
      {currentTab === 'hoy' && (
        <HoyScreen 
          selectedDate={selectedDate} 
          setSelectedDate={setSelectedDate} 
        />
      )}
      {currentTab === 'gym' && (
        <GymScreen />
      )}
      {currentTab === 'profile' && (
        <ProfileScreen />
      )}
      <BottomNav currentTab={currentTab} onChange={setCurrentTab} />
    </div>
  );
}

export default App;
