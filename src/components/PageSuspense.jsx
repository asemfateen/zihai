import { Suspense } from "react";
import Spinner from "./Spinner";

export default function PageSuspense({ children }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent relative z-10 flex items-center justify-center">
          <Spinner size={40} />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
