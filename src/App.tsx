import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Draw } from './pages/Draw'
import { Home } from './pages/Home'
import { Import } from './pages/Import'
import { Pick } from './pages/Pick'
import { Result } from './pages/Result'
import { Review } from './pages/Review'
import { Setup } from './pages/Setup'
import { LotteryProvider } from './store/LotteryContext'

export default function App() {
  return (
    <LotteryProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/import" element={<Import />} />
          <Route path="/pick" element={<Pick />} />
          <Route path="/review" element={<Review />} />
          <Route path="/draw" element={<Draw />} />
          <Route path="/result" element={<Result />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </LotteryProvider>
  )
}
