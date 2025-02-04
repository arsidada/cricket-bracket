import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import "next-auth/jwt"; // ✅ Ensures extended types are included

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.email = profile?.email || '';
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.idToken = token.idToken as string;
    
      session.user = session.user || {}; // ✅ Ensure `session.user` is always an object
      session.user.email = token.email ?? ""; // ✅ Convert null/undefined to an empty string
    
      return session;
    }
  },
};

export default NextAuth(authOptions);