import { getBackofficeErrorMessage } from '../../modules/backoffice/shared/backofficeApiClient';

// Mutation failure message (save, send, assign…). Mutations used to fail
// silently here: the button re-enabled and nothing told the agent their reply
// or status change never reached the server.
export function InlineError({
  error,
  className = 'mt-2',
}: {
  error: unknown;
  className?: string;
}) {
  if (!error) return null;
  return (
    <p role="alert" className={`text-sm text-danger ${className}`}>
      {getBackofficeErrorMessage(error)}
    </p>
  );
}
