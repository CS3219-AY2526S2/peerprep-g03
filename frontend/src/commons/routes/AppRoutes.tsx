import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ProtectedRoutes } from './ProtectedRoutes';
import LoadingPages  from './../../pages/SupportPages/LoadingPages/LoadingPages'

// used direct import instead of barrel import to speed up UI
const SignIn = lazy(() => import('./../../pages/Authentication/SignIn/SignIn'))
const CreateAccount= lazy(() => import('./../../pages/Authentication/CreateAccount/CreateAccount'))
const PageNotFound = lazy(() => import('./../../pages/ErrorPage/PageNotFound/PageNotFound'))
const QuestionDashboard = lazy(() => import('./../../pages/Admin/QuestionDashboard/QuestionDashboard'))
const QuestionForm = lazy(() => import('./../../pages/Admin/QuestionForm/QuestionForm'))
const QuestionInformation = lazy(() => import('./../../pages/Admin/QuestionInformation/QuestionInformation'))
const UnauthorisedPage = lazy(() => import('./../../pages/ErrorPage/UnauthorisedPage/UnauthorisedPage'))
const Collaboration = lazy(() => import('./../../pages/User/Collaboration/Collaboration'))
const AttemptDashboard = lazy(() => import('./../../pages/User/PastAttempt/AttemptDashboard/AttemptDashboard'))
const AttemptInformation= lazy(() => import('./../../pages/User/PastAttempt/AttemptInformation/AttemptInformation'))
const QuestionSetting = lazy(() => import('./../../pages/User/QuestionSetting/QuestionSetting'))
const UserProfile = lazy(() => import('./../../pages/User/UserProfile/UserProfile'))
const WaitingRoom = lazy(() => import('./../../pages/User/WaitingRoom/WaitingRoom'))

export function AppRoutes () {
    return (
        <Suspense fallback = {<LoadingPages/>}>
            <Routes>
                <Route exact path = "/" element = {<SignIn /> }/>
                <Route path = "/create-account" element = {<CreateAccount /> }/>
                <Route path = "/unauthorised" element = {<UnauthorisedPage/> } />
                <Route path = "/profile" element = {<UserProfile/> } />

                <Route element={<ProtectedRoutes allowedRoles={['Admin']} />}>
                    <Route path = "/question" element = {<QuestionDashboard/> } />
                    <Route path = "/question/edit/:questionId" element = {<QuestionForm/> } />
                    <Route path = "/question/new" element = {<QuestionForm/> } />
                    <Route path = "/question/view/:questionId" element = {<QuestionInformation/> } />
                </Route>

                <Route element={<ProtectedRoutes allowedRoles={['User']} />}>
                    <Route path = "/attempt" element = {<AttemptDashboard/> } />
                    <Route path = "/attempt/view/:attemptId" element = {<AttemptInformation/> } />
                    <Route path = "/start" element = {<QuestionSetting/> } />
                    <Route path = "/waiting-room" element = {<WaitingRoom/> } />
                    <Route path="/collaboration" element={<Collaboration />} />
                </Route>

                <Route path = "*" element = {<PageNotFound /> }/>
            </Routes>
        </Suspense>
    )
}