import { AlertCircle } from "lucide-react";
import { Card } from "../ui/Card";

interface PublicFormUnavailableProps {
  title?: string;
  message?: string;
}

export function PublicFormUnavailable({ title = "Form unavailable", message = "This form is temporarily unavailable. Please try again later." }: PublicFormUnavailableProps) {
  return (
    <Card className="border-amberGlow/25 bg-amberGlow/8 p-5 text-sm text-white/72">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-amberGlow" aria-hidden="true" />
        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-1 leading-6">{message}</p>
        </div>
      </div>
    </Card>
  );
}
