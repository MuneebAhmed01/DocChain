import express from "express";
import {
  addDoctor,
  loginAdmin,
  allDoctors,
  appointmentsAdmin,
  appointmentCancel,
  adminDashboard,
  triggerHoldCleanup,
  getDoctorWalletSummary,
  getDoctorTransactionHistory,
  changeDoctorStatus,
  getPlatformRevenueAnalytics,
  getPlatformRevenueTransactions,
  getPlatformRevenueSummary,
} from "../controllers/adminController.js";

import { upload } from "../middlewares/multer.js";
import authAdmin from "../middlewares/authAdmin.js";
import { changeAvailability } from "../controllers/doctorController.js";

const adminRouter = express.Router();

adminRouter.post("/add-doctor", authAdmin, upload.single("image"),   
    addDoctor);
adminRouter.post("/login", loginAdmin);
adminRouter.post("/all-doctors", authAdmin, allDoctors);
adminRouter.post("/change-availability", authAdmin, changeAvailability);
adminRouter.post(
  "/change-doctor-status",
  authAdmin,
  changeDoctorStatus
);

adminRouter.get("/appointments", authAdmin, appointmentsAdmin);
adminRouter.post("/cancel-appointment", authAdmin, appointmentCancel);
adminRouter.get("/dashboard", authAdmin, adminDashboard);
adminRouter.post("/trigger-hold-cleanup", authAdmin, triggerHoldCleanup);

// 💰 Wallet Management Routes
adminRouter.post("/doctor-wallet-summary", authAdmin, getDoctorWalletSummary);
adminRouter.post("/doctor-transaction-history", authAdmin, getDoctorTransactionHistory);

// 💰 Platform Revenue Analytics Routes
adminRouter.post("/platform-revenue-analytics", authAdmin, getPlatformRevenueAnalytics);
adminRouter.post("/platform-revenue-transactions", authAdmin, getPlatformRevenueTransactions);
adminRouter.post("/platform-revenue-summary", authAdmin, getPlatformRevenueSummary);

export default adminRouter;
