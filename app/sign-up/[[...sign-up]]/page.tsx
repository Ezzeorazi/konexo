import { SignUp } from "@clerk/nextjs";

// force-dynamic: no se prerenderiza en build (necesita Clerk en runtime).
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <SignUp />
    </div>
  );
}
