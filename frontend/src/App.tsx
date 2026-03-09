import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './commons'

function App() {
  return (
      <>
        <div>
            <BrowserRouter>
                 <AppRoutes />
            </BrowserRouter>
        </div>
      </>
  )
}

export default App
