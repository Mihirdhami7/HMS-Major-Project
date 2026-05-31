import './App.css';
import { AuthProvider } from './context/AuthContext';
import Layout from './layout/mainlayout';

function App() {
  return (
    <AuthProvider>
      <Layout />
    </AuthProvider>
  );
}

export default App;