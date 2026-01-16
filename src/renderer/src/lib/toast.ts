/**
 * Toast utility using sonner.
 *
 * Usage:
 * ```ts
 * import { toast } from '@/lib/toast'
 *
 * toast.success('Operation completed!')
 * toast.error('Something went wrong')
 * toast.info('Processing...')
 * toast.warning('Please review')
 * toast.promise(asyncFn, { loading: 'Loading...', success: 'Done!', error: 'Failed' })
 * ```
 *
 * @see https://sonner.emilkowal.ski/
 */
export { toast } from 'sonner'
