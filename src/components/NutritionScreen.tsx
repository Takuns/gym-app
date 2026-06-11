import { useState, useEffect } from 'react';
import { Apple } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import DietIdeas from './DietIdeas';

interface NutritionScreenProps {}

export default function NutritionScreen({}: NutritionScreenProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const users = await pb.collection('usuarios').getFullList();
        if (users.length > 0) {
          setUser(users[0]);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="w-10 h-10 rounded-full border-4 border-surface border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Apple size={48} className="text-text-muted mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-text-main mb-2">No hay usuario activo</h2>
        <p className="text-text-muted">Por favor crea un usuario en la base de datos para acceder a nutrición.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header Sticky */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Apple className="text-primary" /> Nutrición
          </h1>
        </div>
      </header>

      <main className="p-4 mt-2">
        <DietIdeas user={user} />
      </main>

    </div>
  );
}
