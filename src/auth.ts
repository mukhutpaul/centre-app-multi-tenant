import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  providers: [
    Credentials({
      name: "credentials",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },

        password: {
          label: "Mot de passe",
          type: "password",
        },
      },

      async authorize(credentials) {
        try {
          const email = String(credentials?.email ?? "")
            .trim()
            .toLowerCase();

          const password = String(
            credentials?.password ?? ""
          );

          if (!email || !password) {
            console.log("AUTH : email ou mot de passe manquant");
            return null;
          }

          console.log("AUTH : recherche de", email);

          const utilisateur = await prisma.utilisateur.findUnique({
            where: {
              email,
            },
          });

          if (!utilisateur) {
            console.log("AUTH : utilisateur introuvable");
            return null;
          }

          console.log(
            "AUTH : utilisateur trouvé",
            utilisateur.id
          );

          if (!utilisateur.motDePasse) {
            console.log(
              "AUTH : aucun mot de passe enregistré"
            );

            return null;
          }

          const passwordCorrect = await bcrypt.compare(
            password,
            utilisateur.motDePasse
          );

          if (!passwordCorrect) {
            console.log(
              "AUTH : mot de passe incorrect"
            );

            return null;
          }

          if (utilisateur.statut !== "ACTIF") {
            console.log(
              "AUTH : utilisateur inactif"
            );

            return null;
          }

          console.log(
            "AUTH : authentification réussie"
          );

          return {
            id: utilisateur.id,
            email: utilisateur.email,
            name: `${utilisateur.prenom} ${utilisateur.nom}`,
          };
        } catch (error) {
          console.error(
            "AUTH AUTHORIZE ERROR:",
            error
          );

          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },

  secret: process.env.AUTH_SECRET,
});
