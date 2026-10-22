import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ElementType, ReactNode } from "react";

const variants: Variants = {
  // Start slightly visible so folds never read as empty gray mid-scroll
  hidden: { opacity: 0.35, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
}: {
  children: ReactNode;
  delay?: number;
  as?: keyof typeof motion;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[Tag] as typeof motion.div;
  const StaticTag = Tag as ElementType;

  if (reduceMotion) {
    return <StaticTag className={className}>{children}</StaticTag>;
  }

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px", amount: 0.15 }}
      variants={variants}
      transition={{ delay: Math.min(delay, 0.12) }}
    >
      {children}
    </MotionTag>
  );
}
