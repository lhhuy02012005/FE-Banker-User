import { error } from "console";
import toast from "react-hot-toast";

export const handleError = (error: any) => {
    const message = error.response?.data?.message || "An unexpected error occurred. Please try again.";
    toast.error(message, {
    duration: 4000,
    position: 'top-right',
  });
  console.error("Error details:", error);
}