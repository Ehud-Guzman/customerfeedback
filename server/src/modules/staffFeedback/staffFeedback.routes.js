import { Router } from "express";
import { submitStaffFeedback } from "./staffFeedback.controller.js";

const router = Router();

// POST /api/staff-feedback/submit
router.post("/submit", submitStaffFeedback);

export default router;
