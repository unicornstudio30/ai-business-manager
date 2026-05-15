import { redirect } from "next/navigation";

export default function PublishedRedirect() {
  redirect("/content?view=published");
}
