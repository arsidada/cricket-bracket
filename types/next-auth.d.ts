// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
    user?: {
      name?: string;
      email?: string;
    };
  }

  interface JWT {
    accessToken?: string;
    idToken?: string;
    email?: string;
  }
}