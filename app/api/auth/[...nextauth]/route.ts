import { prisma } from '@/lib/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { AnvandareRoll } from '@prisma/client';
import bcrypt from 'bcryptjs';
import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// Utöka NextAuth's sessionstyper för att inkludera roll och användar-id
declare module "next-auth" {
  interface User {
    role?: AnvandareRoll;
    id?: string;
  }
  
  interface Session {
    user?: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AnvandareRoll;
    id?: string;
  }
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Användarnamn', type: 'text' },
        password: { label: 'Lösenord', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.anvandare.findUnique({
          where: {
            anvandarnamn: credentials.username
          }
        });

        if (!user || !user.aktiv) {
          return null;
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.losenord
        );

        if (!isCorrectPassword) {
          return null;
        }

        return {
          id: user.id.toString(),
          name: `${user.fornamn} ${user.efternamn}`,
          email: user.epost,
          role: user.roll
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Include user role in the token
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Include user role in the session
      if (session.user) {
        session.user.role = token.role as AnvandareRoll;
        session.user.id = token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'temporarysecretfordevelopment',
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };