export async function updateProficiency(username: string, proficiency: string){
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {status: "200"};
}

export async function getUserProfile(username: string, password: string){
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (username == "InvalidUsername" || password == "Invalid345.") {
          return {status: "401", data: {message: "Invalid username/password"}}
      }
      if (username == "admin01" && password == "Admin01#") {
          return {status: "200", username: "admin01", role: "Admin", email: "admin@example.com", proficiency: "null", JWToken: "token1"}
      }
      return {status:"200", username: "user01", role: "User", email: "user@example.com", proficiency: "Beginner", JWToken: "token2"};
}

export async function createUserProfile(username: string, password: string, email: string){
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (username == "existingUsername") {
        return {status: "409", data: {message: "Username already taken"}}
    }

    return {status: "200"};
}