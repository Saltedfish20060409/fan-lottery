import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppBackground } from './components/AppBackground'
import { Announce } from './pages/Announce'
import { BackgroundSettings } from './pages/BackgroundSettings'
import { Draw } from './pages/Draw'
import { Home } from './pages/Home'
import { Import } from './pages/Import'
import { Pick } from './pages/Pick'
import { Result } from './pages/Result'
import { Review } from './pages/Review'
import { Setup } from './pages/Setup'
import { Stage } from './pages/Stage'
import { LotteryProvider } from './store/LotteryContext'

export default function App() {
  return (
    <LotteryProvider>
      <AppBackground>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/import" element={<Import />} />
            <Route path="/pick" element={<Pick />} />
            <Route path="/review" element={<Review />} />
            <Route path="/draw" element={<Draw />} />
            <Route path="/result" element={<Result />} />
            <Route path="/announce" element={<Announce />} />
            <Route path="/background" element={<BackgroundSettings />} />
            <Route path="/stage" element={<Stage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AppBackground>
    </LotteryProvider>
  )
}
