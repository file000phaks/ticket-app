import { UserProfile } from "../../models/User";
import { mockUsers } from "./mock-data";

interface MockSession {
  user: UserProfile;
  access_token: string;
}

type AuthChangeCallback = (event: string, session: MockSession | null) => void;

type StoredUserRecord = {
  profile: UserProfile;
  password: string;
};

const SESSION_STORAGE_KEY = "ticket_app_session";
const credentialStore = new Map<string, StoredUserRecord>();
let currentSession: MockSession | null = null;
let authChangeListeners: AuthChangeCallback[] = [];

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const cloneProfile = (profile: UserProfile): UserProfile => {
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

const serializeProfile = (profile: UserProfile) => ({
  id: profile.id,
  email: profile.email,
  fullName: profile.fullName,
  role: profile.role,
  department: profile.department,
  phone: profile.phone,
  isActive: profile.isActive,
  createdAt: profile.createdAt.toISOString(),
  updatedAt: profile.updatedAt.toISOString(),
});

const deserializeProfile = (raw: any): UserProfile => {
  return new UserProfile({
    id: raw.id,
    email: raw.email,
    fullName: raw.fullName ?? null,
    role: raw.role,
    department: raw.department ?? null,
    phone: raw.phone ?? null,
    isActive: raw.isActive ?? true,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
  });
};

const persistSession = (session: MockSession | null) => {
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  const stored = {
    user: serializeProfile(session.user),
    access_token: session.access_token,
  };

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stored));
};

const loadPersistedSession = (): MockSession | null => {
  const stored = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);

    if (!parsed?.user) return null;

    return {
      user: deserializeProfile(parsed.user),
      access_token: parsed.access_token,
    };
  } catch (error) {
    console.warn("Failed to parse stored session", error);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
};

const notifyAuthChange = (event: string, session: MockSession | null) => {
  authChangeListeners.forEach((callback) => {
    try {
      callback(event, session ? { ...session, user: cloneProfile(session.user) } : null);
    } catch (error) {
      console.error("Error in auth change listener:", error);
    }
  });
};

const registerUserCredential = (profile: UserProfile, password: string) => {
  const key = normalizeEmail(profile.email);
  credentialStore.set(key, { profile, password });

  const existingIndex = mockUsers.findIndex((user) => user.id === profile.id);
  if (existingIndex === -1) {
    mockUsers.push(profile);
  } else {
    mockUsers[existingIndex] = profile;
  }
};

[
  { email: "admin@test.com", password: "admin123" },
  { email: "supervisor@test.com", password: "supervisor123" },
  { email: "engineer@test.com", password: "engineer123" },
].forEach(({ email, password }) => {
  const profile = mockUsers.find((user) => normalizeEmail(user.email) === normalizeEmail(email));

  if (profile) {
    registerUserCredential(profile, password);
  }
});

if (!currentSession) {
  currentSession = loadPersistedSession();
  if (currentSession) {
    const key = normalizeEmail(currentSession.user.email);
    if (!credentialStore.has(key)) {
      registerUserCredential(currentSession.user, "");
    }
  }
}

const createSession = (profile: UserProfile): MockSession => ({
  user: cloneProfile(profile),
  access_token: `token_${Date.now()}`,
});

const signIn = async (email: string, password: string) => {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const normalizedEmail = normalizeEmail(email);
  const record = credentialStore.get(normalizedEmail);

  if (!record) {
    throw new Error("Invalid email or password");
  }

  if (record.password !== password) {
    throw new Error("Invalid email or password");
  }

  if (!record.profile.isActive) {
    throw new Error("Account is deactivated");
  }

  currentSession = createSession(record.profile);
  persistSession(currentSession);
  notifyAuthChange("SIGNED_IN", currentSession);

  return {
    data: {
      user: cloneProfile(record.profile),
      session: { ...currentSession },
    },
    error: null,
  };
};

const signUp = async (email: string, password: string, fullName?: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const normalizedEmail = normalizeEmail(email);

  if (credentialStore.has(normalizedEmail)) {
    return {
      data: null,
      error: new Error("An account with this email already exists"),
    };
  }

  const now = new Date();
  const generatedId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `mock-${now.getTime()}`;

  const profile = new UserProfile({
    id: generatedId,
    email: email.trim(),
    fullName: fullName?.trim() || null,
    role: "field_engineer",
    department: "field",
    phone: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  registerUserCredential(profile, password);

  return {
    data: {
      user: cloneProfile(profile),
      session: null,
    },
    error: null,
  };
};

const signOut = async () => {
  currentSession = null;
  persistSession(null);
  notifyAuthChange("SIGNED_OUT", null);

  return { error: null };
};

const getSession = async () => {
  if (!currentSession) {
    currentSession = loadPersistedSession();
  }

  return {
    data: {
      session: currentSession ? { ...currentSession, user: cloneProfile(currentSession.user) } : null,
    },
    error: null,
  };
};

const getUser = async () => {
  const { data } = await getSession();

  return {
    data: {
      user: data.session ? cloneProfile(data.session.user) : null,
    },
    error: null,
  };
};

const onAuthStateChange = (callback: AuthChangeCallback) => {
  authChangeListeners.push(callback);

  return {
    data: {
      subscription: {
        unsubscribe: () => {
          authChangeListeners = authChangeListeners.filter((listener) => listener !== callback);
        },
      },
    },
  };
};

const getCurrentUserProfile = async () => {
  if (!currentSession) {
    currentSession = loadPersistedSession();
  }

  const session = currentSession;
  if (!session) return null;

  const record = credentialStore.get(normalizeEmail(session.user.email));
  return record ? cloneProfile(record.profile) : cloneProfile(session.user);
};

const updateProfile = async (userId: string, updates: Partial<UserProfile>) => {
  const entry = Array.from(credentialStore.values()).find((record) => record.profile.id === userId);

  if (!entry) {
    return {
      data: null,
      error: new Error("User not found"),
    };
  }

  Object.assign(entry.profile, {
    fullName: updates.fullName ?? entry.profile.fullName,
    department: updates.department ?? entry.profile.department,
    phone: updates.phone ?? entry.profile.phone,
    role: updates.role ?? entry.profile.role,
    isActive: updates.isActive ?? entry.profile.isActive,
  });
  entry.profile.updatedAt = new Date();

  registerUserCredential(entry.profile, entry.password);

  if (currentSession && currentSession.user.id === userId) {
    currentSession = createSession(entry.profile);
    persistSession(currentSession);
  }

  return {
    data: cloneProfile(entry.profile),
    error: null,
  };
};

export const mockAuthInterface = {
  signIn,
  signOut,
  signUp,
  getUser,
  onAuthStateChange,
  getCurrentUserProfile,
  updateProfile,
  getSession,
};
