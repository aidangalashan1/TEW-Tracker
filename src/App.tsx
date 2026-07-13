import { AppProvider } from './context/AppContext'
import { AppLayout } from './AppLayout'
import { ToastProvider } from './components/Toast'

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppLayout />
      </ToastProvider>
    </AppProvider>
  )
}
