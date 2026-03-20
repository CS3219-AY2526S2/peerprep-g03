import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './commons'
import { useEffect } from 'react';
import { refreshJWToken } from './services/Authentication';

function App() {
  useEffect(() => {
    const runRefresh = async () => {
      const token = localStorage.getItem("JWToken");

      if (!token) return;
      
      const response = await refreshJWToken();

      if (response.status === "200") {
        localStorage.setItem("JWToken", response.JWToken);
      }
    };

    runRefresh();
    
    const interval = setInterval(runRefresh, 60*1000); // Refresh every 5 minutes
    return () => clearInterval(interval); // Cleanup
  }, []);

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
