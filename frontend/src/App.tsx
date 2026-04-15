import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './commons'
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux'
import { initialiseAuth } from './features/Authentication/authenticationSlice';
import { initialiseCollab } from './features/User/Collaboration/collaborationSlice';
import { refreshJWToken } from './services/Authentication';

function App() {
  const dispatch = useDispatch()
  const [bootstrapped, setBootstrapped] = useState(false)

  useEffect(() => {
    const runRefresh = async () => {
      const savedToken = localStorage.getItem("JWToken");
      const savedSession = localStorage.getItem('collabSession');

      if (!savedToken) {
        setBootstrapped(true)
        return;
      }
      
      try {
        const response = await refreshJWToken();

        if (response.status === "200") {
          localStorage.setItem("JWToken", response.JWToken);

          if (savedSession) {
            const parsed = JSON.parse(savedSession)

            dispatch(
              initialiseAuth({
                username: parsed.username ?? '',
                role: parsed.role ?? '',
                email: '',
                proficiency: '',
                JWToken: response.JWToken,
              })
            )

            dispatch(
              initialiseCollab({
                roomId: parsed.roomId ?? null,
                partner: parsed.partner ?? null,
                question: parsed.question ?? null,
              })
            )
          }
        } else {
          localStorage.removeItem('JWToken')
          localStorage.removeItem('collabSession')
        }
      } catch (error) {
        console.error('Failed to refresh session:', error)
        localStorage.removeItem('JWToken')
        localStorage.removeItem('collabSession')
      } finally {
        setBootstrapped(true)
      }
    };

    runRefresh();
    
    const interval = setInterval(runRefresh, 60*1000); // Refresh every 1 minutes
    return () => clearInterval(interval); // Cleanup
  }, [dispatch]);

  console.log('bootstrapped:', bootstrapped)
  console.log('saved collabSession:', localStorage.getItem('collabSession'))
  console.log('saved JWToken:', localStorage.getItem('JWToken'))

  if (!bootstrapped) {
    return <div>Loading...</div>
  };

  

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
