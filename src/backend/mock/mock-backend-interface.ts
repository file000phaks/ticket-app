import { UserProfile, type UserRole } from "../../models/User";
import { mockAuthInterface } from "./mock-auth";
import { mockTickets, mockUsers } from "./mock-data";

interface TicketRecord {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  created_by: string;
  assigned_to: string | null;
  verified_by?: string | null;
  location_name: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: Date;
  updated_at: Date;
  assigned_at: Date | null;
  resolved_at?: Date | null;
  verified_at?: Date | null;
  due_date: Date | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  notes?: string | null;
  created_by_profile: UserProfile | null;
  assigned_to_profile: UserProfile | null;
  verified_by_profile: UserProfile | null;
}

const cloneUserProfile = (profile: UserProfile | null | undefined): UserProfile | null => {
  if (!profile) return null;

  return new UserProfile({
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    department: profile.department,
    phone: profile.phone,
    isActive: profile.isActive,
    createdAt: new Date(profile.createdAt),
    updatedAt: new Date(profile.updatedAt),
  });
};

const cloneTicketRecord = (record: TicketRecord): TicketRecord => ({
  ...record,
  created_at: new Date(record.created_at),
  updated_at: new Date(record.updated_at),
  assigned_at: record.assigned_at ? new Date(record.assigned_at) : null,
  resolved_at: record.resolved_at ? new Date(record.resolved_at) : null,
  verified_at: record.verified_at ? new Date(record.verified_at) : null,
  due_date: record.due_date ? new Date(record.due_date) : null,
  created_by_profile: cloneUserProfile(record.created_by_profile),
  assigned_to_profile: cloneUserProfile(record.assigned_to_profile),
  verified_by_profile: cloneUserProfile(record.verified_by_profile),
});

let currentMockTickets: TicketRecord[] = mockTickets.map((ticket: any) => cloneTicketRecord({
  ...ticket,
  created_at: ticket.created_at ?? ticket.createdAt ?? new Date(),
  updated_at: ticket.updated_at ?? ticket.updatedAt ?? new Date(),
  assigned_at: ticket.assigned_at ?? ticket.assignedAt ?? null,
  resolved_at: ticket.resolved_at ?? ticket.resolvedAt ?? null,
  verified_at: ticket.verified_at ?? ticket.verifiedAt ?? null,
  due_date: ticket.due_date ?? ticket.dueDate ?? null,
  created_by_profile: ticket.created_by_profile ?? null,
  assigned_to_profile: ticket.assigned_to_profile ?? null,
  verified_by_profile: ticket.verified_by_profile ?? null,
} as TicketRecord));

let nextTicketId = currentMockTickets.length + 1;

const findUserById = (userId: string | null | undefined): UserProfile | null => {
  if (!userId) return null;
  const user = mockUsers.find((profile) => profile.id === userId);
  return user ? cloneUserProfile(user) : null;
};

const createTicketRecord = (userId: string, ticketData: Record<string, any>): TicketRecord => {
  const now = new Date();

  return {
    id: String(nextTicketId++),
    title: ticketData.title ?? "Untitled Ticket",
    description: ticketData.description ?? "",
    type: ticketData.type ?? "maintenance",
    priority: ticketData.priority ?? "medium",
    status: ticketData.status ?? "open",
    created_by: userId,
    assigned_to: ticketData.assigned_to ?? null,
    verified_by: ticketData.verified_by ?? null,
    location_name: ticketData.location_name ?? ticketData.location ?? null,
    latitude: ticketData.latitude ?? null,
    longitude: ticketData.longitude ?? null,
    created_at: now,
    updated_at: now,
    assigned_at: null,
    resolved_at: null,
    verified_at: null,
    due_date: ticketData.due_date ? new Date(ticketData.due_date) : null,
    estimated_hours: ticketData.estimated_hours ?? null,
    actual_hours: ticketData.actual_hours ?? 0,
    notes: ticketData.notes ?? null,
    created_by_profile: findUserById(userId),
    assigned_to_profile: findUserById(ticketData.assigned_to ?? null),
    verified_by_profile: findUserById(ticketData.verified_by ?? null),
  };
};

const mapTicketUpdates = (updates: Record<string, any>): Record<string, any> => {
  const mapping: Record<string, string> = {
    createdBy: "created_by",
    assignedTo: "assigned_to",
    verifiedBy: "verified_by",
    locationName: "location_name",
    dueDate: "due_date",
    estimatedHours: "estimated_hours",
    actualHours: "actual_hours",
    createdAt: "created_at",
    updatedAt: "updated_at",
    assignedAt: "assigned_at",
    resolvedAt: "resolved_at",
    verifiedAt: "verified_at",
  };

  const dateFields = new Set([
    "created_at",
    "updated_at",
    "assigned_at",
    "resolved_at",
    "verified_at",
    "due_date",
  ]);

  const normalized: Record<string, any> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined) return;

    const normalizedKey = mapping[key] ?? key;

    if (dateFields.has(normalizedKey) && value) {
      normalized[normalizedKey] = value instanceof Date ? value : new Date(value);
    } else {
      normalized[normalizedKey] = value;
    }
  });

  return normalized;
};

export const mockDbHelpers = {
  async getTicketsWithRelations(userId?: string, role?: UserRole) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    let tickets = currentMockTickets;

    if (role === "field_engineer" && userId) {
      tickets = currentMockTickets.filter(
        (ticket) => ticket.created_by === userId || ticket.assigned_to === userId,
      );
    }

    return { data: tickets.map(cloneTicketRecord), error: null };
  },

  async createTicket(userId: string, ticketData: Record<string, any>) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const userExists = !!findUserById(userId);
    const ticketRecord = createTicketRecord(userId, ticketData);
    currentMockTickets = [ticketRecord, ...currentMockTickets];

    return {
      data: cloneTicketRecord(ticketRecord),
      error: userExists ? null : new Error("User not found"),
    };
  },

  async getTicketActivities(ticketId: string) {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const now = Date.now();

    return [
      {
        id: `act-${ticketId}-1`,
        ticket_id: ticketId,
        user_id: "1",
        type: "created" as const,
        description: "Ticket created",
        created_at: new Date(now - 24 * 60 * 60 * 1000),
        user_profile: findUserById("1"),
      },
      {
        id: `act-${ticketId}-2`,
        ticket_id: ticketId,
        user_id: "2",
        type: "assigned" as const,
        description: "Ticket assigned to Field Engineer",
        created_at: new Date(now - 23 * 60 * 60 * 1000),
        user_profile: findUserById("2"),
      },
      {
        id: `act-${ticketId}-3`,
        ticket_id: ticketId,
        user_id: "3",
        type: "comment" as const,
        description: "Started investigating the issue",
        created_at: new Date(now - 2 * 60 * 60 * 1000),
        user_profile: findUserById("3"),
      },
    ];
  },

  async deleteTicket(ticketId: string) {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const initialLength = currentMockTickets.length;
    currentMockTickets = currentMockTickets.filter((ticket) => ticket.id !== ticketId);

    if (currentMockTickets.length === initialLength) {
      return { error: new Error("Ticket not found") };
    }

    return { error: null };
  },

  async updateTicket(ticketId: string, updates: Record<string, any>) {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const ticketIndex = currentMockTickets.findIndex((ticket) => ticket.id === ticketId);

    if (ticketIndex === -1) {
      return { data: null, error: new Error("Ticket not found") };
    }

    const normalizedUpdates = mapTicketUpdates(updates);
    const ticket = currentMockTickets[ticketIndex];

    const updatedTicket: TicketRecord = {
      ...ticket,
      ...normalizedUpdates,
      updated_at: normalizedUpdates.updated_at ?? new Date(),
      assigned_to_profile: findUserById(
        normalizedUpdates.assigned_to ?? ticket.assigned_to ?? null,
      ),
      verified_by_profile: findUserById(
        normalizedUpdates.verified_by ?? ticket.verified_by ?? null,
      ),
    };

    currentMockTickets[ticketIndex] = updatedTicket;

    return { data: cloneTicketRecord(updatedTicket), error: null };
  },

  async assignTicket(ticketId: string, assignedTo: string | null) {
    return this.updateTicket(ticketId, {
      assigned_to: assignedTo,
      status: assignedTo ? "assigned" : "open",
      assigned_at: assignedTo ? new Date() : null,
    });
  },

  async getDashboardStats(userId: string, role: UserRole) {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const scopedTickets =
      role === "field_engineer"
        ? currentMockTickets.filter(
            (ticket) => ticket.created_by === userId || ticket.assigned_to === userId,
          )
        : currentMockTickets;

    return {
      totalTickets: scopedTickets.length,
      openTickets: scopedTickets.filter((ticket) => ticket.status === "open").length,
      inProgressTickets: scopedTickets.filter((ticket) => ticket.status === "in_progress").length,
      resolvedTickets: scopedTickets.filter((ticket) => ticket.status === "resolved").length,
      overdueTickets: scopedTickets.filter((ticket) => {
        if (!ticket.due_date) return false;
        const dueDate = ticket.due_date instanceof Date ? ticket.due_date : new Date(ticket.due_date);
        return dueDate < new Date() && !["resolved", "verified", "closed"].includes(ticket.status);
      }).length,
      assignedTickets: scopedTickets.filter((ticket) => ticket.assigned_to === userId).length,
      createdTickets: scopedTickets.filter((ticket) => ticket.created_by === userId).length,
    };
  },

  async getUsers(role?: UserRole) {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const users = role ? mockUsers.filter((user) => user.role === role) : mockUsers;

    return users.map((user) => cloneUserProfile(user));
  },

  async getEquipment() {
    await new Promise((resolve) => setTimeout(resolve, 150));

    return currentMockTickets
      .map((ticket) => ticket.equipment)
      .filter((equipment) => Boolean(equipment));
  },

  async getUserProfile(userId: string) {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const user = mockUsers.find((profile) => profile.id === userId);
    return cloneUserProfile(user ?? null);
  },

  async updateUserProfile(userId: string, updates: Partial<UserProfile>) {
    return mockAuthInterface.updateProfile(userId, updates);
  },

  async getUserStats(userId: string) {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const userTickets = currentMockTickets.filter(
      (ticket) => ticket.created_by === userId || ticket.assigned_to === userId,
    );

    const completedTickets = userTickets.filter((ticket) =>
      ["resolved", "verified", "closed"].includes(ticket.status),
    ).length;

    const resolvedTickets = userTickets.filter((ticket) =>
      ["resolved", "verified", "closed"].includes(ticket.status),
    );

    const avgResolutionTime =
      resolvedTickets.length > 0
        ? resolvedTickets.reduce((sum) => sum + (Math.random() * 22 + 2), 0) /
          resolvedTickets.length
        : 0;

    return {
      totalTickets: userTickets.length,
      completedTickets,
      avgResolutionTime,
      lastActivity: new Date().toISOString(),
    };
  },

  async getTicketMedia() {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return [];
  },

  async getUserNotifications() {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { data: [], error: null };
  },

  async updateUserRole(userId: string, role: UserRole) {
    const user = mockUsers.find((profile) => profile.id === userId);

    if (!user) {
      return { data: null, error: new Error("User not found") };
    }

    user.role = role;
    return { data: cloneUserProfile(user), error: null };
  },

  async deactivateUser(userId: string) {
    const user = mockUsers.find((profile) => profile.id === userId);

    if (!user) {
      return { data: null, error: new Error("User not found") };
    }

    user.isActive = false;
    return { data: cloneUserProfile(user), error: null };
  },

  async getTimeEntries() {},
  async createTimeEntry() {},
  async updateTimeEntry() {},
  async deleteTimeEntry() {},
  async getUserTimeEntries() {},
};

const subscribeToNotifications = async () => ({
  unsubscribe: () => undefined,
});

const subscribeToTickets = () => ({
  unsubscribe: () => undefined,
});

const deleteFile = async () => undefined;
const uploadFile = async () => undefined;
const getFileUrl = async () => undefined;
const getCurrentUserProfile = async () => mockAuthInterface.getCurrentUserProfile();
const checkUserRole = async () => true;

const addTicketComment = async () => ({ error: null });
const addTicketNote = async () => ({ error: null });

export const mockBackendInterface = {
  ...mockDbHelpers,
  loadNotifications: mockDbHelpers.getUserNotifications,
  addTicketComment,
  addTicketNote,
  subscribeToNotifications,
  subscribeToTickets,
  deleteFile,
  uploadFile,
  getFileUrl,
  getCurrentUserProfile,
  checkUserRole,
  auth: mockAuthInterface,
};
