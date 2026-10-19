import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, isConfigured } from './firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => (isConfigured ? onAuthStateChanged(auth, setUser) : undefined), []);

  if (!isConfigured) {
    return (
      <Login
        notice="O site ainda não está ligado ao Firebase. Preencha o arquivo web/src/config.js."
        disabled
      />
    );
  }
  if (user === undefined) return <div className="min-h-dvh bg-sky" />;
  if (!user) return <Login />;
  return <Dashboard user={user} onSignOut={() => signOut(auth)} />;
}
