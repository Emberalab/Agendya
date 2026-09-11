import { useState } from 'react';
import { Button, FormGroup, Input } from '@moondesignsystem/react';
import { submitAccessWaitlist } from './accessWaitlistApi';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AccessWaitlistFormProps {
  initialEmail?: string;
  initialBusiness?: string;
}

export function AccessWaitlistForm({
  initialEmail = '',
  initialBusiness = '',
}: AccessWaitlistFormProps) {
  const [name, setName] = useState('');
  const [business, setBusiness] = useState(initialBusiness);
  const [city, setCity] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div
        role="status"
        className="rounded-lg border p-4"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface-soft)',
        }}
      >
        <p
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Ya reservamos tu cupo.
        </p>
        <p
          className="mt-1 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Te escribiremos a {email} cuando puedas crear tu cuenta de
          profesional.
        </p>
      </div>
    );
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!name.trim() || !business.trim() || !city.trim()) {
      setError('Completa nombre, negocio y ciudad.');
      return;
    }
    const digits = whatsapp.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      setError('Ingresa un WhatsApp válido.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Ingresa un correo válido.');
      return;
    }

    setPending(true);
    try {
      const result = await submitAccessWaitlist({
        name: name.trim(),
        business: business.trim(),
        city: city.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim(),
      });
      if (!result.success) {
        setError('No pudimos guardar tu cupo. Intenta de nuevo.');
        return;
      }
      setDone(true);
    } catch {
      setError('No pudimos guardar tu cupo. Intenta de nuevo.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-3">
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Agendya está en periodo de prueba. Reserva tu cupo y te avisamos cuando
        puedas entrar.
      </p>
      <FormGroup>
        <FormGroup.Label htmlFor="waitlist-name" className="agendia-label">
          Nombre *
        </FormGroup.Label>
        <Input
          id="waitlist-name"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setName(e.target.value)
          }
          size="md"
          variant="outline"
          autoComplete="name"
        />
      </FormGroup>
      <FormGroup>
        <FormGroup.Label htmlFor="waitlist-business" className="agendia-label">
          Nombre de tu negocio *
        </FormGroup.Label>
        <Input
          id="waitlist-business"
          value={business}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setBusiness(e.target.value)
          }
          size="md"
          variant="outline"
          autoComplete="organization"
        />
      </FormGroup>
      <FormGroup>
        <FormGroup.Label htmlFor="waitlist-city" className="agendia-label">
          Ciudad *
        </FormGroup.Label>
        <Input
          id="waitlist-city"
          value={city}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setCity(e.target.value)
          }
          size="md"
          variant="outline"
          autoComplete="address-level2"
        />
      </FormGroup>
      <FormGroup>
        <FormGroup.Label htmlFor="waitlist-whatsapp" className="agendia-label">
          WhatsApp *
        </FormGroup.Label>
        <Input
          id="waitlist-whatsapp"
          value={whatsapp}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setWhatsapp(e.target.value)
          }
          size="md"
          variant="outline"
          type="tel"
          autoComplete="tel"
        />
      </FormGroup>
      <FormGroup>
        <FormGroup.Label htmlFor="waitlist-email" className="agendia-label">
          Correo electrónico *
        </FormGroup.Label>
        <Input
          id="waitlist-email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setEmail(e.target.value)
          }
          size="md"
          variant="outline"
          type="email"
          autoComplete="email"
        />
      </FormGroup>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant="fill"
        context="brand"
        size="md"
        isFullWidth
        disabled={pending}
      >
        {pending ? 'Enviando…' : 'Reservar mi cupo'}
      </Button>
    </form>
  );
}
