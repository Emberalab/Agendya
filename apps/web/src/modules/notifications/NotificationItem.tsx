import { useCallback, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Notification } from '@agendya/types';
import { prefersReducedMotion } from '../../shared/a11y/prefersReducedMotion';
import { NotificationTypeIcon } from './notificationIcons';

function relativeTime(iso: string): string {
	return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
}

/**
 * Safety net for the exit transition: if `transitionend` never arrives (row
 * hidden mid-animation because the user opened the detail view, tab backgrounded,
 * a browser that skips the transition…) the row would otherwise linger in the
 * cache invisibly. Comfortably longer than the 0.22s CSS transition.
 */
const EXIT_FALLBACK_MS = 450;

/**
 * One row in the notification centre.
 *
 * The row body is a `<button>` (real button semantics + keyboard support);
 * read/unread is conveyed three non-colour-only ways — a filled dot, a "Nuevo"
 * tag, and bold weight — plus the accessible name is prefixed with "Sin leer."
 * while unread.
 *
 * A **read** row also gets a secondary, low-emphasis "Eliminar" control (a
 * sibling button, not nested) with its own descriptive accessible name. Unread
 * rows deliberately have none — the notification itself is what matters there.
 *
 * Deletion is animated: the parent flips `exiting` to `true`, the CSS in
 * `main.scss` slides the row left + fades it while its height collapses, and the
 * inner element's `transitionend` calls `onExited` — that is the single point
 * where the parent commits the removal (optimistic cache update + undo toast).
 * Under `prefers-reduced-motion` there is no slide: `onExited` fires on the next
 * tick so the outcome is identical, just instant.
 */
export function NotificationItem({
	notification,
	onActivate,
	onDelete,
	exiting = false,
	onExited,
}: {
	notification: Notification;
	onActivate: (notification: Notification) => void;
	/** When provided and the row is read, renders the "Eliminar" control. */
	onDelete?: (notification: Notification) => void;
	/** Drives the exit animation. */
	exiting?: boolean;
	/** Called once, when the exit animation has finished (or immediately under reduced motion). */
	onExited?: (notification: Notification) => void;
}) {
	const unread = notification.readAt === null;
	const when = relativeTime(notification.createdAt);
	const canDelete = !unread && Boolean(onDelete);

	const firedRef = useRef(false);
	const finish = useCallback(() => {
		if (firedRef.current) return;
		firedRef.current = true;
		onExited?.(notification);
	}, [onExited, notification]);

	useEffect(() => {
		if (!exiting) return;
		if (prefersReducedMotion()) {
			finish();
			return;
		}
		const timer = setTimeout(finish, EXIT_FALLBACK_MS);
		return () => clearTimeout(timer);
	}, [exiting, finish]);

	return (
		<div
			data-notification-id={notification.id}
			className="notif-row"
			data-exiting={exiting ? 'true' : undefined}
		>
			<div
				className="notif-row-inner flex items-stretch"
				onTransitionEnd={(event) => {
					if (event.propertyName === 'opacity') finish();
				}}
				style={{
					background: unread ? 'var(--color-brand-tint)' : 'transparent',
					borderLeft: `3px solid ${unread ? 'var(--color-brand-primary)' : 'transparent'}`,
					borderBottom: '1px solid var(--color-border)',
				}}
			>
				<button
					type="button"
					onClick={() => onActivate(notification)}
					aria-label={`${unread ? 'Sin leer. ' : ''}${notification.title}. ${notification.body}. ${when}`}
					className="min-w-0 flex-1 text-left flex gap-3 px-4 py-3.5"
					style={{ background: 'none', border: 'none', cursor: 'pointer' }}
				>
					<span
						className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full mt-0.5"
						style={{
							backgroundColor: 'var(--color-surface-soft)',
							color: 'var(--color-text-brand)',
							border: '1px solid var(--color-border)',
						}}
					>
						<NotificationTypeIcon type={notification.type} />
					</span>

					<span className="flex-1 min-w-0">
						<span className="flex items-center gap-2">
							{unread && (
								<span
									aria-hidden="true"
									className="shrink-0 w-1.5 h-1.5 rounded-full"
									style={{ backgroundColor: 'var(--color-brand-primary)' }}
								/>
							)}
							<span
								className="truncate"
								style={{
									fontFamily: 'var(--font-body)',
									fontSize: '14px',
									fontWeight: unread ? 700 : 500,
									color: 'var(--color-text-primary)',
								}}
							>
								{notification.title}
							</span>
							{unread && (
								<span
									aria-hidden="true"
									className="shrink-0 rounded-full px-1.5 py-0.5"
									style={{
										fontFamily: 'var(--font-mono)',
										fontSize: '9px',
										fontWeight: 700,
										letterSpacing: '0.06em',
										textTransform: 'uppercase',
										color: 'var(--color-text-on-brand)',
										backgroundColor: 'var(--color-brand-primary)',
									}}
								>
									Nuevo
								</span>
							)}
						</span>
						<span
							className="block mt-0.5"
							style={{
								fontFamily: 'var(--font-body)',
								fontSize: '13px',
								color: 'var(--color-text-secondary)',
								lineHeight: 1.45,
								overflowWrap: 'anywhere',
							}}
						>
							{notification.body}
						</span>
						<time
							dateTime={notification.createdAt}
							className="block mt-1"
							style={{
								fontFamily: 'var(--font-mono)',
								fontSize: '11px',
								color: 'var(--color-text-muted)',
							}}
						>
							{when}
						</time>
					</span>
				</button>

				{canDelete && (
					<button
						type="button"
						onClick={() => onDelete?.(notification)}
						aria-label={`Eliminar notificación: ${notification.title}`}
						className="shrink-0 self-center mr-2 rounded-md px-2 py-1"
						style={{
							fontFamily: 'var(--font-body)',
							fontSize: '12px',
							fontWeight: 600,
							color: 'var(--color-text-muted)',
							background: 'none',
							border: 'none',
							cursor: 'pointer',
						}}
					>
						<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path></svg>
					</button>
				)}
			</div>
		</div>
	);
}
