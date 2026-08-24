import { redirect } from "next/navigation";

// Ancienne route racine (theme clair) fusionnee dans la console.
export default function AutoDialerRedirect() {
  redirect("/console/auto-dialer");
}
