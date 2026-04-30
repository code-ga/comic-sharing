import Link from "next/link";

interface AuthFormProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  submitText: string;
  footerLinks?: React.ReactNode;
  loading?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
}

export default function AuthForm({
  children,
  title,
  description,
  submitText,
  footerLinks,
  loading = false,
  onSubmit,
}: AuthFormProps) {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {children}

        <div className="flex justify-center mt-4">
          <button
            type="submit"
            className={`w-full px-4 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
            disabled={loading}
          >
            {loading ? "Processing..." : submitText}
          </button>
        </div>
      </form>

      {footerLinks && (
        <div className="text-center text-sm text-muted-foreground mt-4">
          {footerLinks}
        </div>
      )}
    </div>
  );
}
