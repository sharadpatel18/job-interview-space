import Axios from "axios";
import { toast } from "sonner";

interface ICandidateUser {
  fullName: string;
  email: string;
  password: string;
}

export const createUser = async (userData: ICandidateUser) => {
  try {
    const userPayload = {
      fullName: userData.fullName,
      email: userData.email,
      password: userData.password,
      authProvider: "credentials",
      role: "candidate",
    };
    const response = await Axios.post("/api/auth/signup", userPayload);
    if (response.status === 201) {
      toast.success("User created successfully.");
    }
    return response.data;
  } catch (error) {
    console.error("Error creating user:", error);
    toast.error("Failed to create user. Please try again.");
    throw error;
  }
};
