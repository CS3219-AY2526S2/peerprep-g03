import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components";

export default function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const navigate = useNavigate();
    console.log(users);

    const fetchUsers = async () => {
        const token = localStorage.getItem("JWToken");

        const response = await fetch("http://localhost:3000/auth/users", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (response.ok) {
            setUsers(data);
        } else {
            console.error(data.error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (id, newRole) => {
        const token = localStorage.getItem("JWToken");

        const response = await fetch(`http://localhost:3000/auth/users/${id}/role`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ role: newRole })
        });

        if (response.ok) {
            // update UI immediately
            setUsers(prev =>
                prev.map(user =>
                    user.id === id ? { ...user, role: newRole } : user
                )
            );
        } else {
            const data = await response.json();
            console.error(data.error);
        }
    };

    return (
        <div className="p-10">
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
            
            <Button label="Back to Question Dashboard" onClick={() => navigate('/question')} />
            <table className="table-auto border w-full">
                <thead>
                    <tr>
                        <th className="border p-2">Username</th>
                        <th className="border p-2">Role</th>
                        <th className="border p-2">Change Role</th>
                    </tr>
                </thead>
                <tbody>
                    {users
                    .filter((user) => user.role !== "SuperAdmin")
                    .map((user) => (
                        <tr key={user.id}>
                            <td className="border p-2">{user.username}</td>
                            <td className="border p-2">{user.role}</td>
                            <td className="border p-2">
                                <select
                                    value={user.role}
                                    onChange={(e) =>
                                        handleRoleChange(user.id, e.target.value)
                                    }
                                >
                                    <option value="User">User</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
