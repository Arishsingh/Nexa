import type { NextAuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: { params: { scope: 'read:user repo' } },
    }),
  ],
  pages: { signIn: '/signin' },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) token.accessToken = account.access_token
      if (profile) token.username = (profile as { login?: string }).login
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.username = token.username
      return session
    },
  },
}
