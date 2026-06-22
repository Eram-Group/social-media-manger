import { ReactNode } from 'react';
import { motion } from 'framer-motion';

// Reusable professional motion wrappers (framer-motion) used across the demo to
// give every screen and overlay smooth, consistent entrance/exit animations.

// Page/section enter: gentle rise + fade.
export const FadeInUp = ({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay }}
    className={className}>
    {children}
  </motion.div>
);

// Staggered container — children with `StaggerItem` animate in sequence.
export const Stagger = ({ children, className }: { children: ReactNode; className?: string }) => (
  <motion.div
    initial="hidden"
    animate="show"
    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    className={className}>
    {children}
  </motion.div>
);

export const StaggerItem = ({ children, className }: { children: ReactNode; className?: string }) => (
  <motion.div
    variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    className={className}>
    {children}
  </motion.div>
);

// Backdrop for modals/drawers. Pass className to control layout (e.g. centering).
export const Backdrop = ({
  children,
  onClose,
  className,
}: {
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    onClick={onClose}
    className={`fixed inset-0 z-50 flex bg-black/40 ${className ?? ''}`}>
    {children}
  </motion.div>
);

// Centered modal panel.
export const ModalPanel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96, y: 8 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.96, y: 8 }}
    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    onClick={(e) => e.stopPropagation()}
    className={className}>
    {children}
  </motion.div>
);

// Right-side drawer panel.
export const DrawerPanel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <motion.div
    initial={{ x: '100%' }}
    animate={{ x: 0 }}
    exit={{ x: '100%' }}
    transition={{ type: 'spring', stiffness: 320, damping: 34 }}
    onClick={(e) => e.stopPropagation()}
    className={className}>
    {children}
  </motion.div>
);
