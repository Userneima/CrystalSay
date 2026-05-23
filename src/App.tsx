import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from './store/useStore'
import { loadCrystals } from './utils/loadData'
import GalaxyPage from './pages/GalaxyPage'
import DetailPage from './pages/DetailPage'
import UpdatePage from './pages/UpdatePage'

export default function App() {
  const location = useLocation()
  const loaded = useStore((s) => s.loaded)
  const setCrystals = useStore((s) => s.setCrystals)

  useEffect(() => {
    if (!loaded) {
      loadCrystals().then(setCrystals)
    }
  }, [loaded, setCrystals])

  return (
    <div className="w-full h-full bg-[#02030a]">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full"
        >
          <Routes location={location}>
            <Route path="/" element={<GalaxyPage />} />
            <Route path="/crystal/:id" element={<DetailPage />} />
            <Route path="/update" element={<UpdatePage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
