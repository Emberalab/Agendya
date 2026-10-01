import { accountActivatedTemplate } from './account-activated.template';
import { bookingCancelledToProfessionalTemplate } from './booking-cancelled-professional.template';
import { bookingCancelledTemplate } from './booking-cancelled.template';
import { bookingConfirmationTemplate } from './booking-confirmation.template';
import { bookingReminderTemplate } from './booking-reminder.template';
import { bookingRescheduledToProfessionalTemplate } from './booking-rescheduled-professional.template';
import { bookingRescheduledTemplate } from './booking-rescheduled.template';
import { forgotPasswordTemplate } from './forgot-password.template';
import { passwordChangedTemplate } from './password-changed.template';
import { welcomeApprovedTemplate } from './welcome-approved.template';
import { welcomePendingTemplate } from './welcome-pending.template';

describe('Email Templates', () => {
  describe('welcomePendingTemplate', () => {
    it('should have correct subject', () => {
      const result = welcomePendingTemplate({ businessName: 'Salón Test' });
      expect(result.subject).toBe('Tu registro en Agendya fue recibido');
    });

    it('should include businessName in html and text', () => {
      const result = welcomePendingTemplate({ businessName: 'Salón Test' });
      expect(result.html).toContain('Salón Test');
      expect(result.text).toContain('Salón Test');
    });

    it('should escape HTML in businessName', () => {
      const result = welcomePendingTemplate({
        businessName: '<script>alert("xss")</script>',
      });
      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).not.toContain('<script>');
    });
  });

  describe('welcomeApprovedTemplate', () => {
    it('should have correct subject', () => {
      const result = welcomeApprovedTemplate({
        businessName: 'Salón Test',
        loginUrl: 'https://agendya.co/login',
      });
      expect(result.subject).toBe('Tu cuenta en Agendya está lista');
    });

    it('should include businessName and loginUrl', () => {
      const result = welcomeApprovedTemplate({
        businessName: 'Salón Test',
        loginUrl: 'https://agendya.co/login',
      });
      expect(result.html).toContain('Salón Test');
      expect(result.html).toContain('https://agendya.co/login');
      expect(result.text).toContain('Salón Test');
      expect(result.text).toContain('https://agendya.co/login');
    });

    it('should escape HTML in businessName', () => {
      const result = welcomeApprovedTemplate({
        businessName: '<img src=x onerror=alert(1)>',
        loginUrl: 'https://agendya.co/login',
      });
      expect(result.html).toContain('&lt;img');
      expect(result.html).not.toContain('<img src=x');
    });
  });

  describe('accountActivatedTemplate', () => {
    it('should have correct subject', () => {
      const result = accountActivatedTemplate({
        businessName: 'Salón Test',
        loginUrl: 'https://agendya.co/login',
      });
      expect(result.subject).toBe('Tu cuenta en Agendya fue activada');
    });

    it('should include businessName and loginUrl', () => {
      const result = accountActivatedTemplate({
        businessName: 'Salón Test',
        loginUrl: 'https://agendya.co/login',
      });
      expect(result.html).toContain('Salón Test');
      expect(result.html).toContain('https://agendya.co/login');
      expect(result.text).toContain('Salón Test');
      expect(result.text).toContain('https://agendya.co/login');
    });

    it('should escape HTML in businessName', () => {
      const result = accountActivatedTemplate({
        businessName: '<script>alert("xss")</script>',
        loginUrl: 'https://agendya.co/login',
      });
      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).not.toContain('<script>alert');
    });
  });

  describe('forgotPasswordTemplate', () => {
    it('should have correct subject', () => {
      const result = forgotPasswordTemplate({
        resetUrl: 'https://agendya.co/reset?token=abc',
      });
      expect(result.subject).toBe('Recupera tu contraseña en Agendya');
    });

    it('should include resetUrl in html and text', () => {
      const result = forgotPasswordTemplate({
        resetUrl: 'https://agendya.co/reset?token=abc',
      });
      expect(result.html).toContain('https://agendya.co/reset?token=abc');
      expect(result.text).toContain('https://agendya.co/reset?token=abc');
    });

    it('should mention 1 hour expiration', () => {
      const result = forgotPasswordTemplate({
        resetUrl: 'https://agendya.co/reset?token=abc',
      });
      expect(result.html).toContain('1 hora');
      expect(result.text).toContain('1 hora');
    });
  });

  describe('passwordChangedTemplate', () => {
    it('should have correct subject', () => {
      const result = passwordChangedTemplate({
        replyTo: 'info@agendya.co',
      });
      expect(result.subject).toBe('Tu contraseña fue actualizada');
    });

    it('should include replyTo email', () => {
      const result = passwordChangedTemplate({
        replyTo: 'info@agendya.co',
      });
      expect(result.html).toContain('info@agendya.co');
      expect(result.text).toContain('info@agendya.co');
    });
  });

  describe('bookingConfirmationTemplate', () => {
    it('should have correct subject', () => {
      const result = bookingConfirmationTemplate({
        customerName: 'Juan',
        businessName: 'Salón Test',
        serviceName: 'Corte de pelo',
        formattedDate: 'lunes, 1 de enero de 2026, 10:00',
        cancelUrl: 'https://agendya.co/bookings/token123',
      });
      expect(result.subject).toContain('confirmada');
      expect(result.subject).toContain('Salón Test');
    });

    it('should include all booking details', () => {
      const result = bookingConfirmationTemplate({
        customerName: 'Juan',
        businessName: 'Salón Test',
        serviceName: 'Corte de pelo',
        formattedDate: 'lunes, 1 de enero de 2026, 10:00',
        cancelUrl: 'https://agendya.co/bookings/token123',
      });
      expect(result.html).toContain('Juan');
      expect(result.html).toContain('Salón Test');
      expect(result.html).toContain('Corte de pelo');
      expect(result.html).toContain('lunes, 1 de enero de 2026, 10:00');
      expect(result.html).toContain('https://agendya.co/bookings/token123');
    });

    it('should escape HTML in user-provided fields', () => {
      const result = bookingConfirmationTemplate({
        customerName: '<script>alert(1)</script>',
        businessName: 'Salón Test',
        serviceName: 'Corte<b>Bold</b>',
        formattedDate: 'lunes, 1 de enero de 2026, 10:00',
        cancelUrl: 'https://agendya.co/bookings/token123',
      });
      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).toContain('&lt;b&gt;');
      expect(result.html).not.toContain('<script>alert');
      expect(result.html).not.toContain('<b>Bold</b>');
    });
  });

  describe('bookingCancelledTemplate', () => {
    it('should have correct subject', () => {
      const result = bookingCancelledTemplate({
        customerName: 'Juan',
        businessName: 'Salón Test',
        serviceName: 'Corte de pelo',
        formattedDate: 'lunes, 1 de enero de 2026, 10:00',
      });
      expect(result.subject).toContain('cancelada');
      expect(result.subject).toContain('Salón Test');
    });

    it('should include all booking details', () => {
      const result = bookingCancelledTemplate({
        customerName: 'Juan',
        businessName: 'Salón Test',
        serviceName: 'Corte de pelo',
        formattedDate: 'lunes, 1 de enero de 2026, 10:00',
      });
      expect(result.html).toContain('Juan');
      expect(result.html).toContain('Salón Test');
      expect(result.html).toContain('Corte de pelo');
      expect(result.html).toContain('lunes, 1 de enero de 2026, 10:00');
    });

    it('should escape HTML in customerName', () => {
      const result = bookingCancelledTemplate({
        customerName: '<img src=x onerror=alert(1)>',
        businessName: 'Salón Test',
        serviceName: 'Corte de pelo',
        formattedDate: 'lunes, 1 de enero de 2026, 10:00',
      });
      expect(result.html).toContain('&lt;img');
      expect(result.html).not.toContain('<img src=x');
    });
  });

  describe('bookingReminderTemplate', () => {
    it('should have correct subject for 24h reminder', () => {
      const result = bookingReminderTemplate({
        customerName: 'Juan',
        businessName: 'Salón Test',
        serviceName: 'Corte de pelo',
        formattedDate: 'lunes, 1 de enero de 2026, 10:00',
        hoursBefore: 24,
      });
      expect(result.subject).toContain('Recordatorio');
      expect(result.subject).toContain('Salón Test');
    });

    it('should have correct subject for 2h reminder', () => {
      const result = bookingReminderTemplate({
        customerName: 'Juan',
        businessName: 'Salón Test',
        serviceName: 'Corte de pelo',
        formattedDate: 'lunes, 1 de enero de 2026, 10:00',
        hoursBefore: 2,
      });
      expect(result.subject).toContain('Recordatorio');
      expect(result.subject).toContain('Salón Test');
    });

    it('should include all booking details', () => {
      const result = bookingReminderTemplate({
        customerName: 'Juan',
        businessName: 'Salón Test',
        serviceName: 'Corte de pelo',
        formattedDate: 'lunes, 1 de enero de 2026, 10:00',
        hoursBefore: 24,
      });
      expect(result.html).toContain('Juan');
      expect(result.html).toContain('Salón Test');
      expect(result.html).toContain('Corte de pelo');
      expect(result.html).toContain('lunes, 1 de enero de 2026, 10:00');
    });

    it('should escape HTML in serviceName', () => {
      const result = bookingReminderTemplate({
        customerName: 'Juan',
        businessName: 'Salón Test',
        serviceName: '<script>alert("xss")</script>',
        formattedDate: 'lunes, 1 de enero de 2026, 10:00',
        hoursBefore: 24,
      });
      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).not.toContain('<script>alert');
    });
  });

  describe('bookingRescheduledTemplate', () => {
    it('should have correct subject', () => {
      const result = bookingRescheduledTemplate({
        customerName: 'Juan',
        businessName: 'Salón Test',
        serviceName: 'Corte de pelo',
        oldFormattedDate: 'lunes, 1 de enero de 2026, 10:00',
        newFormattedDate: 'martes, 2 de enero de 2026, 11:00',
        manageUrl: 'https://agendya.co/bookings/token123',
      });
      expect(result.subject).toContain('Cita modificada');
      expect(result.subject).toContain('Salón Test');
    });

    it('should include old and new dates', () => {
      const result = bookingRescheduledTemplate({
        customerName: 'Juan',
        businessName: 'Salón Test',
        serviceName: 'Corte de pelo',
        oldFormattedDate: 'lunes, 1 de enero de 2026, 10:00',
        newFormattedDate: 'martes, 2 de enero de 2026, 11:00',
        manageUrl: 'https://agendya.co/bookings/token123',
      });
      expect(result.html).toContain('lunes, 1 de enero de 2026, 10:00');
      expect(result.html).toContain('martes, 2 de enero de 2026, 11:00');
      expect(result.html).toContain('https://agendya.co/bookings/token123');
    });

    it('should escape HTML in businessName', () => {
      const result = bookingRescheduledTemplate({
        customerName: 'Juan',
        businessName: '<script>alert(1)</script>',
        serviceName: 'Corte de pelo',
        oldFormattedDate: 'lunes, 1 de enero de 2026, 10:00',
        newFormattedDate: 'martes, 2 de enero de 2026, 11:00',
        manageUrl: 'https://agendya.co/bookings/token123',
      });
      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).not.toContain('<script>alert');
    });
  });

  describe('bookingRescheduledToProfessionalTemplate', () => {
    it('should have correct subject', () => {
      const result = bookingRescheduledToProfessionalTemplate({
        professionalName: 'María',
        customerName: 'Juan',
        serviceName: 'Corte de pelo',
        oldFormattedDate: 'lunes, 1 de enero de 2026, 10:00',
        newFormattedDate: 'martes, 2 de enero de 2026, 11:00',
      });
      expect(result.subject).toContain('Modificación de reserva');
    });

    it('should include all details', () => {
      const result = bookingRescheduledToProfessionalTemplate({
        professionalName: 'María',
        customerName: 'Juan',
        serviceName: 'Corte de pelo',
        oldFormattedDate: 'lunes, 1 de enero de 2026, 10:00',
        newFormattedDate: 'martes, 2 de enero de 2026, 11:00',
      });
      expect(result.html).toContain('María');
      expect(result.html).toContain('Juan');
      expect(result.html).toContain('Corte de pelo');
      expect(result.html).toContain('lunes, 1 de enero de 2026, 10:00');
      expect(result.html).toContain('martes, 2 de enero de 2026, 11:00');
    });

    it('should escape HTML in customerName', () => {
      const result = bookingRescheduledToProfessionalTemplate({
        professionalName: 'María',
        customerName: '<b>Hacker</b>',
        serviceName: 'Corte de pelo',
        oldFormattedDate: 'lunes, 1 de enero de 2026, 10:00',
        newFormattedDate: 'martes, 2 de enero de 2026, 11:00',
      });
      expect(result.html).toContain('&lt;b&gt;');
      expect(result.html).not.toContain('<b>Hacker</b>');
    });
  });

  describe('bookingCancelledToProfessionalTemplate', () => {
    const params = {
      professionalName: 'María',
      customerName: 'Juan',
      serviceName: 'Corte de pelo',
      formattedDate: 'lunes, 1 de enero de 2026, 10:00',
    };

    it('should have correct subject', () => {
      const result = bookingCancelledToProfessionalTemplate(params);
      expect(result.subject).toBe('Cita cancelada - Juan');
    });

    it('should include all details in html and text', () => {
      const result = bookingCancelledToProfessionalTemplate(params);
      for (const value of Object.values(params)) {
        expect(result.html).toContain(value);
        expect(result.text).toContain(value);
      }
    });

    it('should escape HTML in customerName', () => {
      const result = bookingCancelledToProfessionalTemplate({
        ...params,
        customerName: '<script>alert(1)</script>',
      });
      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).not.toContain('<script>alert');
    });
  });
});
