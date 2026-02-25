import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

export function ProtectedRoutes({ allowedRoles }) {
    const { value } = useSelector((state) => state.authentication);
    const isLoggedIn:boolean = value.username != ""
    const role = value.role

    if (!isLoggedIn) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/unauthorised" replace />;
    }

    return <Outlet />;
};
