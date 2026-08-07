import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Productos from './pages/Productos'
import Comparar from './pages/Comparar'
import Resumen from './pages/Resumen'
import Configuracion from './pages/Configuracion'
function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/productos" replace />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/comparar" element={<Comparar />} />
          <Route path="/resumen" element={<Resumen />} />
          <Route path="/configuracion" element={<Configuracion />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
