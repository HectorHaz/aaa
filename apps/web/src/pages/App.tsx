import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';

export function App() {
  const [email, setEmail] = useState('admin@demo.do');
  const [password, setPassword] = useState('Admin1234!');
  const [customers, setCustomers] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  async function login(e: FormEvent) {
    e.preventDefault();
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('token', data.accessToken);
    setStatus('Autenticado');
    loadCustomers();
  }

  async function loadCustomers() {
    try {
      const list = await api('/customers');
      setCustomers(list);
    } catch {
      setCustomers([]);
    }
  }

  async function createSampleFlow() {
    const customer = await api('/customers', { method: 'POST', body: JSON.stringify({ code: `C-${Date.now()}`, name: 'Cliente UI', paymentTermsDays: 30, creditLimit: 20000 }) });
    setStatus(`Cliente creado ${customer.id}`);
    await loadCustomers();
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1>ERP PyME RD - MVP</h1>
      <form onSubmit={login} style={{ display: 'flex', gap: 8 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
        <button>Login</button>
      </form>
      <button onClick={createSampleFlow}>Crear cliente demo</button>
      <p>{status}</p>
      <h2>Clientes</h2>
      <ul>{customers.map((c) => <li key={c.id}>{c.code} - {c.name}</li>)}</ul>
    </main>
  );
}
