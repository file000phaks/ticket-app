// userStats.tsx
import { useState, useEffect } from "react";

// ----------------------
// 1. Type definitions
// ----------------------
export interface UserStats {
  assignedTickets: number;
  inProgressTickets: number;
  resolvedThisWeek: number;
  avgResolutionHours: number;
  overdueTickets: number;
}

// ----------------------
// 2. API call function
// ----------------------
export async function fetchUserStats(userId: string): Promise<UserStats> {
  try {
    const response = await fetch(`https://your-server.com/api/users/${userId}/stats`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user stats");
    }

    const data = await response.json();

    // Ensure the return matches our UserStats type
    return {
      assignedTickets: data.assigned_tickets ?? 0,
      inProgressTickets: data.in_progress_tickets ?? 0,
      resolvedThisWeek: data.resolved_this_week ?? 0,
      avgResolutionHours: data.avg_resolution_hours ?? 0,
      overdueTickets: data.overdue_tickets ?? 0,
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return {
      assignedTickets: 0,
      inProgressTickets: 0,
      resolvedThisWeek: 0,
      avgResolutionHours: 0,
      overdueTickets: 0,
    };
  }
}

// ----------------------
// 3. React hook
// ----------------------
interface UseAuthReturn {
  user: { id: string; email: string } | null;
}

// Mocked useAuth hook – replace with your actual implementation
function useAuth(): UseAuthReturn {
  // Example: returning a dummy logged-in user
  return { user: { id: "12345", email: "engineer@example.com" } };
}

export function useUserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      if (!user) {
        setLoading(false);
        setError("No user logged in");
        return;
      }

      try {
        const fetchedStats = await fetchUserStats(user.id);
        setStats(fetchedStats);
      } catch (err: any) {
        
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [user]);

  return { stats, loading, error };
}
