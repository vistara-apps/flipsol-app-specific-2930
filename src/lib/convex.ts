import { ConvexReactClient } from "convex/react";

// Use a dummy URL if not configured - Convex features will be disabled
const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://disabled.convex.cloud";

const convex = new ConvexReactClient(convexUrl);

export default convex;