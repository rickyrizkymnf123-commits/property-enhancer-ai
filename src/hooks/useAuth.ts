import { useAuth, AuthProvider } from '../contexts/AuthContext';
export type { AuthContextType, AuthState, User, Session, Profile, UserRole, Entitlement } from '../types/auth.types';

export { useAuth, AuthProvider };
export default useAuth;
