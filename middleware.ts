import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized({ req, token }) {
      return !!token;
    },
  },
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/kunder/:path*',
    '/prislista/:path*',
    '/arbetsordrar/:path*',
    '/kalender/:path*',
    '/rapporter/:path*',
    '/installningar/:path*',
    '/api/((?!auth).*)/:path*',
  ],
};