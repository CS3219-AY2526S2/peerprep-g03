import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

export function ProtectedRoutes({ allowedRoles }) {
    const { value } = useSelector((state) => state.authentication);
    const isLoggedIn:boolean = value.username != ""
    const role = value.role

    if (!isLoggedIn) {
        return <Navigate to="/" replace />;
    }

    // Allowance of higher roles to access lower role pages.
    const ROLE_HIERARCHY = {
        User: 1,
        Admin: 2,
        SuperAdmin: 3
    };

    if (allowedRoles) {
        const hasAccess = allowedRoles.some(
            (allowedRole) => ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[allowedRole]
        );

        if (!hasAccess) {
            return <Navigate to="/unauthorised" replace />;
        }
    }

    return <Outlet />;
};
