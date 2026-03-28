import { motion } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.11,
      delayChildren: 0.06,
    },
  },
}

const line = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease },
  },
}

/**
 * Staggered block lines — same pattern as many "text reveal" bits (Framer Motion).
 * Use motion.span with block + className per line inside StaggerLines.
 */
export function StaggerLines({ children, className = '' }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={container}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerLine({ children, className = '', as: Tag = 'span', ...rest }) {
  const MotionTag = Tag === 'h1' ? motion.h1 : motion.span
  return (
    <MotionTag variants={line} className={className} {...rest}>
      {children}
    </MotionTag>
  )
}
