export function SuperAdminHome() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
      <h1
        className="text-3xl font-bold mb-2"
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--color-text-primary)',
        }}
      >
        Hola, SuperAdmin
      </h1>
      <p
        className="text-sm max-w-md"
        style={{
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
        }}
      >
        Esta cuenta no usa el panel del profesional. El resto del
        administrador llega en un siguiente ticket.
      </p>
    </div>
  );
}
