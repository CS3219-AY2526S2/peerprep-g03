const BASE_URL = "http://localhost:3000/auth";

export async function getUserProfile(username: string, password: string) {
    try {
        const response = await fetch(`${BASE_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                status: response.status.toString(),
                data: { message: data.error }
            };
        }

        return {
            status: response.status.toString(),
            username: data.username,
            role: data.role,
            email: data.email,
            proficiency: data.proficiency,
            JWToken: data.JWToken
        };

    } catch (err) {
        return {
            status: "500",
            data: { message: "Server unreachable" }
        };
    }
}

export async function createUserProfile(username: string, password: string, email: string) {
    try {
        const response = await fetch(`${BASE_URL}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password, email })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                status: response.status.toString(),
                data: { message: data.error }
            };
        }

        return { status: response.status.toString() };

    } catch (err) {
        return {
            status: "500",
            data: { message: "Server unreachable" }
        };
    }
}


export async function updateProficiency(username: string, proficiency: string){
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {status: "200"};
}

export async function refreshJWToken() {
    try { 
        const token = localStorage.getItem("JWToken");

        if (!token) {
            return { status: "401", data: { message: "No token found" } };
        }

        const response = await fetch(`${BASE_URL}/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            return {
                status: response.status.toString(),
                data: { message: data.error }
            };
        }

        //replace token
        localStorage.setItem("JWToken", data.JWToken);

        return {
            status: response.status.toString(),
            JWToken: data.JWToken
        };
    } catch (err) {
        return {
            status: "500",
            data: { message: "Server unreachable" }
        };
    }
}

// Commented out mock
// export async function getUserProfile(username: string, password: string){
//       await new Promise((resolve) => setTimeout(resolve, 500));

//       if (username == "InvalidUsername" || password == "Invalid345.") {
//           return {status: "401", data: {message: "Invalid username/password"}}
//       }
//       if (username == "admin01" && password == "Admin01#") {
//           return {status: "200", username: "admin01", role: "Admin", email: "admin@example.com", proficiency: "null", JWToken: "token1"}
//       }
//       return {status:"200", username: "user01", role: "User", email: "user@example.com", proficiency: "Beginner", JWToken: "token2"};
// }

// export async function createUserProfile(username: string, password: string, email: string){
//     await new Promise((resolve) => setTimeout(resolve, 500));
//     if (username == "existingUsername") {
//         return {status: "409", data: {message: "Username already taken"}}
//     }

//     return {status: "200"};
// }