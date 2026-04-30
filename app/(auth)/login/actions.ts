"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isEmailAllowed } from "@/lib/auth/config";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/auth/config";
import { createSessionCookie } from "@/lib/auth/session";

export type LoginState = {
  error: string | null;
  email: string;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const rawEmail = String(formData.get("email") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/overview");
  const safeRedirect =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/overview";

  if (!rawEmail || !rawEmail.includes("@")) {
    return { error: "Podaj poprawny adres e-mail.", email: rawEmail };
  }

  if (!isEmailAllowed(rawEmail)) {
    // Don't disclose whether the address is on the list specifically.
    return {
      error: "Ten adres nie ma dostępu do tej instalacji.",
      email: rawEmail,
    };
  }

  const cookieValue = createSessionCookie(rawEmail);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });

  redirect(safeRedirect);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
