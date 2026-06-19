import express from "express";
import { Router } from "express";
import { config } from "../config.js";

export const assetsRouter = Router();
assetsRouter.use("/assets", express.static(config.imagesDir, { fallthrough: false, index: false }));
