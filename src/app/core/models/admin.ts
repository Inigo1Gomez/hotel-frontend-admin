// Espejo de IAdmin en hotel-ms-usuarios (src/models/userModel.ts).
export type AdminRole = 'ADMIN' | 'EMPLOYEE';

export interface Admin {
  id: string;
  /** Object ID (oid) del usuario en Entra ID. */
  entraId: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AdminInput = Pick<Admin, 'entraId' | 'name' | 'email' | 'role' | 'active'>;
